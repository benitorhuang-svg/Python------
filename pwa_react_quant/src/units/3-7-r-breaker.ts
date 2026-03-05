import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitRBreaker: UnitDef = {
    title: 'R-breaker 交易策略',
    module: '模組三 · 突破策略',
    difficulty: '進階',
    description: '全美最著名的日內策略之一。透過昨日的高、低、收盤價，計算出 6 個支撐點與阻力點，來判斷本日的突破與反轉信號。',
    needsData: true,

    theory: `
    <p><strong>R-Breaker</strong> 是一個非常經典且完整的日內分析框架。由 Richard Saidenberg 開發，曾長年霸榜 Future Truth 全美頂尖十年交易策略排行榜。它巧妙地結合了「趨勢突破」與「反轉回馬槍」兩種交易概念。</p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 250" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="20%" y1="0" x2="20%" y2="100%" />
          <line x1="40%" y1="0" x2="40%" y2="100%" />
          <line x1="60%" y1="0" x2="60%" y2="100%" />
          <line x1="80%" y1="0" x2="80%" y2="100%" />
        </g>
        
        <!-- Center Pivot Line -->
        <line x1="0" y1="125" x2="450" y2="125" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4" />
        <text x="440" y="120" fill="#94a3b8" font-size="10" text-anchor="end">Pivot 基平線 (H+L+C)/3</text>

        <!-- Resistance Lines -->
        <rect x="0" y="55" width="450" height="30" fill="rgba(34, 197, 94, 0.05)" />
        <line x1="0" y1="85" x2="450" y2="85" stroke="#06b6d4" stroke-width="1.5" />
        <text x="440" y="80" fill="#06b6d4" font-size="9" text-anchor="end">阻力2 / 賣出線 (R2)</text>
        
        <line x1="0" y1="55" x2="450" y2="55" stroke="#22c55e" stroke-width="2" />
        <text x="440" y="50" fill="#22c55e" font-size="10" font-weight="bold" text-anchor="end">極限突破 / 做多買入線 (R3)</text>

        <!-- Support Lines -->
        <rect x="0" y="165" width="450" height="30" fill="rgba(239, 68, 68, 0.05)" />
        <line x1="0" y1="165" x2="450" y2="165" stroke="#8b5cf6" stroke-width="1.5" />
        <text x="440" y="160" fill="#8b5cf6" font-size="9" text-anchor="end">支撐2 / 買入線 (S2)</text>

        <line x1="0" y1="195" x2="450" y2="195" stroke="#ef4444" stroke-width="2" />
        <text x="440" y="210" fill="#ef4444" font-size="10" font-weight="bold" text-anchor="end">極限跌破 / 放空賣出線 (S3)</text>

        <!-- Price Play 1: Reversal (Fake breakout then dump) -->
        <path d="M 0 110 Q 50 60 100 70 T 150 140 T 200 120" fill="none" stroke="#f59e0b" stroke-width="2" stroke-dasharray="2,2" />
        <circle cx="95" cy="72" r="5" fill="#f59e0b" />
        <text x="95" y="60" fill="#f59e0b" font-size="9" text-anchor="middle">假突破 R2 後遇阻反轉放空</text>
        
        <!-- Price Play 2: True Breakout -->
        <path d="M 200 120 Q 250 100 280 40 T 360 10 T 450 -10" fill="none" stroke="#22c55e" stroke-width="3" />
        <circle cx="270" cy="55" r="6" fill="#facc15" stroke="#0f172a" stroke-width="2" />
        <text x="270" y="42" fill="#facc15" font-size="11" font-weight="bold" text-anchor="middle" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">真突破 R3 追多！</text>
      </svg>
    </div>

    <h3>六大關卡陣列</h3>
    <p>R-Breaker 是基於昨日的價格（最高、最低、收盤）來為今天的市場畫出 6 條楚河漢界。它的架構類似著名的 Pivot Point (樞軸點)：</p>
    <ul>
      <li><strong>Pivot (樞紐基線)</strong>：昨日的高、低、收，加上各項權重算出的一條磁鐵中心線。</li>
      <li><strong style="color: #06b6d4;">觀察緩衝區 (R1, R2 / S1, S2)</strong>：用來判斷市場是否陷入區間震盪。如果是，則在高阻力 (R2) 處放空，低支撐 (S2) 處做多。（逆勢反轉策略）</li>
      <li><strong style="color: #22c55e;">極端突破區 (R3 / S3)</strong>：代表今天發生了超級黑天鵝或大利多，買盤/賣盤徹底失控，此時放棄所有逆勢思考，全力順勢追擊。（順勢突破策略）</li>
    </ul>

    <div class="info-callout">
      <strong>📌 攻守兼備的特性：</strong><br>
      大多數量化策略只有「順勢突破」或是只有「逆勢抄底」。R-Breaker 巧妙地把它們融合在同一天的不同價位上，這讓它在單邊牛市和震盪無聊的猴市中，都能找到生存的空間。
    </div>
  `,

    defaultCode: `import json
import numpy as np
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
MULTIPLIER = 2.0  # 突破價位乘數

# 準備數據
data = stock_data
closes = [d['Close'] for d in data]

# 紀錄 R3 與 S3 軌道以供畫圖
r3_line = [None] * len(data)
s3_line = [None] * len(data)

def strategy(engine, data, i):
    # R-Breaker 需要昨日數據
    if i < 1: return
    
    h = data[i-1]['High']
    l = data[i-1]['Low']
    c = data[i-1]['Close']
    
    pivot = (h + l + c) / 3
    # 計算 R3 與 S3 突破價位 (最簡化趨勢版 R-Breaker)
    r3 = h + MULTIPLIER * (pivot - l)
    s3 = l - MULTIPLIER * (h - pivot)
    
    r3_line[i] = r3
    s3_line[i] = s3
    
    current_close = data[i]['Close']
    
    # 簡化交易邏輯：突破 R3 則全倉買入；跌破 S3 則全倉賣出
    if engine.position == 0:
        if current_close > r3:
            engine.buy(current_close, i, "R-Breaker R3 突破")
            
    elif engine.position > 0:
        if current_close < s3:
            engine.sell(current_close, i, "R-Breaker S3 跌破")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"═══ R-Breaker 趨勢突破策略 ═══")
print(f"總報酬率: {report['total_return']:+.2f}%")
print(f"最大回撤: {report['max_drawdown']:.2f}%")

chart_data = {
    **report,
    "r3": r3_line,
    "s3": s3_line
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
                    { label: 'R3 (買入價)', data: data.r3, borderColor: '#06b6d4', borderWidth: 1, borderDash: [2, 2], pointRadius: 0 },
                    { label: 'S3 (止損價)', data: data.s3, borderColor: '#ef4444', borderWidth: 1, borderDash: [2, 2], pointRadius: 0 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'R-Breaker 支撐點與阻力點', color: '#fff' } }
            }
        });
    },

    params: [
        { id: 'MULTIPLIER', label: '突破價位乘數', min: 1.0, max: 4.0, step: 0.1, default: 2.0, format: v => String(v) }
    ],

    exercises: [
        'R-Breaker 在波動大的行情（例如趨勢初期）效果極佳，試著觀察它如何避開中間的震盪波段。'
    ],

    prevUnit: { id: '3-6', title: '動態波幅突破' },
    nextUnit: { id: '4-1', title: '經典恆溫器策略' }
};
