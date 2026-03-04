import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitFiali: UnitDef = {
    title: '菲阿里四價策略',
    module: '模組三 · 突破策略',
    difficulty: '進階',
    description: '由日本傳奇操盤手菲阿里提出的突破策略，使用昨日的收盤、最高、最低以及今日開盤這四個關鍵價格來建立防線。',
    needsData: true,

    theory: `
    <p><strong>菲阿里四價 (Filari Four Prices)</strong> 是一個非常經典的支撐壓力突破策略。作者菲阿里曾在多次期貨比賽中奪冠。</p>
    
    <p>它捕捉的關鍵指標有：</p>
    <ul>
      <li><strong>昨天最高價 (Yesterday High)</strong>：多頭最後的目標。</li>
      <li><strong>昨天最低價 (Yesterday Low)</strong>：空頭最後的防守。</li>
      <li><strong>昨天收盤價 (Yesterday Close)</strong>：昨日情緒的總結。</li>
      <li><strong>今天開盤價 (Today Open)</strong>：今日市場共識的起點。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 核心策略邏輯：</strong><br>
      我們主要追蹤<strong>高低點的突破</strong>。若今天收盤上穿昨日最高價，代表多方力道延續，趨勢極其強烈。
    </div>
  `,

    defaultCode: `import json
import numpy as np
from backtest_engine import BacktestEngine

# 準備數據
data = stock_data
closes = [d['Close'] for d in data]

# 儲存昨日的高低點路徑 (用來畫圖)
up_line = [None] * len(data)
down_line = [None] * len(data)

def strategy(engine, data, i):
    if i < 1: return
    
    # 昨日四價中的核心二價
    prev_high = data[i-1]['High']
    prev_low = data[i-1]['Low']
    
    # 紀錄軌道以供畫圖顯示
    up_line[i] = prev_high
    down_line[i] = prev_low
    
    current_close = data[i]['Close']
    
    # 交易邏輯：今天收盤價上穿昨天最高價 => 買入；今天收盤價下穿昨天最低價 => 賣出
    if engine.position == 0:
        if current_close > prev_high:
            engine.buy(current_close, i, "高價突破 buy")
            
    elif engine.position > 0:
        if current_close < prev_low:
            engine.sell(current_close, i, "低價跌破 sell")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"═══ 菲阿里四價策略 ═══")
print(f"總報酬率: {report['total_return']:+.2f}%")
print(f"最大回撤: {report['max_drawdown']:.2f}%")

chart_data = {
    **report,
    "upper": up_line,
    "lower": down_line
}
`,

    resultVar: 'chart_data',

    renderChart: (canvasId, data) => {
        const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
        if (!parent) return;

        const priceId = canvasId + '-price';
        const equityId = canvasId + '-equity';
        parent.innerHTML = `
      <div class="chart-wrapper" style="height:350px; margin-bottom:12px;"><canvas id="${priceId}"></canvas></div>
      <div class="chart-wrapper" style="height:250px;"><canvas id="${equityId}"></canvas></div>
    `;

        renderEquityCurve(equityId, data);
        const labels = data.dates.map((d: string, i: number) => i % Math.ceil(data.dates.length / 30) === 0 ? d : '');

        new Chart(document.getElementById(priceId) as HTMLCanvasElement, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: '收盤價', data: data.closes, borderColor: '#e2e8f0', borderWidth: 1, pointRadius: 0 },
                    { label: '昨日最高價', data: data.upper, borderColor: '#06b6d4', borderWidth: 1, borderDash: [2, 2], pointRadius: 0 },
                    { label: '昨日最低價', data: data.lower, borderColor: '#ef4444', borderWidth: 1, borderDash: [2, 2], pointRadius: 0 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: '菲阿里四價突破軌道', color: '#fff' } }
            }
        });
    },

    params: [], // 菲阿里四價固定使用昨日數據，無需參數調優，這也是作者的精神

    exercises: [
        '目前的邏輯是簡單的「突破買入，跌破賣出」，試著思考：如果在突破時增加成交量的過濾條件，會不會更有效？',
        '嘗試思考：為什麼收盤價突破昨日最高價，會被認為是強烈的買入訊號？'
    ],

    prevUnit: { id: '3-4', title: 'Hans123 突破' },
    nextUnit: { id: '3-6', title: '動態波幅突破' }
};
