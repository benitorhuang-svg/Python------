import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitMartingale: UnitDef = {
    title: '馬丁格爾策略與倍增法',
    module: '模組六 · 風險與資金管理',
    difficulty: '進階',
    description: '馬丁格爾理論：在虧損時倍增賭注，直到一次獲利將先前所有虧損連本帶利贏回來。在量化中常表現為價格下跌時加倉。',
    needsData: true,

    theory: `
    <p><strong>馬丁格爾 (Martingale)</strong> 策略起源於 18 世紀法國賭場，其核心思維極其暴力且直觀：「<strong>不管前面輸多少次，只要最後贏一次，就能收回全部本金並獲利。</strong>」</p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 200" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="20%" y1="0" x2="20%" y2="100%" />
          <line x1="40%" y1="0" x2="40%" y2="100%" />
          <line x1="60%" y1="0" x2="60%" y2="100%" />
          <line x1="80%" y1="0" x2="80%" y2="100%" />
        </g>
        
        <!-- Price Path Downwards -->
        <path d="M 0 40 L 100 80 L 200 120 L 300 160" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="2,2" />
        <text x="310" y="165" fill="#64748b" font-size="10" text-anchor="start">資產價格連續下跌</text>

        <!-- Step 1: 1x Position -->
        <rect x="90" y="70" width="20" height="15" fill="#facc15" stroke="#ca8a04" stroke-width="1" />
        <text x="100" y="65" fill="#facc15" font-size="10" font-weight="bold" text-anchor="middle">投入 1 單位</text>
        <line x1="100" y1="80" x2="450" y2="80" stroke="#facc15" stroke-width="0.5" stroke-dasharray="2,2" />

        <!-- Step 2: 2x Position -->
        <rect x="190" y="100" width="20" height="30" fill="#facc15" stroke="#ca8a04" stroke-width="1" />
        <text x="200" y="95" fill="#facc15" font-size="10" font-weight="bold" text-anchor="middle">投入 2 單位</text>
        <line x1="200" y1="120" x2="450" y2="120" stroke="#facc15" stroke-width="0.5" stroke-dasharray="2,2" />

        <!-- Step 3: 4x Position -->
        <rect x="290" y="120" width="20" height="60" fill="#facc15" stroke="#ca8a04" stroke-width="1" />
        <text x="300" y="115" fill="#facc15" font-size="10" font-weight="bold" text-anchor="middle">投入 4 單位</text>
        <line x1="300" y1="160" x2="450" y2="160" stroke="#facc15" stroke-width="0.5" stroke-dasharray="2,2" />

        <!-- Average Cost Line (Pulled down rapidly) -->
        <path d="M 100 80 L 200 106.6 L 300 137" fill="none" stroke="#06b6d4" stroke-width="2.5" />
        <circle cx="300" cy="137" r="4" fill="#06b6d4" />
        <text x="310" y="140" fill="#06b6d4" font-size="10" font-weight="bold" text-anchor="start">均價大幅拉低</text>

        <!-- Final Win: Rebound -->
        <path d="M 300 160 Q 350 160 400 130" fill="none" stroke="#22c55e" stroke-width="2.5" />
        <circle cx="400" cy="130" r="5" fill="#22c55e" stroke="#0f172a" stroke-width="2" />
        <text x="400" y="115" fill="#22c55e" font-size="11" font-weight="bold" text-anchor="middle" style="text-shadow: 0 1px 2px rgba(0,0,0,0.8);">一波反彈，全部回本！</text>
        
        <!-- Danger Zone (Bankruptcy) -->
        <rect x="420" y="0" width="30" height="200" fill="rgba(239, 68, 68, 0.1)" />
        <text x="435" y="100" fill="#ef4444" font-size="10" font-weight="bold" text-anchor="middle" transform="rotate(-90 435 100)">破產深淵 (資金用盡)</text>
      </svg>
    </div>

    <h3>倍增法的邏輯魔力</h3>
    <p>這是一個與技術指標無關，純粹的「部位管理 (Position Sizing)」模型。在量化實務中，通常表現為<strong>「逢低加倉 / 網格交易」</strong>：</p>
    <ul>
      <li><strong>初次建倉：</strong> 先買入極小部分資金（例如 5%）。</li>
      <li><strong>越跌越買：</strong> 若價格下跌 X%，再次買入原先規模的 <strong>2倍</strong> 數量。</li>
      <li><strong>均價優勢：</strong> 因為後面加倉的部位越來越龐大，會把整體平均成本快速拉低。只要市場稍微反彈一點點碰到均價線，就能整體獲利出場。</li>
    </ul>

    <div class="warning-callout">
      <strong>⚠️ 阿基里斯的腳踝：死亡爆倉</strong><br>
      馬丁格爾被戲稱為「撿硬幣的推土機」。在無限本金的情況下這是一個必勝策略。但在現實生活總資金有上限，在連續 6 到 7 次虧損翻倍後（1→2→4→8→16→32→64...），幾波下跌黑天鵝就能在一夕之間把帳戶歸零。著名的 LTCM (長期資本管理公司) 破產就是死於類似的逆勢加倉。
    </div>

    <div class="info-callout">
      <strong>📌 量化優化：參數微調</strong><br>
      實務上為了避免爆倉，我們通常會「限制加倉次數最高上限（如最多 4 次）」，或者採用「非整數倍數（如每次加碼 1.3 倍代替 2 倍）」。
    </div>
  `,

    defaultCode: `import json
import numpy as np
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
BASE_PCT = 0.05    # 初次進場使用資金比例 (5%)
DROP_STEP = 2.0    # 每下跌 2%，加倉一次
TAKE_PROFIT = 1.0  # 整體獲利 1% 就全部清倉

# 準備數據
data = stock_data
closes = [d['Close'] for d in data]

# 追蹤變數
current_bet_count = 0

def strategy(engine, data, i):
    global current_bet_count
    close = data[i]['Close']
    
    # 邏輯：首次買入
    if engine.position == 0:
        current_bet_count = 1
        qty = (engine.capital * BASE_PCT) / close
        engine.buy(close, i, qty, "初始首注")
        
    # 邏輯：持倉中判斷是否加倉或止盈
    elif engine.position > 0:
        profit_pct = (close - engine.avg_price) / engine.avg_price * 100
        
        # 1. 達標止盈
        if profit_pct > TAKE_PROFIT:
            engine.sell(close, i, None, f"止盈出場 (第{current_bet_count}層)")
            current_bet_count = 0
            
        # 2. 虧損倍投 (Martingale)
        elif profit_pct < -(DROP_STEP * current_bet_count):
            current_bet_count += 1
            # 買入當前股數的兩倍 (這需要引擎支持)
            # 這裡我們用 simplified 版：這次買入量 = 基礎注 * (2 ^ 層數-1)
            # 只要資金還夠
            qty = (engine.initial_capital * BASE_PCT * (2 ** (current_bet_count - 1))) / close
            if engine.capital > qty * close:
                engine.buy(close, i, qty, f"第{current_bet_count}層加倍買入")
            else:
                # 資金不足沒法倍增了
                pass

# 執行回測
# 初始化資金設多一點，不然兩三次倍增就沒錢了
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"═══ 馬丁格爾策略回測 ═══")
print(f"最高加碼層數: {current_bet_count}")
print(f"總報酬率: {report['total_return']:+.2f}%")

chart_data = report
`,

    resultVar: 'chart_data',

    renderChart: (canvasId, data) => {
        renderEquityCurve(canvasId, data);
    },

    params: [
        { id: 'BASE_PCT', label: '首注比例', min: 0.01, max: 0.2, step: 0.01, default: 0.05, format: v => `${(v * 100).toFixed(0)}%` },
        { id: 'DROP_STEP', label: '加碼跌幅', min: 1, max: 10, step: 0.5, default: 2, format: v => `${v}%` },
        { id: 'TAKE_PROFIT', label: '目標獲利', min: 0.5, max: 5, step: 0.5, default: 1, format: v => `${v}%` }
    ],

    exercises: [
        '觀察資金曲線。馬丁格爾通常看起來非常平滑，但一旦遇到大回檔，曲線會呈現劇烈的垂直下跌。這說明了什麼？',
        '試著將「加碼跌幅」縮小到 1%，觀察你的資金是否會更快被耗盡。'
    ],

    prevUnit: { id: '5-2', title: '乖離率 BIAS' },
    nextUnit: { id: '6-2', title: '凱利公式' }
};
