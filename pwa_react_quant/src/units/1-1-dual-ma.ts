import type { UnitDef } from './types';
import { renderPriceWithMA, renderEquityCurve } from '../engine/chart-renderer';

export const unitDualMA: UnitDef = {
  title: '雙均線策略',
  module: '模組一 · 量化入門',
  difficulty: '基礎',
  description: '最經典的量化交易入門策略——利用快慢均線的交叉信號進行交易。',
  needsData: true,

  theory: `
    <p><strong>雙均線策略（Dual Moving Average Crossover）</strong>是量化交易中最基礎也最經典的策略。它的核心思想非常簡單：利用兩條不同週期的移動平均線，來捕捉市場趨勢的反轉點。</p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 400 160" style="width: 100%; max-width: 450px; height: auto; display: inline-block;">
        <!-- Background Grid -->
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="10%" y1="0" x2="10%" y2="100%" />
          <line x1="30%" y1="0" x2="30%" y2="100%" />
          <line x1="50%" y1="0" x2="50%" y2="100%" />
          <line x1="70%" y1="0" x2="70%" y2="100%" />
          <line x1="90%" y1="0" x2="90%" y2="100%" />
        </g>
        
        <!-- Long MA (Slow) - Purple -->
        <path d="M 0 60 Q 150 60 200 90 T 400 50" fill="none" stroke="#a855f7" stroke-width="3" stroke-dasharray="6,4" />
        
        <!-- Short MA (Fast) - Cyan -->
        <path d="M 0 130 Q 80 140 130 90 T 280 40 T 400 30" fill="none" stroke="#06b6d4" stroke-width="3" />
        
        <!-- Golden Cross Point -->
        <circle cx="127" cy="85" r="7" fill="#facc15" stroke="#0f172a" stroke-width="2" />
        <text x="127" y="110" fill="#facc15" font-size="12" font-weight="bold" text-anchor="middle" style="text-shadow: 0 2px 4px rgba(0,0,0,0.8);">黃金交叉 (買入)</text>

        <!-- Death Cross Point -->
        <circle cx="288" cy="65" r="7" fill="#ef4444" stroke="#0f172a" stroke-width="2" />
        <text x="288" y="45" fill="#ef4444" font-size="12" font-weight="bold" text-anchor="middle" style="text-shadow: 0 2px 4px rgba(0,0,0,0.8);">死亡交叉 (賣出)</text>
        
        <!-- Legends -->
        <rect x="270" y="125" width="15" height="4" fill="#06b6d4" />
        <text x="295" y="131" fill="#cbd5e1" font-size="11">短期均線 (敏感且快)</text>
        
        <rect x="270" y="145" width="15" height="4" fill="#a855f7" />
        <text x="295" y="151" fill="#cbd5e1" font-size="11">長期均線 (平滑且慢)</text>
      </svg>
    </div>

    <h3>指標計算與數學原理</h3>
    <div class="formula-box" id="ma-formula">
      MA(n) = (C₁ + C₂ + C₃ + ... + Cₙ) / n
    </div>
    <p>其中 <strong>C</strong> 代表每日的收盤價，<strong>n</strong> 代表計算的週期（例如 5 日、20 日）。均線的本質是「平滑歷史真實價格」，週期越短，線條越貼近當下價格；週期越長，越能過濾短期雜音。</p>

    <h3>核心交易邏輯</h3>
    <ul>
      <li>• <strong>金叉（黃金交叉）</strong>：短期均線從下方穿越長期均線。代表短期內市場的買方力量開始強於長期平均水準，是趨勢看漲的<strong>買入信號</strong>。</li>
      <li>• <strong>死叉（死亡交叉）</strong>：短期均線從上方穿越長期均線。代表短期內市場被拋售的力道壓過長期的上漲慣性，是趨勢看跌的<strong>賣出信號</strong>。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 為什麼這個簡單的策略能賺錢？</strong><br>
      因為它完美遵守了「截斷虧損，讓獲利奔跑」的交易聖經。在沒有趨勢的震盪期，它會不斷小虧損離場；但只要一抓到大波段趨勢，就能完整吃完魚身。
    </div>

    <h3>策略的兩面刃</h3>
    <p><strong>✅ 優勢：</strong>客觀不帶情感、極度簡單、在暴漲暴跌的「單邊趨勢市」中能捕捉驚人利潤。</p>
    <p><strong>❌ 劣勢：</strong>均線是「落後指標」。在「橫盤震盪市」中，價格來回穿梭會導致頻繁發出買賣訊號，出現「雙巴」(向上假突破被騙買、向下假跌破又賣在低點) 的嚴重資金磨損。</p>

    <div class="warning-callout">
      <strong>⚠️ 參數的藝術：</strong><br>
      均線週期太短（如 3 日/10 日），信號極度敏感，會產生大量摩擦成本（手續費與假訊號虧損）。週期太長（如 60 日/120 日），又會因為滯後性太嚴重，導致獲利回吐一大半才觸發出場點。這也是為什麼我們需要透過回測來尋找最佳的參數配對。
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
