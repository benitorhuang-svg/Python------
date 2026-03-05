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
    <p><strong>乖離率 (BIAS)</strong> 是一個衡量收盤價與移動平均線距離的相對指標。它生動地展現了市場群眾的情緒何時陷入「過度樂觀」或「過度悲觀」。</p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 200" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="20%" y1="0" x2="20%" y2="100%" />
          <line x1="40%" y1="0" x2="40%" y2="100%" />
          <line x1="60%" y1="0" x2="60%" y2="100%" />
          <line x1="80%" y1="0" x2="80%" y2="100%" />
        </g>
        
        <!-- Moving Average (Center Gravity) -->
        <path d="M 0 100 Q 150 120 450 100" fill="none" stroke="#facc15" stroke-width="3" />
        <text x="440" y="95" fill="#facc15" font-size="11" font-weight="bold" text-anchor="end">移動平均線 (市場引力中心)</text>

        <!-- Price Path (Rubber band snapping) -->
        <path d="M 0 100 Q 50 20 100 80 T 200 180 T 300 80 T 380 40 T 450 100" fill="none" stroke="#cbd5e1" stroke-width="2" />
        
        <!-- Overbought Area (Positive BIAS) -->
        <line x1="65" y1="105" x2="65" y2="45" stroke="#ef4444" stroke-width="2" stroke-dasharray="2,2" />
        <text x="65" y="35" fill="#ef4444" font-size="10" font-weight="bold" text-anchor="middle">正乖離過大 (+BIAS)</text>
        <circle cx="65" cy="45" r="4" fill="#ef4444" />
        <text x="65" y="22" fill="#ef4444" font-size="9" text-anchor="middle">漲多必跌 (賣出)</text>

        <line x1="380" y1="102" x2="380" y2="40" stroke="#ef4444" stroke-width="2" stroke-dasharray="2,2" />
        <circle cx="380" cy="40" r="4" fill="#ef4444" />

        <!-- Oversold Area (Negative BIAS) -->
        <line x1="200" y1="108" x2="200" y2="180" stroke="#22c55e" stroke-width="2" stroke-dasharray="2,2" />
        <text x="200" y="195" fill="#22c55e" font-size="10" font-weight="bold" text-anchor="middle">負乖離過大 (-BIAS)</text>
        <circle cx="200" cy="180" r="4" fill="#22c55e" />
        <text x="200" y="210" fill="#22c55e" font-size="9" text-anchor="middle">跌深必彈 (買進)</text>
      </svg>
    </div>
    
    <h3>均值回歸的物理學：小狗與主人的繩子</h3>
    <p>德國股神安德烈·科斯托蘭尼曾提出著名的「遛狗理論」：經濟與股市的關係就像主人牽著小狗，小狗（價格）有時會跑到前面，有時會落後，但最終都會回到主人（均線/價值）身邊。</p>
    
    <div class="formula-box">
      BIAS = ( (當前價格 - MA) / MA ) × 100%
    </div>

    <ul>
      <li><strong style="color: #ef4444;">正乖離極大 (+BIAS)</strong>：代表上漲速度實在太快，像一根被拉到極限的橡皮筋。多頭已經透支了未來的買盤，即使趨勢沒結束，也隨時可能因為獲利了結賣壓而出現「回檔」。此處切忌追高，甚至可以短空。</li>
      <li><strong style="color: #22c55e;">負乖離極大 (-BIAS)</strong>：代表市場陷入非理性的恐慌拋售。此時下方的賣壓已如強弩之末，橡皮筋隨時會暴力反彈。「跌深就是最大的利多」，量化系統會在此精準執行「逆勢抄底」。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 交易提示：摩擦成本與勝率配置</strong><br>
      乖離率通常被配置為「逆勢抄底」工具。在實戰中，我們通常設定當負乖離率深達某個百分比（例如 -5%）時分批買入，並在乖離率收斂回 0 樞紐時（或 +1%）快速獲利平倉了結，不貪求成為大波段。
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
    { id: 'SELL_BIAS', label: '賣出正乖離', min: 0.5, max: 10, step: 0.5, default: 1.0, format: v => `高於 ${v}%` },
    { id: 'MA_PERIOD', label: 'MA 週期', min: 5, max: 60, step: 5, default: 20, format: v => `${v} 日` }
  ],

  exercises: [
    '目前的負乖離買入點是 -3%，如果調到 -5%（追求更極端的超賣），對夏普比率會有什麼影響？',
    '思考：當市場處於大空頭趨勢時，頻繁的買入負乖離會不會導致持續抄底卻一直被套牢？'
  ],

  prevUnit: { id: '4-1', title: '經典恆溫器策略' },
  nextUnit: { id: '6-1', title: '正向馬丁格爾策略' }
};
