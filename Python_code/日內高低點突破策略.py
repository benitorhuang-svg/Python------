# 回测配置 
'''backtest
start: 2019-01-01 00:00:00
end: 2021-01-01 00:00:00
period: 1m
basePeriod: 1m
balance: 10000
slipPoint: 1
exchanges: [{"eid":"Futures_CTP","currency":"FUTURES"}]
'''

# 导入模块 
from fmz import *
import time

# 定义全局变量：虚拟持仓、上轨、下轨
mp = on_line = under_line = 0
up = 1
down = 1

# 处理时间函数
def can_time(hour, minute):
    hour = str(hour)
    minute = str(minute)
    if len(minute) == 1:
        minute = "0" + minute
    return int(hour + minute)

def onTick():
    _C(exchange.SetContractType, "TA888")  				    # 订阅期货品种
    bar_arr = _C(exchange.GetRecords)  					    # 获取K线列表
    if len(bar_arr) < 10:
        return
    time_new = bar_arr[-1]['Time']  					    # 获取当根K线的时间戳
    time_local_new = time.localtime(time_new / 1000)  		# 处理时间戳
    hour_new = int(time.strftime("%H", time_local_new))  	# 获取小时
    minute_new = int(time.strftime("%M", time_local_new))   # 获取分钟
    day_new = int(time.strftime("%d", time_local_new))	    # 当前K线日期
    time_previous = bar_arr[-2]['Time']  				    # 获取上根K线的时间戳
    previous = time.localtime(time_previous / 1000)  	    # 处理时间戳
    day_previous = int(time.strftime("%d", previous))  	    # 上根K线日期
    global mp, on_line, under_line  		                # 引入全局变量
    high = bar_arr[-2]['High']  				            # 获取上根K线的最高价
    low = bar_arr[-2]['Low']  				                # 获取上根K线的最低价
    if day_new != day_previous:  			                # 如果是最新一根K线
        on_line = high * up 					            # 重置上轨
        under_line = low * down  			                # 重置下轨
    can_trade = can_time(hour_new, minute_new)
    if can_trade < 930:  					                # 如果不是在规定交易的时间内
        if high > on_line:  					            # 如果上根K线最高价大于上轨
            on_line = high * up  				            # 重置上轨
        if low < under_line:  				                # 如果上根K线最低价小于下轨
            under_line = low * down  			            # 重置上轨
    if on_line - under_line < 10:  			                # 如果上轨与下轨的差小于10
        return
    close_new = bar_arr[-1]['Close']  		                # 获取最新价格（卖价），用于开平仓
    # 如果持多单，并且价格小于下轨或者非规定的交易时间
    if mp > 0 and (close_new < under_line or can_trade > 1450):
        exchange.SetDirection("closebuy")  	                # 设置交易方向和类型
        exchange.Sell(close_new - 1, 1)  	                # 平多单
        mp = 0  								            # 设置虚拟持仓的值，即空仓
    # 如果持空单，并且价格大于上轨或者非规定的交易时间
    if mp < 0 and (close_new > on_line or can_trade > 1450):
        exchange.SetDirection("closesell")  	            # 设置交易方向和类型
        exchange.Buy(close_new, 1)  			            # 平空单
        mp = 0  								            # 设置虚拟持仓的值，即空仓
    if mp == 0 and 930 < can_trade < 1450: 	                # 如果当前无持仓且在交易时间内
        if close_new > on_line:  			                # 如果价格大于上轨
            exchange.SetDirection("buy")  	                # 设置交易方向和类型
            exchange.Buy(close_new, 1)  		            # 开多单
            mp = 1  							            # 设置虚拟持仓的值，即有多单
        elif close_new < under_line: 		                # 如果价格小于下轨
            exchange.SetDirection("sell")  	                # 设置交易方向和类型
            exchange.Sell(close_new - 1, 1)  	            # 开空单
            mp = -1  							            # 设置虚拟持仓的值，即有空单
              
def main():
    while True:
        onTick()
        Sleep(1000)

# 回测结果 
task = VCtx(__doc__)                        	            # 调用VCtx()函数
try:
    main()                                  		        # 调用策略入口函数
except:
    task.Show()                      	        	        # 回测结束输出图表