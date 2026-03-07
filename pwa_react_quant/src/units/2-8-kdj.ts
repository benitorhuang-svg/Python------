import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve, renderVolumeChart, renderPriceWithMA } from '../engine/chart-renderer';

export const unitKdj: UnitDef = {
    title: '隨機指標 (KDJ) 策略',
    module: '模組二 · 趨勢跟蹤',
    difficulty: '進階',
    description: 'KDJ 是一個非常靈敏的超買超賣指標，常用於捕捉日內的高低點反擊訊號。',
    needsData: true,

    theory: `
    <p><strong>KDJ 指標</strong> 是在威廉指標 (W%R) 的基礎上發展而來的。它由三條線組成：K 線、D 線和 J 線。其核心在於計算 <strong>RSV (未成熟隨機值)</strong>。</p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 160" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <!-- K Line -->
        <path class="svg-animated-path" d="M 0 100 L 50 120 L 100 80 L 150 130 L 200 40 L 250 10 L 300 85 L 350 140 L 400 60 L 450 40" fill="none" stroke="#22d3ee" stroke-width="2" />
        <!-- D Line -->
        <path class="svg-animated-path" d="M 0 100 Q 100 110 200 60 T 400 80" fill="none" stroke="#818cf8" stroke-width="2" />
        <!-- J Line -->
        <path class="svg-animated-path" d="M 0 100 L 100 70 L 200 20 L 300 100 L 400 150 L 450 10" fill="none" stroke="#fb7185" stroke-width="1.5" stroke-dasharray="2,2" />
        
        <text x="5" y="155" fill="var(--text-muted)" font-size="9">K line (Fast)</text>
        <text x="60" y="155" fill="#818cf8" font-size="9">D line (Slow)</text>
        <text x="120" y="155" fill="#fb7185" font-size="9">J line (Extreme)</text>

        <!-- Golden Cross -->
        <circle class="svg-breathe" cx="170" cy="85" r="4" fill="#34d399" />
        <text x="170" y="105" fill="#34d399" font-size="10" font-weight="bold" text-anchor="middle">金叉買入</text>

        <!-- Death Cross -->
        <circle class="svg-breathe" cx="300" cy="85" r="4" fill="#ef4444" />
        <text x="300" y="105" fill="#ef4444" font-size="10" font-weight="bold" text-anchor="middle">死叉賣出</text>
      </svg>
    </div>

    <h3>指標定義</h3>
    <ul>
      <li><strong>RSV</strong> = [(今日收盤價 - 最近N日最低價) / (最近N日最高價 - 最近N日最低價)] * 100</li>
      <li><strong>K</strong> = 2/3 * 前一日K + 1/3 * 今日RSV</li>
      <li><strong>D</strong> = 2/3 * 前一日D + 1/3 * 今日K</li>
      <li><strong>J</strong> = 3*K - 2*D (反映 K 與 D 的乖離程度)</li>
    </ul>

    <div class="info-callout">
      <strong>📌 KDJ 的層次：</strong><br>
      K 是「快速」隨機值，D 是「慢速」平均值。當 K 向上突破 D 時叫「金叉」，是買入信號。J 線最靈敏，常用於尋找極端反轉點。
    </div>

    <h3>常見實戰規則</h3>
    <ol>
      <li><strong style="color: #34d399;">低位金叉</strong>：在 20 以下發生金叉，可靠度較高。</li>
      <li><strong style="color: #ef4444;">高位死叉</strong>：在 80 以上發生死叉，代表見頂訊號。</li>
      <li><strong style="color: #fb7185;">J 軸擊穿</strong>：J > 100 或 J < 0 通常對應價格的尖銳反轉，適合短線操作。</li>
    </ol>
    `,

    defaultCode: `import json
import numpy as np
from indicators import KDJ, Cross
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
PERIOD = 9
K_PERIOD = 3
D_PERIOD = 3

# 準備數據
data = stock_data
highs = [d['High'] for d in data]
lows = [d['Low'] for d in data]
closes = [d['Close'] for d in data]

# 計算 KDJ
k, d, j = KDJ(highs, lows, closes, PERIOD, K_PERIOD, D_PERIOD)

def strategy(engine, data, i):
    if i < 1 or np.isnan(k[i]) or np.isnan(d[i]): return
    
    close = data[i]['Close']
    
    # KDJ 金叉策略：K 向上穿過 D 且在低位 (低於 30)
    if engine.position == 0:
        if k[i] > d[i] and k[i-1] <= d[i-1] and k[i] < 30:
            engine.buy(close, i, "KDJ 低位金叉")
            
    elif engine.position > 0:
        # KDJ 死叉或高位超賣平倉
        if (k[i] < d[i] and k[i-1] >= d[i-1]) or k[i] > 85:
            engine.sell(close, i, "KDJ 高位死叉/獲利結算")

# 執行回測 (包含小額滑價優化)
engine = BacktestEngine(data, initial_capital=100000, slippage=0.0003)
report = engine.run(strategy)

# 輸出結果

chart_data = {
    **report,
    "k": k, "d": d, "j": j,
    "volumes": [d['Volume'] for d in data],
    "closes": [d['Close'] for d in data]
}
`,

    resultVar: 'chart_data',

    renderChart: (canvasId, data) => {
        const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
        if (!parent) return;

        const priceId = canvasId + '-price';
        const kdjId = canvasId + '-kdj';
        const volId = canvasId + '-volume';
        const equityId = canvasId + '-equity';
        parent.innerHTML = `
          <div class="chart-wrapper" style="height:250px; margin-bottom:12px;"><canvas id="${priceId}"></canvas></div>
          <div class="chart-wrapper" style="height:120px; margin-bottom:12px;"><canvas id="${kdjId}"></canvas></div>
          <div class="chart-wrapper" style="height:120px; margin-bottom:12px;"><canvas id="${volId}"></canvas></div>
          <div class="chart-wrapper" style="height:200px;"><canvas id="${equityId}"></canvas></div>
        `;

        renderEquityCurve(equityId, data);
        renderVolumeChart(volId, data);
        renderPriceWithMA(priceId, data);
        const labels = data.dates.map((d: string, i: number) => i % Math.ceil(data.dates.length / 30) === 0 ? d : '');

        new Chart(document.getElementById(kdjId) as HTMLCanvasElement, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'K', data: data.k, borderColor: '#22d3ee', borderWidth: 1.5, pointRadius: 0, tension: 0.2 },
                    { label: 'D', data: data.d, borderColor: '#818cf8', borderWidth: 1.5, pointRadius: 0, tension: 0.2 },
                    { label: 'J', data: data.j, borderColor: '#fb7185', borderWidth: 1, borderDash: [2, 2], pointRadius: 0, tension: 0.2 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'KDJ 隨機指標', color: '#fff' } }
            }
        });
    },

    params: [
        { id: 'PERIOD', label: 'RSV 週期', min: 2, max: 20, step: 1, default: 9, format: v => `${v} 日` }
    ],

    exercises: [
        '嘗試將 J 線數值加入策略：J < 0 時買入，觀察是否能捕捉到市場的「尖銳坑」。',
        'KDJ 在橫盤震盪中表現優異，但在出現強大趨勢（大漲或大跌）時會頻繁發出假訊號，如何结合趨勢指標（如 MA）來過濾？',
        '對比 RSI 與 KDJ 的反應速度，誰更容易產生「雜訊」？'
    ],

    prevUnit: { id: '2-7', title: '相對強弱 RSI' },
    nextUnit: { id: '3-1', title: 'Dual Thrust' }
};
