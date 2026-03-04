import type { UnitDef } from './types';
import { renderMultiLine } from '../engine/chart-renderer';

export const unitKelly: UnitDef = {
    title: '凱利公式驗證',
    module: '模組六 · 資金管理',
    difficulty: '基礎',
    description: '透過蒙地卡羅模擬，驗證凱利公式如何幫助我們計算最佳下注比例。',

    theory: `
    <p><strong>凱利公式（Kelly Criterion）</strong>是一個用來決定最佳下注比例的數學公式，由約翰·凱利（John L. Kelly Jr.）於 1956 年提出。</p>

    <p>它的核心問題是：<strong>在已知勝率和賠率的情況下，每次應該投入多少比例的資金，才能讓長期資產成長最大化？</strong></p>

    <div class="formula-box" id="kelly-formula">
      f* = (bp - q) / b
    </div>

    <p>其中：</p>
    <ul>
      <li>• <strong>f*</strong> = 最佳下注比例（佔總資金的百分比）</li>
      <li>• <strong>b</strong> = 賠率（盈利 / 虧損的比值）</li>
      <li>• <strong>p</strong> = 勝率（獲勝的機率）</li>
      <li>• <strong>q</strong> = 1 - p（失敗的機率）</li>
    </ul>

    <div class="info-callout">
      <strong>📌 例子：</strong>假設一個交易策略勝率 55%、賠率 2:1（贏2賠1），
      凱利公式建議的最佳下注比例是 f* = (2×0.55 - 0.45) / 2 = <strong>0.325（32.5%）</strong>
    </div>

    <p>但實際交易中，<strong>全凱利比例風險極高</strong>，通常使用「半凱利」（f*/2）甚至更保守的比例。我們用模擬來驗證不同比例的效果。</p>

    <div class="warning-callout">
      <strong>⚠️ 重要觀念：</strong>下注比例過大不會「賺更多」，反而會因為波動過大導致破產。這就是為什麼資金管理如此重要。
    </div>
  `,

    defaultCode: `import random
import json

# ═══ 策略參數（可修改！）═══
win_rate = 0.55      # 勝率 55%
payout = 2.0         # 賠率 2:1（贏2元賠1元）
initial_funds = 100  # 初始資金
rounds = 1000        # 模擬次數

# ═══ 凱利公式計算 ═══
kelly = (payout * win_rate - (1 - win_rate)) / payout
print(f"📐 凱利公式最佳比例: {kelly:.1%}")
print(f"📐 半凱利比例: {kelly/2:.1%}")
print()

# ═══ 模擬不同下注比例 ═══
bet_ratios = [0.10, kelly / 2, kelly, 0.50]
labels = ['10%', f'半凱利 {kelly/2:.0%}', f'凱利 {kelly:.0%}', '50%']
all_curves = []

random.seed(42)  # 固定隨機種子以便重現

for ratio in bet_ratios:
    funds = initial_funds
    curve = [funds]
    for _ in range(rounds):
        bet = funds * ratio
        if random.random() < win_rate:
            funds += bet * payout   # 贏了：獲得 bet × 賠率
        else:
            funds -= bet            # 輸了：損失 bet
        if funds < 0.01:
            funds = 0.01           # 防止資金歸零
        curve.append(round(funds, 2))
    all_curves.append(curve)

# ═══ 輸出結果 ═══
for i, label in enumerate(labels):
    final = all_curves[i][-1]
    ret = (final - initial_funds) / initial_funds * 100
    print(f"{label:>12s}  最終資金: {final:>12,.2f}  報酬率: {ret:>8,.1f}%")

# ═══ 回傳圖表數據 ═══
chart_data = {
    "series": [{"name": labels[i], "data": all_curves[i]} for i in range(len(labels))],
    "labels": list(range(rounds + 1)),
    "title": "🎯 不同下注比例的資金曲線（1000 次模擬）"
}
`,

    resultVar: 'chart_data',

    renderChart: (canvasId, data) => renderMultiLine(canvasId, data),

    params: [
        { id: 'win_rate', label: '勝率', min: 0.3, max: 0.8, step: 0.01, default: 0.55, format: v => `${(v * 100).toFixed(0)}%` },
        { id: 'payout', label: '賠率', min: 1.0, max: 5.0, step: 0.1, default: 2.0, format: v => `${v.toFixed(1)}:1` },
        { id: 'rounds', label: '模擬次數', min: 100, max: 5000, step: 100, default: 1000, format: v => v.toString() }
    ],

    exercises: [
        '將勝率改為 50%、賠率改為 2:1，觀察凱利比例的變化',
        '嘗試將下注比例設為 80%，觀察會發生什麼',
        '將賠率降到 1.5:1，勝率需要多少才不會虧損？',
        '修改代碼移除 random.seed(42)，多次執行觀察結果的波動'
    ],

    prevUnit: { id: '1-1', title: '雙均線策略' },
    nextUnit: null
};
