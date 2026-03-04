import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitArbitrage: UnitDef = {
    title: '期貨跨期套利實戰',
    module: '模組五 · 高級交易與套利',
    difficulty: '進階',
    description: '套利不關注單邊漲跌，而是關注兩份合約之間的「價差 (Spread)」。當價差偏離正常範圍時，買入低估項、賣出高估項。',
    needsData: true,

    theory: `
    <p><strong>跨期套利 (Inter-period Arbitrage)</strong> 是量化交易中風險極低的一種方式。它的核心在於找出兩個極度相關的資產（例如同一產品的不同月分期貨）。</p>
    
    <p>操作原理：</p>
    <ul>
      <li><strong>計算價差</strong>：Spread = 合約 A - 合約 B。</li>
      <li><strong>價差回歸</strong>：合約 A 與 B 的價格雖然會波動，但由於是同一資產，它們的「價差」通常會在一個穩定區間內波動。</li>
      <li><strong>進場規則</strong>：當價差過大（上穿區間），賣出 A 買入 B。當價差過小，買入 A 賣出 B。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 為什麼叫套利？</strong><br>
      因為我們對沖了市場大盤的漲跌風險（Beta）。只要兩者的相關性不消失，且價差會回歸，我們就能獲取穩定的利潤。
    </div>
  `,

    defaultCode: `import json
import numpy as np
from backtest_engine import BacktestEngine

# ═══ 模擬兩個相關合約 ═══
# 在實際中這會是從不同的 exchange.GetRecords 取得
def get_mock_spread(i, price):
    # 模擬另一份合約，帶有一點波動與回歸特性
    return 100 + 50 * np.sin(i / 5)

# 準備數據
data = stock_data
prices = [d['Close'] for d in data]

# 計算價差與區間
spreads = [get_mock_spread(i, p) for i, p in enumerate(prices)]
mean_spread = np.mean(spreads[:50])
std_spread = np.std(spreads[:50])

def strategy(engine, data, i):
    # 這是一個簡化的價差套利模擬：
    # 當 Spread 離均值太遠時，我們假設它會回歸
    current_spread = spreads[i]
    
    # 買進價差 (當價差低於 均值-2個標准差)
    if engine.position == 0:
        if current_spread < (mean_spread - 1.5 * std_spread):
            engine.buy(data[i]['Close'], i, None, "價差極低 - 買入套利")
            
    elif engine.position > 0:
        # 回歸到均值附近就平倉
        if current_spread > mean_spread:
            engine.sell(data[i]['Close'], i, None, "價差回歸 - 止盈平倉")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"═══ 價差套利策略回測 ═══")
print(f"總報酬率: {report['total_return']:+.2f}%")

chart_data = {
    **report,
    "spread": spreads,
    "mean": mean_spread
}
`,

    resultVar: 'chart_data',

    renderChart: (canvasId, data) => {
        const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
        if (!parent) return;

        const spreadId = canvasId + '-spread';
        const equityId = canvasId + '-equity';
        parent.innerHTML = `
      <div class="chart-wrapper" style="height:250px; margin-bottom:12px;"><canvas id="${spreadId}"></canvas></div>
      <div class="chart-wrapper" style="height:250px;"><canvas id="${equityId}"></canvas></div>
    `;

        renderEquityCurve(equityId, data);
        const labels = data.dates.map((d: string, i: number) => i % Math.ceil(data.dates.length / 30) === 0 ? d : '');

        // Spread Chart
        new Chart(document.getElementById(spreadId) as HTMLCanvasElement, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: '合約價差 (Spread)', data: data.spread, borderColor: '#a855f7', borderWidth: 2, pointRadius: 0 },
                    { label: '均值線', data: new Array(data.spread.length).fill(data.mean), borderColor: '#ffffff44', borderDash: [2, 2], pointRadius: 0 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: '套利價差走勢 (模擬)', color: '#fff' } }
            }
        });
    },

    params: [],

    exercises: [
        '目前的邏輯是價差低於 1.5 倍標準差買入。如果標準差倍數調高（例如 2.5），訊號會變得更準確還是更稀少？',
        '思考：為什麼套利需要兩個「高度相關」的資產？如果兩者相關性斷裂（如 A 退市或 B 出事），會發生什麼？'
    ],

    prevUnit: { id: '4-1', title: '經典恆溫器策略' },
    nextUnit: { id: '5-2', title: '乖離率 BIAS' }
};
