# 回测配置 
'''backtest
start: 2019-01-01 00:00:00
end: 2021-01-01 00:00:00
period: 1h
basePeriod: 1h
balance: 10000
slipPoint: 2
exchanges: [{"eid":"Futures_CTP","currency":"FUTURES"}]
'''

# 导入模块 
from fmz import *

# 定义全局变量
mp = 0  												# 用于控制虚拟持仓
last_bar_time = 0  										# 用于判断K线时间
up_line = 0  											# 上轨
down_line = 0  											# 下轨

# 策略参数
Ks = 3
Kx = 2
Cycle = 5

# 策略主函数
def onTick():
    global mp, last_bar_time, up_line, down_line 		# 引入全局变量
    exchange.SetContractType('rb000')  					# 订阅期货品种
    bar_arr = exchange.GetRecords()  					# 获取K线列表
    # 如果没有获取到K线数据或者K线数据太短就返回
    if not bar_arr or len(bar_arr) < 5:
        return  
    last_bar = bar_arr[len(bar_arr) - 1]  				# 最新的K线
    last_bar_close = last_bar['Close']  				# 最新K线的收盘价
    if last_bar_time != last_bar['Time']:  				# 如果产生了新的K线
        hh = TA.Highest(bar_arr, Cycle, 'High')  		# 最高价
        hc = TA.Highest(bar_arr, Cycle, 'Close')  		# 最高的收盘价
        ll = TA.Lowest(bar_arr, Cycle, 'Low')  			# 最低价
        lc = TA.Lowest(bar_arr, Cycle, 'Close')  		# 最低的收盘价
        Range = max(hh - lc, hc - ll)  					# 计算范围
        up_line = _N(last_bar['Open'] + 3 * Range)  	# 计算上轨
        down_line = _N(last_bar['Open'] - 2 * Range)	# 计算下轨
        last_bar_time = last_bar['Time']  				# 更新最后时间戳
    if mp == 0 and last_bar_close >= up_line:
        exchange.SetDirection("buy")  					# 设置交易方向和类型
        exchange.Buy(last_bar_close, 1)  				# 开多单
        mp = 1  										# 设置虚拟持仓有多单
    if mp == 0 and last_bar_close <= down_line:
        exchange.SetDirection("sell")  					# 设置交易方向和类型
        exchange.Sell(last_bar_close - 1, 1)  			# 开空单
        mp = -1  										# 设置虚拟持仓有空单
    if mp == 1 and last_bar_close <= down_line:
        exchange.SetDirection("closebuy")  				# 设置交易方向和类型
        exchange.Sell(last_bar_close - 1, 1)  			# 平多单
        mp = 0  										# 设置虚拟持仓空仓
    if mp == -1 and last_bar_close >= up_line:
        exchange.SetDirection("closesell")  			# 设置交易方向和类型
        exchange.Buy(last_bar_close, 1)  				# 平空单
        mp = 0  										# 设置虚拟持仓空仓

# 程序入口        
def main():
    while True:  										# 进入循环模式
        onTick()  										# 执行策略主函数
        Sleep(1000)  									# 休眠1秒

# 回测结果 
task = VCtx(__doc__)                        			# 调用VCtx()函数
try:
    main()                                  			# 调用策略入口函数
except:
    task.Show()                      	        		# 回测结束输出图表