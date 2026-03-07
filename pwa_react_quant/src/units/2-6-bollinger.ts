import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve, renderVolumeChart } from '../engine/chart-renderer';

export const unitBollinger: UnitDef = {
  title: '布林帶 (Bollinger Bands) 策略',
  module: '模組二 · 趨勢跟蹤',
  difficulty: '基礎',
  description: '利用標準差建立價格通道，判斷市場的波動程度與可能的均值回歸點。',
  needsData: true,

  theory: `
    <p><strong>布林帶 (Bollinger Bands)</strong> 是由約翰·布林 (John Bollinger) 在 1980 年代發明的技術分析工具。它結合了移動平均線與統計學中的「標準差」觀念。</p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 200" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <!-- Background Grid -->
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="0" y1="40" x2="450" y2="40" />
          <line x1="0" y1="80" x2="450" y2="80" />
          <line x1="0" y1="120" x2="450" y2="120" />
          <line x1="0" y1="160" x2="450" y2="160" />
        </g>
        
        <!-- Bollinger Band Fill -->
        <path d="M 0 60 Q 100 40 200 70 T 450 50 L 450 150 Q 350 170 200 130 T 0 140 Z" fill="rgba(34, 211, 238, 0.1)" stroke="none" />

        <!-- Upper Band -->
        <path class="svg-animated-path" d="M 0 60 Q 100 40 200 70 T 450 50" fill="none" stroke="#22d3ee" stroke-width="2" stroke-dasharray="4,2" />
        <text x="440" y="45" fill="#22d3ee" font-size="9" text-anchor="end">上軌 (+2σ)</text>

        <!-- Middle Band (MA) -->
        <path class="svg-animated-path" d="M 0 100 Q 100 80 200 100 T 450 100" fill="none" stroke="#94a3b8" stroke-width="1.5" />
        <text x="440" y="95" fill="#94a3b8" font-size="9" text-anchor="end">中軌 (MA)</text>

        <!-- Lower Band -->
        <path class="svg-animated-path" d="M 0 140 Q 100 120 200 130 T 450 150" fill="none" stroke="#fb7185" stroke-width="2" stroke-dasharray="4,2" />
        <text x="440" y="165" fill="#fb7185" font-size="9" text-anchor="end">下軌 (-2σ)</text>

        <!-- Price Action -->
        <path class="svg-animated-path" d="M 0 110 L 50 90 L 100 50 L 150 70 L 200 120 L 250 145 L 300 110 L 350 130 L 400 90 L 450 80" fill="none" stroke="#f1f5f9" stroke-width="2" />

        <!-- Signal: Mean Reversion -->
        <circle class="svg-breathe" cx="100" cy="50" r="5" fill="#fb7185" />
        <text x="100" y="35" fill="#fb7185" font-size="10" font-weight="bold" text-anchor="middle">超買/準備回歸</text>

        <circle class="svg-breathe" cx="250" cy="145" r="5" fill="#34d399" />
        <text x="250" y="165" fill="#34d399" font-size="10" font-weight="bold" text-anchor="middle">超跌/支撐反彈</text>
      </svg>
    </div>

    <h3>指標結構</h3>
    <p>布林帶由三條線組成：</p>
    <ul>
      <li><strong>中軌 (Middle Band)</strong>：通常是 20 日簡單移動平均線 (SMA 20)。</li>
      <li><strong>上軌 (Upper Band)</strong>：中軌 + 兩倍標準差 (MA + 2σ)。</li>
      <li><strong>下軌 (Lower Band)</strong>：中軌 - 兩倍標準差 (MA - 2σ)。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 核心理念：正態分佈</strong><br>
      在統計學中，假設價格服從正態分佈，則有 <strong>95.4%</strong> 的價格變動會發生在正負兩倍標準差（即布林帶內）之間。因此，當價格觸擊帶邊時，通常代表市場處於極端狀態。
    </div>

    <h3>交易策略邏輯</h3>
    <ol>
      <li><strong style="color: #34d399;">做多 (Buy)</strong>：價格由下往上穿過下軌（支撐確認）或由下往上穿過中軌（趨勢走強）。</li>
      <li><strong style="color: #fb7185;">做空/平倉 (Sell)</strong>：價格由上往下穿過上軌（壓力確認）或由上往下穿過中軌（趨勢轉弱）。</li>
    </ol>
    `,

  defaultCode: `import json
import numpy as np
from indicators import BOLL
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
PERIOD = 20
STD_DEV = 2.0

# 準備數據
data = stock_data
closes = [d['Close'] for d in data]

# 計算布林帶 (中軌, 上軌, 下軌)
ma, upper, lower = BOLL(closes, PERIOD, STD_DEV)

def strategy(engine, data, i):
    if i < PERIOD: return
    if np.isnan(upper[i]) or np.isnan(lower[i]): return
    
    close = data[i]['Close']
    
    # 策略：觸碰下軌買入，觸碰上軌賣出 (均值回歸思路)
    if engine.position == 0:
        if close < lower[i]:
            engine.buy(close, i, "跌破下軌：超跌買入")
            
    elif engine.position > 0:
        if close > upper[i]:
            engine.sell(close, i, "突破上軌：獲利了結")
        elif close < ma[i]:
            engine.sell(close, i, "跌破中軌：趨勢反轉止損")

# 執行回測 (使用升級後的引擎，包含滑價)
engine = BacktestEngine(data, initial_capital=100000, slippage=0.0005)
report = engine.run(strategy)

# 輸出結果

chart_data = {
    **report,
    "ma": ma,
    "upper": upper,
    "lower": lower,
    "volumes": [d['Volume'] for d in data],
    "closes": [d['Close'] for d in data]
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
          <div class="chart-wrapper" style="height:120px; margin-bottom:12px;"><canvas id="${volId}"></canvas></div>
          <div class="chart-wrapper" style="height:200px;"><canvas id="${equityId}"></canvas></div>
        `;

    renderEquityCurve(equityId, data);
    renderVolumeChart(volId, data);
    const labels = data.dates.map((d: string, i: number) => i % Math.ceil(data.dates.length / 30) === 0 ? d : '');

    new Chart(document.getElementById(priceId) as HTMLCanvasElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: '收盤價', data: data.equity_curve.map((_: number, i: number) => data.raw_data ? data.raw_data[i].Close : 0), borderColor: '#f1f5f9', borderWidth: 1.5, pointRadius: 0 },
          { label: '中軌', data: data.ma, borderColor: '#94a3b8', borderWidth: 1, pointRadius: 0 },
          { label: '上軌', data: data.upper, borderColor: 'rgba(34, 211, 238, 0.5)', borderWidth: 1, borderDash: [5, 5], pointRadius: 0 },
          { label: '下軌', data: data.lower, borderColor: 'rgba(251, 113, 133, 0.5)', borderWidth: 1, borderDash: [5, 5], pointRadius: 0, fill: '-1', backgroundColor: 'rgba(34, 211, 238, 0.05)' }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          title: { display: true, text: '價格與布林帶通道', color: '#fff' },
          tooltip: {
            callbacks: {
              afterLabel: function (context: any) {
                // Add trade reason to price chart tooltip if available
                const reason = data.trades.find((t: any) => t.index === context.dataIndex)?.reason;
                return reason ? '📝 理由: ' + reason : '';
              }
            }
          }
        }
      }
    });
  },

  params: [
    { id: 'PERIOD', label: '計算週期', min: 10, max: 60, step: 1, default: 20, format: v => `${v} 日` },
    { id: 'STD_DEV', label: '標準差倍數', min: 1.5, max: 3.5, step: 0.1, default: 2.0, format: v => `${v}σ` }
  ],

  exercises: [
    '調整標準差倍數為 1.5σ，觀察交易次數是否變多？勝率如何變化？',
    '當價格長期貼著上軌跑（這叫「飆帶」），我們的均值回歸策略會發生什麼事？如何優化？',
    '結合成交量：只有在成交量放大且觸碰軌道時才交易，觀察績效表現。'
  ],

  prevUnit: { id: '2-5', title: '簡易波動 EMV' },
  nextUnit: { id: '2-7', title: '相對強弱 RSI' }
};
