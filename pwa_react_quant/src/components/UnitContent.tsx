import { useEffect, useRef, useState } from 'react';
import type { UnitDef } from '../units/types';
import { createEditor, getCode, setCode } from '../engine/editor';
import { runAndGetResult, setGlobal } from '../engine/pyodide-runner';
import { loadStockData } from '../engine/data-loader';
import katex from 'katex';
import { BookOpen, BarChart3, Play, Copy, Terminal, Settings2, Square, X, Code2 } from 'lucide-react';

interface Props {
    unitId: string;
    unit: UnitDef;
    pyodideReady: boolean;
}

interface StrategyStats {
    total_return: number;
    sharpe_ratio: number;
    win_rate: number;
    total_trades: number;
    [key: string]: unknown;
}

export default function UnitContent({ unitId, unit, pyodideReady }: Props) {
    const editorRef = useRef<HTMLDivElement>(null);
    const theoryRef = useRef<HTMLDivElement>(null);

    const [params, setParams] = useState<Record<string, number>>(() => {
        const defaults: Record<string, number> = {};
        if (unit.params) {
            unit.params.forEach(p => defaults[p.id] = p.default);
        }
        return defaults;
    });

    const [outputLogs, setOutputLogs] = useState<{ text: string, type: string }[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [stats, setStats] = useState<StrategyStats | null>(null);
    const [centerView, setCenterView] = useState<'theory' | 'result'>('theory');
    const [rightView, setRightView] = useState<'code' | 'terminal'>('code');

    useEffect(() => {
        if (editorRef.current) {
            createEditor(editorRef.current, unit.defaultCode);
        }

        if (unit.needsData && pyodideReady) {
            loadStockData('2330').then(result => {
                setGlobal('stock_data', result.data);
            });
        }
    }, [unitId, unit, pyodideReady]);

    useEffect(() => {
        if (centerView === 'theory' && theoryRef.current) {
            theoryRef.current.querySelectorAll('.formula-box').forEach(el => {
                if (el.id === 'kelly-formula') katex.render('f^* = \\frac{bp - q}{b}', el as HTMLElement, { displayMode: true, throwOnError: false });
                if (el.id === 'ma-formula') katex.render('MA(n) = \\frac{1}{n} \\sum_{i=1}^{n} C_i', el as HTMLElement, { displayMode: true, throwOnError: false });
            });
        }
    }, [centerView, unitId]);

    const handleParamChange = (id: string, value: string) => {
        const val = parseFloat(value);
        setParams(prev => ({ ...prev, [id]: val }));
        const currentCode = getCode();
        const newDoc = currentCode.replace(new RegExp(`(${id}\\s*=\\s*)([\\d.]+)`), `$1${value}`);
        if (newDoc !== currentCode) setCode(newDoc);
    };

    const handleRun = async () => {
        if (!pyodideReady) return alert('引擎準備中...');
        setIsRunning(true);
        setRightView('terminal');
        setOutputLogs([{ text: '> 正在初始化回測引擎...', type: 'info' }]);

        const code = getCode();
        const res = await runAndGetResult(code, unit.resultVar, (text, type) => {
            setOutputLogs(prev => [...prev, { text: `[${new Date().toLocaleTimeString([], { hour12: false })}] ${text}`, type }]);
        });

        if (res.success && res.data) {
            setStats(res.data as StrategyStats);
            setCenterView('result');
            setTimeout(() => {
                unit.renderChart('result-chart', res.data as StrategyStats);
            }, 100);
        } else if (!res.success) {
            setOutputLogs(prev => [...prev, { text: 'ERROR: ' + (res.error || 'Execution failed'), type: 'error' }]);
        }
        setIsRunning(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(getCode());
    };

    return (
        <div className="unit-layout-2col">
            {/* ═══ CENTER PANEL ═══ */}
            <div className="unit-center-panel">
                {/* Top tabs */}
                <div className="panel-top-tabs">
                    <button
                        className={`panel-tab ${centerView === 'theory' ? 'active' : ''}`}
                        onClick={() => setCenterView('theory')}
                    >
                        <BookOpen size={12} /> 內容說明
                    </button>
                    <button
                        className={`panel-tab ${centerView === 'result' ? 'active' : ''}`}
                        onClick={() => setCenterView('result')}
                    >
                        <BarChart3 size={12} /> 執行結果
                    </button>
                </div>

                {/* Stat cards row */}
                <div className="stat-cards-row" style={{ display: centerView === 'result' && stats ? 'grid' : 'none' }}>
                    <div className="stat-card-compact">
                        <div className="stat-card-label">Returns</div>
                        <div className={`stat-card-value ${(stats?.total_return ?? 0) >= 0 ? 'up' : 'down'}`}>
                            {(stats?.total_return ?? 0) >= 0 ? '+' : ''}{stats?.total_return ?? 0}%
                        </div>
                    </div>
                    <div className="stat-card-compact">
                        <div className="stat-card-label">Sharpe</div>
                        <div className="stat-card-value neutral">{stats?.sharpe_ratio ?? '-'}</div>
                    </div>
                    <div className="stat-card-compact">
                        <div className="stat-card-label">Win Rate</div>
                        <div className={`stat-card-value ${Number(stats?.win_rate ?? 0) > 50 ? 'up' : 'neutral'}`}>
                            {stats?.win_rate ?? 0}%
                        </div>
                    </div>
                    <div className="stat-card-compact">
                        <div className="stat-card-label">Trades</div>
                        <div className="stat-card-value accent">{stats?.total_trades ?? 0}</div>
                    </div>
                </div>

                {/* Content area — BOTH views always in DOM */}
                <div className="center-content-area">
                    {/* Theory */}
                    <div className={`theory-scroll ${centerView === 'theory' ? 'active-view' : 'hidden-view'}`}>
                        <div className="unit-header-area">
                            <div className="unit-header-badges">
                                <span className="badge-module">{unit.module}</span>
                                {unit.difficulty && <span className="badge-difficulty">{unit.difficulty}</span>}
                            </div>
                            <h1 className="unit-title">{unit.title}</h1>
                            <div className="unit-description">
                                <p>{unit.description}</p>
                            </div>
                        </div>

                        <div className="section-card">
                            <h2 className="section-title"><BookOpen size={14} /> 核心理論</h2>
                            <div className="theory-text" ref={theoryRef} dangerouslySetInnerHTML={{ __html: unit.theory }} />
                        </div>
                    </div>

                    {/* Results */}
                    <div className={`results-scroll ${centerView === 'result' ? 'active-view' : 'hidden-view'}`}>
                        {stats ? (
                            <div className="chart-container">
                                <canvas id="result-chart" style={{ width: '100%', height: '100%' }} />
                            </div>
                        ) : (
                            <div className="empty-state">
                                <Play size={44} />
                                <p>尚未執行策略代碼</p>
                                <p>點擊右側「Run」按鈕查看結果</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ═══ RIGHT PANEL ═══ */}
            <div className="unit-editor-panel">
                {/* Top toolbar: tabs + actions */}
                <div className="editor-toolbar">
                    <div className="editor-tabs">
                        <button
                            className={`editor-tab ${rightView === 'code' ? 'active' : ''}`}
                            onClick={() => setRightView('code')}
                        >
                            <Code2 size={12} /> Code
                        </button>
                        <button className="editor-tab" onClick={handleCopy} title="Copy Code">
                            <Copy size={12} /> Copy
                        </button>
                    </div>
                    <div className="btn-group">
                        <button
                            className={`btn-action ${rightView === 'terminal' ? 'active-btn' : ''}`}
                            onClick={() => setRightView('terminal')}
                        >
                            <Terminal size={12} /> Terminal Result
                        </button>
                        <button
                            className={`btn-action btn-execute ${isRunning ? 'active' : ''}`}
                            disabled={isRunning}
                            onClick={handleRun}
                        >
                            {isRunning ? (
                                <><Square size={11} fill="white" /> Stop</>
                            ) : (
                                <><Play size={12} fill="currentColor" /> Run</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Parameters (Shared across right views) */}
                {unit.params && unit.params.length > 0 && (
                    <div className="params-block">
                        <div className="params-header">
                            <div className="params-title"><Settings2 size={11} /> Parameters</div>
                        </div>
                        <div className="params-grid">
                            {unit.params.map(p => (
                                <div key={p.id} className="param-item">
                                    <div className="param-info">
                                        <span className="param-label">{p.label}</span>
                                        <span className="param-value">{p.format(params[p.id] ?? p.default)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        className="custom-slider"
                                        min={p.min} max={p.max} step={p.step}
                                        value={params[p.id] ?? p.default}
                                        onChange={e => handleParamChange(p.id, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Code View (default) */}
                <div className={rightView === 'code' ? 'right-panel-active' : 'hidden-view'}>
                    <div className="editor-container" ref={editorRef} />
                </div>

                {/* Terminal Result View */}
                <div className={`terminal-result-view ${rightView === 'terminal' ? 'active-view' : 'hidden-view'}`}>
                    {outputLogs.length > 0 && !isRunning && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                            <button className="btn-clear-terminal" style={{ marginTop: 0 }} onClick={() => setOutputLogs([])}>
                                <X size={11} /> Clear
                            </button>
                        </div>
                    )}
                    <div className="terminal-window-full">
                        <div className="terminal-body">
                            {outputLogs.length === 0 && (
                                <div style={{ color: 'var(--text-dim)', opacity: 0.4, fontSize: '0.72rem' }}>
                                    {'// 等待執行命令...'}
                                </div>
                            )}
                            {outputLogs.map((log, i) => (
                                <div key={i} className={`log-line ${log.type}`}>{log.text}</div>
                            ))}
                            {isRunning && <span className="blink">▋</span>}
                        </div>
                    </div>

                    {unit.exercises && (
                        <div className="section-card" style={{ marginTop: '16px' }}>
                            <h2 className="section-title" style={{ color: 'var(--brand-amber)' }}>💡 實戰練習</h2>
                            <ul style={{ paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.8 }}>
                                {unit.exercises.map((e, i) => (
                                    <li key={i} style={{ marginBottom: '6px' }}>{e}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
