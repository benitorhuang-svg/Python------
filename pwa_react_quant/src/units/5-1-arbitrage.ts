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
    <p><strong>跨期套利 / 統計套利 (Pairs Trading / Arbitrage)</strong> 是機構與避險基金最喜歡的「低風險量化模型」。它的核心在於找出兩個極度相關的資產（例如台指期 6月合約與 7月合約，或是可口可樂與百事可樂的股票）。</p>
    
    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 220" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="20%" y1="0" x2="20%" y2="100%" />
          <line x1="40%" y1="0" x2="40%" y2="100%" />
          <line x1="60%" y1="0" x2="60%" y2="100%" />
          <line x1="80%" y1="0" x2="80%" y2="100%" />
        </g>
        
        <!-- Background standard deviation channel -->
        <rect x="0" y="70" width="450" height="80" fill="rgba(148, 163, 184, 0.1)" />
        
        <!-- Spread Trajectory -->
        <path d="M 0 110 Q 30 150 60 110 T 120 40 T 180 110 T 240 180 T 300 110 T 360 80 T 450 110" fill="none" stroke="#f59e0b" stroke-width="2.5" />
        
        <!-- Mean Line -->
        <line x1="0" y1="110" x2="450" y2="110" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4" />
        <text x="440" y="105" fill="#94a3b8" font-size="10" text-anchor="end">歷史平均價差 (0 軸或均線)</text>

        <!-- Upper Band (Overvalued) -->
        <line x1="0" y1="70" x2="450" y2="70" stroke="#ef4444" stroke-width="1.5" />
        <text x="440" y="65" fill="#ef4444" font-size="10" text-anchor="end">高估線 (+2個標準差)</text>
        
        <circle cx="120" cy="40" r="5" fill="#ef4444" />
        <text x="120" y="30" fill="#ef4444" font-size="10" font-weight="bold" text-anchor="middle">價差過大！(放空A, 買進B)</text>
        <path d="M 120 40 L 120 110" fill="none" stroke="#ef4444" stroke-width="1" stroke-dasharray="2,2" />

        <!-- Lower Band (Undervalued) -->
        <line x1="0" y1="150" x2="450" y2="150" stroke="#22c55e" stroke-width="1.5" />
        <text x="440" y="165" fill="#22c55e" font-size="10" text-anchor="end">低估線 (-2個標準差)</text>
        
        <circle cx="240" cy="180" r="5" fill="#22c55e" />
        <text x="240" y="200" fill="#22c55e" font-size="10" font-weight="bold" text-anchor="middle">價差過小！(買進A, 放空B)</text>
        <path d="M 240 180 L 240 110" fill="none" stroke="#22c55e" stroke-width="1" stroke-dasharray="2,2" />

        <!-- Return to Mean Signal -->
        <circle cx="150" cy="110" r="6" fill="#facc15" stroke="#0f172a" stroke-width="2" />
        <text x="150" y="130" fill="#facc15" font-size="10" font-weight="bold" text-anchor="middle">均值回歸 (雙腿平倉獲利)</text>
        
        <circle cx="270" cy="110" r="6" fill="#facc15" stroke="#0f172a" stroke-width="2" />
        <text x="270" y="95" fill="#facc15" font-size="10" font-weight="bold" text-anchor="middle">均值回歸 (雙腿平倉獲利)</text>
      </svg>
    </div>

    <h3>對沖的物理學：橡皮筋原理</h3>
    <p>我們不去預測大盤明天是漲還是跌（因為沒人能穩定預測），我們只計算兩者的<strong>「差價 (Spread)」</strong>：Spread = 合約A價格 - 合約B價格。</p>
    <ul>
      <li><strong>同類資產的物理牽引：</strong> 因為它們代表的是同一類東西，所以這兩者的差價就像被一條橡皮筋綁住。大部分時間價差都在合理的區間波動。</li>
      <li><strong>進場點 (橡皮筋被拉到極限)：</strong> 當某天主力突然炒作合約A，導致 A 狂漲而 B 沒跟上，價差被拉得異常巨大。此時我們「放空被高估的合約A」，同時「買進被低估的合約B」。</li>
      <li><strong>出場點 (橡皮筋彈回)：</strong> 幾天後市場恢復冷靜，過大的價差收斂回均值。我們把兩邊的部位同時平倉。不管這幾天大盤是暴漲還是暴跌，我們賺的純粹是「價差回歸」的利潤。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 市場中立風險 (Market Neutral)：</strong><br>
      因為你同時擁有一張多單和一張空單，兩者的盈虧會互相抵銷。你免疫了股災或崩盤的系統性 Beta 風險，這就是真正的「避險套利 (Hedging Arbitrage)」。
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

# ═══ 策略參數 ═══
STD_MULTIPLIER = 1.5

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
    
    # 買進價差 (當價差低於 均值-N個標准差)
    if engine.position == 0:
        if current_spread < (mean_spread - STD_MULTIPLIER * std_spread):
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

    params: [
        { id: 'STD_MULTIPLIER', label: '標準差倍數', min: 1.0, max: 3.0, step: 0.1, default: 1.5, format: v => `${v} 倍` }
    ],

    exercises: [
        '目前的邏輯是價差低於 1.5 倍標準差買入。如果標準差倍數調高（例如 2.5），訊號會變得更準確還是更稀少？',
        '思考：為什麼套利需要兩個「高度相關」的資產？如果兩者相關性斷裂（如 A 退市或 B 出事），會發生什麼？'
    ],

    prevUnit: { id: '4-1', title: '經典恆溫器策略' },
    nextUnit: { id: '5-2', title: '乖離率 BIAS' }
};
