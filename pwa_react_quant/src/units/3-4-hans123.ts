import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitHans123: UnitDef = {
    title: 'Hans123 日內突破策略',
    module: '模組三 · 突破策略',
    difficulty: '進階',
    description: 'Hans123 被稱為歐洲最流行的日內交易系統，它透過判斷開盤第一段時間的高低點，來決定本日的交易方向。',
    needsData: true,

    theory: `
    <p><strong>Hans123 策略</strong> 是一個非常純粹的「突破跟隨」系統。它的設計理念是：開盤後的初期交易往往決定了當日的主要交易區間。</p>
    
    <p>策略步驟：</p>
    <ol>
      <li><strong>觀察開盤範圍</strong>：從開盤起計算 N 根 K 線（通常是前半小時）的最高價與最低價。</li>
      <li><strong>建立上下軌</strong>：開盤 N 根 K 線的最高點為上軌，最低點為下軌。</li>
      <li><strong>突破進場</strong>：
        <ul>
          <li>價格上穿上軌 => 做多。</li>
          <li>價格下穿下軌 => 做空。</li>
        </ul>
      </li>
    </ol>

    <div class="info-callout">
      <strong>📌 為什麼有效？</strong><br>
      Hans123 捕捉的是市場在開盤釋放能量後的方向選擇。它可以讓我們在趨勢剛形成時就進場。
    </div>
  `,

    defaultCode: `import json
import numpy as np
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
OPEN_BARS = 30      # 觀察開盤後前 N 根 K 線作為區間 (在日線模式下，我們用歷史循環的前段來模擬)

# 準備數據
data = stock_data
closes = [d['Close'] for d in data]
highs = [d['High'] for d in data]
lows = [d['Low'] for d in data]

# 計算開盤區間 (模擬)
# 這裡取數據的前 OPEN_BARS 個來當作本日的開盤觀察期 (假設數據為當日切片)
upper_limit = max(highs[:OPEN_BARS])
lower_limit = min(lows[:OPEN_BARS])

def strategy(engine, data, i):
    # 觀察期內不交易
    if i < OPEN_BARS: return
    
    current_close = data[i]['Close']
    
    # 交易邏輯：收盤價突破開盤期高點買入，跌破低點賣出
    if engine.position == 0:
        if current_close > upper_limit:
            engine.buy(current_close, i, "Hans123 突破上軌")
            
    elif engine.position > 0:
        if current_close < lower_limit:
            engine.sell(current_close, i, "Hans123 跌破下軌")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"═══ Hans123 策略回測 ═══")
print(f"開盤觀察數: {OPEN_BARS}")
print(f"總報酬率: {report['total_return']:+.2f}%")

chart_data = {
    **report,
    "upper": upper_limit,
    "lower": lower_limit
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
                    { label: ' Hans123 上軌', data: new Array(data.closes.length).fill(data.upper), borderColor: '#06b6d4', borderWidth: 1, borderDash: [5, 5], pointRadius: 0 },
                    { label: ' Hans123 下軌', data: new Array(data.closes.length).fill(data.lower), borderColor: '#ef4444', borderWidth: 1, borderDash: [5, 5], pointRadius: 0 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    },

    params: [
        { id: 'OPEN_BARS', label: '觀察根數 (N)', min: 10, max: 100, step: 5, default: 30, format: v => `${v} 根` }
    ],

    exercises: [
        '當 N 值取得愈大，這條突破線是變得更容易還是更難突破？對勝率有何影響？'
    ],

    prevUnit: { id: '3-3', title: '增強版唐奇安通道' },
    nextUnit: { id: '3-5', title: '菲阿里四價策略' }
};
