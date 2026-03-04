'''backtest
start: 2020-01-01 00:00:00
end: 2020-01-02 00:00:00
period: 1d
basePeriod: 1d
exchanges: [{"eid":"Futures_CTP","currency":"FUTURES"}]
'''

import random

chart = {
    "__isStock": True,
    "tooltip": {
        "xDateFormat": "%Y-%m-%d %H:%M:%S, %A"
    },
    "title": {
        "text": "资金曲线"
    },
    "rangeSelector": {
        "buttons": [{
            "type": "hour",
            "count": 1,
            "text": "1h"
        }, {
            "type": "hour",
            "count": 2,
            "text": "3h"
        }, {
            "type": "hour",
            "count": 8,
            "text": "8h"
        }, {
            "type": "all",
            "text": "All"
        }],
        "selected": 0,
        "inputEnabled": False
    },
    "xAxis": {
        "type": ""
    },
    "yAxis": {
        "title": {
            "text": ""
        },
        "opposite": False,
    },
    "series": [{
        "name": "",
        "id": "",
        "data": []
    }]
}

# 策略入口函数
def main():
    global chart
    ObjChart = Chart(chart)         # 绘图对象
    ObjChart.reset()                # 在启动前，先清空绘图对象
    now = 0                         # 随机次数
    bet = 1
    maxBet = 0                      # 最大投入资金
    lost = 0
    maxLost = 0                     # 最大连续亏损次数
    initialFunds = 10000            # 初始资金
    funds = initialFunds            # 实时资金
    while True:
        if random.random() > 0.5:   # 胜率为50%
            funds = funds + bet     # 盈利
            bet = 1                 # 在每次盈利后，将投入资金重置为1元
            lost = 0
        else:
            funds = funds - bet     # 亏损
            bet = bet * 2           # 在每次亏损后，将投入资金翻倍
            lost += 1

        if bet > maxBet:
            maxBet = bet            # 计算最大投入资金

        if lost > maxLost:
            maxLost = lost          # 计算连续亏损次数

        ObjChart.add(0, [now, funds]) # 添加画图数据
        ObjChart.update(chart)          # 画图
        now += 1                        # 随机次数加1
        if funds < 0:                   # 如果破产，则结束程序
            Log("初始资金：" + str(initialFunds))
            Log("随机次数：" + str(now))
            Log("最大连续亏损次数：" + str(maxLost))
            Log("最大投入资金：" + str(maxBet))
            Log("最终资金：" + str(funds))
            return
