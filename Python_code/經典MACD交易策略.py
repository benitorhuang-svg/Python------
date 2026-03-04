# 回测配置 
'''backtest
start: 2019-01-01 00:00:00
end: 2021-01-01 00:00:00
period: 1d
basePeriod: 1d
balance: 10000
slipPoint: 2
exchanges: [{"eid":"Futures_CTP","currency":"FUTURES"}]
'''

# 导入模块 
from fmz import *

mp = 0  									# 定义一个全局变量，用于控制虚拟持仓
    
# 程序主函数
def onTick():
    _C(exchange.SetContractType, "FG000")	# 订阅期货品种
    bar = _C(exchange.GetRecords)  			# 获取K线列表
    if len(bar) < 100:						# 如果K线列表长度太小就返回
        return
    macd = TA.MACD(bar, 5, 50, 15)  		# 计算MACD值
    dif = macd[0][-2]  						# 获取DIF的值，返回一个列表
    dea = macd[1][-2]  						# 获取DEA的值，返回一个列表
    last_close = bar[-1]['Close']			# 获取最新价格（卖价）
    global mp  								# 全局变量，用于控制虚拟持仓
    if mp == 1 and dif < dea:
        exchange.SetDirection("closebuy")	# 设置交易方向和类型
        exchange.Sell(last_close - 1, 1) 	# 平多单
        mp = 0  							# 设置虚拟持仓的值，即空仓
    if mp == -1 and dif > dea:
        exchange.SetDirection("closesell")  # 设置交易方向和类型
        exchange.Buy(last_close, 1)  		# 平空单
        mp = 0  							# 设置虚拟持仓的值，即空仓
    if mp == 0 and dif > dea:
        exchange.SetDirection("buy")  		# 设置交易方向和类型
        exchange.Buy(last_close, 1)  		# 开多单
        mp = 1  							# 设置虚拟持仓的值，即有多单
    if mp == 0 and dif < dea:
        exchange.SetDirection("sell")  		# 设置交易方向和类型
        exchange.Sell(last_close - 1, 1)	# 开空单
        mp = -1  							# 设置虚拟持仓的值，即有空单
        
def main():
    while True:
        onTick()
        Sleep(1000)

# 回测结果 
task = VCtx(__doc__)                        # 调用VCtx()函数
try:
    main()                                  # 调用策略入口函数
except:
    task.Show()                      	    # 回测结束输出图表