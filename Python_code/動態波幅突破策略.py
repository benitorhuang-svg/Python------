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

# 外部参数
cycle_length = 100

# 定义全局变量
up_line = 0  								        # 上轨
under_line = 0  							        # 下轨
mp = 0  										    # 用于控制虚拟持仓

def onTick():
    exchange.SetContractType("c000")  		        # 订阅期货品种
    bars = exchange.GetRecords()  			        # 获取K线列表
    if len(bars) < cycle_length + 1:  		        # 如果K线列表的长度太小就直接返回
        return
    close0 = bars[len(bars) - 1].Close		        # 获取当根K线收盘价
    high0 = bars[len(bars) - 1].High  		        # 获取当根K线最高价
    high1 = bars[len(bars) - 2].High  		        # 获取上根K线最高价
    low0 = bars[len(bars) - 1].Low  		        # 获取当根K线最低价
    low1 = bars[len(bars) - 2].Low  		        # 获取上根K线最低价
    # 获取前cycle_length根K线最高价的最高价
    highs = TA.Highest(bars, cycle_length, 'High')  
    # 获取前cycle_length根K线最低价的最低价
    lows = TA.Lowest(bars, cycle_length, 'Low')  
    global up_line, under_line, mp  		        # 使用全局变量
    if high0 > high1:  	                            # 如果当根K线最高价大于上根K线最高价
        under_line=lows	                            # 把下轨重新赋值为：前cycle_length根K线最低价的最低价
    if low0 < low1:  	                            # 如果当根K线最低价小于上根K线最低价
        up_line = highs	                            # 把上轨重新赋值为：前cycle_length根K线最高价的最高价
    middle_line = (lows + highs) / 2  		        # 计算中轨的值
            
    if mp == 0 and close0 > up_line:  		        # 如果当前空仓，并且最新价大于上轨
        exchange.SetDirection("buy")  		        # 设置交易方向和类型
        exchange.Buy(close0, 1)  			        # 开多单
        mp = 1  							        # 设置虚拟持仓的值，即有多单
                
    if mp == 0 and close0 < under_line:  	        # 如果当前空仓，并且最新价小于下轨
        exchange.SetDirection("sell")  		        # 设置交易方向和类型
        exchange.Sell(close0 - 1, 1)  		        # 开空单
        mp = -1  							        # 设置虚拟持仓的值，即有空单
                
    if mp > 0 and close0 < middle_line:  	        # 如果当前持有多单且最新价小于中轨
        exchange.SetDirection("closebuy")  	        # 设置交易方向和类型
        exchange.Sell(close0 - 1, 1)  		        # 平多单
        mp = 0  							        # 设置虚拟持仓的值，即空仓
                
    if mp < 0 and close0 > middle_line:		        # 如果当前持有空单且最新价大于中轨
        exchange.SetDirection("closesell") 	        # 设置交易方向和类型
        exchange.Buy(close0, 1)  			        # 平空单
        mp = 0  							        # 设置虚拟持仓的值，即空仓
        
def main():     
    while True:  							        # 进入无限循环模式
        onTick()  							        # 执行策略主函数
        Sleep(1000)							        # 休眠1秒

# 回测结果 
task = VCtx(__doc__)                        	    # 调用VCtx()函数
try:
    main()                                  		# 调用策略入口函数
except:
    task.Show()                      	        	# 回测结束输出图表