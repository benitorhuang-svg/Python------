import type { UnitDef } from './types';
import { renderPriceWithMA } from '../engine/chart-renderer';
import { Chart } from 'chart.js';

export const unitMacd: UnitDef = {
    title: '經典 MACD 策略',
    module: '模組二 · 趨勢跟蹤',
    difficulty: '進階',
    description: '利用 MACD (平滑異同移動平均線) 的快慢線交叉與零軸穿越來捕捉市場趨勢。',
    needsData: true,

    theory: `
    <p><strong>MACD (Moving Average Convergence Divergence)</strong> 是一種動能趨勢指標，由 Gerald Appel 在 1970 年代末提出。它顯示了兩條價格移動平均線之間的關係與乖離程度。</p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 180" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="10%" y1="0" x2="10%" y2="100%" />
          <line x1="30%" y1="0" x2="30%" y2="100%" />
          <line x1="50%" y1="0" x2="50%" y2="100%" />
          <line x1="70%" y1="0" x2="70%" y2="100%" />
          <line x1="90%" y1="0" x2="90%" y2="100%" />
        </g>
        
        <!-- Zero Line -->
        <line x1="0" y1="90" x2="450" y2="90" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="4,4" />
        <text x="440" y="85" fill="#94a3b8" font-size="10" text-anchor="end">零軸 (Zero Line)</text>

        <!-- MACD Histogram -->
        <rect x="50" y="90" width="8" height="20" fill="rgba(239, 68, 68, 0.4)" stroke="#ef4444" stroke-width="1" />
        <rect x="70" y="90" width="8" height="15" fill="rgba(239, 68, 68, 0.4)" stroke="#ef4444" stroke-width="1" />
        <rect x="90" y="90" width="8" height="5" fill="rgba(239, 68, 68, 0.4)" stroke="#ef4444" stroke-width="1" />
        <rect x="110" y="80" width="8" height="10" fill="rgba(34, 197, 94, 0.4)" stroke="#22c55e" stroke-width="1" />
        <rect x="130" y="65" width="8" height="25" fill="rgba(34, 197, 94, 0.4)" stroke="#22c55e" stroke-width="1" />
        <rect x="150" y="45" width="8" height="45" fill="rgba(34, 197, 94, 0.4)" stroke="#22c55e" stroke-width="1" />
        <rect x="170" y="60" width="8" height="30" fill="rgba(34, 197, 94, 0.4)" stroke="#22c55e" stroke-width="1" />
        <rect x="190" y="85" width="8" height="5" fill="rgba(34, 197, 94, 0.4)" stroke="#22c55e" stroke-width="1" />
        <rect x="210" y="90" width="8" height="15" fill="rgba(239, 68, 68, 0.4)" stroke="#ef4444" stroke-width="1" />
        <rect x="230" y="90" width="8" height="40" fill="rgba(239, 68, 68, 0.4)" stroke="#ef4444" stroke-width="1" />
        
        <!-- DEA Line (Slow) Orange -->
        <path d="M 10 120 Q 150 20 250 130 T 450 60" fill="none" stroke="#f59e0b" stroke-width="2" />
        
        <!-- DIF Line (Fast) Cyan -->
        <path d="M 10 150 Q 130 -30 220 160 T 450 20" fill="none" stroke="#06b6d4" stroke-width="2" />
        
        <!-- Golden Cross Point -->
        <circle cx="102" cy="88" r="6" fill="#facc15" stroke="#0f172a" stroke-width="2" />
        <text x="102" y="68" fill="#facc15" font-size="11" font-weight="bold" text-anchor="middle" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">金叉 (綠柱浮現)</text>

        <!-- Death Cross Point -->
        <circle cx="203" cy="98" r="6" fill="#ef4444" stroke="#0f172a" stroke-width="2" />
        <text x="203" y="123" fill="#ef4444" font-size="11" font-weight="bold" text-anchor="middle" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">死叉 (紅柱浮現)</text>
        
        <!-- Legend -->
        <rect x="20" y="20" width="12" height="3" fill="#06b6d4" />
        <text x="36" y="25" fill="#cbd5e1" font-size="10">DIF 快線</text>
        <rect x="20" y="35" width="12" height="3" fill="#f59e0b" />
        <text x="36" y="40" fill="#cbd5e1" font-size="10">DEA 慢線</text>
        <rect x="20" y="50" width="12" height="8" fill="rgba(34, 197, 94, 0.6)" stroke="#22c55e" stroke-width="1" />
        <text x="36" y="58" fill="#cbd5e1" font-size="10">MACD 能量柱</text>
      </svg>
    </div>

    <h3>指標的三大靈魂元件</h3>
    <ul style="list-style-type: none; padding-left: 0;">
      <li style="margin-bottom: 12px;"><strong style="color: #06b6d4;">① DIF (快線 / 差離值)</strong>：<br>短期 EMA (12日) 減去 長期 EMA (26日)。它代表「近期價格趨勢」與「長期價格趨勢」的距離。</li>
      <li style="margin-bottom: 12px;"><strong style="color: #f59e0b;">② DEA / Signal (慢線 / 訊號線)</strong>：<br>DIF 再取一次 EMA 平滑 (通常是 9日)。它用來給跳動的 DIF 抓出一個穩定的移動軌跡。</li>
      <li><strong style="color: #22c55e;">③ MACD 柱狀圖 (Histogram)</strong>：<br>(DIF - DEA) × 2。這是最直觀的動能展現。當柱子變長，代表趨勢正在加速；柱子縮短，代表動能正在衰退。</li>
    </ul>

    <h3>交易邏輯與實戰技巧</h3>
    <p>比起單純的雙均線交叉，MACD 提供了更多的「動能預警」資訊：</p>
    <ul>
      <li><strong>基本金叉/死叉：</strong>DIF 向上突破 DEA 買入（紅柱轉綠柱）；DIF 向下跌破 DEA 賣出（綠柱轉紅柱）。</li>
      <li><strong>零軸的意義：</strong>零軸上方代表多頭市場，零軸下方代表空頭市場。<b>「零軸上的金叉」</b>勝率通常遠大於零軸下的金叉。</li>
      <li><strong>背離 (Divergence)：</strong>高階用法。當價格創新高，但 MACD 柱狀圖（或 DIF）卻沒有創出新高（甚至走低），這被稱為「頂背離」，是強烈的反轉離場訊號。</li>
    </ul>

    <h3>策略特性評估</h3>
    <p><strong>✅ 優點：</strong>MACD 比起一般的均線，將「雜訊平滑處理」做得非常好，能夠穩定抓出波段中長期的明顯趨勢段。</p>
    <p><strong>❌ 缺點：</strong>它是典型的「滯後指標」，也就是趨勢發動了一段時間它才會轉向。此外，在「橫盤無波動」的死水市裡，DIF 與 DEA 會像麻花一樣糾纏在一起，導致買賣訊號頻繁雙巴虧損。</p>
  `,

    defaultCode: `import json
import numpy as np
from indicators import MACD, Cross
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
FAST_PERIOD = 12    # 快線 EMA 週期
SLOW_PERIOD = 26    # 慢線 EMA 週期
SIGNAL_PERIOD = 9   # 訊號線 EMA 週期

# ═══ 載入數據 ═══
data = stock_data
closes = [d['Close'] for d in data]

# ═══ 計算指標 ═══
# MACD 回傳三個陣列：DIF, DEA, 柱狀圖(MACD_hist)
dif, dea, macd_hist = MACD(closes, FAST_PERIOD, SLOW_PERIOD, SIGNAL_PERIOD)
cross_signal = Cross(dif, dea)

# ═══ 定義策略函數 ═══
def macd_strategy(engine, data, i):
    # 確保指標已產生有效數值
    if i < SLOW_PERIOD + SIGNAL_PERIOD:
        return

    # 金叉買入
    if cross_signal[i] == 1:
        engine.buy(data[i]['Close'], i, "MACD 金叉")
    # 死叉賣出
    elif cross_signal[i] == -1:
        engine.sell(data[i]['Close'], i, "MACD 死叉")

# ═══ 執行回測 ═══
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(macd_strategy)

# ═══ 輸出結果 ═══
print(f"═══ MACD 策略回測結果 ═══")
print(f"參數: {FAST_PERIOD},{SLOW_PERIOD},{SIGNAL_PERIOD}")
print(f"初始資金: {report['initial_capital']:,.0f}")
print(f"最終資金: {report['final_capital']:,.2f}")
print(f"總報酬率: {report['total_return']:+.2f}%")
print(f"勝    率: {report['win_rate']:.1f}%")
print(f"最大回撤: {report['max_drawdown']:.2f}%")

chart_data = {
    **report,
    "closes": closes,
    "dif": [None if np.isnan(v) else round(v, 3) for v in dif],
    "dea": [None if np.isnan(v) else round(v, 3) for v in dea],
    "macd": [None if np.isnan(v) else round(v, 3) for v in macd_hist]
}
`,

    resultVar: 'chart_data',

    renderChart: (canvasId, data) => {
        const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
        if (parent) {
            const priceId = canvasId + '-price';
            const macdId = canvasId + '-macd';

            parent.innerHTML = `
        <div class="chart-wrapper" style="height:250px; margin-bottom:16px;">
          <canvas id="${priceId}"></canvas>
        </div>
        <div class="chart-wrapper" style="height:200px;">
          <canvas id="${macdId}"></canvas>
        </div>
      `;

            // 繪製價格圖與交易點位
            renderPriceWithMA(priceId, {
                closes: data.closes || data.dates.map(() => null),
                dates: data.dates,
                trades: data.trades,
            });

            // 自訂繪製 MACD 圖表
            const ctx = document.getElementById(macdId) as HTMLCanvasElement;
            if (ctx) {
                const labels = data.dates.map((d: string, i: number) => i % Math.ceil(data.dates.length / 30) === 0 ? d : '');
                // 取得顏色配置
                const getBarColor = (val: number) => val >= 0 ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)';
                const getBarBorder = (val: number) => val >= 0 ? '#22c55e' : '#ef4444';

                const barColors = data.macd.map((v: number | null) => v !== null ? getBarColor(v) : 'transparent');
                const barBorders = data.macd.map((v: number | null) => v !== null ? getBarBorder(v) : 'transparent');

                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels,
                        datasets: [
                            {
                                type: 'line',
                                label: 'DIF (快線)',
                                data: data.dif,
                                borderColor: '#06b6d4',
                                borderWidth: 1.5,
                                pointRadius: 0,
                                tension: 0.2
                            },
                            {
                                type: 'line',
                                label: 'DEA (慢線)',
                                data: data.dea,
                                borderColor: '#f59e0b',
                                borderWidth: 1.5,
                                pointRadius: 0,
                                tension: 0.2
                            },
                            {
                                type: 'bar',
                                label: 'MACD (柱狀圖)',
                                data: data.macd,
                                backgroundColor: barColors,
                                borderColor: barBorders,
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { labels: { color: '#94a3b8', font: { family: "'Noto Sans TC', sans-serif", size: 10 } } },
                            title: { display: true, text: '📊 MACD 指標', color: '#e2e8f0', font: { family: "'Noto Sans TC'", size: 14, weight: 'bold' as const } }
                        },
                        scales: {
                            x: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { color: '#64748b', maxTicksLimit: 10 } },
                            y: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { color: '#64748b' } }
                        }
                    }
                });
            }
        }
    },

    params: [
        { id: 'FAST_PERIOD', label: '快線週期', min: 5, max: 20, step: 1, default: 12, format: v => `${v}` },
        { id: 'SLOW_PERIOD', label: '慢線週期', min: 15, max: 50, step: 1, default: 26, format: v => `${v}` },
        { id: 'SIGNAL_PERIOD', label: '訊號週期', min: 5, max: 20, step: 1, default: 9, format: v => `${v}` }
    ],

    exercises: [
        '目前的策略在震盪市會產生很多交易。嘗試加上條件：只在 DIF 和 DEA 都在零軸以上時才允許買入。',
        '嘗試將參數改為短線常用的 6, 13, 5，並觀察交易次數。'
    ],

    prevUnit: { id: '1-1', title: '雙均線策略' },
    nextUnit: { id: '3-1', title: 'Dual Thrust' }
};
