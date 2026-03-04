# 回测配置 
'''backtest
start: 2019-01-01 00:00:00
end: 2021-01-01 00:00:00
period: 15m
basePeriod: 15m
slipPoint: 2
exchanges: [{"eid":"Futures_CTP","currency":"FUTURES","balance":100000}]
'''

# 导入模块 
from fmz import *
import time  									    # 导入库，用于转换时间格式

mp = 0  											# 虚拟持仓

def trade_time(hour, minute):
    minute = str(minute)
    if len(minute) == 1:
        minute = "0" + minute
    return int(str(hour) + minute)

def onTick():
    _C(exchange.SetContractType, "ag888")  			# 订阅期货品种
    bar_arr = _C(exchange.GetRecords, PERIOD_D1)	# 获取日线列表
    if len(bar_arr) < 2:  							# 如果小于2根K线
        return  								    # 返回继续等待数据
    yh = bar_arr[-2]['High']  						# 昨日最高价
    yl = bar_arr[-2]['Low']  						# 昨日最低价
    today_open = bar_arr[-1]['Open']  				# 当日开盘价
    bar_arr = _C(exchange.GetRecords)  				# 获取当前设置周期K线列表
    current = bar_arr[-1]['Time']  					# 获取当前K线时间戳
    local = time.localtime(current / 1000)  		# 处理时间戳
    hour = int(time.strftime("%H", local))  		# 格式化时间戳，并获取小时
    minute = int(time.strftime("%M", local))  		# 格式化时间戳，并获取分钟
    price = bar_arr[-1]['Close']  					# 获取最新价格
    global mp
    # 设置多头止损
    if today_open / yh > 1.005:  				    # 如果当天开盘价大于昨天最高价
        long_stop = yh  							# 设置多头止损价为昨天最高价
    elif today_open / yh < 0.995:  				    # 如果当天开盘价小于昨天最高价
        long_stop = today_open  					# 设置多头止损价为当天开盘价
    else:  										    # 如果当天开盘价接近昨天最高价
        long_stop = (yh + yl) / 2  				    # 设置多头止损为昨天中间价
    # 设置空头止损
    if today_open / yl < 0.995:  				    # 如果当天开盘价小于昨天最低价
        short_stop = yl  						    # 设置空头止损价为昨天最低价
    elif today_open / yl > 1.005:  				    # 如果当天开盘价大于昨天最低价
        short_stop = today_open  				    # 设置空头止损价为当天开盘价
    else:  										    # 如果当天开盘价接近昨天最低价
        short_stop = (yh + yl) / 2  				# 设置多头止损为昨天中间价
    # 下单交易
    trading = trade_time(hour, minute)
    if mp > 0:  									# 如果当前持有多单
# 如果当前价格小于多头止损线，或者超过规定的交易时间
        if price < long_stop or trading > 1450:  
            exchange.SetDirection("closebuy")  	    # 设置交易方向和类型
            exchange.Sell(price - 1, 1)  			# 平多单
            mp = 0  								# 重置虚拟持仓
    if mp < 0:  									# 如果当前持有空单
# 如果当前价格大于空头止损线，或者超过规定的交易时间
        if price > short_stop or trading > 1450:  
            exchange.SetDirection("closesell")  	# 设置交易方向和类型
            exchange.Buy(price, 1)  				# 平空单
            mp = 0  								# 重置虚拟持仓
# 如果当前无持仓，并且在规定的交易时间内
    if mp == 0 and 930 < trading < 1450:  		
        if price > yh:  							# 如果当前价格大于昨天最高价
            exchange.SetDirection("buy")  		    # 设置交易方向和类型
            exchange.Buy(price, 1)  				# 开多单
            mp = 1  								# 重置虚拟持仓
        elif price < yl:  						    # 如果价格小于昨天最低价
            exchange.SetDirection("sell")  		    # 设置交易方向和类型
            exchange.Sell(price - 1, 1)  			# 开空单
            mp = -1  								# 重置虚拟持仓

def main():
    while True:   								    # 无限循环
        onTick()  								    # 执行策略主函数
        Sleep(1000)  								# 休眠1秒

# 回测结果 
task = VCtx(__doc__)                        		# 调用VCtx()函数
try:
    main()                                  	    # 调用策略入口函数
except:
    task.Show()                      	            # 回测结束输出图表