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
    <p>市場總是只有 20% 的時間在走趨勢，80% 的時間在無聊的震盪。<strong>恆溫器策略 (Thermostat Strategy)</strong> 的強大之處在於它具備「環境偵測器」與「大腦切換開關」，能在不同的市場採用截然不同的武器。</p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 200" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="20%" y1="0" x2="20%" y2="100%" />
          <line x1="40%" y1="0" x2="40%" y2="100%" />
          <line x1="60%" y1="0" x2="60%" y2="100%" />
          <line x1="80%" y1="0" x2="80%" y2="100%" />
        </g>

        <!-- Thermostat Logic Flow -->
        <rect x="150" y="10" width="150" height="40" fill="#334155" stroke="#cbd5e1" stroke-width="1.5" rx="8" />
        <text x="225" y="30" fill="#f8fafc" font-size="12" font-weight="bold" text-anchor="middle">環境偵測：CMI (震盪指數)</text>
        
        <path d="M 225 50 L 225 70" fill="none" stroke="#cbd5e1" stroke-width="2" />
        <path d="M 100 70 L 350 70" fill="none" stroke="#cbd5e1" stroke-width="2" />
        <path d="M 100 70 L 100 90" fill="none" stroke="#cbd5e1" stroke-width="2" />
        <path d="M 350 70 L 350 90" fill="none" stroke="#cbd5e1" stroke-width="2" />

        <!-- Trend Mode (Left) -->
        <rect x="20" y="90" width="160" height="90" fill="rgba(34, 197, 94, 0.1)" stroke="#22c55e" stroke-width="2" rx="8" />
        <text x="100" y="115" fill="#22c55e" font-size="13" font-weight="bold" text-anchor="middle">🌊 趨勢模式</text>
        <text x="100" y="135" fill="#e2e8f0" font-size="10" text-anchor="middle">CMI &gt; 35 (高動能)</text>
        <rect x="40" y="145" width="120" height="20" fill="rgba(34, 197, 94, 0.2)" rx="4" />
        <text x="100" y="159" fill="#22c55e" font-size="10" font-weight="bold" text-anchor="middle">採用「雙均線追多/空」</text>

        <!-- Swing Mode (Right) -->
        <rect x="270" y="90" width="160" height="90" fill="rgba(245, 158, 11, 0.1)" stroke="#f59e0b" stroke-width="2" rx="8" />
        <text x="350" y="115" fill="#f59e0b" font-size="13" font-weight="bold" text-anchor="middle">⚖️ 震盪模式</text>
        <text x="350" y="135" fill="#e2e8f0" font-size="10" text-anchor="middle">CMI &le; 35 (死水市場)</text>
        <rect x="290" y="145" width="120" height="20" fill="rgba(245, 158, 11, 0.2)" rx="4" />
        <text x="350" y="159" fill="#f59e0b" font-size="10" font-weight="bold" text-anchor="middle">採用「RSI 低買高賣」</text>
      </svg>
    </div>
    
    <h3>策略靈魂：CMI (Choppiness Market Index)</h3>
    <p>CMI 的公式通常是計算一段時間內「絕對漲跌幅」與「每日波動總和」的比值。這與之前提過的 AMA 自適應均線 (ER) 原理非常相似。</p>
    <ul>
      <li><strong style="color: #22c55e;">進入趨勢模式 (CMI > 35)</strong>：當市場走出一波大行情時，均線追蹤是最賺錢的策略。系統會自動把大腦切換為「動量跟隨者」，不管價格有多高，只要指標說是多頭就用力買下去。</li>
      <li><strong style="color: #f59e0b;">進入震盪模式 (CMI ≤ 35)</strong>：當市場連續幾個禮拜上下洗刷、沒有明確方向時。我們這時候如果用均線就會發生「頻繁觸發雙巴虧損」。這時系統會切換為「擺盪交易員」，只要跌深就抄底，稍微漲一點就趕緊獲利入袋。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 為什麼叫恆溫器？</strong><br>
      因為它像現代冷氣空調一樣：發現房間冷了就送暖風（震盪時用逆勢策略搶短多），發現太熱了就送冷風（過熱時用反轉策略）。它嘗試整合我們在前面模組學到的兩個極端理論，達到在任何環境下都能穩定獲利的聖杯理想。
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
    nextUnit: { id: '4-2', title: 'MACD + RSI 雙過濾' }
};
