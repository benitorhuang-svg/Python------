/**
 * UnitContent.tsx — Main orchestrator for a strategy unit view.
 * Delegates to sub-components and custom hooks for each concern.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import type { UnitDef } from '../units/types';
import type { StrategyStats } from '../types/backtest';
import { createEditor, getCode, setCode } from '../engine/editor';
import {
    renderEquityCurve, renderPriceWithMA, renderVolumeChart,
    renderUnderwaterChart, renderDistributionChart,
    renderOptimizationBarChart, renderOptimizationScatterChart
} from '../engine/chart-renderer';
import { setGlobal } from '../engine/pyodide-runner';
import { loadStockData, generateSimulatedData } from '../engine/data-loader';
import { Copy } from 'lucide-react';
import { escapeRegex } from './unit/utils';

// Sub-components
import TheoryPanel from './unit/TheoryPanel';
import RunResultsPanel from './unit/RunResultsPanel';
import OptimizeResultsPanel from './unit/OptimizeResultsPanel';
import OptimizeConfigPanel from './unit/OptimizePanel';
import TerminalPanel from './unit/TerminalPanel';
import ParamsBlock from './unit/ParamsBlock';

// Custom hooks
import { useBacktest } from '../hooks/useBacktest';
import { useOptimizer } from '../hooks/useOptimizer';

interface Props {
    unitId: string;
    unit: UnitDef;
    pyodideReady: boolean;
    onRunStart?: () => void;
}

export default function UnitContent({ unitId, unit, pyodideReady, onRunStart }: Props) {
    const editorRef = useRef<HTMLDivElement>(null);

    // ─── State ──────────────────────────
    const [params, setParams] = useState<Record<string, number>>(() => {
        const defaults: Record<string, number> = {};
        unit.params?.forEach(p => defaults[p.id] = p.default);
        return defaults;
    });
    const [centerView, setCenterView] = useState<'theory' | 'run' | 'optimize'>('theory');
    const [rightView, setRightView] = useState<'code' | 'terminal'>('code');
    const [dataLoaded, setDataLoaded] = useState(false);
    const [dataSource, setDataSource] = useState<'real' | 'simulated'>('real');
    const [symbol, setSymbol] = useState('2330.TW');

    // ─── Custom Hooks ──────────────────────────
    const backtest = useBacktest({
        unit, unitId, pyodideReady, dataSource, symbol,
        dataLoaded, setDataLoaded, onRunStart
    });

    const optimizer = useOptimizer({
        unit, pyodideReady, params, onRunStart
    });

    // ─── Parameter change handler ──────────────────────────
    const handleParamChange = useCallback((id: string, value: string) => {
        const val = parseFloat(value);
        setParams(prev => ({ ...prev, [id]: val }));
        backtest.clearStats();
        const currentCode = getCode();
        const newDoc = currentCode.replace(
            new RegExp(`^(${escapeRegex(id)}\\s*=\\s*)([\\d.]+)`, 'm'),
            `$1${value}`
        );
        if (newDoc !== currentCode) setCode(newDoc);
    }, [backtest]);

    // ─── Run handler (wraps backtest hook + UI transitions) ──────────────────
    const handleRun = useCallback(async () => {
        setRightView('terminal');
        const result = await backtest.handleRun();
        if (result) {
            backtest.setIsRunning(false);
            setCenterView('run');
            requestAnimationFrame(() => {
                renderEquityCurve('result-chart', result);
                if (result.drawdown_series) renderUnderwaterChart('result-underwater-chart', result);
                if (result.profit_distribution) renderDistributionChart('result-dist-chart', result.profit_distribution);
                if (result.price_data) renderPriceWithMA('result-price-ma-chart', {
                    ...(result.price_data as any), ...(result.ma_data as any), trades: result.trades
                });
                if (result.volume_data) renderVolumeChart('result-volume-chart', result.volume_data);
            });
        }
        backtest.setIsRunning(false);
    }, [backtest]);

    // ─── Optimize handler ──────────────────
    const handleOptimize = useCallback(async () => {
        await optimizer.handleOptimize();
        setCenterView('optimize');
    }, [optimizer]);

    // ─── Editor & Data init ──────────────────────────
    useEffect(() => {
        if (editorRef.current) {
            const savedCode = localStorage.getItem(`quant_code_${unitId}`);
            createEditor(editorRef.current, savedCode || unit.defaultCode, (newCode) => {
                localStorage.setItem(`quant_code_${unitId}`, newCode);
            });
        }

        if (unit.needsData && pyodideReady) {
            setDataLoaded(false);
            const loadPromise = dataSource === 'real'
                ? loadStockData('2330')
                : Promise.resolve({
                    data: generateSimulatedData(500),
                    source: 'simulated' as const,
                    symbol: '模擬股票'
                });

            loadPromise.then(async result => {
                await setGlobal('stock_data', result.data);
                setDataLoaded(true);
            }).catch(async () => {
                const simData = generateSimulatedData(500);
                await setGlobal('stock_data', simData);
                setDataLoaded(true);
            });
        } else if (!unit.needsData) {
            setDataLoaded(true);
        }
    }, [unitId, unit, pyodideReady, dataSource]);

    // ─── Re-render charts on view switch ──────────────────────────
    useEffect(() => {
        if (centerView === 'run' && backtest.stats) {
            requestAnimationFrame(() => {
                renderEquityCurve('result-chart', backtest.stats!);
                if (backtest.stats!.drawdown_series) renderUnderwaterChart('result-underwater-chart', backtest.stats!);
                if (backtest.stats!.profit_distribution) renderDistributionChart('result-dist-chart', backtest.stats!.profit_distribution);
                if (backtest.stats!.price_data) renderPriceWithMA('result-price-ma-chart', {
                    ...(backtest.stats!.price_data as any), ...(backtest.stats!.ma_data as any), trades: backtest.stats!.trades
                });
                if (backtest.stats!.volume_data) renderVolumeChart('result-volume-chart', backtest.stats!.volume_data);
            });
        }
        if (centerView === 'optimize' && optimizer.scanResults.length > 0) {
            requestAnimationFrame(() => {
                renderOptimizationBarChart('result-opt-bar', optimizer.scanResults, (idx: number) => {
                    const r = optimizer.scanResults[idx];
                    Object.entries(r.params).forEach(([id, val]) => handleParamChange(id, val.toString()));
                    setRightView('code');
                    handleRun();
                });
                renderOptimizationScatterChart('result-opt-scatter', optimizer.scanResults);
            });
        }
    }, [centerView, unitId, backtest.stats, optimizer.scanResults]);

    // ─── Utility handlers ──────────────────────────
    const handleCopy = () => navigator.clipboard.writeText(getCode());
    const handleReset = () => {
        if (confirm("確定要重設為預設程式碼嗎？這將會覆蓋您目前的修改。")) {
            setCode(unit.defaultCode);
            localStorage.setItem(`quant_code_${unitId}`, unit.defaultCode);
        }
    };

    // ═══════════════════════════════════════════
    //   RENDER
    // ═══════════════════════════════════════════
    return (
        <div className="unit-layout-2col">
            {/* ═══ CENTER PANEL ═══ */}
            <div className="unit-center-panel">
                <div className="panel-top-tabs">
                    <button className={`panel-tab ${centerView === 'theory' ? 'active' : ''}`} onClick={() => setCenterView('theory')}>
                        內容說明
                    </button>
                    <button className={`panel-tab ${centerView === 'run' ? 'active' : ''}`} onClick={() => setCenterView('run')}>
                        單次回測
                    </button>
                    <button className={`panel-tab ${centerView === 'optimize' ? 'active' : ''}`} onClick={() => setCenterView('optimize')}>
                        篩選參數優化
                    </button>
                </div>

                <div className="center-content-area">
                    {/* Theory */}
                    <div className={`theory-scroll ${centerView === 'theory' ? 'active-view' : 'hidden-view'}`}>
                        <TheoryPanel unit={unit} />
                    </div>

                    {/* Run Results */}
                    <div className={`results-scroll ${centerView === 'run' ? 'active-view' : 'hidden-view'}`}>
                        <RunResultsPanel stats={backtest.stats} unitId={unitId} />
                    </div>

                    {/* Optimize: Config + Results in one view */}
                    <div className={`results-scroll ${centerView === 'optimize' ? 'active-view' : 'hidden-view'}`}>
                        <OptimizeConfigPanel
                            unit={unit}
                            params={params}
                            scanParams={optimizer.scanParams}
                            setScanParams={optimizer.setScanParams}
                            isOptimizing={optimizer.isOptimizing}
                            optimizeProgress={optimizer.optimizeProgress}
                            onOptimize={handleOptimize}
                        />
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
                    </div>
                    <div className="btn-group">
                        <button className="btn btn-outline" onClick={handleReset} style={{ fontSize: '0.72rem', padding: '5px 12px' }}>
                            Reset
                        </button>
                        <button
                            className={`btn ${backtest.isRunning ? 'btn-danger' : 'btn-primary'}`}
                            style={{ minWidth: '70px', justifyContent: 'center', padding: '5px 16px' }}
                            onClick={handleRun}
                        >
                            {backtest.isRunning ? 'Stop' : 'Run'}
                        </button>
                    </div>
                </div>

                {/* Parameters */}
                <ParamsBlock
                    params={params}
                    unitParams={unit.params || []}
                    needsData={unit.needsData}
                    dataSource={dataSource}
                    symbol={symbol}
                    onParamChange={handleParamChange}
                    onDataSourceChange={(src) => { setDataSource(src); setDataLoaded(false); }}
                    onSymbolChange={(sym) => { setSymbol(sym); setDataLoaded(false); }}
                />

                {/* Code View */}
                <div className={rightView === 'code' ? 'right-panel-active' : 'hidden-view'} style={{ position: 'relative' }}>
                    <button className="btn btn-outline" style={{ position: 'absolute', top: '12px', right: '20px', zIndex: 50, padding: '4px 10px', fontSize: '0.7rem' }} onClick={handleCopy} title="複製程式碼">
                        <Copy size={13} /> Copy
                    </button>
                    <div className="editor-container" ref={editorRef} />
                </div>

                {/* Terminal View */}
                <div className={`terminal-result-view ${rightView === 'terminal' ? 'active-view' : 'hidden-view'}`}>
                    <TerminalPanel
                        outputLogs={backtest.outputLogs}
                        isRunning={backtest.isRunning}
                        stats={backtest.stats}
                    />
                </div>


            </div>
        </div>
    );
}
