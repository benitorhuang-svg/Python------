import type { UnitDef } from './types';
import { Chart } from 'chart.js';
import { renderEquityCurve, renderVolumeChart, renderPriceWithMA } from '../engine/chart-renderer';

export const unitLinearRegression: UnitDef = {
    title: '線性回歸價格預測',
    module: '模組八 · 機器學習入門',
    difficulty: '困難',
    description: '利用線性回歸 (Linear Regression) 建立價格預測模型。學習如何選擇特徵 (Features)、設定目標 (Target) 並驗證模型的預測準確度。',
    needsData: true,

    theory: `
    <p>歡迎來到量化交易的進階領域：<strong>機器學習 (Machine Learning)</strong>。在前面的模組中，我們使用的是「規則驅動 (Rule-based)」策略（例如：如果 A 發生，就做 B）。現在，我們要轉向「數據驅動 (Data-driven)」——讓電腦自己從數據中尋找規律。</p>

    <div style="margin: 24px 0; background: var(--bg-hover); border-radius: var(--radius-lg); padding: 20px; text-align: center; border: 1px solid var(--border-subtle);">
      <svg viewBox="0 0 450 180" style="width: 100%; max-width: 500px; height: auto; display: inline-block;">
        <!-- Regression Line -->
        <line x1="50" y1="150" x2="400" y2="30" stroke="#22d3ee" stroke-width="2" stroke-dasharray="4,4" />
        <text x="400" y="25" fill="#22d3ee" font-size="10" text-anchor="end">回歸線 (最佳預測)</text>

        <!-- Points -->
        <circle cx="80" cy="140" r="3" fill="#818cf8" />
        <circle cx="120" cy="110" r="3" fill="#818cf8" />
        <circle cx="160" cy="130" r="3" fill="#818cf8" />
        <circle cx="200" cy="80" r="3" fill="#818cf8" />
        <circle cx="250" cy="60" r="3" fill="#818cf8" />
        <circle cx="300" cy="90" r="3" fill="#818cf8" />
        
        <!-- Target Point -->
        <circle class="svg-breathe" cx="380" cy="40" r="5" fill="#facc15" />
        <text x="385" y="60" fill="#facc15" font-size="10" font-weight="bold">預測明日價格</text>

        <text x="225" y="175" fill="var(--text-dim)" font-size="9" text-anchor="middle">X：特徵 (MA, RSI, 歷史波動...) -> Y：明日報酬</text>
      </svg>
    </div>

    <h3>什麼是線性回歸？</h3>
    <p>簡單來說，線性回歸嘗試找到一條「最貼合所有歷史數據點」的直線。其數學公式為：</p>
    <div class="formula-box" style="text-align: center;">
      <strong>y = w₁x₁ + w₂x₂ + ... + b</strong>
    </div>
    <ul>
      <li><strong>y (目標)</strong>：我們想預測的值（例如：明日的漲跌幅）。</li>
      <li><strong>x (特徵)</strong>：我們用來預測的工具（例如：今日的 RSI、昨日的成交量）。</li>
      <li><strong>w (權重)</strong>：電腦學習後賦予每個特徵的重要性。</li>
    </ul>

    <h3>量化交易中的 ML 流程</h3>
    <ol>
      <li><strong>特徵工程 (Feature Engineering)</strong>：將技術指標轉化為模型看得懂的 X 矩陣。</li>
      <li><strong>數據加窗 (Windowing)</strong>：使用過去 N 天的數據來預測未來 1 天。</li>
      <li><strong>訓練與預測</strong>：計算最優權重，並對最新的數據進行推理 (Inference)。</li>
    </ol>

    <div class="info-callout">
      <strong>⚠️ 機器學習的陷阱：過擬合 (Overfitting)</strong><br>
      如果你的特徵太多或規律太複雜，電腦可能會「死背」歷史數據，導致在回測中表現完美，但對未來一無所知。保持模型的簡潔是關鍵。
    </div>
    `,

    defaultCode: `import json
import numpy as np
from indicators import RSI, MA
from backtest_engine import BacktestEngine

# ═══ 機器學習設定 ═══
LOOKBACK = 10      # 使用過去 10 天的數據作為訓練集
PREDICT_DAYS = 1    # 預測明日價格

# 準備數據
data = stock_data
closes = np.array([d['Close'] for d in data])
rsi = np.array(RSI(closes, 14))

# 構建特徵矩陣 (X) 與 目標向量 (y)
# 我們預測的是「漲跌幅百分比」
returns = np.diff(closes) / closes[:-1] * 100

preds = np.full(len(closes), 0.0)

# 簡單線性回歸擬合 (手動實現)
def predict_next(x_data, y_data, next_x):
    # 手動最小平方法：(X'X)^-1 X'y
    X = np.column_stack([np.ones(len(x_data)), x_data])
    try:
        w = np.linalg.inv(X.T @ X) @ X.T @ y_data
        return w[0] + w[1] * next_x
    except:
        return 0

for i in range(20, len(closes) - 1):
    # 特徵：過去 N 天的 RSI 與 當前價格相對於均線的離散程度
    x_features = rsi[i-LOOKBACK : i]
    y_targets = returns[i-LOOKBACK+1 : i+1]
    
    # 預測當前 i 對應的明天 i+1 的漲跌
    preds[i+1] = predict_next(x_features, y_targets, rsi[i])

def strategy(engine, data, i):
    if i < 30: return
    
    close = data[i]['Close']
    prediction = preds[i] # 這是對今日收盤相對於昨日的預測 (或者是對明日的預期)
    
    # 策略邏輯：如果預測漲幅 > 0.5% 則買入，預測跌幅 < -0.5% 則賣出
    if engine.position == 0:
        if prediction > 0.5:
            engine.buy(close, i, f"ML預測漲幅:{prediction:.2f}%")
    elif engine.position > 0:
        if prediction < -0.2:
            engine.sell(close, i, f"ML預測轉弱:{prediction:.2f}%")

# 執行回測
engine = BacktestEngine(data, initial_capital=100000)
report = engine.run(strategy)

# 輸出結果

chart_data = {
    **report,
    "predictions": preds.tolist(),
    "volumes": [d['Volume'] for d in data],
    "closes": closes.tolist()
}
`,

    resultVar: 'chart_data',

    renderChart: (canvasId, data) => {
        const parent = document.getElementById(canvasId)?.parentElement?.parentElement;
        if (!parent) return;

        const priceId = canvasId + '-price';
        const predId = canvasId + '-pred';
        const volId = canvasId + '-volume';
        const equityId = canvasId + '-equity';

        parent.innerHTML = `
          <div class="chart-wrapper" style="height:250px; margin-bottom:12px;"><canvas id="${priceId}"></canvas></div>
          <div class="chart-wrapper" style="height:120px; margin-bottom:12px;"><canvas id="${predId}"></canvas></div>
          <div class="chart-wrapper" style="height:100px; margin-bottom:12px;"><canvas id="${volId}"></canvas></div>
          <div class="chart-wrapper" style="height:200px;"><canvas id="${equityId}"></canvas></div>
        `;

        renderEquityCurve(equityId, data);
        renderPriceWithMA(priceId, data);
        renderVolumeChart(volId, data);
        const labels = data.dates.map((d: string, i: number) => i % Math.ceil(data.dates.length / 30) === 0 ? d : '');

        // Predictions Chart
        new Chart(document.getElementById(predId) as HTMLCanvasElement, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'ML 預測漲跌%', data: data.predictions, borderColor: '#facc15', borderWidth: 1.5, pointRadius: 0 },
                    { label: '基準線', data: new Array(data.predictions.length).fill(0), borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1, pointRadius: 0 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { title: { display: true, text: '機器學習預測值', color: '#fff' } }
            }
        });
    },

    params: [
        { id: 'LOOKBACK', label: '訓練集長度', min: 5, max: 100, step: 5, default: 10, format: v => `${v} 天` }
    ],

    exercises: [
        '嘗試增加特徵：目前的 X 只有 RSI。如果你把成交量的變動也加入矩陣 X 中，模型的預測準確度會提升嗎？',
        '改變訓練集長度 LOOKBACK：過短模型的權重會抖動很大，過長模型會反應遲鈍。尋找最佳平衡點。',
        '「滑動視窗」概念：我們每一天都重新訓練模型，這在金融市場中非常常見。思考為什麼不一次訓練完終身使用？'
    ],

    prevUnit: { id: '7-1', title: '終極實戰' },
    nextUnit: { id: '8-2', title: '邏輯回歸分類' }
};
