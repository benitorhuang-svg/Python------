import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitFundamentals: UnitDef = {
    title: '基本面與技術面結合實踐',
    module: '模組七 · 終極實戰',
    difficulty: '進階',
    description: '不僅僅看 K 線，還整合了公司的基本面因子 (如 PE, ROE)，實現「好公司」+「好價格」的複合選股系統。',
    needsData: true,

    theory: `
    <p><strong>基本面量化 (Fundamental Quant)</strong> 是大中型機構最常用的方法。它結合了：</p>
    
    <ul>
      <li><strong>價值過濾 (價值)</strong>：只在 PE (本益比) 低於一定標準，或 ROE (權益報酬率) 高於一定標準時才考慮買入。</li>
      <li><strong>技術觸發 (動能)</strong>：當符合基本面條件後，再使用 MA 交叉或突破來尋找最優進場時機。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 為什麼結合更強？</strong><br>
      只看技術面容易遇到「垃圾股」崩盤；只看基本面容易遇到「價值陷阱」（股價很便宜但一直跌）。兩者結合能顯著降低投資組合的風險。
    </div>
  `,

    defaultCode: `import json
import numpy as np
from indicators import MA, Cross
from backtest_engine import BacktestEngine

# ═══ 模擬基本面數據 (在實際場景中這會是從各財務報表接口抓取) ═══
# 我們在數據中加入一個虛擬的「估值因子」 
PE_THRESHOLD = 15   # 我們只買 PE < 15 的「便宜貨」

# 準備數據
data = stock_data
closes = [d['Close'] for d in data]

# 假設數據中有 PE 屬性 (我們這裡用隨機模擬代表每日變動的 PE)
# 實際上這部分會從 API 的財務指標接口取得
def get_pe(i):
    # 模擬 5 - 20 之間的波動 PE
    return 10 + 10 * np.sin(i / 10)

# 計算技術面指標
ma = MA(closes, 20)
cross = Cross(closes, ma)

def strategy(engine, data, i):
    # 確保指標已算出
    if i < 20: return
    
    current_pe = get_pe(i)
    current_close = data[i]['Close']
    
    # 邏輯：基本面過濾 + 技術面觸發
    # 條件1：估值便宜 (PE < 15)
    # 條件2：趨勢轉強 (價格上穿 MA20)
    if engine.position == 0:
        if current_pe < PE_THRESHOLD and cross[i] == 1:
            engine.buy(current_close, i, None, f"基本面(PE:{current_pe:.1f}) 符合選股標準進場")
            
    elif engine.position > 0:
        # 技術面走弱或估值過高止盈
        if cross[i] == -1 or current_pe > 25:
             engine.sell(current_close, i, None, "基本面過熱或技術面走弱出場")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"═══ 基本面 + 技術面複合策略 ═══")
print(f"PE 閾值設定: {PE_THRESHOLD}")
print(f"總報酬率: {report['total_return']:+.2f}%")

# 儲存繪圖數據
chart_data = {
    **report,
    "ma": ma,
    "pe": [get_pe(i) for i in range(len(data))]
}
`,

    resultVar: 'chart_data',

    renderChart: (canvasId, data) => {
        const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
        if (!parent) return;

        const priceId = canvasId + '-price';
        const indicatorId = canvasId + '-pe';
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
                    { label: 'PE (本益比)', data: data.pe, borderColor: '#06b6d4', borderWidth: 2, pointRadius: 0 },
                    { label: '選股門檻 (15)', data: new Array(data.pe.length).fill(15), borderColor: '#ffffff22', borderDash: [5, 5], pointRadius: 0 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: '公司估值走向 (PE)', color: '#fff' } }
            }
        });

        new Chart(document.getElementById(priceId) as HTMLCanvasElement, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: '收盤價', data: data.closes, borderColor: '#e2e8f0', borderWidth: 1, pointRadius: 0 },
                    { label: 'MA 20', data: data.ma, borderColor: '#f59e0b', borderWidth: 1.5, pointRadius: 0 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    },

    params: [
        { id: 'PE_THRESHOLD', label: 'PE 選股上限', min: 8, max: 25, step: 1, default: 15, format: v => `< ${v}` }
    ],

    exercises: [
        '目前的邏輯是 PE < 15 才買。如果調到 20（稍微放寬標準），獲利是否會因為買入更多機會而增加？風險呢？',
        '思考：為什麼我們在 PE > 25 時會選擇自動離場，這代表了什麼規律？'
    ],

    prevUnit: { id: '6-4', title: '反向馬丁格爾策略' },
    nextUnit: null
};
