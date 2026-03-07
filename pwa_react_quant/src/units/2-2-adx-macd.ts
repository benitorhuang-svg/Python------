import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitAdxMacd: UnitDef = {
  title: '利用平均趨向指數輔助MACD策略',
  module: '模組二 · 趨勢跟蹤',
  difficulty: '進階',
  description: '結合動能指標 MACD 與趨勢強度指標 ADX，只在趨勢明顯時才進行交易，有效過濾震盪市場的假訊號。',
  needsData: true,

  theory: `
    <p><strong>ADX 輔助 MACD 策略</strong> 是一個為了克服 MACD 在震盪市頻繁失靈而設計的進階組合方案。</p>
    
    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 180" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="10%" y1="0" x2="10%" y2="100%" />
          <line x1="30%" y1="0" x2="30%" y2="100%" />
          <line x1="50%" y1="0" x2="50%" y2="100%" />
          <line x1="70%" y1="0" x2="70%" y2="100%" />
          <line x1="90%" y1="0" x2="90%" y2="100%" />
        </g>
        
        <!-- Background Zones for ADX > 25 -->
        <rect x="0" y="0" width="130" height="180" fill="rgba(239, 68, 68, 0.05)" />
        <text x="65" y="20" fill="#ef4444" font-size="10" text-anchor="middle" font-weight="bold">跌勢強烈期</text>
        
        <rect x="130" y="0" width="170" height="180" fill="rgba(255, 255, 255, 0.03)" />
        <text x="215" y="20" fill="#94a3b8" font-size="10" text-anchor="middle" font-weight="bold">橫盤無趨勢期</text>
        
        <rect x="300" y="0" width="150" height="180" fill="rgba(34, 197, 94, 0.05)" />
        <text x="375" y="20" fill="#22c55e" font-size="10" text-anchor="middle" font-weight="bold">漲勢強烈期</text>

        <!-- Zero Line for MACD -->
        <line x1="0" y1="80" x2="450" y2="80" stroke="#64748b" stroke-width="1" stroke-dasharray="4,4" />
        <text x="440" y="75" fill="#64748b" font-size="9" text-anchor="end">MACD 零軸</text>

        <!-- ADX Threshold Line -->
        <line x1="0" y1="150" x2="450" y2="150" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="2,2" />
        <text x="440" y="145" fill="#f59e0b" font-size="9" text-anchor="end">ADX = 25 天險</text>

        <!-- MACD DIF Line (Cyan) -->
        <path class="svg-animated-path" d="M 0 40 Q 60 40 130 80 T 260 80 T 360 40 T 450 30" fill="none" stroke="#06b6d4" stroke-width="2" />
        
        <!-- ADX Line (Pink) -->
        <path class="svg-animated-path" d="M 0 120 Q 50 120 100 130 T 150 160 T 225 170 T 280 160 T 320 130 T 400 110" fill="none" stroke="#ec4899" stroke-width="2.5" />
        
        <!-- Ignoring MACD Crossover in flat zone -->
        <circle class="svg-breathe" cx="215" cy="80" r="5" fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="2,2" />
        <line x1="215" y1="80" x2="215" y2="165" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3,3" />
        <text x="215" y="65" fill="#94a3b8" font-size="10" font-weight="bold" text-anchor="middle">忽略假金叉 (ADX < 25)</text>

        <!-- Valid Golden Cross -->
        <circle class="svg-breathe" cx="340" cy="53" r="6" fill="#facc15" stroke="#0f172a" stroke-width="2" />
        <line x1="340" y1="53" x2="340" y2="120" stroke="#facc15" stroke-width="1" stroke-dasharray="3,3" />
        <text x="340" y="40" fill="#facc15" font-size="11" font-weight="bold" text-anchor="middle" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">有效買入 (ADX > 25)</text>
      </svg>
    </div>

    <p>它的核心邏輯是加入一個<strong>「雙重大腦決策機制」</strong>：</p>
    <ul>
      <li><strong style="color: #06b6d4;">方向大腦 (MACD)</strong>：判斷現在是上漲動能還是下跌動能。負責發射買賣信號。</li>
      <li><strong style="color: #ec4899;">動能大腦 (ADX)</strong>：平均趨向指數 (Average Directional Index)。它不分多空，只看「目前的趨勢強不強」。數值通常落在 0~100，當 ADX > 25 時，代表市場正處於單邊狂飆狀態。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 為什麼要這兩個組合被譽為經典？</strong><br>
      MACD 最會賺錢的地方是「大單邊趨勢」，最會把錢虧光的地方是「橫盤震盪」。<br>
      ADX 可以像雷達一樣告訴我們：「現在是大行情還是死水市」。當 ADX 死氣沉沉（低於 20~25）時，我們直接關閉 MACD，避開無意義的「雙巴交易」(Whipsaw)。
    </div>
    
    <h3>策略邏輯總結</h3>
    <p><strong>✅ 買入條件：</strong>MACD 出現黃金交叉 <b>並且</b> ADX > 25（有的策略會要求 ADX 正在上揚）。</p>
    <p><strong>✅ 賣出條件：</strong>MACD 出現死亡交叉（這時可以不用管 ADX，因為保本優先）。</p>
  `,

  defaultCode: `import json
import numpy as np
from indicators import MACD, ADX, Cross
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
MACD_FAST = 12
MACD_SLOW = 26
MACD_SIG = 9
ADX_PERIOD = 14
ADX_THRESH = 25  # ADX 超過此值才視為強趨勢

# 準備數據
data = stock_data
closes = [d['Close'] for d in data]
highs = [d['High'] for d in data]
lows = [d['Low'] for d in data]

# 計算指標
dif, dea, macd_hist = MACD(closes, MACD_FAST, MACD_SLOW, MACD_SIG)
adx, plus_di, minus_di = ADX(highs, lows, closes, ADX_PERIOD)
macd_cross = Cross(dif, dea)

def strategy(engine, data, i):
    # 確保指標已算出
    if i < 40: return
    
    current_adx = adx[i]
    current_cross = macd_cross[i]
    
    # 進場邏輯：MACD 金叉 且 ADX 指示強勢趨勢
    if engine.position == 0:
        if current_cross == 1 and current_adx > ADX_THRESH:
            engine.buy(data[i]['Close'], i, f"ADX({current_adx:.1f}) 強勢金叉進場")
            
    # 出場邏輯：MACD 死叉
    elif engine.position > 0:
        if current_cross == -1:
            engine.sell(data[i]['Close'], i, "MACD 死叉出場")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"ADX 閾值: {ADX_THRESH}")

chart_data = {
    **report,
    "dif": dif, "dea": dea, "macd_hist": macd_hist,
    "adx": adx, "adx_thresh": ADX_THRESH
}
`,

  resultVar: 'chart_data',

  renderChart: (canvasId, data) => {
    const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
    if (!parent) return;

    const priceId = canvasId + '-price';
    const adxId = canvasId + '-adx';
    const equityId = canvasId + '-equity';
    parent.innerHTML = `
      <div class="chart-wrapper" style="height:250px; margin-bottom:12px;"><canvas id="${priceId}"></canvas></div>
      <div class="chart-wrapper" style="height:150px; margin-bottom:12px;"><canvas id="${adxId}"></canvas></div>
      <div class="chart-wrapper" style="height:200px;"><canvas id="${equityId}"></canvas></div>
    `;

    renderEquityCurve(equityId, data);

    const labels = data.dates.map((d: string, i: number) => i % Math.ceil(data.dates.length / 30) === 0 ? d : '');

    // Price Chart
    new Chart(document.getElementById(priceId) as HTMLCanvasElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: '收盤價', data: data.closes, borderColor: '#e2e8f0', borderWidth: 1, pointRadius: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: '價格走勢', color: '#fff' } } }
    });

    // ADX Chart
    new Chart(document.getElementById(adxId) as HTMLCanvasElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'ADX', data: data.adx, borderColor: '#06b6d4', borderWidth: 2, pointRadius: 0 },
          { label: '閾值', data: new Array(data.adx.length).fill(data.adx_thresh), borderColor: '#ef4444', borderDash: [5, 5], borderWidth: 1, pointRadius: 0 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'ADX 趨勢強度', color: '#fff' } } }
    });
  },

  params: [
    { id: 'ADX_THRESH', label: 'ADX 強度閾值', min: 10, max: 40, step: 1, default: 25, format: v => `> ${v}` },
    { id: 'ADX_PERIOD', label: 'ADX 週期', min: 5, max: 30, step: 1, default: 14, format: v => `${v} 日` },
    { id: 'MACD_FAST', label: 'MACD 快線', min: 5, max: 30, step: 1, default: 12, format: v => `${v}` },
    { id: 'MACD_SLOW', label: 'MACD 慢線', min: 10, max: 60, step: 1, default: 26, format: v => `${v}` },
    { id: 'MACD_SIG', label: 'MACD 訊號', min: 3, max: 20, step: 1, default: 9, format: v => `${v}` }
  ],

  exercises: [
    '將 ADX 閾值調低到 15，觀察交易次數是否增加？勝率發生了什麼變化？',
    '嘗試思考：如果 ADX 正在下降，是否代表趨勢正在衰減？如何加入這個判斷？'
  ],

  prevUnit: { id: '2-1', title: 'MACD 策略' },
  nextUnit: { id: '2-3', title: '自適應均線 AMA' }
};
