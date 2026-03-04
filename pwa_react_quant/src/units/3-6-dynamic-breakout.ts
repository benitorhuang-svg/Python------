import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitDynamicBreakout: UnitDef = {
  title: '動態波幅突破策略',
  module: '模組三 · 突破策略',
  difficulty: '進階',
  description: '波幅突破系統會根據市場的歷史波動率 (ATR) 自動調整突破軌道的寬度，行情平靜時寬度縮窄，行情劇烈時寬度放寬。',
  needsData: true,

  theory: `
    <p><strong>動態波幅突破 (Dynamic Volatility Breakout)</strong> 是一種「隨機應變」的突破系統。它不像固定百分比或固定點數系統，它是基於<strong>平均真理範圍 (ATR)</strong> 來調整突破閾值。</p>
    
    <p>基本算法：</p>
    <ul>
      <li><strong>基準價格</strong>: 通常是今日開盤價。</li>
      <li><strong>波動範圍 (Range)</strong>: 過去 N 日內的平均波動幅度 × 係數 K。</li>
      <li><strong>上軌 = 開盤價 + 係數 × ATR</strong>。</li>
      <li><strong>下軌 = 開盤價 - 係數 × ATR</strong>。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 優點：</strong><br>
      因為它考慮了 ATR，當市場波動劇烈時，突破線會自動移遠，防止被震盪刷出來；當波動平靜時，它會縮窄捕捉細微的趨勢起動。
    </div>
  `,

  defaultCode: `import json
import numpy as np
from indicators import ATR
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
ATR_PERIOD = 20    # 計算波動率的週期
K_FACTOR = 0.5     # 突破係數

# 準備數據
data = stock_data
highs = [d['High'] for d in data]
lows = [d['Low'] for d in data]
closes = [d['Close'] for d in data]
opens = [d['Open'] for d in data]

# 計算 ATR (移動平均波动)
atr = ATR(highs, lows, closes, ATR_PERIOD)

# 用來畫圖的路徑
up_line = [None] * len(data)
down_line = [None] * len(data)

def strategy(engine, data, i):
    if i < ATR_PERIOD: return
    if np.isnan(atr[i-1]): return
    
    # 動態邊界 = 今日開盤價 +/- (K * 昨日 ATR)
    current_open = data[i]['Open']
    current_close = data[i]['Close']
    
    range_val = atr[i-1] * K_FACTOR
    
    upper_bound = current_open + range_val
    lower_bound = current_open - range_val
    
    # 紀錄軌道以供畫圖顯示
    up_line[i] = upper_bound
    down_line[i] = lower_bound
    
    # 交易邏輯：突破開盤價一段 ATR 距離則進場
    if engine.position == 0:
        if current_close > upper_bound:
            engine.buy(current_close, i, "動態波幅突破買入")
    
    elif engine.position > 0:
        if current_close < lower_bound:
            engine.sell(current_close, i, "動態波幅跌破賣出")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"═══ 動態波幅突破策略 ═══")
print(f"ATR 係數 K: {K_FACTOR}")
print(f"總報酬率: {report['total_return']:+.2f}%")

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
          { label: '動態上軌', data: data.upper, borderColor: '#06b6d4', borderWidth: 1, borderDash: [2, 2], pointRadius: 0 },
          { label: '動態下軌', data: data.lower, borderColor: '#ef4444', borderWidth: 1, borderDash: [2, 2], pointRadius: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { title: { display: true, text: '價格與動態 ATR 軌道', color: '#fff' } }
      }
    });
  },

  params: [
    { id: 'K_FACTOR', label: '突破係數 K', min: 0.1, max: 2.0, step: 0.1, default: 0.5, format: v => `${v}` },
    { id: 'ATR_PERIOD', label: 'ATR 週期', min: 10, max: 60, step: 5, default: 20, format: v => `${v} 日` }
  ],

  exercises: [
    '當市場整體波動率 (ATR) 上升時，觀察你的突破線會跟著發生什麼變化？',
    '嘗試調小 K_FACTOR 到 0.2，看看是否會產生太多假信號頻繁進出場？'
  ],

  prevUnit: { id: '3-5', title: '菲阿里四價策略' },
  nextUnit: { id: '3-7', title: 'R-breaker 策略' }
};
