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
    <p><strong>動態波幅突破 (Dynamic Volatility Breakout)</strong> 是一種「隨機應變」的智能突破系統。它拋棄了死板的固定點數，改用<strong>真實波動幅度 (ATR)</strong> 來自動調整突破軌道的寬度。</p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 200" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="20%" y1="0" x2="20%" y2="100%" />
          <line x1="40%" y1="0" x2="40%" y2="100%" />
          <line x1="60%" y1="0" x2="60%" y2="100%" />
          <line x1="80%" y1="0" x2="80%" y2="100%" />
        </g>
        
        <!-- Period 1: Low Volatility (Narrow Channel) -->
        <rect x="0" y="80" width="150" height="40" fill="rgba(6, 182, 212, 0.05)" />
        <path d="M 0 80 Q 75 90 150 80" fill="none" stroke="#06b6d4" stroke-width="2" stroke-dasharray="4,4" />
        <path d="M 0 120 Q 75 110 150 120" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,4" />
        
        <path d="M 0 100 Q 30 110 60 90 T 130 95 T 150 100" fill="none" stroke="#cbd5e1" stroke-width="1.5" />
        <text x="75" y="145" fill="#94a3b8" font-size="10" text-anchor="middle">低波動期 (ATR極小)</text>
        <line x1="75" y1="80" x2="75" y2="120" stroke="#06b6d4" stroke-width="1" />
        <text x="78" y="105" fill="#06b6d4" font-size="9" text-anchor="start">窄軌道</text>

        <!-- Divider -->
        <line x1="150" y1="20" x2="150" y2="180" stroke="#64748b" stroke-width="1" stroke-dasharray="2,2" />

        <!-- Period 2: High Volatility (Wide Channel) -->
        <rect x="150" y="40" width="300" height="120" fill="rgba(6, 182, 212, 0.05)" />
        <path d="M 150 40 Q 300 30 450 40" fill="none" stroke="#06b6d4" stroke-width="2" stroke-dasharray="4,4" />
        <path d="M 150 160 Q 300 170 450 160" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,4" />
        
        <path d="M 150 100 Q 180 140 210 60 T 270 150 T 320 60 T 380 110" fill="none" stroke="#cbd5e1" stroke-width="1.5" />
        <text x="250" y="185" fill="#94a3b8" font-size="10" text-anchor="middle">高波動震盪期 (ATR極大)</text>
        <line x1="250" y1="40" x2="250" y2="160" stroke="#06b6d4" stroke-width="1" />
        <text x="255" y="105" fill="#06b6d4" font-size="9" text-anchor="start">寬軌道防守</text>

        <!-- Dynamic Breakout -->
        <path d="M 380 110 Q 400 80 430 10" fill="none" stroke="#22c55e" stroke-width="2.5" />
        <circle cx="415" cy="40" r="5" fill="#facc15" stroke="#0f172a" stroke-width="2" />
        <text x="415" y="30" fill="#facc15" font-size="11" font-weight="bold" text-anchor="middle" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">真突破！</text>
      </svg>
    </div>
    
    <h3>原理：像呼吸一樣收縮的通道</h3>
    <p>市場的波動性是會週期性改變的。有時候像死水，有時候像波濤洶湧的海洋。固定點數的突破盲點在於：在死水期難以觸發，在海嘯期卻又頻繁被假突破掃到停損。</p>
    <ul>
      <li><strong style="color: #64748b;">基準價格</strong>: 通常使用今日開盤價或昨日收盤價。</li>
      <li><strong style="color: #06b6d4;">動態上軌 (多頭觸發線)</strong> = 基準價 + ( N 日 ATR × 係數 K1 )</li>
      <li><strong style="color: #f59e0b;">動態下軌 (空頭觸發線)</strong> = 基準價 - ( N 日 ATR × 係數 K2 )</li>
    </ul>

    <div class="info-callout">
      <strong>📌 為什麼要用 ATR (Average True Range)？</strong><br>
      ATR 精準衡量了最近一段時間每天的「平均最大振幅」。<br>
      當市場平靜時 (ATR 小)，系統判定「稍微動一下可能就是新趨勢」，所以主動把上下軌<strong>收窄</strong>，變得極度敏感。<br>
      當市場劇烈震盪時 (ATR 大)，系統判定「現在充滿雜訊雜音」，所以主動把上下軌<strong>拉寬</strong>，避免被來回雙巴。這是量化高手中非常高級的濾網技巧。
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
