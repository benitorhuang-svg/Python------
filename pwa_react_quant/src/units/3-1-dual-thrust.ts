import type { UnitDef } from './types';
import { renderEquityCurve } from '../engine/chart-renderer';
import { Chart } from 'chart.js';

export const unitDualThrust: UnitDef = {
    title: 'Dual Thrust 日內突破',
    module: '模組三 · 突破策略',
    difficulty: '進階',
    description: '由 Michael Boulos 提出，曾在華爾街名噪一時的經典區間突破型策略。',
    needsData: true,

    theory: `
    <p><strong>Dual Thrust</strong> 是一個著名的突破系統，適用於股票、期貨和加密貨幣。它屬於「開盤區間突破」策略的改良版。</p>

    <p>核心邏輯是計算歷史 N 天的區間波動，然後以當日開盤價為基準，加上或減去特定比例的波動，形成今日的「上軌」和「下軌」。當價格突破軌道時進場。</p>

    <div class="formula-box">
      HH = N天最高價<br>
      LC = N天最低收盤價<br>
      HC = N天最高收盤價<br>
      LL = N天最低價<br><br>
      Range = max(HH - LC, HC - LL)<br>
      上軌 = Open + K1 × Range<br>
      下軌 = Open - K2 × Range
    </div>

    <ul>
      <li><strong>看多突破：</strong> 當日價格大於「上軌」 → 買進（或平空做多）</li>
      <li><strong>看空突破：</strong> 當日價格小於「下軌」 → 賣出（或平多做空）</li>
    </ul>

    <div class="info-callout">
      <strong>📌 特色：</strong>Dual Thrust 允許 K1 和 K2 不同。如果 K1 < K2，代表做多的門檻比較低，這在多頭市場會更有利。這種非對稱性是它成功的原因之一。
    </div>
  `,

    defaultCode: `import json
import numpy as np
from indicators import Highest, Lowest, MA
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
N = 4       # 計算 Range 的天數
K1 = 0.5    # 上軌乘數 (多頭)
K2 = 0.5    # 下軌乘數 (空頭)

data = stock_data
closes = [d['Close'] for d in data]
highs = [d['High'] for d in data]
lows = [d['Low'] for d in data]
opens = [d['Open'] for d in data]

# 計算指標所需的前 N 天最大最小值
# 為了避免未來函數，計算第 i 天的軌道必須只用 i-1, i-2...等前 N 天的數據
def get_range(i):
    if i < N: return 0
    
    # 擷取前 N 天的歷史資料 (不含當日 i)
    hist_h = highs[i-N : i]
    hist_l = lows[i-N : i]
    hist_c = closes[i-N : i]
    
    HH = max(hist_h)
    LC = min(hist_c)
    HC = max(hist_c)
    LL = min(hist_l)
    
    return max(HH - LC, HC - LL)

# 為了繪圖，我們把每天的上軌下軌存起來
upper_bands = [None] * len(data)
lower_bands = [None] * len(data)

def dual_thrust_strategy(engine, data, i):
    # N天前不交易
    if i < N: return
    
    rg = get_range(i)
    upper = opens[i] + K1 * rg
    lower = opens[i] - K2 * rg
    
    # 儲存軌道用於畫圖
    upper_bands[i] = round(upper, 2)
    lower_bands[i] = round(lower, 2)
    
    current_price = closes[i]
    
    # 模擬日內突破 (為了簡化，如果當日最高價破上軌，假設收盤買進)
    if highs[i] > upper:
        engine.buy(current_price, i, "向上突破")
    elif lows[i] < lower:
        engine.sell(current_price, i, "向下突破")

# ═══ 執行回測 ═══
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(dual_thrust_strategy)

# ═══ 輸出結果 ═══
print(f"═══ Dual Thrust 策略回測 ═══")
print(f"參數: N={N}, K1={K1}, K2={K2}")
print(f"總報酬率: {report['total_return']:+.2f}%")
print(f"勝    率: {report['win_rate']:.1f}%")

chart_data = {
    **report,
    "closes": closes,
    "upper": upper_bands,
    "lower": lower_bands
}
`,

    resultVar: 'chart_data',

    renderChart: (canvasId, data) => {
        const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
        if (!parent) return;

        const priceId = canvasId + '-price';
        const equityId = canvasId + '-equity';
        parent.innerHTML = `
      <div class="chart-wrapper" style="height:350px; margin-bottom:16px;">
        <canvas id="${priceId}"></canvas>
      </div>
      <div class="chart-wrapper" style="height:250px;">
        <canvas id="${equityId}"></canvas>
      </div>
    `;

        renderEquityCurve(equityId, data);

        const ctx = document.getElementById(priceId) as HTMLCanvasElement;
        if (ctx) {
            const labels = data.dates.map((d: string, i: number) => i % Math.ceil(data.dates.length / 30) === 0 ? d : '');
            const buy = new Array(data.closes.length).fill(null);
            const sell = new Array(data.closes.length).fill(null);
            data.trades?.forEach((t: any) => {
                if (t.type === 'BUY') buy[t.index] = data.closes[t.index];
                if (t.type === 'SELL') sell[t.index] = data.closes[t.index];
            });

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels,
                    datasets: [
                        { label: '收盤價', data: data.closes, borderColor: '#e2e8f0', borderWidth: 1.5, pointRadius: 0, tension: 0.1 },
                        { label: '上軌', data: data.upper, borderColor: '#06b6d4', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, tension: 0.1 },
                        { label: '下軌', data: data.lower, borderColor: '#f59e0b', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, tension: 0.1 },
                        { label: '買入', data: buy, borderColor: '#22c55e', backgroundColor: '#22c55e', pointRadius: 5, pointStyle: 'triangle', showLine: false },
                        { label: '賣出', data: sell, borderColor: '#ef4444', backgroundColor: '#ef4444', pointRadius: 5, pointStyle: 'triangle', pointRotation: 180, showLine: false }
                    ]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#94a3b8' } }, title: { display: true, text: '📈 價格與突破軌道', color: '#e2e8f0' } },
                    scales: { x: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { color: '#64748b' } }, y: { grid: { color: 'rgba(148,163,184,0.08)' }, ticks: { color: '#64748b' } } }
                }
            });
        }
    },

    params: [
        { id: 'N', label: '週期 N', min: 2, max: 20, step: 1, default: 4, format: v => `${v} 天` },
        { id: 'K1', label: '上軌 K1', min: 0.1, max: 2.0, step: 0.1, default: 0.5, format: v => v.toFixed(1) },
        { id: 'K2', label: '下軌 K2', min: 0.1, max: 2.0, step: 0.1, default: 0.5, format: v => v.toFixed(1) }
    ],

    exercises: [
        '目前的 K1=0.5, K2=0.5 是對稱的。嘗試把 K1 改為 0.2，K2 改為 0.8，看看在多頭明顯的市場下勝率是否提升？',
        '把 N 修改為 10，軌道會變寬，交易次數會變多還是變少？'
    ],

    prevUnit: { id: '2-1', title: 'MACD 策略' },
    nextUnit: { id: '6-1', title: '馬丁格爾策略' }
};
