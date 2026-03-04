import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitDonchian: UnitDef = {
  title: '增強版唐奇安通道策略',
  module: '模組三 · 突破策略',
  difficulty: '進階',
  description: '著名的趨勢跟蹤系統，也就是聲名大噪的「海龜交易法則」核心。基於價格突破 N 日高低點動態進出場。',
  needsData: true,

  theory: `
    <p><strong>唐奇安通道 (Donchian Channel)</strong> 由 Richard Donchian 提出，是著名的「海龜交易法則」所使用的核心通道技術。</p>
    
    <p>這是一種經典的價格突破趨勢追蹤方法，它的通道定義非常直觀，完全由過去一段時間的價格極值來決定：</p>

    <div class="formula-box">
      通道上軌 = 過去 N 日內的最高價 (Highest High)<br>
      通道下軌 = 過去 N 日內的最低價 (Lowest Low)<br>
      通道中軌 = (上軌 + 下軌) / 2
    </div>

    <ul>
      <li><strong>進場信號：</strong> 當價格突破上軌時，說明市場創下近期新高，趨勢向上，我們進場做多。</li>
      <li><strong>出場信號：</strong> 傳統海龜會使用較短週期的反向突破出場，或直接跌破「下軌」或「中軌」作為移動停利/停損線。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 為什麼要乘 0.999 跟 1.001？</strong> <br>
      在原本 FMZ 的期貨套件實作中，為了避免價格精準觸及邊界時反覆震盪發出假信號，
      通常會讓觸發閾值稍微打一點折扣（例如上軌 * 0.999 讓突破提早一點點發生，或者過濾掉剛好等於的極端情況）。
    </div>
  `,

  defaultCode: `import json
import numpy as np
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
N = 55            # 唐奇安通道計算週期 (過去 N 天)
UP_COEF = 0.999   # 上軌微調係數
DN_COEF = 1.001   # 下軌微調係數

# 準備數據
data = stock_data
closes = [d['Close'] for d in data]
highs = [d['High'] for d in data]
lows = [d['Low'] for d in data]

# 用來畫圖的陣列
upper_bands = [None] * len(data)
lower_bands = [None] * len(data)
mid_bands = [None] * len(data)

def donchian_strategy(engine, data, i):
    # 確保有足夠的歷史資料來計算 N 天極值
    if i <= N:
        return
        
    # 計算唐奇安軌道 (基於過去 N 天，不包含今日，避免未來函數)
    hist_h = highs[i-N : i]
    hist_l = lows[i-N : i]
    
    on_line = max(hist_h) * UP_COEF
    under_line = min(hist_l) * DN_COEF
    mid_line = (on_line + under_line) / 2
    
    # 紀錄軌道以供畫圖顯示
    upper_bands[i] = round(on_line, 2)
    lower_bands[i] = round(under_line, 2)
    mid_bands[i] = round(mid_line, 2)
    
    current_close = closes[i]
    
    # 交易邏輯 (簡單多頭版)
    # 如果目前無持倉，且價格大於上軌 => 買入
    if engine.position == 0:
        if current_close > on_line:
            engine.buy(current_close, i, "突破上軌進場")
            
    # 如果持有多單，且價格跌破中軌 => 平倉
    elif engine.position > 0:
        if current_close < mid_line:
            engine.sell(current_close, i, "跌破中軌出場")

# ═══ 執行回測 ═══
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(donchian_strategy)

# ═══ 輸出結果 ═══
print(f"═══ 唐奇安通道策略回測 ═══")
print(f"通道週期: {N} 天")
print(f"總報酬率: {report['total_return']:+.2f}%")
print(f"最大回撤: {report['max_drawdown']:.2f}%")
print(f"交易次數: {report['total_trades']} 次")
print(f"夏普比率: {report['sharpe_ratio']:.2f}")

chart_data = {
    **report,
    "closes": closes,
    "upper": upper_bands,
    "lower": lower_bands,
    "mid": mid_bands
}
`,

  resultVar: 'chart_data',

  renderChart: (canvasId, data) => {
    const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
    if (!parent) return;

    const priceId = canvasId + '-price';
    const equityId = canvasId + '-equity';
    parent.innerHTML = `
      <div class="chart-wrapper" style="height:350px; margin-bottom:16px;">
        <canvas id="${priceId}"></canvas>
      </div>
      <div class="chart-wrapper" style="height:250px;">
        <canvas id="${equityId}"></canvas>
      </div>
    `;

    renderEquityCurve(equityId, data);

    const ctx = document.getElementById(priceId) as HTMLCanvasElement;
    if (ctx) {
      const labels = data.dates.map((d: string, i: number) => i % Math.ceil(data.dates.length / 30) === 0 ? d : '');
      const buy = new Array(data.closes.length).fill(null);
      const sell = new Array(data.closes.length).fill(null);

      data.trades?.forEach((t: any) => {
        if (t.type === 'BUY') buy[t.index] = data.closes[t.index];
        if (t.type === 'SELL') sell[t.index] = data.closes[t.index];
      });

      new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: '收盤價', data: data.closes, borderColor: '#e2e8f0', borderWidth: 1.5, pointRadius: 0, tension: 0.1 },
            { label: '上軌', data: data.upper, borderColor: '#06b6d4', backgroundColor: 'rgba(6, 182, 212, 0.05)', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, tension: 0.1, fill: '+2' }, // fill to lower band
            { label: '中軌', data: data.mid, borderColor: '#8b5cf6', borderWidth: 1, borderDash: [2, 4], pointRadius: 0, tension: 0.1 },
            { label: '下軌', data: data.lower, borderColor: '#f59e0b', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, tension: 0.1 },
            { label: '買入', data: buy, borderColor: '#22c55e', backgroundColor: '#22c55e', pointRadius: 5, pointStyle: 'triangle', showLine: false },
            { label: '賣出', data: sell, borderColor: '#ef4444', backgroundColor: '#ef4444', pointRadius: 5, pointStyle: 'triangle', pointRotation: 180, showLine: false }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#94a3b8' } },
            title: { display: true, text: '📈 價格與唐奇安通道 (海龜核心)', color: '#e2e8f0' }
          },
          scales: {
            x: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { color: '#64748b' } },
            y: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { color: '#64748b' } }
          }
        }
      });
    }
  },

  params: [
    { id: 'N', label: '通道週期 (N)', min: 10, max: 200, step: 5, default: 55, format: v => `${v} 天` },
    { id: 'UP_COEF', label: '上軌微調', min: 0.98, max: 1.02, step: 0.001, default: 0.999, format: v => v.toFixed(3) },
    { id: 'DN_COEF', label: '下軌微調', min: 0.98, max: 1.02, step: 0.001, default: 1.001, format: v => v.toFixed(3) }
  ],

  exercises: [
    '目前的出場條件是「跌破中軌」，試試看將出場條件改為「跌破下軌」，會影響報酬率或是最大回撤嗎？',
    '參數 N=55 偏向中長線，嘗試將 N 改為 20 的海龜短期版，看看交易次數的變化。'
  ],

  prevUnit: { id: '3-2', title: '高低點突破' },
  nextUnit: { id: '3-4', title: 'Hans123 突破' }
};
