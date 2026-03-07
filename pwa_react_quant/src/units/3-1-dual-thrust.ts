import type { UnitDef } from './types';
import { renderEquityCurve, renderVolumeChart, renderPriceWithMA } from '../engine/chart-renderer';
import { Chart } from 'chart.js';

export const unitDualThrust: UnitDef = {
  title: 'Dual Thrust 日內突破',
  module: '模組三 · 突破策略',
  difficulty: '進階',
  description: '由 Michael Boulos 提出，曾在華爾街名噪一時的經典區間突破型策略。',
  needsData: true,

  theory: `
    <p><strong>Dual Thrust</strong> 是一個著名的日內趨勢突破系統，由 Michael Boulos 提出。它曾被 Future Truth 雜誌評選為最賺錢的策略之一，是典型的「開盤區間突破」進化版。</p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 200" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="20%" y1="0" x2="20%" y2="100%" />
          <line x1="40%" y1="0" x2="40%" y2="100%" />
          <line x1="60%" y1="0" x2="60%" y2="100%" />
          <line x1="80%" y1="0" x2="80%" y2="100%" />
        </g>
        
        <!-- Previous N days history (Left side) -->
        <rect x="10" y="50" width="80" height="100" fill="rgba(148, 163, 184, 0.1)" stroke="#64748b" stroke-width="1" stroke-dasharray="2,2" />
        <text x="50" y="40" fill="#94a3b8" font-size="10" text-anchor="middle">過去 N 天價格區間 (Range)</text>
        <path d="M 20 100 Q 30 50 40 80 T 60 150 T 80 120" fill="none" stroke="#94a3b8" stroke-width="1.5" />

        <!-- Today's Trading Session -->
        <line x1="100" y1="0" x2="100" y2="200" stroke="#f59e0b" stroke-width="1" stroke-dasharray="4,4" />
        <text x="115" y="15" fill="#f59e0b" font-size="11" font-weight="bold">今日開盤</text>

        <!-- Open Price Baseline -->
        <line x1="100" y1="120" x2="450" y2="120" stroke="#ffffff" stroke-width="1" stroke-dasharray="2,2" />
        <text x="440" y="115" fill="#ffffff" font-size="10" text-anchor="end">開盤基準價 (Open)</text>
        <circle cx="100" cy="120" r="4" fill="#ffffff" />

        <!-- Upper Band (K1) -->
        <rect x="100" y="70" width="350" height="50" fill="rgba(34, 197, 94, 0.05)" />
        <line x1="100" y1="70" x2="450" y2="70" stroke="#22c55e" stroke-width="2" />
        <text x="440" y="65" fill="#22c55e" font-size="10" text-anchor="end">上軌 = Open + K1 × Range</text>

        <!-- Lower Band (K2) - Asymmetric, slightly tighter -->
        <rect x="100" y="120" width="350" height="30" fill="rgba(239, 68, 68, 0.05)" />
        <line x1="100" y1="150" x2="450" y2="150" stroke="#ef4444" stroke-width="2" />
        <text x="440" y="145" fill="#ef4444" font-size="10" text-anchor="end">下軌 = Open - K2 × Range</text>

        <!-- Price Path Breakout -->
        <path class="svg-animated-path" d="M 100 120 Q 150 140 200 100 T 260 80 T 320 60 T 450 20" fill="none" stroke="#06b6d4" stroke-width="2.5" />
        
        <!-- Long signal -->
        <circle class="svg-breathe" cx="280" cy="70" r="6" fill="#facc15" stroke="#0f172a" stroke-width="2" />
        <line x1="280" y1="70" x2="280" y2="40" stroke="#facc15" stroke-width="1" stroke-dasharray="2,2" />
        <text x="280" y="35" fill="#facc15" font-size="11" font-weight="bold" text-anchor="middle" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">突破上軌 (做多)</text>
      </svg>
    </div>

    <h3>核心邏輯設計</h3>
    <p>它放棄了單純用固定的某個價格（比如昨日最高價）當作突破線，而是動態計算過去一段時間的<strong>「絕對震幅」</strong>：</p>

    <div class="formula-box">
      Range = max(前N天最高價 - 前N天最低收盤, 前N天最高收盤 - 前N天最低價)<br><br>
      今日上軌 = 今日開盤價 + K1 × Range<br>
      今日下軌 = 今日開盤價 - K2 × Range
    </div>

    <ul>
      <li><strong style="color: #22c55e;">看多突破：</strong> 當日內價格強勢拉升，大於「上軌」時 → 買進（如果持有空單則反手做多）。</li>
      <li><strong style="color: #ef4444;">看空突破：</strong> 當日內價格弱勢殺跌，小於「下軌」時 → 賣出（如果持有多單則反手做空）。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 聰明的「非對稱性」(Asymmetry)：</strong><br>
      Dual Thrust 的靈魂在於允許 K1 和 K2 的倍數不同。在長期的多頭大牛市中，你可以把 K1 調小 (例如 0.5)，把 K2 調大 (例如 0.8) —— 意思是：只要稍微往漲的方向突破我就追，但往跌的方向必須殺得很深我才判斷是空頭。這種順應大勢的微調是它能暴利的關鍵。
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
    
    # 模擬日內突破 - 真實的 Dual Thrust 是反手交易系統
    if highs[i] > upper:
        if engine.position <= 0:
            if engine.position < 0: engine.cover(current_price, i, "空單止損/反手")
            engine.buy(current_price, i, "向上突破做多")
    elif lows[i] < lower:
        if engine.position >= 0:
            if engine.position > 0: engine.sell(current_price, i, "多單止損/反手")
            engine.short(current_price, i, "向下突破做空")

# ═══ 執行回測 (包含滑價與手續費) ═══
engine = BacktestEngine(data, initial_capital=100000, slippage=0.0002)
report = engine.run(dual_thrust_strategy)

# ═══ 輸出結果 ═══

chart_data = {
    **report,
    "closes": closes,
    "upper": upper_bands,
    "lower": lower_bands,
    "volumes": [d['Volume'] for d in data]
}
`,

  resultVar: 'chart_data',

  renderChart: (canvasId, data) => {
    const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
    if (!parent) return;

    const priceId = canvasId + '-price';
    const volId = canvasId + '-volume';
    const equityId = canvasId + '-equity';

    parent.innerHTML = `
      <div class="chart-wrapper" style="height:320px; margin-bottom:12px;"><canvas id="${priceId}"></canvas></div>
      <div class="chart-wrapper" style="height:100px; margin-bottom:12px;"><canvas id="${volId}"></canvas></div>
      <div class="chart-wrapper" style="height:200px;"><canvas id="${equityId}"></canvas></div>
    `;

    renderEquityCurve(equityId, data);
    renderVolumeChart(volId, data);

    const ctx = document.getElementById(priceId) as HTMLCanvasElement;
    if (ctx) {
      const labels = data.dates.map((d: string, i: number) => i % Math.ceil(data.dates.length / 30) === 0 ? d : '');
      const buy = new Array(data.closes.length).fill(null);
      const sell = new Array(data.closes.length).fill(null);
      const short = new Array(data.closes.length).fill(null);
      const cover = new Array(data.closes.length).fill(null);
      const reasons = new Array(data.closes.length).fill('');

      data.trades?.forEach((t: any) => {
        const idx = t.index;
        reasons[idx] = t.reason || '';
        if (t.type === 'BUY') buy[idx] = data.closes[idx];
        else if (t.type === 'SELL') sell[idx] = data.closes[idx];
        else if (t.type === 'SHORT') short[idx] = data.closes[idx];
        else if (t.type === 'COVER') cover[idx] = data.closes[idx];
      });

      new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: '收盤價', data: data.closes, borderColor: '#f1f5f9', borderWidth: 1.5, pointRadius: 0, tension: 0.1 },
            { label: '上軌', data: data.upper, borderColor: '#06b6d4', borderWidth: 1, borderDash: [5, 5], pointRadius: 0 },
            { label: '下軌', data: data.lower, borderColor: '#f59e0b', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, fill: '-1', backgroundColor: 'rgba(6, 182, 212, 0.05)' },
            // @ts-ignore
            { label: '買入 ▲', data: buy, reasons: reasons, borderColor: '#22c55e', backgroundColor: '#22c55e', pointRadius: 6, pointStyle: 'triangle', showLine: false },
            // @ts-ignore
            { label: '賣出 ▼', data: sell, reasons: reasons, borderColor: '#ef4444', backgroundColor: '#ef4444', pointRadius: 6, pointStyle: 'triangle', pointRotation: 180, showLine: false },
            // @ts-ignore
            { label: '賣空 ▼', data: short, reasons: reasons, borderColor: '#fbbf24', backgroundColor: '#fbbf24', pointRadius: 6, pointStyle: 'triangle', pointRotation: 180, showLine: false },
            // @ts-ignore
            { label: '平空 ▲', data: cover, reasons: reasons, borderColor: '#60a5fa', backgroundColor: '#60a5fa', pointRadius: 6, pointStyle: 'triangle', showLine: false }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            title: { display: true, text: 'Dual Thrust 突破軌道 (Long/Short Reversal)', color: '#fff' },
            tooltip: {
              callbacks: {
                afterLabel: function (context: any) {
                  const info = context.raw?.reason || context.dataset.reasons?.[context.dataIndex];
                  return info ? '📝 理由: ' + info : '';
                }
              }
            }
          }
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

  prevUnit: { id: '2-8', title: '隨機指標 KDJ' },
  nextUnit: { id: '3-2', title: '日內高低點突破' }
};
