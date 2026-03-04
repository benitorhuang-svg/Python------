import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitAroon: UnitDef = {
  title: '阿隆指標 AROON 策略',
  module: '模組二 · 趨勢跟蹤',
  difficulty: '進階',
  description: 'Aroon 指標透過觀察最近一個價格高點與低點發生的時間，來判斷趨勢的起步。',
  needsData: true,

  theory: `
    <p><strong>阿隆指標 (Aroon Indicator)</strong> 是由 Tushar Chande 開發的。它的名字在梵文中代表「黎明的光芒」。</p>
    
    <p>它與一般的動能指標不同，它不看價格變動的幅度，而是看<strong>「時間」</strong>：</p>
    <ul>
      <li><strong>Aroon Up</strong>：衡量自週期內最高點以來的時間。</li>
      <li><strong>Aroon Down</strong>：衡量自週期內最低點以來的時間。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 核心訊號：</strong><br>
      1. 當 Aroon Up 在 100 附近時，代表趨勢剛創下近期新高。<br>
      2. 當 Up 穿過 Down 時（Aroon 交叉），通常預示著新趨勢的黎明。
    </div>
  `,

  defaultCode: `import json
import numpy as np
from indicators import AROON
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
AROON_PERIOD = 25

# 準備數據
data = stock_data
highs = [d['High'] for d in data]
lows = [d['Low'] for d in data]

# 計算 Aroon
up_line, down_line = AROON(highs, lows, AROON_PERIOD)

def strategy(engine, data, i):
    if i < AROON_PERIOD: return
    
    # 阿隆交叉策略：Up 上穿 Down => 買入；Down 上穿 Up => 賣出
    if engine.position == 0:
        if up_line[i] > down_line[i] and up_line[i-1] <= down_line[i-1]:
            engine.buy(data[i]['Close'], i, "阿隆金叉")
            
    elif engine.position > 0:
        if down_line[i] > up_line[i] and down_line[i-1] <= up_line[i-1]:
            engine.sell(data[i]['Close'], i, "阿隆死叉")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"═══ 阿隆策略回測 ═══")
print(f"週期: {AROON_PERIOD}")
print(f"總報酬率: {report['total_return']:+.2f}%")
print(f"最大回撤: {report['max_drawdown']:.2f}%")

chart_data = {
    **report,
    "up": up_line,
    "down": down_line
}
`,

  resultVar: 'chart_data',

  renderChart: (canvasId, data) => {
    const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
    if (!parent) return;

    const priceId = canvasId + '-price';
    const indicatorId = canvasId + '-aroon';
    const equityId = canvasId + '-equity';
    parent.innerHTML = `
      <div class="chart-wrapper" style="height:250px; margin-bottom:12px;"><canvas id="${priceId}"></canvas></div>
      <div class="chart-wrapper" style="height:150px; margin-bottom:12px;"><canvas id="${indicatorId}"></canvas></div>
      <div class="chart-wrapper" style="height:200px;"><canvas id="${equityId}"></canvas></div>
    `;

    renderEquityCurve(equityId, data);
    const labels = data.dates.map((d: string, i: number) => i % Math.ceil(data.dates.length / 30) === 0 ? d : '');

    // Indicator Chart
    new Chart(document.getElementById(indicatorId) as HTMLCanvasElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Aroon Up', data: data.up, borderColor: '#22c55e', borderWidth: 2, pointRadius: 0 },
          { label: 'Aroon Down', data: data.down, borderColor: '#ef4444', borderWidth: 2, pointRadius: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { title: { display: true, text: 'Aroon Up/Down', color: '#fff' } },
        scales: { y: { min: 0, max: 100 } }
      }
    });
  },

  params: [
    { id: 'AROON_PERIOD', label: '阿隆週期', min: 10, max: 60, step: 5, default: 25, format: v => `${v} 日` }
  ],

  exercises: [
    '當 Aroon Up 與 Down 同時保持低位（< 30）時，這意味著市場處於什麼狀態？',
    '嘗試將週期縮短到 14，觀察交叉頻率是否變得過高導致過多交易代價。'
  ],

  prevUnit: { id: '2-3', title: '自適應均線 AMA' },
  nextUnit: { id: '2-5', title: '簡易波動 EMV' }
};
