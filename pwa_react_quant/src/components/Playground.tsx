import { useEffect, useRef, useState, useCallback } from 'react';
import type { StrategyStats } from '../types/backtest';
import type { UnitDef, UnitParam } from '../units/types';
import { createEditor, getCode, setCode } from '../engine/editor';
import {
    renderEquityCurve, renderPriceWithMA, renderVolumeChart,
    renderUnderwaterChart, renderDistributionChart,
    renderOptimizationBarChart, renderOptimizationScatterChart
} from '../engine/chart-renderer';
import { escapeRegex } from './unit/utils';
import { loadStockData, generateSimulatedData } from '../engine/data-loader';
import { setGlobal, runAndGetResult } from '../engine/pyodide-runner';
import { Copy, Play, FileDown, Settings, Sliders, RefreshCw, Terminal, Zap } from 'lucide-react';
import { exportCsv } from '../engine/csv-exporter';
import TerminalPanel from './unit/TerminalPanel';
import TradeTable from './unit/TradeTable';
import OptimizeConfigPanel from './unit/OptimizePanel';
import OptimizeResultsPanel from './unit/OptimizeResultsPanel';
import ParamsBlock from './unit/ParamsBlock';
import { useOptimizer } from '../hooks/useOptimizer'; interface Props {
    pyodideReady: boolean;
    onRunStart?: () => void;
}

const DEFAULT_CODE = `import numpy as np
import pandas as pd
from backtest_engine import BacktestEngine
from indicators import MACD, RSI, BOLL, MA, EMA

# ════ 策略邏輯 ════
# 提示：參數建議使用外部滑桿控制，這裏自動與下方 UI 同步
# 全域變數: EMA_FAST_VAL, EMA_SLOW_VAL, RSI_PERIOD_VAL
EMA_FAST = EMA_FAST_VAL
EMA_SLOW = EMA_SLOW_VAL

def strategy(engine, data, i):
    closes = [d['Close'] for d in data]
    
    # 計算指標
    dif, dea, hist = MACD(closes, fast_period=EMA_FAST, slow_period=EMA_SLOW)
    rsi_vals = RSI(closes, period=RSI_PERIOD_VAL)
    
    if i < EMA_SLOW: return
    
    curr_rsi = rsi_vals[i]
    curr_macd = hist[i]
    prev_macd = hist[i-1]
    
    # 買入: MACD 金叉 + RSI 超過 40
    if engine.position == 0:
        if (curr_macd > 0 and prev_macd <= 0) and (curr_rsi > 40):
            engine.buy(closes[i], i, "MACD金叉 + RSI轉強")
            
    # 賣出: MACD 死叉 或 RSI 超漲 (70)
    elif engine.position > 0:
        if (curr_macd < 0 and prev_macd >= 0) or (curr_rsi > 70):
            engine.sell(closes[i], i, "MACD死叉或RSI超賣")

# ══ 執行全量回測 ══
engine = BacktestEngine(stock_data, initial_capital=1000000)
report = engine.run(strategy)
report
`;

const PLAYGROUND_PARAMS: UnitParam[] = [
    { id: 'EMA_FAST', label: '快線 EMA', min: 2, max: 50, step: 1, default: 12, format: v => `${v}` },
    { id: 'EMA_SLOW', label: '慢線 EMA', min: 20, max: 200, step: 1, default: 26, format: v => `${v}` },
    { id: 'MACD_SIG', label: 'MACD 訊號', min: 5, max: 30, step: 1, default: 9, format: v => `${v}` },
    { id: 'RSI_PERIOD', label: 'RSI 週期', min: 5, max: 60, step: 1, default: 14, format: v => `${v}` },
    { id: 'RSI_BUY', label: 'RSI 買入值', min: 10, max: 50, step: 1, default: 30, format: v => `${v}` },
    { id: 'RSI_SELL', label: 'RSI 賣出值', min: 50, max: 90, step: 1, default: 70, format: v => `${v}` },
    { id: 'BOLL_PERIOD', label: '布林週期', min: 10, max: 60, step: 1, default: 20, format: v => `${v}` },
    { id: 'BOLL_STD', label: '布林標準差', min: 1, max: 4, step: 0.1, default: 2.0, format: v => `${v.toFixed(1)}` },
    { id: 'MA_PERIOD', label: 'MA 週期', min: 5, max: 200, step: 5, default: 20, format: v => `${v}` },
    { id: 'ATR_PERIOD', label: 'ATR 週期', min: 10, max: 60, step: 1, default: 14, format: v => `${v}` },
    { id: 'ATR_MUL', label: 'ATR 倍數', min: 1, max: 5, step: 0.5, default: 2.0, format: v => `${v.toFixed(1)}` },
    { id: 'KDJ_N', label: 'KDJ 週期', min: 5, max: 30, step: 1, default: 9, format: v => `${v}` },
    { id: 'KDJ_M1', label: 'KDJ M1', min: 2, max: 10, step: 1, default: 3, format: v => `${v}` },
    { id: 'KDJ_M2', label: 'KDJ M2', min: 2, max: 10, step: 1, default: 3, format: v => `${v}` },
    { id: 'DONCHIAN_P', label: '唐奇安週期', min: 10, max: 100, step: 5, default: 20, format: v => `${v}` },
    { id: 'BREAKOUT_K', label: '突破係數 K', min: 0.1, max: 2.0, step: 0.1, default: 0.5, format: v => `${v.toFixed(1)}` },
    { id: 'STOP_LOSS', label: '停損比例', min: 1, max: 20, step: 0.5, default: 5, format: v => `${v}%` },
    { id: 'TAKE_PROFIT', label: '停利比例', min: 2, max: 50, step: 1, default: 10, format: v => `${v}%` },
    { id: 'POSITION_PCT', label: '倉位比例', min: 10, max: 100, step: 5, default: 100, format: v => `${v}%` },
    { id: 'LOOKBACK', label: '歷史長度', min: 10, max: 200, step: 10, default: 60, format: v => `${v}` }
];

const PLAYGROUND_UNIT: UnitDef = {
    title: 'Playground',
    module: '0',
    difficulty: 'All',
    description: '',
    theory: '',
    defaultCode: DEFAULT_CODE,
    resultVar: 'report',
    renderChart: renderEquityCurve,
    params: PLAYGROUND_PARAMS,
    prevUnit: null,
    nextUnit: null
};

export default function Playground({ pyodideReady, onRunStart }: Props) {
    const editorRef = useRef<HTMLDivElement>(null);

    const [dataSource, setDataSource] = useState<'real' | 'simulated'>('real');
    const [symbol, setSymbol] = useState('2330');
    const [dataLoaded, setDataLoaded] = useState(false);

    // 視圖狀態
    const [centerView, setCenterView] = useState<'theory' | 'run' | 'optimize_res'>('theory');
    const [rightView, setRightView] = useState<'code' | 'terminal' | 'parameters'>('code');

    // 參數滑桿狀態
    const [params, setParams] = useState<Record<string, number>>(() => {
        const defaults: Record<string, number> = {};
        PLAYGROUND_UNIT.params?.forEach(p => defaults[p.id] = p.default);
        return defaults;
    });

    const [isRunning, setIsRunning] = useState(false);
    const [hasRun, setHasRun] = useState(false);
    const [stats, setStats] = useState<StrategyStats | null>(null);
    const [logs, setLogs] = useState<{ text: string; type: string }[]>([]);

    const optimizer = useOptimizer({
        unit: PLAYGROUND_UNIT, pyodideReady, params, onRunStart
    });

    const handleParamChange = useCallback((id: string, value: string) => {
        const val = parseFloat(value);
        setParams(prev => ({ ...prev, [id]: val }));

        // Push param to python global explicitly for playground users if they want it
        if (pyodideReady) {
            setGlobal(`${id}_VAL`, val);
            if (id === 'RSI_PERIOD') setGlobal('RSI_VAL', val);
        }

        const currentCode = getCode();
        const newDoc = currentCode.replace(
            new RegExp(`^(${escapeRegex(id)}\\s*=\\s*)([\\w.]+)`, 'm'),
            `$1${value}`
        );
        if (newDoc !== currentCode) setCode(newDoc);
    }, [pyodideReady]);

    // Optimize handler
    const handleOptimize = useCallback(async () => {
        setRightView('parameters');
        setCenterView('optimize_res');
        await optimizer.handleOptimize();
    }, [optimizer]);

    // 同步參數到 Python 全域變數初始化
    useEffect(() => {
        if (!pyodideReady) return;
        Object.entries(params).forEach(([id, val]) => {
            setGlobal(`${id}_VAL`, val);
            if (id === 'RSI_PERIOD') setGlobal('RSI_VAL', val);
        });
    }, [pyodideReady]); // 僅初始載入觸發，動態由 handleParamChange 處理

    // ─── Re-render charts on view switch or new results ──────────────────────────
    useEffect(() => {
        if (centerView === 'optimize_res' && optimizer.scanResults.length > 0) {
            requestAnimationFrame(() => {
                renderOptimizationBarChart('result-opt-bar', optimizer.scanResults.slice(0, 30));
                renderOptimizationScatterChart('result-opt-scatter', optimizer.scanResults);
            });
        }
    }, [centerView, optimizer.scanResults]);

    // Editor sync
    useEffect(() => {
        if (editorRef.current) {
            const savedCode = localStorage.getItem(`quant_playground_code`);
            createEditor(editorRef.current, savedCode || DEFAULT_CODE, (newCode) => {
                localStorage.setItem(`quant_playground_code`, newCode);
            });
        }
    }, []);

    // Load data
    useEffect(() => {
        if (!pyodideReady) return;
        setDataLoaded(false);
        const loadPromise = dataSource === 'real'
            ? loadStockData(symbol)
            : Promise.resolve({
                data: generateSimulatedData(500),
                source: 'simulated' as const,
                symbol: '模擬資料'
            });

        loadPromise.then(async result => {
            await setGlobal('stock_data', result.data);
            setDataLoaded(true);
        }).catch(async () => {
            alert('抓取資料失敗，使用模擬資料代替');
            const simData = generateSimulatedData(500);
            await setGlobal('stock_data', simData);
            setDataLoaded(true);
        });
    }, [pyodideReady, dataSource, symbol]);

    const handleRun = async () => {
        if (!pyodideReady || !dataLoaded || isRunning) return;

        setIsRunning(true);
        setHasRun(true);
        setRightView('terminal');
        setLogs([]);
        setStats(null);
        onRunStart?.();

        const code = getCode();
        const appendLogs = (text: string, type: 'info' | 'error') => {
            setLogs(prev => [...prev, { text, type }]);
        };

        try {
            const result = await runAndGetResult(code, 'report', appendLogs);
            setCenterView('run');
            if (result.success && result.data) {
                setStats(result.data);
                requestAnimationFrame(() => {
                    renderEquityCurve('pg-result-chart', result.data);
                    if (result.data.drawdown_series) renderUnderwaterChart('pg-underwater-chart', result.data);
                    if (result.data.profit_distribution) renderDistributionChart('pg-dist-chart', result.data.profit_distribution);
                    if (result.data.price_data) renderPriceWithMA('pg-price-ma-chart', {
                        ...result.data.price_data, ...result.data.ma_data, trades: result.data.trades
                    });
                    if (result.data.volume_data) renderVolumeChart('pg-volume-chart', result.data.volume_data);
                });
            } else if (result.error) {
                appendLogs(result.error, 'error');
            }
        } catch (err: any) {
            appendLogs(err.message, 'error');
        } finally {
            setIsRunning(false);
        }
    };

    const handleCopy = () => navigator.clipboard.writeText(getCode());
    const handleReset = () => {
        if (confirm("確定要重設為預設程式碼嗎？")) {
            setCode(DEFAULT_CODE);
            localStorage.setItem(`quant_playground_code`, DEFAULT_CODE);
        }
    };

    return (
        <div className="unit-layout-2col">
            {/* ═══ CENTER PANEL ═══ */}
            <div className="unit-center-panel">
                <div className="panel-top-tabs">
                    <button className={`panel-tab ${centerView === 'theory' ? 'active' : ''}`} onClick={() => setCenterView('theory')}>
                        Playground
                    </button>
                    <button className={`panel-tab ${centerView === 'run' ? 'active' : ''}`} onClick={() => setCenterView('run')}>
                        單次回測
                    </button>
                    <button className={`panel-tab ${centerView === 'optimize_res' ? 'active' : ''}`} onClick={() => setCenterView('optimize_res')}>
                        篩選參數結果
                    </button>
                </div>

                <div className="center-content-area">
                    {/* Theory (Playground 說明) */}
                    <div className={`theory-scroll ${centerView === 'theory' ? 'active-view' : 'hidden-view'}`} style={{ padding: '24px' }}>
                        <h1 style={{ fontSize: '2rem', marginBottom: '16px', color: 'var(--brand-primary)' }}>自由沙盒模式</h1>
                        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
                            這是一個完全自由的量化策略沙盒。你可以在右側撰寫你的 Python 腳本，手動操作資料並回測任何想法。
                            <br /><br />
                            點擊右上角的 <strong>Run</strong> 來執行你的程式碼。執行過程中，系統會自動切換至「Terminal」查看結果與程式印出的日誌。
                            <br /><br />
                            若需將結果圖表化，請確保你的程式碼最終呼叫 <code>report = engine.run(strategy)</code>！
                        </p>
                    </div>

                    {/* Run Results */}
                    <div className={`results-scroll ${centerView === 'run' ? 'active-view' : 'hidden-view'}`} style={{ padding: '16px' }}>
                        {!stats && !isRunning && !hasRun && (
                            <div className="empty-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <Play size={44} style={{ opacity: 0.5, marginBottom: '16px' }} />
                                <p>請撰寫策略並點擊 Run 開始回測</p>
                                <p style={{ opacity: 0.7, fontSize: '0.85rem', marginTop: '8px' }}>你可以自由匯入 indicators.py 內的技術指標，或自行撰寫</p>
                            </div>
                        )}
                        {!stats && !isRunning && hasRun && (
                            <div className="empty-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                <Terminal size={44} style={{ opacity: 0.3, marginBottom: '16px', color: 'var(--text-primary)' }} />
                                <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>執行成功</p>
                                <p style={{ opacity: 0.7, fontSize: '0.85rem', marginTop: '8px' }}>程式碼已執行完畢，上方可撰寫產生回測報表的自訂邏輯。</p>
                            </div>
                        )}
                        {stats && (
                            <>
                                <div className="chart-container" style={{ minHeight: '350px', marginBottom: '12px' }}>
                                    <canvas id="pg-result-chart" style={{ width: '100%', height: '100%' }} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                                    <div className="chart-container" style={{ minHeight: '220px' }}><canvas id="pg-underwater-chart" style={{ width: '100%', height: '100%' }} /></div>
                                    <div className="chart-container" style={{ minHeight: '220px' }}><canvas id="pg-dist-chart" style={{ width: '100%', height: '100%' }} /></div>
                                </div>
                                <div className="chart-container" style={{ minHeight: '200px', marginBottom: '12px' }}>
                                    <canvas id="pg-price-ma-chart" style={{ width: '100%', height: '100%' }} />
                                </div>
                                <div className="chart-container" style={{ minHeight: '150px' }}>
                                    <canvas id="pg-volume-chart" style={{ width: '100%', height: '100%' }} />
                                </div>
                                <div style={{ marginTop: '16px' }}>
                                    <TradeTable trades={stats.trades || []} unitId="playground" />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Optimize Results View */}
                    <div className={`results-scroll ${centerView === 'optimize_res' ? 'active-view' : 'hidden-view'}`} style={{ padding: '16px' }}>
                        <OptimizeResultsPanel scanResults={optimizer.scanResults} />
                    </div>
                </div>
            </div>

            {/* ═══ RIGHT PANEL ═══ */}
            <div className="unit-editor-panel">
                {/* Top toolbar */}
                <div className="editor-toolbar">
                    <div className="editor-tabs">
                        <button className={`editor-tab ${rightView === 'code' ? 'active' : ''}`} onClick={() => setRightView('code')}>
                            Code
                        </button>
                        <button className={`editor-tab ${rightView === 'terminal' ? 'active' : ''}`} onClick={() => setRightView('terminal')}>
                            Terminal
                        </button>
                        <button className={`editor-tab ${rightView === 'parameters' ? 'active' : ''}`} onClick={() => setRightView('parameters')}>
                            Parameters
                        </button>
                    </div>

                    <div className="btn-group" style={{ marginLeft: 'auto' }}>
                        <button className="btn btn-outline" onClick={handleReset} style={{ fontSize: '0.72rem', padding: '5px 12px' }}>
                            Reset
                        </button>
                        <button
                            className={`btn ${isRunning ? 'btn-danger' : pyodideReady && dataLoaded ? 'btn-primary' : ''}`}
                            style={{
                                minWidth: '90px',
                                justifyContent: 'center',
                                padding: '5px 16px',
                                background: (!pyodideReady || !dataLoaded) ? 'var(--bg-document)' : undefined,
                                border: (!pyodideReady || !dataLoaded) ? '1px solid var(--border-medium)' : undefined,
                                color: (!pyodideReady || !dataLoaded) ? 'var(--text-muted)' : undefined,
                                cursor: (!pyodideReady || !dataLoaded) ? 'not-allowed' : 'pointer'
                            }}
                            disabled={!pyodideReady || !dataLoaded}
                            onClick={handleRun}
                        >
                            {(!pyodideReady || !dataLoaded) ? '載入中...' : (isRunning ? 'Stop' : 'Run')}
                        </button>
                        {stats && (
                            <button className="btn btn-outline" style={{ fontSize: '0.72rem', padding: '5px 12px' }} onClick={() => exportCsv(stats, `playground_${symbol}_export.csv`)}>
                                <FileDown size={13} style={{ marginRight: '4px' }} /> CSV
                            </button>
                        )}
                    </div>
                </div>

                {/* Parameters Panel */}
                <div className={rightView === 'parameters' ? 'right-panel-active' : 'hidden-view'} style={{ overflowY: 'auto' }}>
                    <div style={{ padding: '16px' }}>
                        <div className="data-source-toggle" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.65rem', marginBottom: '16px', background: 'var(--bg-card)', padding: '8px 12px', borderRadius: '4px' }}>
                            <span style={{ opacity: 0.8, color: 'var(--text-muted)' }}>資料來源:</span>
                            <button
                                className={`btn-data-toggle ${dataSource === 'simulated' ? 'active' : ''}`}
                                onClick={() => { setDataSource('simulated'); setDataLoaded(false); }}
                                title="使用虛擬隨機數據"
                            >
                                虛擬資料
                            </button>
                            <button
                                className={`btn-data-toggle ${dataSource === 'real' ? 'active' : ''}`}
                                onClick={() => { setDataSource('real'); setDataLoaded(false); }}
                                title="使用真實股票數據 (透過 API)"
                            >
                                API
                            </button>
                            {dataSource === 'real' && (
                                <input
                                    type="text"
                                    className="symbol-input"
                                    value={symbol}
                                    onChange={(e) => { setSymbol(e.target.value); setDataLoaded(false); }}
                                    placeholder="Symbol"
                                    style={{
                                        width: '60px', background: 'var(--bg-document)', border: '1px solid var(--border-subtle)',
                                        color: 'var(--text-primary)', fontSize: '0.65rem', padding: '2px 4px', borderRadius: '4px', marginLeft: '4px'
                                    }}
                                />
                            )}
                        </div>

                        <OptimizeConfigPanel
                            unit={PLAYGROUND_UNIT}
                            params={params}
                            scanParams={optimizer.scanParams}
                            setScanParams={optimizer.setScanParams}
                            isOptimizing={optimizer.isOptimizing}
                            optimizeProgress={optimizer.optimizeProgress}
                            onOptimize={handleOptimize}
                        />
                    </div>
                </div>

                {/* Code View */}
                <div className={rightView === 'code' ? 'right-panel-active' : 'hidden-view'} style={{ position: 'relative' }}>
                    <button
                        className="btn btn-outline"
                        onClick={handleCopy}
                        style={{
                            position: 'absolute', top: '12px', right: '12px', zIndex: 10,
                            background: 'var(--bg-surface)', border: '1px solid var(--border-medium)',
                            padding: '4px 10px', fontSize: '0.7rem'
                        }}
                    >
                        <Copy size={13} style={{ marginRight: '4px' }} /> Copy
                    </button>
                    <div className="editor-container" ref={editorRef} style={{ height: '100%' }} />
                </div>

                {/* Terminal View */}
                <div className={`terminal-result-view ${rightView === 'terminal' ? 'active-view' : 'hidden-view'}`}>
                    <TerminalPanel
                        outputLogs={logs}
                        isRunning={isRunning}
                        stats={stats}
                    />
                </div>
            </div>
        </div>
    );
}

