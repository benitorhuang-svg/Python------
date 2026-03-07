import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve, renderVolumeChart, renderPriceWithMA } from '../engine/chart-renderer';

export const unitDonchian: UnitDef = {
  title: '增強版唐奇安通道策略',
  module: '模組三 · 突破策略',
  difficulty: '進階',
  description: '著名的趨勢跟蹤系統，也就是聲名大噪的「海龜交易法則」核心。基於價格突破 N 日高低點動態進出場。',
  needsData: true,

  theory: `
    <p><strong>唐奇安通道 (Donchian Channel)</strong> 由 Richard Donchian 提出，是量化交易界最著名的「海龜交易法則」所使用的核心通道技術。更是所有趨勢跟蹤系統的鼻祖。</p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 200" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="20%" y1="0" x2="20%" y2="100%" />
          <line x1="40%" y1="0" x2="40%" y2="100%" />
          <line x1="60%" y1="0" x2="60%" y2="100%" />
          <line x1="80%" y1="0" x2="80%" y2="100%" />
        </g>
        
        <!-- Donchian Channel Fill (Background) -->
        <path d="M 0 60 L 100 60 L 100 40 L 150 40 L 150 20 L 450 20 L 450 160 L 250 160 L 250 140 L 200 140 L 200 120 L 0 120 Z" fill="rgba(139, 92, 246, 0.05)" />
        
        <!-- Upper Band (Highest High) -->
        <path class="svg-animated-path" d="M 0 60 L 100 60 L 100 40 L 150 40 L 150 20 L 450 20" fill="none" stroke="#06b6d4" stroke-width="2" />
        <text x="440" y="15" fill="#06b6d4" font-size="10" text-anchor="end">上軌 = N日最高價 (海龜買入點)</text>
        
        <!-- Lower Band (Lowest Low) -->
        <path class="svg-animated-path" d="M 0 120 L 200 120 L 200 140 L 250 140 L 250 160 L 450 160" fill="none" stroke="#ef4444" stroke-width="2" />
        <text x="440" y="175" fill="#ef4444" font-size="10" text-anchor="end">下軌 = N日最低價 (反手放空點)</text>
        
        <!-- Middle Band -->
        <path d="M 0 90 L 100 90 L 100 80 L 150 80 L 150 70 L 200 70 L 200 80 L 250 80 L 250 90 L 450 90" fill="none" stroke="#8b5cf6" stroke-width="1" stroke-dasharray="4,4" />
        <text x="440" y="85" fill="#8b5cf6" font-size="10" text-anchor="end">中軌 = (上軌+下軌)/2 (移動停利點)</text>

        <!-- Price Path -->
        <path class="svg-animated-path" d="M 0 110 Q 50 70 100 40 T 150 20 T 200 100 T 250 160 T 320 100 T 450 60" fill="none" stroke="#f59e0b" stroke-width="2.5" />
        
        <!-- Signals -->
        <circle class="svg-breathe" cx="100" cy="40" r="5" fill="#facc15" stroke="#0f172a" stroke-width="2" />
        <line x1="100" y1="40" x2="100" y2="70" stroke="#facc15" stroke-width="1" stroke-dasharray="2,2" />
        <text x="100" y="85" fill="#facc15" font-size="11" font-weight="bold" text-anchor="middle" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">創新高買入</text>

        <circle class="svg-breathe" cx="178" cy="70" r="5" fill="#fb923c" stroke="#0f172a" stroke-width="2" />
        <line x1="178" y1="70" x2="178" y2="50" stroke="#fb923c" stroke-width="1" stroke-dasharray="2,2" />
        <text x="178" y="45" fill="#fb923c" font-size="10" font-weight="bold" text-anchor="middle">跌破中軌(停利)</text>

        <circle class="svg-breathe" cx="250" cy="160" r="5" fill="#06b6d4" stroke="#0f172a" stroke-width="2" />
        <line x1="250" y1="160" x2="250" y2="130" stroke="#06b6d4" stroke-width="1" stroke-dasharray="2,2" />
        <text x="250" y="125" fill="#06b6d4" font-size="11" font-weight="bold" text-anchor="middle" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">創新低賣出</text>
      </svg>
    </div>

    <h3>通道構成與交易法則</h3>
    <p>這是一種經典的價格突破趨勢追蹤方法，它的通道定義非常直觀，完全包絡了過去一段時間的價格極值，軌道外觀看起來像一層一層的「階梯」：</p>

    <div class="formula-box">
      通道上軌 = 過去 N 日內的最高價 (Highest High)<br>
      通道下軌 = 過去 N 日內的最低價 (Lowest Low)<br>
      通道中軌 = (上軌 + 下軌) / 2
    </div>

    <ul>
      <li><strong style="color: #06b6d4;">進場信號：</strong> 價格突破 55 日最高價（上軌）時，代表市場已經強勢表態，海龜會毫不猶豫地建倉做多，不帶任何個人主觀預測。</li>
      <li><strong style="color: #8b5cf6;">出場信號 (停利/停損)：</strong> 如果價格只是稍微回檔，海龜會死抱不放。但只要價格跌破「中軌」或「更短期的下軌（例如 20 日新低）」，代表趨勢已遭破壞，必須毫不留情地清倉走人。這確保了「獲利能奔跑，虧損被截斷」。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 為什麼代碼裡要乘上 0.999 跟 1.001 的微調係數？</strong> <br>
      在原本 FMZ 的期貨實作套件中，為了避免價格在一天內「無數次精準觸發同一個邊界價位」造成程式瘋狂進出場，
      通常會讓觸發閾值稍微打一點折扣（例如 上軌 * 0.999，等於突破門檻稍微降低一點點），來化解黏在邊界上的摩擦雜訊。
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
    
    # 交易邏輯 (專業海龜版：包含反手機制)
    if engine.position <= 0:
        if current_close > on_line:
            if engine.position < 0: engine.cover(current_close, i, "空單止損/反手")
            engine.buy(current_close, i, f"突破{N}日上軌")
            
    elif engine.position >= 0:
        if current_close < under_line:
            if engine.position > 0: engine.sell(current_close, i, "多單止損/反手")
            engine.short(current_close, i, f"跌破{N}日下軌")
    
    # 特殊出場邏輯：跌破中軌主動平倉 (非反手)
    elif engine.position > 0 and current_close < mid_line:
        engine.sell(current_close, i, "跌破中軌 (趨勢轉弱)")
    elif engine.position < 0 and current_close > mid_line:
        engine.cover(current_close, i, "站回中軌 (空頭減損)")

# ═══ 執行回測 (包含滑價) ═══
engine = BacktestEngine(data, initial_capital=100000, slippage=0.0003)
report = engine.run(donchian_strategy)

# ═══ 輸出結果 ═══

chart_data = {
    **report,
    "closes": closes,
    "upper": upper_bands,
    "lower": lower_bands,
    "mid": mid_bands,
    "volumes": [d['Volume'] for d in data]
}
`,

  resultVar: 'chart_data',

  renderChart: (canvasId, data) => {
    const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
    if (!parent) return;

    const priceId = canvasId + '-price';
    const volId = canvasId + '-volume';
    const equityId = canvasId + '-equity';

    parent.innerHTML = `
      <div class="chart-wrapper" style="height:320px; margin-bottom:12px;"><canvas id="${priceId}"></canvas></div>
      <div class="chart-wrapper" style="height:100px; margin-bottom:12px;"><canvas id="${volId}"></canvas></div>
      <div class="chart-wrapper" style="height:200px;"><canvas id="${equityId}"></canvas></div>
    `;

    renderEquityCurve(equityId, data);
    renderVolumeChart(volId, data);

    const ctx = document.getElementById(priceId) as HTMLCanvasElement;
    if (ctx) {
      const labels = data.dates.map((d: string, i: number) => i % Math.ceil(data.dates.length / 30) === 0 ? d : '');
      const buy = new Array(data.closes.length).fill(null);
      const sell = new Array(data.closes.length).fill(null);
      const short = new Array(data.closes.length).fill(null);
      const cover = new Array(data.closes.length).fill(null);
      const reasons = new Array(data.closes.length).fill('');

      data.trades?.forEach((t: any) => {
        const idx = t.index;
        reasons[idx] = t.reason || '';
        if (t.type === 'BUY') buy[idx] = data.closes[idx];
        else if (t.type === 'SELL') sell[idx] = data.closes[idx];
        else if (t.type === 'SHORT') short[idx] = data.closes[idx];
        else if (t.type === 'COVER') cover[idx] = data.closes[idx];
      });

      new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: '收盤價', data: data.closes, borderColor: '#f1f5f9', borderWidth: 1.5, pointRadius: 0 },
            { label: '上軌', data: data.upper, borderColor: '#06b6d4', borderWidth: 1, borderDash: [5, 5], pointRadius: 0 },
            { label: '下軌', data: data.lower, borderColor: '#f59e0b', borderWidth: 1, borderDash: [5, 5], pointRadius: 0 },
            { label: '中軌', data: data.mid, borderColor: 'rgba(139, 92, 246, 0.4)', borderWidth: 1, borderDash: [2, 2], pointRadius: 0 },
            // @ts-ignore
            { label: '買入 ▲', data: buy, reasons: reasons, borderColor: '#22c55e', backgroundColor: '#22c55e', pointRadius: 6, pointStyle: 'triangle', showLine: false },
            // @ts-ignore
            { label: '賣出 ▼', data: sell, reasons: reasons, borderColor: '#ef4444', backgroundColor: '#ef4444', pointRadius: 6, pointStyle: 'triangle', pointRotation: 180, showLine: false },
            // @ts-ignore
            { label: '賣空 ▼', data: short, reasons: reasons, borderColor: '#fbbf24', backgroundColor: '#fbbf24', pointRadius: 6, pointStyle: 'triangle', pointRotation: 180, showLine: false },
            // @ts-ignore
            { label: '平空 ▲', data: cover, reasons: reasons, borderColor: '#60a5fa', backgroundColor: '#60a5fa', pointRadius: 6, pointStyle: 'triangle', showLine: false }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            title: { display: true, text: '唐奇安通道 (Turtle Reversal Suite)', color: '#fff' },
            tooltip: {
              callbacks: {
                afterLabel: function (context: any) {
                  const info = context.raw?.reason || context.dataset.reasons?.[context.dataIndex];
                  return info ? '📝 理由: ' + info : '';
                }
              }
            }
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
