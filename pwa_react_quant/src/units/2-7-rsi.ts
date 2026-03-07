import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve, renderVolumeChart, renderPriceWithMA } from '../engine/chart-renderer';

export const unitRsi: UnitDef = {
    title: '相對強弱指數 (RSI) 策略',
    module: '模組二 · 趨勢跟蹤',
    difficulty: '基礎',
    description: 'RSI 用於衡量價格上漲與下跌力度的相對強弱，是判斷市場超買或超賣的最經典指標。',
    needsData: true,

    theory: `
    <p><strong>相對強弱指數 (Relative Strength Index, RSI)</strong> 由 J. Welles Wilder 在 1978 年開發。它的核心邏輯非常直觀：<strong>最近的上漲力道相對於下跌力道有多強？</strong></p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 150" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <!-- RSI Zones -->
        <rect x="0" y="0" width="450" height="30" fill="rgba(251, 113, 133, 0.1)" />
        <rect x="0" y="120" width="450" height="30" fill="rgba(52, 211, 153, 0.1)" />
        
        <line x1="0" y1="30" x2="450" y2="30" stroke="#fb7185" stroke-width="1" stroke-dasharray="2,2" />
        <text x="440" y="25" fill="#fb7185" font-size="9" text-anchor="end">70 超買界限</text>

        <line x1="0" y1="75" x2="450" y2="75" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
        <text x="440" y="70" fill="var(--text-muted)" font-size="9" text-anchor="end">50 多空分界</text>

        <line x1="0" y1="120" x2="450" y2="120" stroke="#34d399" stroke-width="1" stroke-dasharray="2,2" />
        <text x="440" y="115" fill="#34d399" font-size="9" text-anchor="end">30 超賣界限</text>

        <!-- RSI Curve -->
        <path class="svg-animated-path" d="M 0 80 Q 50 100 100 135 T 200 60 T 300 15 T 400 90 T 450 110" fill="none" stroke="#60a5fa" stroke-width="3" />
        
        <!-- Markers -->
        <circle class="svg-breathe" cx="130" cy="130" r="5" fill="#34d399" />
        <text x="135" y="145" fill="#34d399" font-size="10" font-weight="bold">極度恐慌/超賣</text>

        <circle class="svg-breathe" cx="280" cy="20" r="5" fill="#fb7185" />
        <text x="280" y="45" fill="#fb7185" font-size="10" font-weight="bold" text-anchor="middle">瘋狂追漲/超買</text>
      </svg>
    </div>

    <h3>指標計算邏輯 (14日)</h3>
    <p>RSI 的數值介於 0 到 100 之間：</p>
    <ul>
      <li><strong>RSI = 100 - [100 / (1 + RS)]</strong></li>
      <li><strong>RS (相對強度)</strong> = 14日平均上漲幅度 / 14日平均下跌幅度</li>
    </ul>

    <h3>實戰交易訊號</h3>
    <ol>
      <li><strong style="color: #fb7185;">超買 (Overbought)</strong>：當 RSI > 70 時，代表近期漲勢過猛，隨時可能回調。</li>
      <li><strong style="color: #34d399;">超賣 (Oversold)</strong>：當 RSI < 30 時，代表市場過度悲觀，跌勢可能耗盡。</li>
      <li><strong style="color: #60a5fa;">背離 (Divergence)</strong>：價格創新高但 RSI 卻走低，是強烈的趨勢反轉預警。</li>
    </ol>
    `,

    defaultCode: `import json
import numpy as np
from indicators import RSI
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
PERIOD = 14
UP_BOUND = 70
LOW_BOUND = 30

# 準備數據
data = stock_data
closes = [d['Close'] for d in data]

# 計算 RSI
rsi = RSI(closes, PERIOD)

def strategy(engine, data, i):
    if i < PERIOD: return
    if np.isnan(rsi[i]): return
    
    close = data[i]['Close']
    
    # 策略：RSI 低於 30 買入，高於 70 賣出
    if engine.position == 0:
        if rsi[i] < LOW_BOUND:
            engine.buy(close, i, f"RSI={rsi[i]:.1f}：低位超賣買入")
            
    elif engine.position > 0:
        if rsi[i] > UP_BOUND:
            engine.sell(close, i, f"RSI={rsi[i]:.1f}：高位超買賣出")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000, slippage=0.0002)
report = engine.run(strategy)

# 輸出結果

chart_data = {
    **report,
    "rsi": rsi,
    "up_bound": UP_BOUND,
    "low_bound": LOW_BOUND,
    "volumes": [d['Volume'] for d in data],
    "closes": [d['Close'] for d in data]
}
`,

    resultVar: 'chart_data',

    renderChart: (canvasId, data) => {
        const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
        if (!parent) return;

        const priceId = canvasId + '-price';
        const rsiId = canvasId + '-rsi';
        const volId = canvasId + '-volume';
        const equityId = canvasId + '-equity';
        parent.innerHTML = `
          <div class="chart-wrapper" style="height:250px; margin-bottom:12px;"><canvas id="${priceId}"></canvas></div>
          <div class="chart-wrapper" style="height:120px; margin-bottom:12px;"><canvas id="${rsiId}"></canvas></div>
          <div class="chart-wrapper" style="height:120px; margin-bottom:12px;"><canvas id="${volId}"></canvas></div>
          <div class="chart-wrapper" style="height:200px;"><canvas id="${equityId}"></canvas></div>
        `;

        renderEquityCurve(equityId, data);
        renderVolumeChart(volId, data);
        renderPriceWithMA(priceId, data);
        const labels = data.dates.map((d: string, i: number) => i % Math.ceil(data.dates.length / 30) === 0 ? d : '');

        new Chart(document.getElementById(rsiId) as HTMLCanvasElement, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'RSI', data: data.rsi, borderColor: '#60a5fa', borderWidth: 2, pointRadius: 0, tension: 0.1 },
                    { label: '超買線', data: new Array(data.rsi.length).fill(data.up_bound), borderColor: '#fb7185', borderWidth: 1, borderDash: [2, 2], pointRadius: 0 },
                    { label: '超賣線', data: new Array(data.rsi.length).fill(data.low_bound), borderColor: '#34d399', borderWidth: 1, borderDash: [2, 2], pointRadius: 0 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'RSI 相對強弱指標', color: '#fff' } },
                scales: { y: { min: 0, max: 100 } }
            }
        });
    },

    params: [
        { id: 'PERIOD', label: 'RSI 週期', min: 2, max: 30, step: 1, default: 14, format: v => `${v} 日` },
        { id: 'UP_BOUND', label: '超買閾值', min: 60, max: 90, step: 1, default: 70, format: v => `RSI > ${v}` },
        { id: 'LOW_BOUND', label: '超賣閾值', min: 10, max: 40, step: 1, default: 30, format: v => `RSI < ${v}` }
    ],

    exercises: [
        '嘗試縮短週期到 6 日，觀察 RSI 跳動是否變大？是否導致頻繁交易？',
        '「鈍化」現象：當 RSI 長期處於 70 以上，單純賣出可能會錯失大噴發趨勢。如何解決？',
        '將買入條件改為「RSI 由下往上穿過 50」，觀察性質轉變。'
    ],

    prevUnit: { id: '2-6', title: '布林帶 Bollinger' },
    nextUnit: { id: '2-8', title: '隨機指標 KDJ' }
};
