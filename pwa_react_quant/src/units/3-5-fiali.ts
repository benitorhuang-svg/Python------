import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitFiali: UnitDef = {
    title: '菲阿里四價策略',
    module: '模組三 · 突破策略',
    difficulty: '進階',
    description: '由日本傳奇操盤手菲阿里提出的突破策略，使用昨日的收盤、最高、最低以及今日開盤這四個關鍵價格來建立防線。',
    needsData: true,

    theory: `
    <p><strong>菲阿里四價 (Filari Four Prices)</strong> 是一個非常經典且暴力的純 K 線支撐壓力突破策略。作者菲阿里（Filari）曾依靠這套極簡法則在多次日本期貨比賽中奪冠。</p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 200" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="20%" y1="0" x2="20%" y2="100%" />
          <line x1="50%" y1="0" x2="50%" y2="100%" />
          <line x1="80%" y1="0" x2="80%" y2="100%" />
        </g>
        
        <!-- Yesterday's Candlestick -->
        <text x="100" y="20" fill="#94a3b8" font-size="11" font-weight="bold" text-anchor="middle">昨日 (Yesterday)</text>
        <line x1="100" y1="40" x2="100" y2="160" stroke="#94a3b8" stroke-width="2" />
        <!-- Candle Body -->
        <rect x="85" y="70" width="30" height="60" fill="rgba(34, 197, 94, 0.2)" stroke="#22c55e" stroke-width="2" />
        <text x="75" y="45" fill="#06b6d4" font-size="10" text-anchor="end">最高價 (High)</text>
        <text x="75" y="165" fill="#ef4444" font-size="10" text-anchor="end">最低價 (Low)</text>
        <text x="125" y="75" fill="#22c55e" font-size="10" text-anchor="start">收盤價 (Close)</text>

        <!-- Resistance and Support Lines Extended -->
        <line x1="100" y1="40" x2="450" y2="40" stroke="#06b6d4" stroke-width="1.5" stroke-dasharray="4,4" />
        <line x1="100" y1="160" x2="450" y2="160" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4" />

        <!-- Today's Price Action -->
        <text x="300" y="20" fill="#f59e0b" font-size="11" font-weight="bold" text-anchor="middle">今日 (Today)</text>
        <circle cx="200" cy="100" r="4" fill="#f59e0b" />
        <text x="190" y="105" fill="#f59e0b" font-size="10" text-anchor="end">今日開盤 (Open)</text>
        
        <!-- Price Path Breakout -->
        <path d="M 200 100 Q 230 140 250 110 T 280 60 T 320 30 T 450 -10" fill="none" stroke="#22c55e" stroke-width="2.5" />
        
        <circle cx="304" cy="40" r="6" fill="#facc15" stroke="#0f172a" stroke-width="2" />
        <line x1="304" y1="40" x2="304" y2="70" stroke="#facc15" stroke-width="1" stroke-dasharray="2,2" />
        <text x="304" y="85" fill="#facc15" font-size="11" font-weight="bold" text-anchor="middle" style="text-shadow: 0 1px 3px rgba(0,0,0,0.8);">漲破昨日最高！追多</text>

      </svg>
    </div>

    <h3>四價防守理論</h3>
    <p>這是一個邏輯極簡，完全不依賴任何均線或技術指標的純價格戰法。它捕捉的四個關鍵錨點：</p>
    <ul>
      <li><strong style="color: #06b6d4;">昨日最高價 (Yesterday High)</strong>：昨日多頭衝鋒的最後根據地。代表上方的最強壓力，一旦今日被它突破，意味著空方所有防線崩潰。</li>
      <li><strong style="color: #ef4444;">昨日最低價 (Yesterday Low)</strong>：昨日空頭空襲的最深處。一旦被跌破，代表多頭的防守徹底瓦解，趨勢轉而向下。</li>
      <li><strong style="color: #22c55e;">昨日收盤價 (Yesterday Close)</strong>：昨日交戰一天後的「最終共識」，用來判斷隔夜跳空情緒。</li>
      <li><strong style="color: #f59e0b;">今日開盤價 (Today Open)</strong>：今日市場共識的起點。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 實戰交易法則：</strong><br>
      策略非常的直觀：<strong>「昨天最高價就是天花板，昨天最低價就是地板」。</strong><br>
      今日盤中，只要價格漲破天花板，我們就無腦買進做多；只要價格跌穿地板，我們就停損反手放空。它捕捉的是單日極強的動能延續，非常適合用在具有明顯波段趨勢的活躍市場上。
    </div>
  `,

    defaultCode: `import json
import numpy as np
from backtest_engine import BacktestEngine

# 準備數據
data = stock_data
closes = [d['Close'] for d in data]

# 儲存昨日的高低點路徑 (用來畫圖)
up_line = [None] * len(data)
down_line = [None] * len(data)

def strategy(engine, data, i):
    if i < 1: return
    
    # 昨日四價中的核心二價
    prev_high = data[i-1]['High']
    prev_low = data[i-1]['Low']
    
    # 紀錄軌道以供畫圖顯示
    up_line[i] = prev_high
    down_line[i] = prev_low
    
    current_close = data[i]['Close']
    
    # 交易邏輯：今天收盤價上穿昨天最高價 => 買入；今天收盤價下穿昨天最低價 => 賣出
    if engine.position == 0:
        if current_close > prev_high:
            engine.buy(current_close, i, "高價突破 buy")
            
    elif engine.position > 0:
        if current_close < prev_low:
            engine.sell(current_close, i, "低價跌破 sell")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"═══ 菲阿里四價策略 ═══")
print(f"總報酬率: {report['total_return']:+.2f}%")
print(f"最大回撤: {report['max_drawdown']:.2f}%")

chart_data = {
    **report,
    "upper": up_line,
    "lower": down_line
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
                    { label: '昨日最高價', data: data.upper, borderColor: '#06b6d4', borderWidth: 1, borderDash: [2, 2], pointRadius: 0 },
                    { label: '昨日最低價', data: data.lower, borderColor: '#ef4444', borderWidth: 1, borderDash: [2, 2], pointRadius: 0 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: '菲阿里四價突破軌道', color: '#fff' } }
            }
        });
    },

    params: [], // 菲阿里四價固定使用昨日數據，無需參數調優，這也是作者的精神

    exercises: [
        '目前的邏輯是簡單的「突破買入，跌破賣出」，試著思考：如果在突破時增加成交量的過濾條件，會不會更有效？',
        '嘗試思考：為什麼收盤價突破昨日最高價，會被認為是強烈的買入訊號？'
    ],

    prevUnit: { id: '3-4', title: 'Hans123 突破' },
    nextUnit: { id: '3-6', title: '動態波幅突破' }
};
