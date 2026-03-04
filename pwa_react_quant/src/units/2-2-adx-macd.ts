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
    <p><strong>ADX 輔助 MACD 策略</strong> 是一個為了克服 MACD 在震盪市頻繁失靈而設計的進階方案。</p>
    
    <p>它的核心邏輯是加入一個「趨勢開關」：</p>
    <ul>
      <li><strong>MACD (動能)</strong>：負責尋找價格轉折與動能方向（快慢線交叉）。</li>
      <li><strong>ADX (強度)</strong>：負責判斷目前的趨勢是否「夠強」。通常當 ADX > 25 時，代表市場處於強勢趨勢中，此時 MACD 的訊號才值得信任。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 為什麼要搭配？</strong><br>
      MACD 是趨勢追蹤指標，最怕橫盤震盪。ADX 可以告訴我們「現在是不是橫盤」，當 ADX 過低時（例如 < 20），我們選擇觀望，避開不必要的磨損。
    </div>
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
print(f"═══ ADX + MACD 輔助策略 ═══")
print(f"ADX 閾值: {ADX_THRESH}")
print(f"總報酬率: {report['total_return']:+.2f}%")
print(f"最大回撤: {report['max_drawdown']:.2f}%")

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
    { id: 'ADX_PERIOD', label: 'ADX 週期', min: 5, max: 30, step: 1, default: 14, format: v => `${v} 日` }
  ],

  exercises: [
    '將 ADX 閾值調低到 15，觀察交易次數是否增加？勝率發生了什麼變化？',
    '嘗試思考：如果 ADX 正在下降，是否代表趨勢正在衰減？如何加入這個判斷？'
  ],

  prevUnit: { id: '2-1', title: 'MACD 策略' },
  nextUnit: { id: '2-3', title: '自適應均線 AMA' }
};
