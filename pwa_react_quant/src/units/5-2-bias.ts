import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitBias: UnitDef = {
  title: '乖離率 BIAS 策略',
  module: '模組五 · 高級交易與套利',
  difficulty: '基礎',
  description: '乖離率衡量價格與移動平均線之間的偏離程度。根據「物極必反」法則，過大的偏離預示著趨勢後勁不足或即將反轉。',
  needsData: true,

  theory: `
    <p><strong>乖離率 (BIAS)</strong> 是一個衡量收盤價與移動平均線距離的指標。它顯示了當前市場的超買或超賣程度。</p>
    
    <div class="formula-box">
      BIAS = ( (當前價格 - MA) / MA ) × 100%
    </div>

    <ul>
      <li><strong>正乖離大</strong>：代表價格漲得太快，離均線太遠，可能會回檔。</li>
      <li><strong>負乖離大</strong>：代表價格跌得太重，離均線太遠，可能會反彈。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 交易提示：</strong><br>
      我們利用「回歸均值」的特性，在負乖離觸及極端值時買入，並在回歸到均線（乖離率回到 0 附近）或正乖離過大時賣出。
    </div>
  `,

  defaultCode: `import json
import numpy as np
from indicators import MA
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
MA_PERIOD = 20
BUY_BIAS = -3.0    # 當負乖離超過 -3% 時買入
SELL_BIAS = 1.0    # 當乖離回到 1% 時賣出

# 準備數據
data = stock_data
closes = [d['Close'] for d in data]

# 計算指標
ma = MA(closes, MA_PERIOD)
bias = [( (c - m) / m ) * 100 if not np.isnan(m) else 0 for c, m in zip(closes, ma)]

def strategy(engine, data, i):
    # 需要指標算出
    if i < MA_PERIOD: return
    
    curr_bias = bias[i]
    close = data[i]['Close']
    
    # 交易邏輯：跌太深買入；回溫賣出
    if engine.position == 0:
        if curr_bias < BUY_BIAS:
            engine.buy(close, i, f"負乖離({curr_bias:.1f}%) 低買")
            
    elif engine.position > 0:
        if curr_bias > SELL_BIAS:
            engine.sell(close, i, f"回歸均值({curr_bias:.1f}%) 賣出")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"═══ 乖離率 BIAS 策略 ═══")
print(f"總報酬率: {report['total_return']:+.2f}%")

chart_data = {
    **report,
    "bias": bias,
    "buy_limit": BUY_BIAS,
    "sell_limit": SELL_BIAS
}
`,

  resultVar: 'chart_data',

  renderChart: (canvasId, data) => {
    const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
    if (!parent) return;

    const priceId = canvasId + '-price';
    const indicatorId = canvasId + '-bias';
    const equityId = canvasId + '-equity';
    parent.innerHTML = `
      <div class="chart-wrapper" style="height:250px; margin-bottom:12px;"><canvas id="${priceId}"></canvas></div>
      <div class="chart-wrapper" style="height:150px; margin-bottom:12px;"><canvas id="${indicatorId}"></canvas></div>
      <div class="chart-wrapper" style="height:200px;"><canvas id="${equityId}"></canvas></div>
    `;

    renderEquityCurve(equityId, data);
    const labels = data.dates.map((d: string, i: number) => i % Math.ceil(data.dates.length / 30) === 0 ? d : '');

    // BIAS Chart
    new Chart(document.getElementById(indicatorId) as HTMLCanvasElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'BIAS (%)', data: data.bias, borderColor: '#f59e0b', borderWidth: 2, pointRadius: 0 },
          { label: '買入區域', data: new Array(data.bias.length).fill(data.buy_limit), borderColor: '#22c55e99', borderDash: [2, 2], borderWidth: 1, pointRadius: 0 },
          { label: '賣出區域', data: new Array(data.bias.length).fill(data.sell_limit), borderColor: '#ef444499', borderDash: [2, 2], borderWidth: 1, pointRadius: 0 },
          { label: '基準(0)', data: new Array(data.bias.length).fill(0), borderColor: '#ffffff22', borderWidth: 1, pointRadius: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { title: { display: true, text: '乖離率 BIAS 波動走勢', color: '#fff' } }
      }
    });

    // Price Chart
    new Chart(document.getElementById(priceId) as HTMLCanvasElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: '收盤價', data: data.closes, borderColor: '#e2e8f0', borderWidth: 1, pointRadius: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  },

  params: [
    { id: 'BUY_BIAS', label: '買入負乖離', min: -10, max: -0.5, step: 0.5, default: -3.0, format: v => `低於 ${v}%` },
    { id: 'SELL_BIAS', label: '賣出正乖離', min: 0.5, max: 10, step: 0.5, default: 1.0, format: v => `高於 ${v}%` }
  ],

  exercises: [
    '目前的負乖離買入點是 -3%，如果調到 -5%（追求更極端的超賣），對夏普比率會有什麼影響？',
    '思考：當市場處於大空頭趨勢時，頻繁的買入負乖離會不會導致持續抄底卻一直被套牢？'
  ],

  prevUnit: { id: '4-1', title: '經典恆溫器策略' },
  nextUnit: { id: '6-1', title: '正向馬丁格爾策略' }
};
