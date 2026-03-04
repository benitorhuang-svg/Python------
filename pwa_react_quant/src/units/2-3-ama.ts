import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitAma: UnitDef = {
  title: '自適應動態雙均線策略 (AMA)',
  module: '模組二 · 趨勢跟蹤',
  difficulty: '進階',
  description: '使用考夫曼自適應均線 (KAMA)，在趨勢明顯時變得靈敏，在震盪時變得遲鈍，自動過濾市場噪音。',
  needsData: true,

  theory: `
    <p><strong>自適應均線 (Adaptive Moving Average, AMA)</strong> 由 Perry Kaufman 提出，旨在決解決傳統均線在「滯後性」與「靈敏度」之間的兩難。</p>
    
    <p>它的核心秘密在於<strong>效率比 (Efficiency Ratio, ER)</strong>：</p>
    <ul>
      <li><strong>ER 趨近 1</strong>：價格直線變動，趨勢極強。AMA 會變得非常靈敏（趨近短週期均線）。</li>
      <li><strong>ER 趨近 0</strong>：價格上下震盪，噪聲極多。AMA 會變得非常遲鈍（趨近長週期均線），避免頻繁交易。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 為什麼叫「自適應」？</strong><br>
      它能自動偵測市場的波動強度。當市場橫盤時，AMA 會橫向發展幾乎不動；當市場啟動爆發時，它會迅速跟上價格。
    </div>
  `,

  defaultCode: `import json
import numpy as np
from indicators import AMA, Cross
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
AMA_N = 10        # 計算效率比的週期
AMA_FAST = 2      # 最快平滑週期
AMA_SLOW = 30     # 最慢平滑週期

# 準備數據
data = stock_data
closes = [d['Close'] for d in data]

# 計算 AMA
ama = AMA(closes, AMA_N, AMA_FAST, AMA_SLOW)

def strategy(engine, data, i):
    if i < 2: return
    if np.isnan(ama[i]) or np.isnan(ama[i-1]): return
    
    current_close = data[i]['Close']
    
    # 交易邏輯：價格上穿 AMA => 買入；價格下穿 AMA => 賣出
    if engine.position == 0:
        if current_close > ama[i] and data[i-1]['Close'] <= ama[i-1]:
            engine.buy(current_close, i, "上穿 AMA 進場")
            
    elif engine.position > 0:
        if current_close < ama[i]:
            engine.sell(current_close, i, "下穿 AMA 出場")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"═══ KAMA 自適應均線策略 ═══")
print(f"總報酬率: {report['total_return']:+.2f}%")
print(f"最大回撤: {report['max_drawdown']:.2f}%")

chart_data = {
    **report,
    "ama": ama
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

    // Price Chart with AMA
    new Chart(document.getElementById(priceId) as HTMLCanvasElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: '收盤價', data: data.closes, borderColor: '#e2e8f0', borderWidth: 1, pointRadius: 0 },
          { label: 'AMA (KAMA)', data: data.ama, borderColor: '#f59e0b', borderWidth: 2, pointRadius: 0, tension: 0.1 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { title: { display: true, text: '價格與 KAMA 自適應均線', color: '#fff' } }
      }
    });
  },

  params: [
    { id: 'AMA_N', label: '效率比週期 (N)', min: 5, max: 30, step: 1, default: 10, format: v => `${v} 日` },
    { id: 'AMA_FAST', label: '最快平滑', min: 2, max: 10, step: 1, default: 2, format: v => `${v} 日` },
    { id: 'AMA_SLOW', label: '最慢平滑', min: 20, max: 60, step: 2, default: 30, format: v => `${v} 日` }
  ],

  exercises: [
    '觀察在橫盤區間中，AMA 是否呈現近乎水平的狀態？這對於減少假訊號有什麼幫助？',
    '嘗試縮短 AMA_N，看看均線是否變得過於敏感。'
  ],

  prevUnit: { id: '2-2', title: 'ADX+MACD 輔助' },
  nextUnit: { id: '2-4', title: '阿隆指標 Aroon' }
};
