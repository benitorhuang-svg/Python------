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
    <p><strong>簡易波動指標 (Ease of Movement, EMV)</strong> 由 Richard Arms 開發，它的核心邏輯非常獨特。它試圖解答一個問題：<strong>推動價格上漲（或下跌），需要多大的成交量？</strong></p>

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
        <line x1="0" y1="80" x2="450" y2="80" stroke="#64748b" stroke-width="1.5" stroke-dasharray="4,4" />
        <text x="440" y="75" fill="#64748b" font-size="9" text-anchor="end">阻力零軸 (Zero Line)</text>

        <!-- EMV Line -->
        <path d="M 0 80 Q 50 120 100 130 T 160 80 T 260 30 T 360 120 T 450 60" fill="none" stroke="#a855f7" stroke-width="3" />
        
        <!-- Scene 1: Heavy Volume, Price won't move much (Low EMV near zero) -->
        <rect x="70" y="150" width="20" height="30" fill="rgba(148, 163, 184, 0.4)" stroke="#94a3b8" stroke-width="1" />
        <rect x="100" y="140" width="20" height="40" fill="rgba(148, 163, 184, 0.4)" stroke="#94a3b8" stroke-width="1" />
        <text x="95" y="130" fill="#f59e0b" font-size="10" font-weight="bold" text-anchor="middle">爆出天量，但價格不動</text>
        <circle cx="95" cy="120" r="4" fill="#f59e0b" />
        <line x1="95" y1="120" x2="95" y2="80" stroke="#f59e0b" stroke-width="1" stroke-dasharray="2,2" />

        <!-- Scene 2: Low Volume, Price sky rockets (High EMV) -->
        <rect x="230" y="170" width="20" height="10" fill="rgba(148, 163, 184, 0.4)" stroke="#94a3b8" stroke-width="1" />
        <rect x="260" y="165" width="20" height="15" fill="rgba(148, 163, 184, 0.4)" stroke="#94a3b8" stroke-width="1" />
        <text x="255" y="60" fill="#22c55e" font-size="10" font-weight="bold" text-anchor="middle">無量空拋，價格輕鬆暴漲</text>
        <circle cx="255" cy="40" r="6" fill="#22c55e" stroke="#0f172a" stroke-width="2" />
        <line x1="255" y1="40" x2="255" y2="160" stroke="#22c55e" stroke-width="1" stroke-dasharray="2,2" />

        <!-- Scene 3: Low Volume, Price drops (Low EMV Negative) -->
        <rect x="350" y="165" width="20" height="15" fill="rgba(148, 163, 184, 0.4)" stroke="#94a3b8" stroke-width="1" />
        <text x="360" y="145" fill="#ef4444" font-size="10" font-weight="bold" text-anchor="middle">輕鬆下跌區</text>

        <!-- Legend -->
        <rect x="10" y="160" width="12" height="4" fill="#a855f7" />
        <text x="26" y="166" fill="#cbd5e1" font-size="10">EMV 線</text>
        <rect x="10" y="172" width="12" height="6" fill="rgba(148, 163, 184, 0.4)" stroke="#94a3b8" stroke-width="1" />
        <text x="26" y="178" fill="#cbd5e1" font-size="10">市場成交量</text>
      </svg>
    </div>

    <h3>物理學的動能視角</h3>
    <p>想像推動一台車。如果用很大的力氣（爆大量）車子卻不怎麼走，代表這裡**阻力很大**。如果只輕輕推一下（無量），車子就滑行了幾十公尺（大漲）代表這是一條無阻力的下坡！</p>
    <ul>
      <li><strong style="color: #22c55e;">EMV 極高 (遠大於 0)</strong>：價格大幅度上漲，而且成交量很小。這代表上方完全沒有解套與賣壓阻力，是「最健康的輕鬆上漲」。</li>
      <li><strong style="color: #ef4444;">EMV 極低 (遠小於 0)</strong>：價格不費吹灰之力就暴跌。下方沒有任何人想接刀。</li>
      <li><strong style="color: #f59e0b;">EMV 接近 0</strong>：要麼是市場死水一攤沒人交易；要麼就是「爆出了天量卻收了十字星」，多空主力正在史詩級換手，誰也推不動誰。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 實戰交易邏輯：</strong><br>
      因為每日的 EMV 跳動過快，我們通常使用 EMV 的移動平均線（例如 EMA 14）。<br>
      當 <strong>EMV 向上穿過零軸</strong> 時，是一個強大的買入訊號，表示空方的阻力已經撤退，上漲通道被打開。
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
