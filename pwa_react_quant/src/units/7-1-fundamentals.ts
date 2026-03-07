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
    <p><strong>基本面量化 (Fundamental Quant) / 因子投資</strong> 是全球大中型避險基金（如 AQR、橋水）最核心的武器。它不再把自己侷限於 K線圖，而是把公司的財務體質與市場的價格動能結合，實現「<strong>買好資產的便宜價位，並在剛起漲時上車</strong>」。</p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 200" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        
        <!-- Venn Diagram Circles -->
        <!-- Fundamental Circle -->
        <circle cx="170" cy="100" r="80" fill="rgba(6, 182, 212, 0.15)" stroke="#06b6d4" stroke-width="2" />
        <text x="130" y="80" fill="#06b6d4" font-size="12" font-weight="bold" text-anchor="middle">基本面因子</text>
        <text x="130" y="100" fill="#94a3b8" font-size="10" text-anchor="middle">低本益比 (PE)</text>
        <text x="130" y="115" fill="#94a3b8" font-size="10" text-anchor="middle">高 ROE, 營收增長</text>
        <text x="130" y="130" fill="#94a3b8" font-size="9" text-anchor="middle">(過濾器 / 防禦盾牌)</text>

        <!-- Technical Circle -->
        <circle cx="280" cy="100" r="80" fill="rgba(245, 158, 11, 0.15)" stroke="#f59e0b" stroke-width="2" />
        <text x="320" y="80" fill="#f59e0b" font-size="12" font-weight="bold" text-anchor="middle">技術面動能</text>
        <text x="320" y="100" fill="#94a3b8" font-size="10" text-anchor="middle">均線黃金交叉</text>
        <text x="320" y="115" fill="#94a3b8" font-size="10" text-anchor="middle">帶量突破新高</text>
        <text x="320" y="130" fill="#94a3b8" font-size="9" text-anchor="middle">(觸發器 / 攻擊長矛)</text>

        <!-- Intersection (Holy Grail) -->
        <!-- Using a clip-path to highlight the intersection -->
        <clipPath id="circle-clip">
          <circle cx="170" cy="100" r="80" />
        </clipPath>
        <circle cx="280" cy="100" r="80" fill="rgba(34, 197, 94, 0.3)" clip-path="url(#circle-clip)" />
        
        <text x="225" y="95" fill="#22c55e" font-size="12" font-weight="bold" text-anchor="middle" style="text-shadow: 0 1px 2px rgba(0,0,0,0.8);">雙因子</text>
        <text x="225" y="115" fill="#22c55e" font-size="12" font-weight="bold" text-anchor="middle" style="text-shadow: 0 1px 2px rgba(0,0,0,0.8);">共振點</text>
        
        <path d="M 225 150 L 225 180" fill="none" stroke="#22c55e" stroke-width="2" stroke-dasharray="2,2" />
        <rect x="175" y="180" width="100" height="20" fill="#22c55e" rx="4" />
        <text x="225" y="193" fill="#0f172a" font-size="11" font-weight="bold" text-anchor="middle">果斷大倉買進</text>
      </svg>
    </div>

    <h3>雙重濾網：防禦與攻擊</h3>
    <ul>
      <li><strong style="color: #06b6d4;">第一層過濾 (價值盾牌)</strong>：每天透過財報 API，掃描全市場，把「太貴的 (高 PE)」、「不賺錢的」、「容易倒閉的」公司全部踢除出選股池。只留下體質強健的「潛力名單」。</li>
      <li><strong style="color: #f59e0b;">第二層觸發 (動能長矛)</strong>：好公司不代表馬上會漲（這叫價值陷阱）。我們派出技術指標（例如 20MA 突破）掛載在這些名單上。當某天這隻潛力股突然爆量起漲，產生黃金交叉時，代表主力大戶進場了，系統才會果斷開槍。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 為什麼結合更強？ (左側 + 右側交易)</strong><br>
      只看技術面追高，很容易遇到「炒作垃圾股」最後暴跌下市（缺乏基本面防守）；只看基本面抄底，很容易買在半山腰後被套牢好幾年（缺乏資金面確認）。兩者結合完美解決彼此的盲點，大幅提升量化組合的夏普比率（Sharpe Ratio）。
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
print(f"PE 閾值設定: {PE_THRESHOLD}")

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
    nextUnit: { id: '8-1', title: '線性回歸預測' }
};
