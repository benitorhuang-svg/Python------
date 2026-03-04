import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve } from '../engine/chart-renderer';

export const unitMartingale: UnitDef = {
    title: '馬丁格爾策略與倍增法',
    module: '模組六 · 風險管理',
    difficulty: '進階',
    description: '馬丁格爾理論：在虧損時倍增賭注，直到一次獲利將先前所有虧損連本帶利贏回來。在量化中常表現為價格下跌時加倉。',
    needsData: true,

    theory: `
    <p><strong>馬丁格爾 (Martingale)</strong> 策略起源於 18 世紀的賭場，其核心是「虧損加倍」。</p>
    
    <p>基本原理：</p>
    <ul>
      <li>第一筆投入 1 單位，若獲利則重新開始。</li>
      <li>若虧損，則下一手投入 2 單位。</li>
      <li>若再虧損，則下一手投入 4 單位，以此類推（1, 2, 4, 8, 16...）。</li>
    </ul>

    <div class="warning-callout">
      <strong>⚠️ 死亡之牆：</strong><br>
      馬丁格爾理論上在「無限資金」與「無上限規則」下必勝。但在現實中，連續的黑天鵝路徑會導致資金在短時間內徹底「爆倉」。
    </div>

    <div class="info-callout">
      <strong>📌 量化應用：</strong><br>
      在交易中，表現為「跌幅加倉」。每當價格下跌 X% 時，就加碼買入原先兩倍的股數。
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
