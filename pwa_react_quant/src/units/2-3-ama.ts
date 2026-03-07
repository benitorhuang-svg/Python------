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

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 180" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="10%" y1="0" x2="10%" y2="100%" />
          <line x1="30%" y1="0" x2="30%" y2="100%" />
          <line x1="50%" y1="0" x2="50%" y2="100%" />
          <line x1="70%" y1="0" x2="70%" y2="100%" />
          <line x1="90%" y1="0" x2="90%" y2="100%" />
        </g>
        
        <!-- Price Line Oscillating then trending -->
        <path class="svg-animated-path" d="M 0 100 Q 30 60 60 110 T 120 70 T 180 120 T 240 80 T 280 140 Q 320 80 360 40 T 450 10" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="2" stroke-dasharray="2,2" />
        
        <!-- Standard Fast MA (Cyan) - Gets whipped around -->
        <path class="svg-animated-path" d="M 0 100 Q 35 65 65 110 T 125 75 T 185 120 T 245 85 T 285 135 Q 325 85 365 45 T 450 15" fill="none" stroke="rgba(6, 182, 212, 0.4)" stroke-width="1.5" />
        
        <!-- AMA Line (Purple) - Flattens out during chop, catches the trend -->
        <path class="svg-animated-path" d="M 0 95 Q 120 100 240 100 Q 280 100 320 80 Q 360 50 450 20" fill="none" stroke="#a855f7" stroke-width="3" />
        
        <!-- Annotations -->
        <!-- Chop Zone -->
        <rect x="20" y="55" width="230" height="90" fill="none" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4,4" rx="4" />
        <text x="135" y="45" fill="#f59e0b" font-size="11" font-weight="bold" text-anchor="middle">震盪期 ER≈0</text>
        <text x="135" y="115" fill="#a855f7" font-size="10" font-weight="bold" text-anchor="middle">AMA 呈現水平（鈍化防守）</text>

        <!-- Trend Zone -->
        <rect x="290" y="20" width="140" height="110" fill="none" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="4,4" rx="4" />
        <text x="360" y="145" fill="#22c55e" font-size="11" font-weight="bold" text-anchor="middle">爆發期 ER≈1</text>
        <text x="360" y="65" fill="#a855f7" font-size="10" font-weight="bold" text-anchor="middle" transform="rotate(-20 360 65)">AMA 迅速跟隨（轉為敏捷）</text>

        <!-- Legend -->
        <rect x="10" y="160" width="12" height="2" fill="rgba(255,255,255,0.3)" />
        <text x="26" y="164" fill="#cbd5e1" font-size="10">真實價格</text>
        
        <rect x="90" y="160" width="12" height="2" fill="rgba(6, 182, 212, 0.4)" />
        <text x="106" y="164" fill="#cbd5e1" font-size="10">傳統快均線 (易被雙巴)</text>
        
        <rect x="220" y="159" width="12" height="4" fill="#a855f7" />
        <text x="236" y="164" fill="#cbd5e1" font-size="10">自適應均線 AMA</text>
      </svg>
    </div>

    <h3>核心秘密：效率比 (Efficiency Ratio, ER)</h3>
    <p>AMA 之所以聰明，是因為它在計算平均前，會先計算當下的<strong>市場效率</strong>。公式為：</p>
    <div class="formula-box">
      ER = | 總位移 (起點到終點直線距離) | / 總路徑長 (每日波動加總)
    </div>
    <ul>
      <li><strong style="color: #22c55e;">單邊趨勢市 (ER 趨近 1)</strong>：價格直線飆升，位移等於路徑長度。系統會認知市場效率極高，自動將平滑係數切換至<strong>最快參數</strong>（如 2 日均線），緊咬趨勢不放。</li>
      <li><strong style="color: #f59e0b;">橫盤猴市 (ER 趨近 0)</strong>：價格今天漲明天跌，來回震盪，位移極小但路徑很長。系統認知市場效率極低，自動將平滑係數切換至<strong>最慢參數</strong>（如 30 日均線），變成一條死魚防守線，過濾掉所有假突破訊號。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 為什麼叫「自適應」？</strong><br>
      你不需要再手動猜測現在該用 5日 還是 20日 均線。AMA 自己就是一個「變形蟲」，它會根據市場波動率自己轉換形態，是許多高階量化機構非常喜歡的平滑過濾器。
    </div>
    
    <h3>實戰用法</h3>
    <p>AMA 由於平滑得非常漂亮，通常不需要再搭配第二條均線找交叉，而是直接當成<strong>動態支撐/壓力線</strong>來使用：站上 AMA 且 AMA 拐頭向上就做多，跌破則做空。</p>
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
