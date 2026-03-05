import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitAroon: UnitDef = {
  title: '阿隆指標 AROON 策略',
  module: '模組二 · 趨勢跟蹤',
  difficulty: '進階',
  description: 'Aroon 指標透過觀察最近一個價格高點與低點發生的時間，來判斷趨勢的起步。',
  needsData: true,

  theory: `
    <p><strong>阿隆指標 (Aroon Indicator)</strong> 是由 Tushar Chande 開發的。它的名字在梵文中代表「黎明的光芒」。</p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 180" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="10%" y1="0" x2="10%" y2="100%" />
          <line x1="30%" y1="0" x2="30%" y2="100%" />
          <line x1="50%" y1="0" x2="50%" y2="100%" />
          <line x1="70%" y1="0" x2="70%" y2="100%" />
          <line x1="90%" y1="0" x2="90%" y2="100%" />
        </g>
        
        <!-- Axis -->
        <line x1="0" y1="140" x2="450" y2="140" stroke="#64748b" stroke-width="1" stroke-dasharray="4,4" />
        <text x="440" y="135" fill="#64748b" font-size="9" text-anchor="end">0分底線</text>
        <line x1="0" y1="20" x2="450" y2="20" stroke="#64748b" stroke-width="1" stroke-dasharray="4,4" />
        <text x="440" y="15" fill="#64748b" font-size="9" text-anchor="end">100分頂線</text>
        
        <!-- Aroon Down Line - Red -->
        <path d="M 0 30 Q 80 80 120 130 T 180 140 T 260 80 T 360 40 T 450 20" fill="none" stroke="#ef4444" stroke-width="2.5" />
        
        <!-- Aroon Up Line - Green -->
        <path d="M 0 130 Q 80 100 120 40 T 180 20 T 260 60 T 360 100 T 450 140" fill="none" stroke="#22c55e" stroke-width="2.5" />
        
        <!-- Trend Start Area -->
        <circle cx="120" cy="85" r="5" fill="#facc15" stroke="#0f172a" stroke-width="2" />
        <rect x="150" y="40" width="130" height="90" fill="none" stroke="#facc15" stroke-width="1" stroke-dasharray="4,4" rx="4" />
        <text x="215" y="80" fill="#facc15" font-size="11" font-weight="bold" text-anchor="middle">多頭黎明 (向上大交叉)</text>
        <text x="215" y="100" fill="#22c55e" font-size="10" font-weight="bold" text-anchor="middle">Up 頂撞 100 分天花板</text>
        <text x="215" y="115" fill="#ef4444" font-size="10" font-weight="bold" text-anchor="middle">Down 躺平 0 分地板</text>

        <!-- Down Trend Start -->
        <circle cx="340" cy="70" r="5" fill="#06b6d4" stroke="#0f172a" stroke-width="2" />
        <text x="340" y="55" fill="#06b6d4" font-size="11" font-weight="bold" text-anchor="middle">空頭反撲 (向下交叉)</text>

        <!-- Legend -->
        <rect x="10" y="160" width="12" height="4" fill="#22c55e" />
        <text x="26" y="166" fill="#cbd5e1" font-size="10">Aroon Up (距離最高點的天數得分)</text>
        
        <rect x="230" y="160" width="12" height="4" fill="#ef4444" />
        <text x="246" y="166" fill="#cbd5e1" font-size="10">Aroon Down (距離最低點的天數得分)</text>
      </svg>
    </div>
    
    <h3>獨特的「時間」維度</h3>
    <p>大部分的技術指標都在計算「價格到底漲/跌了多少錢」。唯獨阿隆指標，它完全不在乎價格漲跌的絕對空間，它只問一個問題：<strong>「距離上一次創出新高（或新低），已經過了幾天了？」</strong></p>
    <ul>
      <li><strong style="color: #22c55e;">Aroon Up (多頭分數)</strong>：如果今天剛好創下 25 天內的新高，Aroon Up 就是 100 分。如果最高點發生在 25 天前，它就是 0 分。</li>
      <li><strong style="color: #ef4444;">Aroon Down (空頭分數)</strong>：同理，如果今天剛好創下 25 天內的新低，Aroon Down 就是 100 分。</li>
    </ul>

    <h3>實戰交易訊號</h3>
    <p>兩條線的競速遊戲，就像多空雙方的搶椅子大賽：</p>
    <ul>
      <li><strong>極限狀態：</strong>當 Aroon Up 達到 100，且 Aroon Down 降到極低（例如 0），代表買方正在瘋狂創新高，賣方完全失憶。這是強烈趨勢的證明。</li>
      <li><strong>黃金交叉 (買入點)：</strong>當 Aroon Up 向上穿越 Aroon Down 時。這表示最近「創新高」的頻率，已經正式擊敗了「創新低」的頻率。趨勢正在黎明破曉。</li>
      <li><strong>死亡交叉 (賣出點)：</strong>當 Aroon Down 向上穿越 Aroon Up 時。表示空頭開始更頻繁地擊穿下限。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 為什麼阿隆指標常被用來作開關？</strong><br>
      在盤整期，創新高和創新低的時間會交替出現，導致 Up 和 Down 兩條線都在 50 分左右徘徊糾纏。一旦其中一條線如火箭般飆升黏住天花板，就是趨勢發動的明牌。
    </div>
  `,

  defaultCode: `import json
import numpy as np
from indicators import AROON
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
AROON_PERIOD = 25

# 準備數據
data = stock_data
highs = [d['High'] for d in data]
lows = [d['Low'] for d in data]

# 計算 Aroon
up_line, down_line = AROON(highs, lows, AROON_PERIOD)

def strategy(engine, data, i):
    if i < AROON_PERIOD: return
    
    # 阿隆交叉策略：Up 上穿 Down => 買入；Down 上穿 Up => 賣出
    if engine.position == 0:
        if up_line[i] > down_line[i] and up_line[i-1] <= down_line[i-1]:
            engine.buy(data[i]['Close'], i, "阿隆金叉")
            
    elif engine.position > 0:
        if down_line[i] > up_line[i] and down_line[i-1] <= up_line[i-1]:
            engine.sell(data[i]['Close'], i, "阿隆死叉")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"═══ 阿隆策略回測 ═══")
print(f"週期: {AROON_PERIOD}")
print(f"總報酬率: {report['total_return']:+.2f}%")
print(f"最大回撤: {report['max_drawdown']:.2f}%")

chart_data = {
    **report,
    "up": up_line,
    "down": down_line
}
`,

  resultVar: 'chart_data',

  renderChart: (canvasId, data) => {
    const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
    if (!parent) return;

    const priceId = canvasId + '-price';
    const indicatorId = canvasId + '-aroon';
    const equityId = canvasId + '-equity';
    parent.innerHTML = `
      <div class="chart-wrapper" style="height:250px; margin-bottom:12px;"><canvas id="${priceId}"></canvas></div>
      <div class="chart-wrapper" style="height:150px; margin-bottom:12px;"><canvas id="${indicatorId}"></canvas></div>
      <div class="chart-wrapper" style="height:200px;"><canvas id="${equityId}"></canvas></div>
    `;

    renderEquityCurve(equityId, data);
    const labels = data.dates.map((d: string, i: number) => i % Math.ceil(data.dates.length / 30) === 0 ? d : '');

    // Indicator Chart
    new Chart(document.getElementById(indicatorId) as HTMLCanvasElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Aroon Up', data: data.up, borderColor: '#22c55e', borderWidth: 2, pointRadius: 0 },
          { label: 'Aroon Down', data: data.down, borderColor: '#ef4444', borderWidth: 2, pointRadius: 0 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { title: { display: true, text: 'Aroon Up/Down', color: '#fff' } },
        scales: { y: { min: 0, max: 100 } }
      }
    });
  },

  params: [
    { id: 'AROON_PERIOD', label: '阿隆週期', min: 10, max: 60, step: 5, default: 25, format: v => `${v} 日` }
  ],

  exercises: [
    '當 Aroon Up 與 Down 同時保持低位（< 30）時，這意味著市場處於什麼狀態？',
    '嘗試將週期縮短到 14，觀察交叉頻率是否變得過高導致過多交易代價。'
  ],

  prevUnit: { id: '2-3', title: '自適應均線 AMA' },
  nextUnit: { id: '2-5', title: '簡易波動 EMV' }
};
