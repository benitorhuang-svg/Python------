import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitHans123: UnitDef = {
  title: 'Hans123 日內突破策略',
  module: '模組三 · 突破策略',
  difficulty: '進階',
  description: 'Hans123 被稱為歐洲最流行的日內交易系統，它透過判斷開盤第一段時間的高低點，來決定本日的交易方向。',
  needsData: true,

  theory: `
    <p><strong>Hans123 策略</strong> 是外匯市場與期貨日內交易中，最著名的「早盤突破系統」之一。它的核心哲學是：「<strong>早晨的躁動結束後，真正的趨勢才會浮現。</strong>」</p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 200" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="20%" y1="0" x2="20%" y2="100%" />
          <line x1="40%" y1="0" x2="40%" y2="100%" />
          <line x1="60%" y1="0" x2="60%" y2="100%" />
          <line x1="80%" y1="0" x2="80%" y2="100%" />
        </g>
        
        <!-- Morning Observation Box -->
        <rect x="0" y="50" width="120" height="90" fill="rgba(148, 163, 184, 0.15)" stroke="#94a3b8" stroke-width="1" stroke-dasharray="4,4" />
        <text x="60" y="100" fill="#94a3b8" font-size="11" font-weight="bold" text-anchor="middle">早盤觀察期 (不交易)</text>
        <line x1="120" y1="0" x2="120" y2="200" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="2,2" />
        <text x="125" y="15" fill="#f59e0b" font-size="10" font-weight="bold">觀察期結束 (N根K線)</text>

        <!-- Upper/Lower Limits established by the box -->
        <line x1="0" y1="50" x2="450" y2="50" stroke="#06b6d4" stroke-width="2" />
        <text x="440" y="45" fill="#06b6d4" font-size="10" text-anchor="end">上軌 = 早盤最高價 (做多線)</text>
        
        <line x1="0" y1="140" x2="450" y2="140" stroke="#ef4444" stroke-width="2" />
        <text x="440" y="135" fill="#ef4444" font-size="10" text-anchor="end">下軌 = 早盤最低價 (放空線)</text>

        <!-- Price Path: whipsaws inside the box, then breaks out -->
        <path d="M 0 100 Q 20 60 40 120 T 80 50 T 130 110 T 180 80 T 220 130 Q 260 40 320 20 T 450 10" fill="none" stroke="#22c55e" stroke-width="2.5" />
        
        <!-- Breakout Signal -->
        <circle cx="253" cy="50" r="6" fill="#facc15" stroke="#0f172a" stroke-width="2" />
        <line x1="253" y1="50" x2="253" y2="80" stroke="#facc15" stroke-width="1" stroke-dasharray="2,2" />
        <text x="253" y="95" fill="#facc15" font-size="11" font-weight="bold" text-anchor="middle" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">突破早盤高點！(追多)</text>
      </svg>
    </div>
    
    <h3>交易邏輯設計</h3>
    <p>市場開盤的第一個小時通常是最混亂的，因為各種隔夜消息、散戶恐慌與機構建倉都在這時候發生。Hans123 選擇在最混亂的時候<strong>「作壁上觀」</strong>：</p>
    <ol>
      <li><strong>圈出拳擊擂台</strong>：從開盤起算 N 根 K 線（例如台指期的前 30 分鐘或前 1 小時），記錄這段時間的最高價與最低價，畫出一個「早盤箱型」。</li>
      <li><strong>等待表態</strong>：過了觀察期後，如果價格向上突破這個箱子的天花板（上軌），代表多方取得了當日的統治權，順勢做多。</li>
      <li><strong>反殺放空</strong>：如果價格向下跌破箱子的地板（下軌），代表空方主導，順勢做空。</li>
    </ol>

    <div class="info-callout">
      <strong>📌 為什麼這個策略如此經典？</strong><br>
      因為它完美避開了開盤時無序的「多空雙巴」。它讓市場自己告訴你今天的真實方向。這種「定時箱型突破」在波動率夠大的市場（如加密貨幣早盤、美股開盤）勝率極高。通常會在快收盤時強制定平倉，不留過夜（避免跳空風險）。
    </div>
  `,

  defaultCode: `import json
import numpy as np
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
OPEN_BARS = 30      # 觀察開盤後前 N 根 K 線作為區間 (在日線模式下，我們用歷史循環的前段來模擬)

# 準備數據
data = stock_data
closes = [d['Close'] for d in data]
highs = [d['High'] for d in data]
lows = [d['Low'] for d in data]

# 計算開盤區間 (模擬)
# 這裡取數據的前 OPEN_BARS 個來當作本日的開盤觀察期 (假設數據為當日切片)
upper_limit = max(highs[:OPEN_BARS])
lower_limit = min(lows[:OPEN_BARS])

def strategy(engine, data, i):
    # 觀察期內不交易
    if i < OPEN_BARS: return
    
    current_close = data[i]['Close']
    
    # 交易邏輯：收盤價突破開盤期高點買入，跌破低點賣出
    if engine.position == 0:
        if current_close > upper_limit:
            engine.buy(current_close, i, "Hans123 突破上軌")
            
    elif engine.position > 0:
        if current_close < lower_limit:
            engine.sell(current_close, i, "Hans123 跌破下軌")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"═══ Hans123 策略回測 ═══")
print(f"開盤觀察數: {OPEN_BARS}")
print(f"總報酬率: {report['total_return']:+.2f}%")

chart_data = {
    **report,
    "upper": upper_limit,
    "lower": lower_limit
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
          { label: ' Hans123 上軌', data: new Array(data.closes.length).fill(data.upper), borderColor: '#06b6d4', borderWidth: 1, borderDash: [5, 5], pointRadius: 0 },
          { label: ' Hans123 下軌', data: new Array(data.closes.length).fill(data.lower), borderColor: '#ef4444', borderWidth: 1, borderDash: [5, 5], pointRadius: 0 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
  },

  params: [
    { id: 'OPEN_BARS', label: '觀察根數 (N)', min: 10, max: 100, step: 5, default: 30, format: v => `${v} 根` }
  ],

  exercises: [
    '當 N 值取得愈大，這條突破線是變得更容易還是更難突破？對勝率有何影響？'
  ],

  prevUnit: { id: '3-3', title: '增強版唐奇安通道' },
  nextUnit: { id: '3-5', title: '菲阿里四價策略' }
};
