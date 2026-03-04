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
    <p><strong>MACD (Moving Average Convergence Divergence)</strong> 是一種動能趨勢指標，由 Gerald Appel 在 1970 年代末提出。它顯示了兩條價格移動平均線之間的關係。</p>

    <p>MACD 由三個部分組成：</p>
    <ul>
      <li>• <strong>DIF (快線)</strong>：短期 EMA (預設 12) 減去 長期 EMA (預設 26)。</li>
      <li>• <strong>DEA / Signal (慢線)</strong>：DIF 的 EMA (預設 9)。</li>
      <li>• <strong>MACD 柱狀圖</strong>：(DIF - DEA) × 2，用來直觀顯示快慢線的差距。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 基本交易邏輯：</strong>
      <ul>
        <li><strong>金叉買入：</strong>DIF 向上突破 DEA，或 MACD 柱狀圖由負轉正。</li>
        <li><strong>死叉賣出：</strong>DIF 向下跌破 DEA，或 MACD 柱狀圖由正轉負。</li>
        <li><strong>零軸過濾：</strong>為提高準確率，許多交易者會要求金叉必須發生在零軸上方，或死叉發生在零軸下方。</li>
      </ul>
    </div>

    <p><strong>優點：</strong>能有效捕捉中長期的明顯趨勢段，並將震盪市的雜訊進行一定程度的平滑處理。</p>
    <p><strong>缺點：</strong>它是滯後指標，在快速劇烈波動的市場中反應不及，且在無趨勢的盤整市會頻繁發出錯誤信號（左右挨打）。</p>
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
