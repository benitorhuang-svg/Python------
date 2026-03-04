import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitAntiMartingale: UnitDef = {
    title: '反向馬丁格爾 (逆勢倍增法)',
    module: '模組六 · 風險管理',
    difficulty: '進階',
    description: '與馬丁格爾相反，只在獲利時增加注碼。旨在捕捉大趨勢，並在震盪時保護資本 (即「順勢加倉，逆勢止損」)。',
    needsData: true,

    theory: `
    <p><strong>反向馬丁格爾 (Anti-Martingale)</strong> 被許多專業交易員稱為「聖杯」的基石，因為它符合了「截斷虧損，讓獲利奔跑」的原則。</p>
    
    <p>操作規則：</p>
    <ul>
      <li>贏的時候<strong>加碼</strong>（乘勝追擊）。</li>
      <li>輸的時候<strong>回歸首注</strong>（保護資本）。</li>
    </ul>

    <div class="info-callout">
      <strong>📌 為什麼比較安全？</strong><br>
      因為你在虧損時不會去硬碰硬（不會倍增賭注），所以最大的虧損就是首注。而一旦抓到波段趨勢，你手上的籌碼會以指數級增長，創造驚人的盈餘。
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
        { id: 'WIN_STEP', label: '獲利加碼點', min: 1, max: 10, step: 1, default: 3, format: v => `${v}%` }
    ],

    exercises: [
        '當你在上漲趨勢中持續加碼，為什麼你的平均持倉成本也會跟著拉高？這對接下來的回檔風險有什麼影響？',
        '嘗試思考：這種策略在什麼樣的市場環境下（趨勢、震盪、尖峰）表現最差？'
    ],

    prevUnit: { id: '6-2', title: '凱利公式' },
    nextUnit: { id: '7-1', title: '基本面量化實踐' }
};
