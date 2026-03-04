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
    <p><strong>R-Breaker</strong> 是一個結合了「趨勢突破」與「反轉回馬槍」的混和交易策略。它由 Richard Saidenberg 開發，曾多次進入全美頂尖策略排行榜。</p>
    
    <p>它每天會計算出 6 個關鍵價位：</p>
    <ul>
      <li><strong>突破買入價 (R3)</strong>：高點突破極限。</li>
      <li><strong>反轉點位 (R2 / S2)</strong>：強阻力與強支撐，適合觀察反向動能。</li>
      <li><strong>突破賣出價 (S3)</strong>：低點跌破極限。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 核心精神：</strong><br>
      如果價格突破 R3（最上方紅線），則強烈買入捕捉趨勢爆發。如果價格雖然進入 R2 但隨即回落，則可能是假突破，進場做反轉。
    </div>
  `,

    defaultCode: `import json
import numpy as np
from backtest_engine import BacktestEngine

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
    r3 = h + 2 * (pivot - l)
    s3 = l - 2 * (h - pivot)
    
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

    params: [],

    exercises: [
        'R-Breaker 在波動大的行情（例如趨勢初期）效果極佳，試著觀察它如何避開中間的震盪波段。'
    ],

    prevUnit: { id: '3-6', title: '動態波幅突破' },
    nextUnit: { id: '4-1', title: '經典恆溫器策略' }
};
