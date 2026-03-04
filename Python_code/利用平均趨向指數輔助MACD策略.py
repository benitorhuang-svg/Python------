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
import talib                                # talib库需要手动安装
import numpy as np

mp = 0                                      # 定义一个全局变量，用于控制虚拟持仓

# 把K线列表转换成最高价、最低价、收盘价列表
# 用于转换为numpy.array类型数据
def get_data(bars):
    arr = [[], [], []]
    for i in bars:
        arr[0].append(i['High'])
        arr[1].append(i['Low'])
        arr[2].append(i['Close'])
    return arr

# 程序主函数
def onTick():
    _C(exchange.SetContractType, "FG000")	# 订阅期货品种
    bar = _C(exchange.GetRecords)  			# 获取K线列表
    if len(bar) < 100:						# 如果K线列表长度太小就返回
        return
    macd = TA.MACD(bar, 5, 50, 15)  		# 计算MACD值
    dif = macd[0][-2]  						# 获取DIF的值，返回一个列表
    dea = macd[1][-2]  						# 获取DEA的值，返回一个列表
    np_arr = np.array(get_data(bar)) 		# 把列表转换为numpy.array类型数据
    adx_arr = talib.ADX(np_arr[0], np_arr[1], np_arr[2], 14)  # 计算ADX的值
    adx1 = adx_arr[-2]  					# 倒数第二根K线的ADX值
    adx2 = adx_arr[-3]  					# 倒数第三根K线的ADX值
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
    if mp == 0 and dif > dea and adx1 > adx2:
        exchange.SetDirection("buy")  		# 设置交易方向和类型
        exchange.Buy(last_close, 1)  		# 开多单
        mp = 1  							# 设置虚拟持仓的值，即有多单
    if mp == 0 and dif < dea and adx1 > adx2:
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