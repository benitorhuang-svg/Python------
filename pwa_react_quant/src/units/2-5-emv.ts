import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitEmv: UnitDef = {
    title: '簡易波動 EMV 策略',
    module: '模組二 · 趨勢跟蹤',
    difficulty: '進階',
    description: 'Ease of Movement (EMV) 結合了價格變動與成交量，尋找「輕鬆上漲」或「輕鬆下跌」的低阻力區間。',
    needsData: true,

    theory: `
    <p><strong>簡易波動指標 (Ease of Movement, EMV)</strong> 由 Richard Arms 開發，它的核心邏輯非常獨特：</p>
    
    <p>它衡量的是「價格變動」與「成交量」之間的關係：</p>
    <ul>
      <li><strong>EMV 高於 0</strong>：價格上漲且成交量不大。這代表市場阻力極小，上漲非常「輕鬆」。</li>
      <li><strong>EMV 低於 0</strong>：價格下跌且成交量不大。這代表下跌阻力極小。</li>
      <li><strong>EMV 接近 0</strong>：價格不動，或是成交量極大但價格推不動。這通常代表阻力重重。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 交易提示：</strong><br>
      我們通常使用 EMV 的移動平均線。當 EMV 向上穿過 0 軸時，是一個強大的買入訊號，表示空方已無力阻擋。
    </div>
  `,

    defaultCode: `import json
import numpy as np
from indicators import EMV, Cross
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
EMV_PERIOD = 14

# 準備數據
data = stock_data
highs = [d['High'] for d in data]
lows = [d['Low'] for d in data]
vols = [d['Volume'] for d in data]

# 計算 EMV (EMA 14)
emv = EMV(highs, lows, vols, EMV_PERIOD)

def strategy(engine, data, i):
    if i < 1: return
    if np.isnan(emv[i]) or np.isnan(emv[i-1]): return
    
    # 策略：EMV 上穿 0 => 買入；EMV 下穿 0 => 賣出
    if engine.position == 0:
        if emv[i] > 0 and emv[i-1] <= 0:
            engine.buy(data[i]['Close'], i, "EMV 零軸金叉")
            
    elif engine.position > 0:
        if emv[i] < 0 and emv[i-1] >= 0:
            engine.sell(data[i]['Close'], i, "EMV 零軸死叉")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"═══ EMV 策略回測 ═══")
print(f"總報酬率: {report['total_return']:+.2f}%")
print(f"最大回撤: {report['max_drawdown']:.2f}%")

chart_data = {
    **report,
    "emv": emv
}
`,

    resultVar: 'chart_data',

    renderChart: (canvasId, data) => {
        const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
        if (!parent) return;

        const priceId = canvasId + '-price';
        const indicatorId = canvasId + '-emv';
        const equityId = canvasId + '-equity';
        parent.innerHTML = `
      <div class="chart-wrapper" style="height:250px; margin-bottom:12px;"><canvas id="${priceId}"></canvas></div>
      <div class="chart-wrapper" style="height:150px; margin-bottom:12px;"><canvas id="${indicatorId}"></canvas></div>
      <div class="chart-wrapper" style="height:200px;"><canvas id="${equityId}"></canvas></div>
    `;

        renderEquityCurve(equityId, data);
        const labels = data.dates.map((d: string, i: number) => i % Math.ceil(data.dates.length / 30) === 0 ? d : '');

        new Chart(document.getElementById(indicatorId) as HTMLCanvasElement, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'EMV', data: data.emv, borderColor: '#a855f7', borderWidth: 2, pointRadius: 0, tension: 0.1 },
                    { label: '零軸', data: new Array(data.emv.length).fill(0), borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'Ease of Movement (EMV)', color: '#fff' } }
            }
        });
    },

    params: [
        { id: 'EMV_PERIOD', label: 'EMV 平滑週期', min: 5, max: 40, step: 1, default: 14, format: v => `${v} 日` }
    ],

    exercises: [
        '當 EMV 在零軸附近橫盤代表什麼含義？這時候適合進行交易嗎？',
        '嘗試將 EMV 與均線過濾结合，比如只在價格高於 MA20 時才跟隨 EMV 的金叉。'
    ],

    prevUnit: { id: '2-4', title: '阿隆指標 Aroon' },
    nextUnit: { id: '3-1', title: 'Dual Thrust 突破' }
};
