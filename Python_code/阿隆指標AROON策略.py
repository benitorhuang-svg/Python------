# 回测配置 
'''backtest
start: 2019-01-01 00:00:00
end: 2021-01-01 00:00:00
period: 1d
basePeriod: 1d
slipPoint: 2
exchanges: [{"eid":"Futures_CTP","currency":"FUTURES","balance":100000}]
'''

# 导入模块 
from fmz import *
import talib
import numpy as np

# 外部参数
cycle_length = 100

# 定义全局变量
mp = 0	# 用于控制虚拟持仓

# 把K线列表转换成最高价和最低价列表，用于转换为numpy.array类型数据
def get_data(bars):
    arr = [[], []]
    for i in bars:
        arr[0].append(i['High'])
        arr[1].append(i['Low'])
    return arr


# 策略主函数
def onTick():
    exchange.SetContractType("ni000")  	            # 订阅期货品种
    bars = exchange.GetRecords()  		            # 获取K线列表
    if len(bars) < cycle_length + 1:  	            # 如果K线列表的长度太小，所以直接返回
        return
    np_arr = np.array(get_data(bars))	            # 把列表转换为numpy.array类型数据
    aroon = talib.AROON(np_arr[0], np_arr[1], 20)	# 计算阿隆指标
    aroon_up = aroon[1][len(aroon[1]) - 2]  		# 阿隆上线倒数第2根数据
    aroon_down = aroon[0][len(aroon[0]) - 2]  		# 阿隆下线倒数第2根数据
    close0 = bars[len(bars) - 1].Close  			# 获取当根K线收盘价
    global mp  										# 全局变量，虚拟仓位
# 如果当前空仓，并且阿隆上线大于下线，并且阿隆上线大于50
    if mp == 0 and  aroon_up > aroon_down and aroon_up > 50:
        exchange.SetDirection("buy")  				# 设置交易方向和类型
        exchange.Buy(close0, 1)  					# 开多单
        mp = 1  									# 设置虚拟持仓的值为有多单
    # 如果当前空仓，并且阿隆下线大于上线，并且阿隆下线小于50
    if mp == 0 and aroon_down > aroon_up and aroon_down > 50:  
        exchange.SetDirection("sell")  				# 设置交易方向和类型
        exchange.Sell(close0 - 1, 1)  				# 开空单
        mp = -1  									# 设置虚拟持仓的值为有空单
    # 如果当前持有多单，并且阿隆上线小于下线或者阿隆上线小于50
    if mp > 0 and  (aroon_up < aroon_down or aroon_up < 50):  
        exchange.SetDirection("closebuy")  			# 设置交易方向和类型
        exchange.Sell(close0 - 1, 1)  				# 平多单
        mp = 0  									# 设置虚拟持仓的值，即空仓
    # 如果当前持有空单，并且阿隆下线小于上线或者阿隆下线小于50
    if mp < 0 and (aroon_down < aroon_up or aroon_down < 50):  
        exchange.SetDirection("closesell")  		# 设置交易方向和类型
        exchange.Buy(close0, 1)  					# 平空单
        mp = 0  									# 设置虚拟持仓的值，即空仓
    
# 程序入口
def main():
    while True:  									# 进入无限循环模式
        onTick()  									# 执行策略主函数
        Sleep(1000)  								# 休眠1秒

# 回测结果 
task = VCtx(__doc__)                        		# 调用VCtx()函数
try:
    main()                                  		# 调用策略入口函数
except:
    task.Show()                      	        	# 回测结束输出图表