import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve, renderVolumeChart, renderPriceWithMA } from '../engine/chart-renderer';

export const unitMacdRsi: UnitDef = {
    title: 'MACD + RSI 雙重過濾策略',
    module: '模組四 · 切換與混合策略',
    difficulty: '進階',
    description: '結合趨勢指標 (MACD) 與擺盪指標 (RSI)，利用趨勢確認方向，再由超買超賣尋找更佳進場點，減少「追高殺低」的雜訊。',
    needsData: true,

    theory: `
    <p>單一指標往往有其極限：MACD 在盤整期會頻繁產生假訊號，而 RSI 在強趨勢中會發生「指標鈍化」。<strong>混合策略 (Hybrid Strategy)</strong> 的核心理念是：<strong>用不同的時間尺度與物理邏輯相互核驗。</strong></p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 180" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <!-- Logic Gates -->
        <rect x="50" y="30" width="120" height="40" fill="rgba(34, 211, 238, 0.1)" stroke="#22d3ee" stroke-width="1.5" rx="20" />
        <text x="110" y="55" fill="#22d3ee" font-size="12" font-weight="bold" text-anchor="middle">MACD (趨勢)</text>

        <rect x="50" y="110" width="120" height="40" fill="rgba(81, 140, 248, 0.1)" stroke="#818cf8" stroke-width="1.5" rx="20" />
        <text x="110" y="135" fill="#818cf8" font-size="12" font-weight="bold" text-anchor="middle">RSI (力道)</text>

        <path d="M 170 50 L 220 50 L 220 70" fill="none" stroke="#cbd5e1" stroke-width="2" />
        <path d="M 170 130 L 220 130 L 220 110" fill="none" stroke="#cbd5e1" stroke-width="2" />

        <circle cx="220" cy="90" r="30" fill="#334155" stroke="#fff" stroke-width="2" />
        <text x="220" y="94" fill="#fff" font-size="14" font-weight="900" text-anchor="middle">AND</text>

        <path d="M 250 90 L 300 90" fill="none" stroke="#fff" stroke-width="2" />
        <rect x="300" y="70" width="120" height="40" fill="rgba(52, 211, 153, 0.2)" stroke="#34d399" stroke-width="2" rx="4" />
        <text x="360" y="95" fill="#34d399" font-size="12" font-weight="bold" text-anchor="middle">高勝率買點</text>
      </svg>
    </div>

    <h3>雙重過濾邏輯</h3>
    <ul>
      <li><strong style="color: #22d3ee;">趨勢濾網 (MACD)</strong>：確保我們是順著大趨勢交易。只有在 MACD DIF > DEA (金叉) 或 DIF > 0 時才視為多頭環境。</li>
      <li><strong style="color: #818cf8;">超賣濾網 (RSI)</strong>：在多頭環境中「尋找回調點」。如果 MACD 是多頭，但 RSI 也已經 > 70，則不再追買，等待 RSI 回落到 50 左右再進場。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 進場組合方案：</strong><br>
      只有當 <strong>MACD 是多頭狀態</strong> 且 <strong>RSI 剛剛從超賣區往上翻 (或跌破 50 又站回)</strong> 時，才是勝率最高的共振點。這就像是在高速公路上等待車流稍微放慢（回調）但方向仍然一致時切入。
    </div>
    `,

    defaultCode: `import json
import numpy as np
from indicators import MACD, RSI, Cross
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
MACD_FAST = 12
MACD_SLOW = 26
RSI_PERIOD = 14
RSI_BUY_LEVEL = 45 # 稍微放寬，在趨勢中尋找支撐

# 準備數據
data = stock_data
closes = [d['Close'] for d in data]

# 計算指標
dif, dea, macd = MACD(closes, MACD_FAST, MACD_SLOW)
rsi = RSI(closes, RSI_PERIOD)

def strategy(engine, data, i):
    if i < MACD_SLOW: return
    
    close = data[i]['Close']
    
    # 指標狀態
    macd_bull = dif[i] > dea[i]  # MACD 金叉中
    rsi_ready = rsi[i] < 60      # 不是極度超買
    
    # 策略邏輯
    if engine.position == 0:
        # 當 MACD 金叉且 RSI 處於相對低位 (或從低點翻紅)
        if macd_bull and rsi[i] > RSI_BUY_LEVEL and rsi[i-1] <= RSI_BUY_LEVEL:
            engine.buy(close, i, "MACD 多頭 + RSI 支撐確認")
            
    elif engine.position > 0:
        # 當 MACD 出現死叉，或者 RSI 進入極度超買 (80)
        if dif[i] < dea[i] or rsi[i] > 80:
            engine.sell(close, i, "趨勢轉弱或超買獲利了結")

# 執行回測 (使用升級引擎：0.03% 滑價模擬)
engine = BacktestEngine(data, initial_capital=100000, slippage=0.0003)
report = engine.run(strategy)

# 輸出結果

chart_data = {
    **report,
    "dif": dif, "dea": dea, "macd": macd,
    "rsi": rsi,
    "volumes": [d['Volume'] for d in data],
    "closes": closes
}
`,

    resultVar: 'chart_data',

    renderChart: (canvasId, data) => {
        const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
        if (!parent) return;

        const priceId = canvasId + '-price';
        const macdId = canvasId + '-macd';
        const rsiId = canvasId + '-rsi';
        const volId = canvasId + '-volume';
        const equityId = canvasId + '-equity';

        parent.innerHTML = `
          <div class="chart-wrapper" style="height:300px; margin-bottom:12px;"><canvas id="${priceId}"></canvas></div>
          <div class="chart-wrapper" style="height:120px; margin-bottom:12px;"><canvas id="${macdId}"></canvas></div>
          <div class="chart-wrapper" style="height:120px; margin-bottom:12px;"><canvas id="${rsiId}"></canvas></div>
          <div class="chart-wrapper" style="height:100px; margin-bottom:12px;"><canvas id="${volId}"></canvas></div>
          <div class="chart-wrapper" style="height:200px;"><canvas id="${equityId}"></canvas></div>
        `;

        renderEquityCurve(equityId, data);
        renderPriceWithMA(priceId, data);
        renderVolumeChart(volId, data);
        const labels = data.dates.map((d: string, i: number) => i % Math.ceil(data.dates.length / 30) === 0 ? d : '');

        // MACD Chart
        new Chart(document.getElementById(macdId) as HTMLCanvasElement, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'DIF', data: data.dif, borderColor: '#22d3ee', borderWidth: 1.5, pointRadius: 0 },
                    { label: 'DEA', data: data.dea, borderColor: '#fb7185', borderWidth: 1.5, pointRadius: 0 },
                    { label: 'MACD', data: data.macd, type: 'bar' as const, backgroundColor: data.macd.map((v: number) => v >= 0 ? 'rgba(52, 211, 153, 0.4)' : 'rgba(251, 113, 133, 0.4)'), borderWidth: 0 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'MACD (12, 26, 9)', color: '#fff' } }
            }
        });

        // RSI Chart
        new Chart(document.getElementById(rsiId) as HTMLCanvasElement, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'RSI', data: data.rsi, borderColor: '#818cf8', borderWidth: 2, pointRadius: 0 },
                    { label: '50 水平線', data: new Array(data.rsi.length).fill(50), borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderDash: [5, 5], pointRadius: 0 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: 'RSI (14)', color: '#fff' } },
                scales: { y: { min: 0, max: 100 } }
            }
        });
    },

    params: [
        { id: 'RSI_BUY_LEVEL', label: 'RSI 買入水平', min: 20, max: 60, step: 1, default: 45, format: v => `RSI > ${v}` },
        { id: 'RSI_PERIOD', label: 'RSI 週期', min: 5, max: 30, step: 1, default: 14, format: v => `${v} 日` }
    ],

    exercises: [
        '如果只用 MACD 不加 RSI，在橫盤期間會產生多少錯誤信號？對比績效回測。',
        '嘗試加入 Short (做空) 邏輯：當 MACD 死叉且 RSI 剛剛跌破 60 時進場做空。',
        '優化參數：當市場處於 200 日均線上方時，調高 RSI 的進場門檻。'
    ],

    prevUnit: { id: '4-1', title: '恆溫器策略' },
    nextUnit: { id: '5-1', title: '高級套利實戰' }
};
