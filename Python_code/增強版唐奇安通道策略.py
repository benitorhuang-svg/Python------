# 回测配置 
'''backtest
start: 2019-01-01 00:00:00
end: 2021-01-01 00:00:00
period: 1d
basePeriod: 1d
balance: 10000
slipPoint: 1
exchanges: [{"eid":"Futures_CTP","currency":"FUTURES"}]
'''

# 导入模块 
from fmz import *

mp = 0  											    # 定义全局变量，用于控制虚拟持仓

def onTick():
    _C(exchange.SetContractType, "c000")  		        # 订阅期货品种
    bar_arr = _C(exchange.GetRecords)  			        # 获取K线列表
    if len(bar_arr) < 60:
        return
    close_new = bar_arr[-1]['Close']			        # 获取最新价格（卖价）
    close_last = bar_arr[-2]['Close']			        # 上根K线收盘价
    bar_arr.pop()								        # 删除列表最后一个数据
    on_line = TA.Highest(bar_arr, 55, 'High') * 0.999 	# 计算唐奇安上轨
    under_line = TA.Lowest(bar_arr, 55, 'Low') * 1.001 	# 计算唐奇安下轨
    middle_line = (on_line + under_line) / 2	        # 计算唐奇安中轨
    global mp 									        # 引入全局变量
    if mp > 0 and close_last < middle_line: 	        # 如果持多单，并且价格小于下轨
        exchange.SetDirection("closebuy")  		        # 设置交易方向和类型
        exchange.Sell(close_new - 1, 1)  		        # 平多单
        mp = 0  									    # 设置虚拟持仓的值，即空仓
    if mp < 0 and close_last > middle_line: 	        # 如果持空单，并且价格大于上轨
        exchange.SetDirection("closesell")		        # 设置交易方向和类型
        exchange.Buy(close_new, 1)  				    # 平空单
        mp = 0  									    # 设置虚拟持仓的值，即空仓
    if mp == 0:  								        # 如果当前无持仓
        if close_last > on_line:  				        # 如果价格大于上轨
            exchange.SetDirection("buy")  		        # 设置交易方向和类型
            exchange.Buy(close_new, 1)  			    # 开多单
            mp = 1  								    # 设置虚拟持仓的值，即有多单
        elif close_last < under_line:  			        # 如果价格小于下轨
            exchange.SetDirection("sell")  		        # 设置交易方向和类型
            exchange.Sell(close_new - 1, 1) 		    # 开空单
            mp = -1  								    # 设置虚拟持仓的值，即有空单
        
# 程序入口      
def main():
    while True:									        # 进入无线循环模式
        onTick()									    # 执行策略主函数
        Sleep(1000)  								    # 休眠1秒

# 回测结果 
task = VCtx(__doc__)                        		    # 调用VCtx()函数
try:
    main()                                  			# 调用策略入口函数
except:
    task.Show()                      	        		# 回测结束输出图表