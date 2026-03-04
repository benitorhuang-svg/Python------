import type { UnitDef } from './types';
import { renderPriceWithMA, renderEquityCurve } from '../engine/chart-renderer';

export const unitDualMA: UnitDef = {
  title: '雙均線策略',
  module: '模組一 · 量化入門',
  difficulty: '基礎',
  description: '最經典的量化交易入門策略——利用快慢均線的交叉信號進行交易。',
  needsData: true,

  theory: `
    <p><strong>雙均線策略（Dual Moving Average Crossover）</strong>是量化交易中最基礎也最經典的策略。它的核心思想非常簡單：</p>

    <p><strong>當短期均線向上穿越長期均線（金叉）時買入；當短期均線向下穿越長期均線（死叉）時賣出。</strong></p>

    <div class="formula-box" id="ma-formula">
      MA(n) = (C₁ + C₂ + ... + Cₙ) / n
    </div>

    <p>其中 <strong>C</strong> 是收盤價，<strong>n</strong> 是均線週期。</p>

    <p>策略邏輯：</p>
    <ul>
      <li>• <strong>金叉（黃金交叉）</strong>：短期均線從下方穿越長期均線 → 買入信號</li>
      <li>• <strong>死叉（死亡交叉）</strong>：短期均線從上方穿越長期均線 → 賣出信號</li>
    </ul>

    <div class="info-callout">
      <strong>📌 為什麼有效？</strong>短期均線反映近期價格趨勢，長期均線反映長期趨勢。
      當短期趨勢超越長期趨勢，暗示市場動能正在轉變。
    </div>

    <p><strong>優點：</strong>簡單直觀、適合趨勢市場、容易程式化。</p>
    <p><strong>缺點：</strong>在震盪市場中會頻繁產生假信號，存在滯後性。</p>

    <div class="warning-callout">
      <strong>⚠️ 參數選擇很重要：</strong>短期均線太短會太敏感（假信號多），太長則太遲鈍（錯過行情）。
      常見組合有 5/20、10/30、5/60 等。
    </div>
  `,

  defaultCode: `import json
import numpy as np
from indicators import MA, Cross
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
SHORT_MA = 5      # 短期均線週期
LONG_MA = 20      # 長期均線週期

# ═══ 載入數據 ═══
# stock_data 由 JS 環境注入
data = stock_data

# ═══ 計算指標 ═══
closes = [d['Close'] for d in data]
ma_short = MA(closes, SHORT_MA)
ma_long = MA(closes, LONG_MA)
cross = Cross(ma_short, ma_long)

# ═══ 定義策略函數 ═══
def dual_ma_strategy(engine, data, i):
    if i < max(SHORT_MA, LONG_MA):
        return  # 數據不足

    if cross[i] == 1:
        engine.buy(data[i]['Close'], i, "金叉買入")
    elif cross[i] == -1:
        engine.sell(data[i]['Close'], i, "死叉賣出")

# ═══ 執行回測 ═══
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(dual_ma_strategy)

# ═══ 輸出結果 ═══
print(f"═══ 雙均線策略回測結果 ═══")
print(f"MA 參數: {SHORT_MA} / {LONG_MA}")
print(f"初始資金: {report['initial_capital']:,.0f}")
print(f"最終資金: {report['final_capital']:,.2f}")
print(f"總報酬率: {report['total_return']:+.2f}%")
print(f"最大回撤: {report['max_drawdown']:.2f}%")
print(f"夏普比率: {report['sharpe_ratio']:.2f}")

chart_data = {
    **report,
    "ma_short": [None if np.isnan(v) else round(v, 2) for v in ma_short],
    "ma_long": [None if np.isnan(v) else round(v, 2) for v in ma_long],
    "short_period": SHORT_MA,
    "long_period": LONG_MA
}
`,

  resultVar: 'chart_data',

  renderChart: (canvasId, data) => {
    const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
    if (parent) {
      const priceId = canvasId + '-price';
      const equityId = canvasId + '-equity';
      parent.innerHTML = `
        <div class="chart-wrapper" style="height:300px; margin-bottom:16px;">
          <canvas id="${priceId}"></canvas>
        </div>
        <div class="chart-wrapper" style="height:280px;">
          <canvas id="${equityId}"></canvas>
        </div>
      `;
      renderPriceWithMA(priceId, data);
      renderEquityCurve(equityId, data);
    }
  },

  params: [
    { id: 'SHORT_MA', label: '短期均線', min: 2, max: 30, step: 1, default: 5, format: v => `${v} 日` },
    { id: 'LONG_MA', label: '長期均線', min: 10, max: 120, step: 5, default: 20, format: v => `${v} 日` }
  ],

  exercises: [
    '將均線參數改為 10/30，觀察交易次數與勝率的變化',
    '嘗試 5/60 的組合，這對趨勢市場更好還是更差？',
    '嘗試加入一個條件：只在價格高於 MA60 時才允許買入（趨勢過濾）'
  ],

  prevUnit: null,
  nextUnit: { id: '6-2', title: '凱利公式' }
};
