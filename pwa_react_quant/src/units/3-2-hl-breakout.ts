import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitHlBreakout: UnitDef = {
    title: '日內高低點突破策略',
    module: '模組三 · 突破策略',
    difficulty: '基礎',
    description: '基於前幾個交易時段的最高點與最低點建立區間。一旦本日價格突破該區間，便認為是強趨勢的開始。',
    needsData: true,

    theory: `
    <p><strong>高低點突破 (HL Breakout)</strong> 是一種非常直觀的突破交易法。它的假設非常簡單：如果價格能突破過去一段時間的「阻力」或「支撐」，那麼後續將會有一波強大的動能。</p>
    
    <p>常見的參數設定是看過去 20 日（一個月）的極端價格：</p>
    <ul>
      <li><strong>看漲突破</strong>：價格 > 過去 N 日內的最高價 => 買入。</li>
      <li><strong>看跌突破</strong>：價格 < 過去 N 日內的最低價 => 賣出或平倉。</li>
    </ul>

    <div class="warning-callout">
      <strong>⚠️ 缺點：</strong><br>
      在高波動且橫盤的市場中，價格可能會頻繁「假突破」邊界後隨即回落，造成頻繁停損。
    </div>
  `,

    defaultCode: `import json
import numpy as np
from indicators import Highest, Lowest
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
LOOKBACK = 20      # 回看 N 天的高低點

# 準備數據
data = stock_data
closes = [d['Close'] for d in data]
highs = [d['High'] for d in data]
lows = [d['Low'] for d in data]

# 計算前 N 天的最高/最低 (不包含今天)
# 我們需要手動處理一下，因為 indicators.Highest 是包含當前的
# 這裡我們用一個平移處理來避開未來函數
hist_high = [np.nan] * len(data)
hist_low = [np.nan] * len(data)

# 計算軌道
full_highest = Highest(highs, LOOKBACK)
full_lowest = Lowest(lows, LOOKBACK)

for i in range(1, len(data)):
    hist_high[i] = full_highest[i-1]
    hist_low[i] = full_lowest[i-1]

def strategy(engine, data, i):
    if i < LOOKBACK: return
    if np.isnan(hist_high[i]): return
    
    current_close = data[i]['Close']
    
    # 交易邏輯：收盤價突破前 N 日最高點買入，跌破前 N 日最低點賣出
    if engine.position == 0:
        if current_close > hist_high[i]:
            engine.buy(current_close, i, f"突破{LOOKBACK}日新高")
            
    elif engine.position > 0:
        if current_close < hist_low[i]:
            engine.sell(current_close, i, f"跌破{LOOKBACK}日新低")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"═══ 高低點突破策略 ═══")
print(f"回看週期: {LOOKBACK}")
print(f"總報酬率: {report['total_return']:+.2f}%")

chart_data = {
    **report,
    "upper": hist_high,
    "lower": hist_low
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
                    { label: 'N日高點', data: data.upper, borderColor: '#06b6d4', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, tension: 0.1 },
                    { label: 'N日低點', data: data.lower, borderColor: '#ef4444', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, tension: 0.1 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: '價格與突破軌道', color: '#fff' } }
            }
        });
    },

    params: [
        { id: 'LOOKBACK', label: '回看週期', min: 5, max: 60, step: 5, default: 20, format: v => `${v} 日` }
    ],

    exercises: [
        '當 LOOKBACK 調得非常短（例如 5）時，會發生什麼事？交易次數會變多還是變少？',
        '思考：為什麼我們在計算最高點時，要用 i-1 天以前的數據，而不是包含當天價格？'
    ],

    prevUnit: { id: '3-1', title: 'Dual Thrust 突破' },
    nextUnit: { id: '3-3', title: '增強版唐奇安通道' }
};
