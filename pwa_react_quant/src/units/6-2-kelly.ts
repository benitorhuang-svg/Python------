import type { UnitDef } from './types';
import { renderMultiLine } from '../engine/chart-renderer';

export const unitKelly: UnitDef = {
    title: '凱利公式驗證',
    module: '模組六 · 風險與資金管理',
    difficulty: '基礎',
    description: '透過蒙地卡羅模擬，驗證凱利公式如何幫助我們計算最佳下注比例。',

    theory: `
    <p><strong>凱利公式（Kelly Criterion）</strong>是一個用來決定最佳下注比例的數學公式，由約翰·凱利（John L. Kelly Jr.）於 1956 年提出，至今仍是量化資金管理領域的聖經。</p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 220" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <g stroke="rgba(255,255,255,0.05)" stroke-width="1">
          <line x1="20%" y1="0" x2="20%" y2="100%" />
          <line x1="40%" y1="0" x2="40%" y2="100%" />
          <line x1="60%" y1="0" x2="60%" y2="100%" />
          <line x1="80%" y1="0" x2="80%" y2="100%" />
        </g>
        
        <!-- Y Axis (Growth Rate) & X Axis (Bet Size) -->
        <line x1="50" y1="20" x2="50" y2="180" stroke="#cbd5e1" stroke-width="2" />
        <line x1="50" y1="180" x2="420" y2="180" stroke="#cbd5e1" stroke-width="2" />
        <text x="30" y="25" fill="#cbd5e1" font-size="10" transform="rotate(-90 30 25)" font-weight="bold">長期資產增長率 (Growth Rate)</text>
        <text x="420" y="195" fill="#cbd5e1" font-size="10" text-anchor="end" font-weight="bold">下注資金比例 (Bet Size %)</text>

        <!-- The Kelly Curve (Parabola) -->
        <!-- Optimal Kelly at 50%, zero growth around 100% -->
        <path d="M 50 180 Q 150 20 250 180" fill="none" stroke="#22c55e" stroke-width="3" />
        
        <!-- Danger Zone Curve -->
        <path d="M 250 180 Q 320 280 400 350" fill="none" stroke="#ef4444" stroke-width="3" stroke-dasharray="4,4" />
        
        <!-- Optimal Kelly Point -->
        <circle cx="150" cy="80" r="6" fill="#facc15" stroke="#0f172a" stroke-width="2" />
        <line x1="150" y1="80" x2="150" y2="180" stroke="#facc15" stroke-width="1" stroke-dasharray="2,2" />
        <text x="150" y="65" fill="#facc15" font-size="12" font-weight="bold" text-anchor="middle">f* (最佳凱利點)</text>
        <text x="150" y="195" fill="#facc15" font-size="10" text-anchor="middle">最高增長點</text>

        <!-- Half Kelly Point -->
        <circle cx="100" cy="118" r="4" fill="#06b6d4" />
        <line x1="100" y1="118" x2="100" y2="180" stroke="#06b6d4" stroke-width="1" stroke-dasharray="2,2" />
        <text x="100" y="105" fill="#06b6d4" font-size="10" font-weight="bold" text-anchor="middle">半凱利 (實戰極限)</text>
        <text x="100" y="210" fill="#06b6d4" font-size="9" text-anchor="middle">承擔一半風險/享3/4利潤</text>
        
        <!-- Overbetting Zone -->
        <rect x="250" y="30" width="160" height="140" fill="rgba(239, 68, 68, 0.05)" />
        <text x="330" y="100" fill="#ef4444" font-size="12" font-weight="bold" text-anchor="middle">過度下注區 (Overbetting)</text>
        <text x="330" y="120" fill="#ef4444" font-size="10" text-anchor="middle">賺得更少，風險無限大，最終破產</text>
      </svg>
    </div>

    <p>它的核心問題是：<strong>在已知勝率和賠率的情況下，每次應該投入多少比例的資金，才能讓長期資產成長最大化？</strong></p>

    <div class="formula-box" id="kelly-formula">
      f* = (bp - q) / b
    </div>

    <p>其中：</p>
    <ul>
      <li><strong style="color: #facc15;">f*</strong> = 最佳下注比例（佔總資金的百分比）</li>
      <li><strong style="color: #06b6d4;">b</strong> = 賠率（預期獲利 / 預期虧損）</li>
      <li><strong style="color: #22c55e;">p</strong> = 勝率（獲勝的機率）</li>
      <li><strong style="color: #ef4444;">q</strong> = 1 - p（失敗的機率）</li>
    </ul>

    <div class="info-callout">
      <strong>📌 例子：</strong>假設一個交易策略勝率 55%、賠率 2:1（停利空間是停損空間的兩倍），
      凱利公式建議的最佳下注比例是 f* = (2×0.55 - 0.45) / 2 = <strong>0.325（32.5%）</strong>
    </div>

    <div class="warning-callout">
      <strong>⚠️ 重要觀念：神奇的拋物線</strong><br>
      如圖所示，資產增長率是一條拋物線。當你下注超過 f* 點（例如全倉梭哈 100%），你並沒有「賺更多」，而是進入了<strong>過度下注區</strong>，幾次連續虧損的波動就會導致本金歸零。實務操作上受到市場滑價與不確定性影響，專業基金通常只會使用<strong>「半凱利 (Half-Kelly)」</strong>：承擔一半的破產風險，卻能享受 3/4 的理論利潤。
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
