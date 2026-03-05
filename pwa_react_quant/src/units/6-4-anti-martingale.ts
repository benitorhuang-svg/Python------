import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitAntiMartingale: UnitDef = {
    title: '反向馬丁格爾 (逆勢倍增法)',
    module: '模組六 · 風險與資金管理',
    difficulty: '進階',
    description: '與馬丁格爾相反，只在獲利時增加注碼。旨在捕捉大趨勢，並在震盪時保護資本 (即「順勢加倉，逆勢止損」)。',
    needsData: true,

    theory: `
    <p><strong>反向馬丁格爾 (Anti-Martingale)</strong> 被許多專業的順勢交易員（如海龜交易員）稱為「資金管理的聖杯」。因為它完美契合了交易界的最強金律：<strong>「截斷虧損，讓獲利奔跑。」</strong></p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 200" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="20%" y1="0" x2="20%" y2="100%" />
          <line x1="40%" y1="0" x2="40%" y2="100%" />
          <line x1="60%" y1="0" x2="60%" y2="100%" />
          <line x1="80%" y1="0" x2="80%" y2="100%" />
        </g>
        
        <!-- Price Path Upwards (Trend) -->
        <path d="M 0 160 L 100 120 L 200 80 L 300 40" fill="none" stroke="#22c55e" stroke-width="2" stroke-dasharray="2,2" />
        <text x="310" y="35" fill="#22c55e" font-size="10" text-anchor="start">資產價格連續上漲 (大趨勢)</text>

        <!-- Step 1: 1x Position (Initial) -->
        <rect x="90" y="115" width="20" height="15" fill="#06b6d4" stroke="#0891b2" stroke-width="1" />
        <text x="100" y="145" fill="#06b6d4" font-size="10" font-weight="bold" text-anchor="middle">建倉 1 單位</text>
        <line x1="100" y1="120" x2="450" y2="120" stroke="#06b6d4" stroke-width="0.5" stroke-dasharray="2,2" />

        <!-- Step 2: 2x Position (Pyramiding) -->
        <rect x="190" y="65" width="20" height="30" fill="#06b6d4" stroke="#0891b2" stroke-width="1" />
        <text x="200" y="110" fill="#06b6d4" font-size="10" font-weight="bold" text-anchor="middle">加注 2 單位</text>
        <line x1="200" y1="80" x2="450" y2="80" stroke="#06b6d4" stroke-width="0.5" stroke-dasharray="2,2" />

        <!-- Step 3: 4x Position -->
        <rect x="290" y="10" width="20" height="60" fill="#06b6d4" stroke="#0891b2" stroke-width="1" />
        <text x="300" y="85" fill="#06b6d4" font-size="10" font-weight="bold" text-anchor="middle">加注 4 單位</text>
        <line x1="300" y1="40" x2="450" y2="40" stroke="#06b6d4" stroke-width="0.5" stroke-dasharray="2,2" />

        <!-- Average Cost Line (Pulled up, but controlled) -->
        <path d="M 100 120 L 200 93.3 L 300 62.8" fill="none" stroke="#facc15" stroke-width="2.5" />
        <circle cx="300" cy="62.8" r="4" fill="#facc15" />
        <text x="310" y="60" fill="#facc15" font-size="10" font-weight="bold" text-anchor="start">均價緩步墊高 (仍低於市價)</text>

        <!-- Danger Scenario: Reversal -->
        <path d="M 300 40 Q 330 60 360 100" fill="none" stroke="#ef4444" stroke-width="2.5" />
        <circle cx="360" cy="100" r="5" fill="#ef4444" stroke="#0f172a" stroke-width="2" />
        <text x="360" y="118" fill="#ef4444" font-size="11" font-weight="bold" text-anchor="middle" style="text-shadow: 0 1px 2px rgba(0,0,0,0.8);">趨勢反轉！觸碰到動態停損</text>
        
        <!-- Safety Net -->
        <line x1="300" y1="80" x2="450" y2="80" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,4" />
        <text x="440" y="75" fill="#ef4444" font-size="9" text-anchor="end">整體停損停利線</text>
      </svg>
    </div>
    
    <h3>操作規則：贏衝輸縮</h3>
    <p>它與傳統馬丁格爾的思維完全顛倒，不是在虧損時攤平，而是<strong>用市場贏來的錢，當作籌碼去贏更多的錢</strong>。</p>
    <ul>
      <li><strong style="color: #ef4444;">輸的時候縮手 (保護資本)：</strong> 初始建倉極其微小。如果一進場就看錯被停損，最大損失就是那 1 單位。不會越陷越深。</li>
      <li><strong style="color: #22c55e;">贏的時候加注 (乘勝追擊)：</strong> 只有當倉位處於「浮盈」狀態，且突破下一個關鍵價位時，才動用資金或浮盈去擴大倉位。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 為什麼比較安全，卻又能賺大錢？</strong><br>
      因為你在震盪市瘋狂失誤（連虧 10 次）時，每次只虧首注 1 單位，總共虧 10。但只要你抓到一次超級狂牛大波段，你的倉位會呈現指數級別暴增 (1→2→4→8...)。一次盈虧比極高（例如 1賠20）的交易，就能涵蓋數十次的試錯成本。
    </div>
  `,

    defaultCode: `import json
import numpy as np
from backtest_engine import BacktestEngine

# ═══ 策略參數 ═══
BASE_PCT = 0.05    # 初次進場比例
WIN_STEP = 3.0     # 每漲 3%，就加碼一倍注碼
MAX_LAYERS = 3     # 最高加碼幾次

# 準備數據
data = stock_data
closes = [d['Close'] for d in data]

# 追蹤變數
current_layer = 0

def strategy(engine, data, i):
    global current_layer
    close = data[i]['Close']
    
    # 首次買入
    if engine.position == 0:
        current_layer = 1
        qty = (engine.initial_capital * BASE_PCT) / close
        engine.buy(close, i, qty, "Anti-Martingale 首注")
        
    # 持倉中判斷獲利加碼或停損
    elif engine.position > 0:
        # 計算相對於平均成本的獲利
        profit_pct = (close - engine.avg_price) / engine.avg_price * 100
        
        # 1. 達標加碼
        if profit_pct > (WIN_STEP * current_layer) and current_layer < MAX_LAYERS:
            current_layer += 1
            # 加碼注碼 (這正是獲利時增加暴露)
            qty = (engine.initial_capital * BASE_PCT * (current_layer)) / close
            if engine.capital > qty * close:
                engine.buy(close, i, qty, f"獲利追擊 第{current_layer}次法加碼")
                
        # 2. 獲利回吐或止損
        elif profit_pct < -2.0: # 固定回調停損
            engine.sell(close, i, None, "回調保護性止損")
            current_layer = 0

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果
print(f"═══ 反向馬丁格爾策略回測 ═══")
print(f"最大持倉層數: {current_layer}")
print(f"總報酬率: {report['total_return']:+.2f}%")

chart_data = report
`,

    resultVar: 'chart_data',

    renderChart: (canvasId, data) => {
        renderEquityCurve(canvasId, data);
    },

    params: [
        { id: 'BASE_PCT', label: '首注比例', min: 0.01, max: 0.2, step: 0.01, default: 0.05, format: v => `${(v * 100).toFixed(0)}%` },
        { id: 'WIN_STEP', label: '獲利加碼點', min: 1, max: 10, step: 1, default: 3, format: v => `${v}%` },
        { id: 'MAX_LAYERS', label: '最大加碼次數', min: 1, max: 10, step: 1, default: 3, format: v => `${v} 次` }
    ],

    exercises: [
        '當你在上漲趨勢中持續加碼，為什麼你的平均持倉成本也會跟著拉高？這對接下來的回檔風險有什麼影響？',
        '嘗試思考：這種策略在什麼樣的市場環境下（趨勢、震盪、尖峰）表現最差？'
    ],

    prevUnit: { id: '6-2', title: '凱利公式' },
    nextUnit: { id: '7-1', title: '基本面量化實踐' }
};
