import random

chart = {
    "title": {
        "text": '资金曲线'
    },
    "rangeSelector": {
        "buttons": [{
            "type": 'all',
            "text": 'All'
        }],
        "selected": 0,
        "inputEnabled": false
    },
    "yAxis": {
        "title": {
            "text": '资金曲线'
        },
        "opposite": false,
    },
    "series": [{
        "name": "10%头寸",
        "id": "",
        "data": []
    }, {
        "name": "25%头寸",
        "id": "",
        "data": []
    }, {
        "name": "50%头寸",
        "id": "",
        "data": []
    }]
};											# 图表配置变量

def main():
    now = 0 									# 模拟投注次数
    ObjChart = Chart(chart); 				# 绘图对象
    ObjChart.reset(); 						# 在启动前，先清空绘图对象
    funds1 = 100 							# 初始资金
    funds2 = 100 							# 初始资金
    funds3 = 100 							# 初始资金
    while True:
        betRatio1 = funds1 * 0.10 			# 以10%的比例投注
        betRatio2 = funds2 * 0.25 			# 以25%的比例投注
        betRatio3 = funds3 * 0.50 			# 以50%的比例投注
        if random.random() > 0.5: 			# 胜率为50%
            funds1 = funds1 + betRatio1 * 2 	# 赔率为2
            funds2 = funds2 + betRatio2 * 2 	# 赔率为2
            funds3 = funds3 + betRatio3 * 2 	# 赔率为2
        else:
            funds1 = funds1 - betRatio1 * 1 	# 赔率为2
            funds2 = funds2 - betRatio2 * 1 	# 赔率为2
            funds3 = funds3 - betRatio3 * 1	# 赔率为2
        ObjChart.add(0, [now, funds1]) 		# 添加绘图数据
        ObjChart.add(1, [now, funds2]) 		# 添加绘图数据
        ObjChart.add(2, [now, funds3]) 		# 添加绘图数据
        ObjChart.update(chart) 				# 绘图
        now = now + 1 						# 投注次数
        if now > 1000:
            return 							# 模拟投注1000次
