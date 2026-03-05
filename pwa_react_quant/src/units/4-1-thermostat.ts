import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitThermostat: UnitDef = {
    title: '經典恆溫器策略',
    module: '模組四 · 切換策略',
    difficulty: '進階',
    description: '恆溫器系統會偵測市場的「震盪指數 (CMI)」，當 CMI 指出目前是趨勢時使用均線系統，當 CMI 指出是震盪時改用百盪指標策略。',
    needsData: true,

    theory: `
    <p>市場總是只有 20% 的時間在走趨勢，80% 的時間在震盪。<strong>恆溫器策略 (Thermostat Strategy)</strong> 的強大之處在於它具備「偵測器」與「切換開關」。</p>
    
    <p>策略靈魂：<strong>CMI (Choppiness Market Index)</strong></p>
    <ul>
      <li><strong>CMI > 35</strong>：判斷市場處於<strong>趨勢模式 (Trend Mode)</strong>。此時執行「突破買入」或「均線跟蹤」。</li>
      <li><strong>CMI <= 35</strong>：判斷市場處於<strong>震盪模式 (Swing Mode)</strong>。此時執行「低買高賣」或「逆勢回檔」。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 為什麼叫恆溫器？</strong><br>
      冷了就加熱（震盪時改用逆勢策略搶波段），熱了就降溫（趨勢時用突破順向追擊）。它目標是在任何市場環境都能穩定獲利。
    </div>
  `,

    defaultCode: `import json
import numpy as np
from indicators import CMI, MA
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
CMI_PERIOD = 20
CMI_THRESH = 35    # 切換閾值

# 準備數據
data = stock_data
closes = [d['Close'] for d in data]

# 計算指標
cmi = CMI(closes, CMI_PERIOD)
ma = MA(closes, 50)  # 作為趨勢判斷參考

def strategy(engine, data, i):
    if i < 50: return
    
    curr_cmi = cmi[i]
    close = data[i]['Close']
    
    # 模式切換邏輯
    if curr_cmi > CMI_THRESH:
        # 趨勢模式：價格大於 50 日均線則持倉
        if engine.position == 0:
            if close > ma[i]:
                engine.buy(close, i, "CMI 趨勢模式-順勢 buy")
        elif engine.position > 0:
            if close < ma[i]:
                engine.sell(close, i, "CMI 趨勢模式-順勢 sell")
                
    else:
        # 震盪模式：簡單的均值回歸 (價格低於均線多一點就買，高於均線多一點就賣)
        # 用一個比較敏感的高低點來決定震盪進場
        if engine.position == 0:
            if close < ma[i] * 0.98:
                engine.buy(close, i, "CMI 震盪模式-逆勢 buy")
        elif engine.position > 0:
            if close > ma[i] * 1.02:
                engine.sell(close, i, "CMI 震盪模式-逆勢 sell")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"═══ 恆溫器策略回測 ═══")
print(f"總報酬率: {report['total_return']:+.2f}%")

chart_data = {
    **report,
    "cmi": cmi,
    "ma": ma,
    "thresh": CMI_THRESH
}
`,

    resultVar: 'chart_data',

    renderChart: (canvasId, data) => {
        const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
        if (!parent) return;

        const priceId = canvasId + '-price';
        const indicatorId = canvasId + '-cmi';
        const equityId = canvasId + '-equity';
        parent.innerHTML = `
      <div class="chart-wrapper" style="height:250px; margin-bottom:12px;"><canvas id="${priceId}"></canvas></div>
      <div class="chart-wrapper" style="height:150px; margin-bottom:12px;"><canvas id="${indicatorId}"></canvas></div>
      <div class="chart-wrapper" style="height:200px;"><canvas id="${equityId}"></canvas></div>
    `;

        renderEquityCurve(equityId, data);
        const labels = data.dates.map((d: string, i: number) => i % Math.ceil(data.dates.length / 30) === 0 ? d : '');

        // CMI Chart
        new Chart(document.getElementById(indicatorId) as HTMLCanvasElement, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'CMI 指數', data: data.cmi, borderColor: '#3b82f6', borderWidth: 2, pointRadius: 0 },
                    { label: '切換線(35)', data: new Array(data.cmi.length).fill(data.thresh), borderColor: '#ffffff22', borderDash: [5, 5], borderWidth: 1, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'Choppiness Market Index (CMI)', color: '#fff' } }
            }
        });

        // Price + MA Chart
        new Chart(document.getElementById(priceId) as HTMLCanvasElement, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: '收盤價', data: data.closes, borderColor: '#e2e8f0', borderWidth: 1, pointRadius: 0 },
                    { label: 'MA 50', data: data.ma, borderColor: '#a855f7', borderWidth: 1.5, pointRadius: 0 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    },

    params: [
        { id: 'CMI_THRESH', label: '切換閾值', min: 20, max: 50, step: 2, default: 35, format: v => `趨勢 > ${v}` },
        { id: 'CMI_PERIOD', label: 'CMI 週期', min: 10, max: 50, step: 5, default: 20, format: v => `${v} 日` }
    ],

    exercises: [
        '當看到 CMI 的數值非常低（例如 < 15）時，代表目前的價格變動如何？',
        '思考：目前我們用 50 日均線作為基準。如果將其縮短（更短線），是否會提高在震盪市中的靈敏度？'
    ],

    prevUnit: { id: '3-7', title: 'R-breaker 策略' },
    nextUnit: { id: '5-1', title: '期貨跨期套利' }
};
