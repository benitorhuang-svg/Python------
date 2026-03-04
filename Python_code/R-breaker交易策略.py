# 回测配置 
'''backtest
start: 2020-01-01 00:00:00
end: 2021-01-01 00:00:00
period: 1h
basePeriod: 1h
slipPoint: 2
exchanges: [{"eid":"Futures_CTP","currency":"FUTURES","balance":100000}]
'''

# 导入模块 
from fmz import *

# 策略主函数
def onTick():
    # 获取数据
    exchange.SetContractType('rb000')   					# 订阅期货品种
    bars_arr =exchange.GetRecords(PERIOD_D1)  			# 获取日K线数组
    if len(bars_arr) < 2:  								# 如果K线数量小于2根
        return
    yesterday_open = bars_arr[-2]['Open']     			# 昨日开盘价
    yesterday_high = bars_arr[-2]['High']     			# 昨日最高价
    yesterday_low = bars_arr[-2]['Low']       			# 昨日最低价
    yesterday_close = bars_arr[-2]['Close']   			# 昨日收盘价
    # 计算
    pivot = (yesterday_high+yesterday_close+yesterday_low) / 3 * 1 # 枢轴点
    r1 = 2 * pivot - yesterday_low 						# 阻力位1
    r2 = pivot + (yesterday_high - yesterday_low)		# 阻力位2
    r3 = yesterday_high + 2 * (pivot - yesterday_low)	# 阻力位3
    s1 = 2 * pivot - yesterday_high  					# 支撑位1
    s2 = pivot - (yesterday_high - yesterday_low)  		# 支撑位2
    s3 = yesterday_low - 2 * (yesterday_high - pivot)  	# 支撑位3
    today_high = bars_arr[-1]['High'] 					# 今日最高价
    today_low = bars_arr[-1]['Low'] 					# 今日最低价
    current_price = _C(exchange.GetTicker).Last 		#当前价格
    # 获取持仓
    position_arr = _C(exchange.GetPosition)  			# 获取持仓数组
    if len(position_arr) > 0:  							# 如果持仓数组大于0
        for i in position_arr:
            if i['ContractType'][:2] == 'rb':  			# 如果持仓品种等于rb
                if i['Type'] % 2 == 0:  					# 如果是多单
                    position = i['Amount']  				# 赋值持仓数量为正数
                else:
                    position = -i['Amount']  				# 赋值持仓数量为负数
                profit = i['Profit']  					# 获取持仓盈亏
    else:
        position = 0  									# 赋值持仓数量为0
        profit = 0  										# 赋值持仓盈亏为0
    if position == 0:  									# 如果无持仓
        if current_price > r3:  							# 如果价格大于阻力位3
            exchange.SetDirection("buy")  				# 设置交易方向和类型
            exchange.Buy(current_price + 1, 1)  			# 开多单
        if current_price < s3:  							# 如果价格小于支撑位3
            exchange.SetDirection("sell")  				# 设置交易方向和类型
            exchange.Sell(current_price - 1, 1)  		# 开空单
    if position > 0:  									# 如果持有多单
    # 如果今日最高价大于阻力位2，并且当前价格小于阻力位1
        if today_high > r2 and current_price < r1 or current_price < s3:  
            exchange.SetDirection("closebuy")  			# 设置交易方向和类型
            exchange.Sell(current_price - 1, 1)  		# 平多单
            exchange.SetDirection("sell")  				# 设置交易方向和类型
            exchange.Sell(current_price - 1, 1)  		# 反手开空单
    if position < 0:  # 如果持有空单
        # 如果今日最低价小于支撑位2，并且当前价格大于支撑位1
        if today_low < s2 and current_price > s1 or current_price > r3:  
            exchange.SetDirection("closesell")  			# 设置交易方向和类型
            exchange.Buy(current_price + 1, 1)  			# 平空单
            exchange.SetDirection("buy")  				# 设置交易方向和类型
            exchange.Buy(current_price + 1, 1)  			# 反手开多单
            
# 程序主函数
def main():
    while True:     										# 循环
        onTick()    										# 执行策略主函数
        Sleep(1000) 										# 休眠1秒

# 回测结果 
task = VCtx(__doc__)                        		# 调用VCtx()函数
try:
    main()                                  		# 调用策略入口函数
except:
    task.Show()                      	        	# 回测结束输出图表