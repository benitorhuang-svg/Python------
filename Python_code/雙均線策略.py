# !/usr/local/bin/python
# -*- coding: UTF-8 -*-

# 回测配置 
'''backtest
start: 2019-01-01 00:00:00
end: 2020-12-31 00:00:00
period: 1d
basePeriod: 1d
exchanges: [{"eid":"Futures_CTP","currency":"FUTURES"}]
'''

# 导入模块 
from fmz import *
import numpy as np

task = VCtx(__doc__)                        	# 调用VCtx()函数初始化
# 策略开始 
mp = 0                                      	# 定义一个全局变量，用于控制虚拟持仓
futures_code = 'AP000'                      	# 设置期货合约代码

def get_close(r):                           	# 把K线数组转换成收盘价数组
    arr = []
    for i in r:
        arr.append(i['Close'])
    return arr

def onTick():
    # 获取数据
    exchange.SetContractType(futures_code) 	    # 订阅期货品种
    bar_arr = exchange.GetRecords()         	# 获取K线数组
    if len(bar_arr) < 50:                   	# 如果K线数量过小
        return
    
    # 计算均线
    close_arr = get_close(bar_arr)  		    # 把K线数组转换成收盘价数组
    np_close_arr = np.array(close_arr) 		    # 把列表转换为numpy.array
    ma1 = TA.MA(np_close_arr, 5)         		# 短期均线
    ma2 = TA.MA(np_close_arr, 10)        	    # 长期均线

    # 策略逻辑
    global mp                               	# 导入全局变量
    last_close = close_arr[-1]  				# 获取最新价格
    if mp == 1 and _Cross(ma1, ma2) < 0:        # 如果有多单并且死叉
        exchange.SetDirection("closebuy")  	    # 设置交易方向和类型
        exchange.Sell(last_close - 1, 1)  	    # 平多单
        mp = 0  								# 设置虚拟持仓的值，即空仓
    if mp == -1 and _Cross(ma1, ma2) > 0:       # 如果有空单并且金叉
        exchange.SetDirection("closesell")	    # 设置交易方向和类型
        exchange.Buy(last_close, 1)  		    # 平空单
        mp = 0  								# 设置虚拟持仓的值，即空仓
    if mp == 0 and _Cross(ma1, ma2) > 0:        # 如果无持仓并且金叉
        exchange.SetDirection("buy")  		    # 设置交易方向和类型
        exchange.Buy(last_close, 1)  		    # 开多单
        mp = 1  								# 设置虚拟持仓的值，即有多单
    if mp == 0 and _Cross(ma1, ma2) < 0:        # 如果无持仓并且死叉
        exchange.SetDirection("sell")  		    # 设置交易方向和类型
        exchange.Sell(last_close - 1, 1)  	    # 开空单
        mp = -1 

def main():                                 	# 策略入口函数
    while True:                             	# 无限循环模式
        onTick()                            	# 执行策略主函数

# 回测结果 
try:
    main()                                  	# 调用策略入口函数
except:
    task.Show()                      	 		# 回测结束输出图表