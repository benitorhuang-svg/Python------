# 导入第三方库
import requests
from bs4 import BeautifulSoup
import time
import datetime
import json

# 创建全局变量
diff_data = reserve_data = receipt_data = 0

# 时间戳转换函数
def to_timestamp(date_str):
    time_array = time.strptime(date_str + " 00:00:00", "%Y-%m-%d %H:%M:%S")
    return int(round(time.mktime(time_array) * 1000))

# 时间序列转换函数
def date_arr(year, month, day):
    begin, end = datetime.date(year, month, day), datetime.date.today()
    arr = []
    for i in range((end - begin).days + 1):
        day = begin + datetime.timedelta(days=i)
        arr.append([str(day).replace('-', ''), str(day),
                    day.weekday() + 1, to_timestamp(str(day))])
    return arr

# 获取基差数据
def spot_futures_diff_data(date, futures_name):
    global diff_data
    url = f"http://www.100ppi.com/sf2/day-{date}.html"
    try:
        url_text = requests.get(url).text
    except BaseException:
        return int(diff_data)
    soup = BeautifulSoup(url_text, "html5lib")
    if len(soup.select("#fdata")) > 0:
        results = soup.select("#fdata")[0]
        for i in results.find_all('tr'):
            if len(i.find_all('td', text=futures_name)) > 0:
                data = i.find_all('font')[0].text
                if data is not None:
                    diff_data = data
    return int(diff_data)

# 获取现货价格
def spot_data(date, futures_name, url_type, types):
    global reserve_data, receipt_data
    data_type = reserve_data if types == 'WHSTOCKS' else receipt_data
    url = f'http://www.shfe.com.cn/data/dailydata/{date}{url_type}.dat'
    try:
        url_text = requests.get(url).text
    except BaseException:
        return data_type
    total = count = 0
    if url_text[0] == '{':
        for i in json.loads(url_text)['o_cursor']:
            if futures_name in i['VARNAME']:
                if '合计' not in i['WHABBRNAME']:
                    if '总计' not in i['WHABBRNAME']:
                        try:
                            inventory = int(i[types])
                        except BaseException:
                            return data_type
                        if inventory > 0:
                            total, count = total + inventory, count + 1
        if count > 0:
            data_type = int(total / count)
    return data_type

# 策略入口函数
def main():
    # 创建基差图表配置变量
    cfgA = {
        "extension": {"layout": 'single', "col": 4, "height": "500px"},
        "title": {"text": "基差图表"},
        "series": [{"name": "基差", "data": []}]
}
    # 创建库存图表配置变量
    cfgB = {
        "extension": {"layout": 'single', "col": 4, "height": "500px"},
        "title": {"text": "库存图表"},
        "series": [{"name": "库存", "data": []}]
}
    # 创建仓单图表配置变量
    cfgC = {
        "extension": {"layout": 'single', "col": 4, "height": "500px"},
        "title": {"text": "仓单图表"},
        "series": [{"name": "仓单", "data": []}]
    }
    LogReset()                              # 清空Log日志信息
    chart = Chart([cfgA, cfgB, cfgC])       # 创建图表对象
    chart.reset()                           # 清空图表内容
    for i in date_arr(2021, 10, 1):         # 循环遍历时间序列
        # 分别获取基差、库存、仓单数据
        diff = spot_futures_diff_data(i[1], '天然橡胶')
        reserve = spot_data(i[0], '天然橡胶', 'weeklystock', 'WHSTOCKS')
        receipt = spot_data(i[0], '天然橡胶', 'dailystock', 'WRTWGHTS')
        if diff != 0 and reserve != 0 and receipt != 0:
            # 在基差、库存、仓单图表配置变量中加入数据
            chart.add(0, [i[3], diff])      # 在基差图表配置变量中加入数据
            chart.add(1, [i[3], reserve])   # 在库存图表配置变量中加入数据
            chart.add(2, [i[3], receipt])   # 在仓单图表配置变量中加入数据
            chart.update([cfgA, cfgB, cfgC])    # 更新图表对象
            time.sleep(1)                       # 休眠
            Log(f'基差：{diff} 库存：{reserve} 仓单：{receipt} 日期：{i[1]}')
