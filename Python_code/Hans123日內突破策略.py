# 回测配置 
'''backtest
start: 2020-01-01 00:00:00
end: 2021-01-01 00:00:00
period: 10m
basePeriod: 10m
exchanges: [{"eid":"Futures_CTP","currency":"FUTURES"}]
'''

# 导入模块 
from fmz import *

up_line = down_line = trade_count = 0  					# 定义全局变量：上轨、下轨、当天交易次数

def current_time(bar_arr):
    current = bar_arr[-1]['Time']  			            # 获取当前K线时间戳
    time_local = time.localtime(current / 1000)         # 处理时间戳
    hour = time.strftime("%H", time_local)  		    # 格式化时间戳，并获取小时
    minute = time.strftime("%M", time_local)  	        # 格式化时间戳，并获取分钟
    if len(minute) == 1:
        minute = "0" + minute
    return int(hour + minute)

# 取消未成交订单
def cancel_order():
    Sleep(1000)
    orders = exchange.GetOrders()
    if len(orders) > 0:
        exchange.CancelOrder(orders[0].Id)

def onTick():
    _C(exchange.SetContractType, "a888")  			    # 订阅期货品种
    bar_arr = _C(exchange.GetRecords)  	                # 获取分钟K线数组
    global up_line, down_line, trade_count  		    # 引入全局变量
    current = current_time(bar_arr)  					# 处理时间
    if current == 930:  						        # 如果K线时间是09:30
        bar_arr = _C(exchange.GetRecords, PERIOD_D1)    # 获取日K线数组
        up_line = bar_arr[-1]['High']                   # 获取K线最高价
        down_line = bar_arr[-1]['Low']                  # 获取K线最低价
        trade_count = 0  							    # 重置交易次数为0
    position_arr = _C(exchange.GetPosition)  		    # 获取持仓数组
    profit = 0                                          # 持仓利润
    position = 0                                        # 持仓方向和数量
    if len(position_arr) > 0:  						    # 如果持仓数组长度大于0
        position_dic = position_arr[0]  				# 获取持仓字典数据
        if position_dic['Type'] % 2 == 0:  		        # 如果是多单
            position = position_dic['Amount']  	        # 赋值持仓数量为正数
        else:
            position = -position_dic['Amount']  	    # 赋值持仓数量为负数
        profit = position_dic['Profit']  			    # 获取持仓盈亏
    depth = exchange.GetDepth()                         # 获取深度数据
    ask = depth.Asks[0].Price                           # 获取卖一价
    bid = depth.Bids[0].Price                           # 获取买一价
    if current == 1450 or profit > 300:                 # 如果时间等于14:50或者利润大于300
        if position > 0:  						        # 如果持多单
            exchange.SetDirection("closebuy")  	        # 设置交易方向和类型
            exchange.Sell(bid, 1) 	                    # 平多单
        if position < 0:  						        # 如果持空单
            exchange.SetDirection("closesell")  	    # 设置交易方向和类型
            exchange.Buy(ask, 1)  	                    # 平空单
    # 如果当前无持仓，并且小于指定交易次数，并且在指定交易时间内
    if position == 0 and trade_count < 3 and 930 < current < 1400:
        if bid > up_line:  			                    # 如果价格大于上轨
            exchange.SetDirection("buy")  		        # 设置交易方向和类型
            exchange.Buy(ask, 1)  	                    # 开多单
            trade_count = trade_count + 1  		        # 交易次数加一次
        if ask < down_line:  		                    # 如果价格小于下轨
            exchange.SetDirection("sell")  		        # 设置交易方向和类型
            exchange.Sell(bid, 1)	                    # 开空单
            trade_count = trade_count + 1  		        # 交易次数加一次
    cancel_order()

# 策略入口函数
def main():
    while True:  								        # 无限循环
        onTick()  								        # 执行策略主函数
        Sleep(1000)  								    # 休眠1秒

# 回测结果 
task = VCtx(__doc__)                        			# 调用VCtx()函数
try:
    main()                                  			# 调用策略入口函数
except:
    task.Show()                      	        		# 回测结束输出图表