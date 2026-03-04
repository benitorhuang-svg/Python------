# 回测配置 
'''backtest
start: 2018-05-01 00:00:00
end: 2020-01-01 00:00:00
period: 1h
basePeriod: 1h
balance: 10000
slipPoint: 2
exchanges: [{"eid":"Futures_CTP","currency":"FUTURES"}]
'''

# 导入模块 
from fmz import *

# 外部参数和全局变量
short = 10
long = 50
mp = 0

# 策略主函数
def onTick():
    # 获取数据
    exchange.SetContractType('rb000')   		# 订阅期货品种
    bars_arr = exchange.GetRecords()    		# 获取K线列表
    if len(bars_arr) < long + 1:        		# 如果K线数量过小
        return

    # 计算BIAS
    close = bars_arr[-2]['Close']     			# 获取上一根K线收盘价
    ma1 = TA.MA(bars_arr, short)[-2]  			# 计算上一根K线短期均线值
    bias1 = (close - ma1) / ma1 * 100 			# 计算短期乖离率值
    ma2 = TA.MA(bars_arr, long)[-2]   			# 计算上一根K线长期均线值
    bias2 = (close - ma2) / ma2 * 100 			# 计算长期乖离率值

    # 下单交易
    global mp  									# 全局变量
    current_price = bars_arr[-1]['Close']  		# 最新价格
    if mp > 0:   								# 如果持有多单
        if bias2 <= bias1:    					# 如果长期乖离率<=短期乖离率
            exchange.SetDirection("closebuy")   # 设置交易方向和类型
            exchange.Sell(current_price - 1, 1)	# 平多单
            mp = 0  							# 重置虚拟持仓
    if mp < 0:   								# 如果持有空单
        if bias2 >= bias1:    					# 如果长期乖离率>=短期乖离率
            exchange.SetDirection("closesell")  # 设置交易方向和类型
            exchange.Buy(current_price, 1)		# 平空单
            mp = 0  							# 重置虚拟持仓
    if mp == 0:  								# 如果无持仓
        if bias2 > bias1:    					# 长期乖离率大于短期乖离率
            exchange.SetDirection("buy")        # 设置交易方向和类型
            exchange.Buy(current_price, 1) 		# 开多单
            mp = 1  						    # 重置虚拟持仓
        if bias2 < bias1:    					# 长期乖离率小于短期乖离率
            exchange.SetDirection("sell")       # 设置交易方向和类型
            exchange.Sell(current_price - 1, 1)	# 开空单
            mp = -1  							# 重置虚拟持仓

# 程序入口函数
def main():
    while True:      							# 循环
        onTick()     							# 执行策略主函数
        Sleep(1000)  							# 休眠1秒

# 回测结果 
task = VCtx(__doc__)                        	# 调用VCtx()函数
try:
    main()                                  	# 调用策略入口函数
except:
    task.Show()                      	        # 回测结束输出图表