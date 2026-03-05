import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitHlBreakout: UnitDef = {
    title: '日內高低點突破策略',
    module: '模組三 · 突破策略',
    difficulty: '基礎',
    description: '基於前幾個交易時段的最高點與最低點建立區間。一旦本日價格突破該區間，便認為是強趨勢的開始。',
    needsData: true,

    theory: `
    <p><strong>高低點突破 (HL Breakout)</strong> 是一種非常直觀且符合人性的趨勢交易法。它的假設非常簡單：<strong>如果價格能突破過去一段時間的「阻力天花板」，那麼上方必定海闊天空，後續將會有一波強大的動能。</strong></p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 200" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="20%" y1="0" x2="20%" y2="100%" />
          <line x1="40%" y1="0" x2="40%" y2="100%" />
          <line x1="60%" y1="0" x2="60%" y2="100%" />
          <line x1="80%" y1="0" x2="80%" y2="100%" />
        </g>
        
        <!-- Lookback Window -->
        <rect x="0" y="40" width="250" height="120" fill="rgba(148, 163, 184, 0.1)" stroke="#64748b" stroke-width="1" stroke-dasharray="2,2" />
        <text x="125" y="30" fill="#94a3b8" font-size="10" text-anchor="middle">過去 N 日的觀察窗 (Lookback Window)</text>

        <!-- Resistance Line -->
        <line x1="0" y1="40" x2="450" y2="40" stroke="#06b6d4" stroke-width="2" />
        <text x="440" y="35" fill="#06b6d4" font-size="10" text-anchor="end">N 日最高點 (突破買入線)</text>

        <!-- Support Line -->
        <line x1="0" y1="160" x2="450" y2="160" stroke="#ef4444" stroke-width="2" />
        <text x="440" y="155" fill="#ef4444" font-size="10" text-anchor="end">N 日最低點 (跌破停損/做空線)</text>

        <!-- Price Path -->
        <path d="M 0 100 Q 40 50 80 120 T 160 60 T 230 140 T 260 80 T 290 20 T 360 10 T 450 -10" fill="none" stroke="#f59e0b" stroke-width="2.5" />
        
        <!-- Buy Signal -->
        <circle cx="280" cy="40" r="6" fill="#facc15" stroke="#0f172a" stroke-width="2" />
        <line x1="280" y1="40" x2="280" y2="80" stroke="#facc15" stroke-width="1" stroke-dasharray="2,2" />
        <text x="280" y="95" fill="#facc15" font-size="11" font-weight="bold" text-anchor="middle" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">突破前高！(做多買入)</text>
      </svg>
    </div>
    
    <h3>交易邏輯設計</h3>
    <p>最常見的參數是看過去 20 日（約一個月的交易日）或 55 日：</p>
    <ul>
      <li><strong style="color: #06b6d4;">看漲突破</strong>：當今日收盤價 <strong>&gt;</strong> 過去 N 日內的最高價，代表市場消化了所有過去一個月的賣壓，此時順勢買入。</li>
      <li><strong style="color: #ef4444;">看跌突破 / 停損出局</strong>：當今日收盤價 <strong>&lt;</strong> 過去 N 日內的最低價，代表支撐崩盤，強烈賣出或反手做空。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 順勢交易的鐵律：高買高賣</strong><br>
      散戶喜歡「低買高賣（抄底逃頂）」，但量化趨勢高手通常是「高買更高賣」。敢於在創下新高時進場，是因為動能剛剛被點燃。理查．丹尼斯著名的「海龜交易法則」其核心基礎就是高低點突破。
    </div>

    <div class="warning-callout">
      <strong>⚠️ 缺點與摩擦成本：假突破</strong><br>
      在高波動且呈現箱型橫盤的市場中，莊家往往會刻意製造「假突破」（洗盤）。價格剛刺破 20 日新高，吸引突破派買單進場後，隔天立刻暴跌回跌破 20 日新低。導致策略左右挨打，來回停損。
    </div>
  `,

    defaultCode: `import json
import numpy as np
from indicators import Highest, Lowest
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
LOOKBACK = 20      # 回看 N 天的高低點

# 準備數據
data = stock_data
closes = [d['Close'] for d in data]
highs = [d['High'] for d in data]
lows = [d['Low'] for d in data]

# 計算前 N 天的最高/最低 (不包含今天)
# 我們需要手動處理一下，因為 indicators.Highest 是包含當前的
# 這裡我們用一個平移處理來避開未來函數
hist_high = [np.nan] * len(data)
hist_low = [np.nan] * len(data)

# 計算軌道
full_highest = Highest(highs, LOOKBACK)
full_lowest = Lowest(lows, LOOKBACK)

for i in range(1, len(data)):
    hist_high[i] = full_highest[i-1]
    hist_low[i] = full_lowest[i-1]

def strategy(engine, data, i):
    if i < LOOKBACK: return
    if np.isnan(hist_high[i]): return
    
    current_close = data[i]['Close']
    
    # 交易邏輯：收盤價突破前 N 日最高點買入，跌破前 N 日最低點賣出
    if engine.position == 0:
        if current_close > hist_high[i]:
            engine.buy(current_close, i, f"突破{LOOKBACK}日新高")
            
    elif engine.position > 0:
        if current_close < hist_low[i]:
            engine.sell(current_close, i, f"跌破{LOOKBACK}日新低")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"═══ 高低點突破策略 ═══")
print(f"回看週期: {LOOKBACK}")
print(f"總報酬率: {report['total_return']:+.2f}%")

chart_data = {
    **report,
    "upper": hist_high,
    "lower": hist_low
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
                    { label: 'N日高點', data: data.upper, borderColor: '#06b6d4', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, tension: 0.1 },
                    { label: 'N日低點', data: data.lower, borderColor: '#ef4444', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, tension: 0.1 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: '價格與突破軌道', color: '#fff' } }
            }
        });
    },

    params: [
        { id: 'LOOKBACK', label: '回看週期', min: 5, max: 60, step: 5, default: 20, format: v => `${v} 日` }
    ],

    exercises: [
        '當 LOOKBACK 調得非常短（例如 5）時，會發生什麼事？交易次數會變多還是變少？',
        '思考：為什麼我們在計算最高點時，要用 i-1 天以前的數據，而不是包含當天價格？'
    ],

    prevUnit: { id: '3-1', title: 'Dual Thrust 突破' },
    nextUnit: { id: '3-3', title: '增強版唐奇安通道' }
};
