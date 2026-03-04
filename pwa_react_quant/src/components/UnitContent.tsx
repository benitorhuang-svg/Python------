import React, { useEffect, useRef, useState } from 'react';
import type { UnitDef } from '../units/types';
import { createEditor, getCode, setCode } from '../engine/editor';
import { runAndGetResult, setGlobal } from '../engine/pyodide-runner';
import { loadStockData } from '../engine/data-loader';
import katex from 'katex';

interface Props {
    unitId: string;
    unit: UnitDef;
    pyodideReady: boolean;
}

export default function UnitContent({ unitId, unit, pyodideReady }: Props) {
    const editorRef = useRef<HTMLDivElement>(null);
    const theoryRef = useRef<HTMLDivElement>(null);

    const [params, setParams] = useState<Record<string, number>>({});
    const [outputLogs, setOutputLogs] = useState<{ text: string, type: string }[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [stats, setStats] = useState<any>(null);
    const [viewMode, setViewMode] = useState<'theory' | 'result'>('theory');

    // Reset when unitId changes
    useEffect(() => {
        const defaultParams: Record<string, number> = {};
        if (unit.params) {
            unit.params.forEach(p => defaultParams[p.id] = p.default);
        }
        setParams(defaultParams);
        setOutputLogs([]);
        setStats(null);
        setViewMode('theory');

        if (editorRef.current) {
            createEditor(editorRef.current, unit.defaultCode);
        }

        if (unit.needsData && pyodideReady) {
            loadStockData('2330').then(result => {
                setGlobal('stock_data', result.data);
            });
        }
    }, [unitId, unit, pyodideReady]);

    // Async trigger katex after theory rendered
    useEffect(() => {
        if (viewMode === 'theory' && theoryRef.current) {
            theoryRef.current.querySelectorAll('.formula-box').forEach(el => {
                if (el.id === 'kelly-formula') katex.render('f^* = \\frac{bp - q}{b}', el as HTMLElement, { displayMode: true, throwOnError: false });
                if (el.id === 'ma-formula') katex.render('MA(n) = \\frac{1}{n} \\sum_{i=1}^{n} C_i', el as HTMLElement, { displayMode: true, throwOnError: false });
            });
        }
    }, [viewMode, unitId]);

    const handleParamChange = (id: string, value: string) => {
        const val = parseFloat(value);
        setParams(prev => ({ ...prev, [id]: val }));
        const currentCode = getCode();
        const newDoc = currentCode.replace(new RegExp(`(${id}\\s*=\\s*)([\\d.]+)`), `$1${value}`);
        if (newDoc !== currentCode) setCode(newDoc);
    };

    const handleRun = async () => {
        if (!pyodideReady) return alert('核心引擎準備中，請稍候...');
        setIsRunning(true);
        setViewMode('result');
        setOutputLogs([{ text: '🚀 策略執行中...', type: 'info' }]);

        const code = getCode();
        const res = await runAndGetResult(code, unit.resultVar, (text, type) => {
            setOutputLogs(prev => [...prev, { text, type }]);
        });

        if (res.success && res.data) {
            setStats(res.data);
            setTimeout(() => {
                unit.renderChart('result-chart', res.data);
            }, 50);
        } else if (!res.success) {
            setOutputLogs(prev => [...prev, { text: '❌ ' + (res.error || '程式執行失敗'), type: 'error' }]);
        }
        setIsRunning(false);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(getCode());
        alert('程式碼已複製到剪貼簿');
    };

    const handleBackToTheory = () => {
        setViewMode('theory');
    };

    return (
        <div className="unit-layout">
            <div className="unit-theory-panel">
                <div className="theory-inner">
                    {/* 
                      CRITICAL FIX: Removed ternary with sibling-changing blocks.
                      Instead, using CSS classes to hide/show to avoid DOM re-ordering errors.
                    */}
                    <div className={`view-theory fade-in ${viewMode === 'theory' ? 'active-view' : 'hidden-view'}`}>
                        <header style={{ marginBottom: '2.5rem' }}>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: 900 }}>{unit.title}</h1>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>{unit.description}</p>
                        </header>

                        <div className="section-card">
                            <h2 className="section-title">📖 理論解說</h2>
                            <div className="theory-text" ref={theoryRef} dangerouslySetInnerHTML={{ __html: unit.theory }} />
                        </div>

                        {unit.exercises && (
                            <div className="section-card">
                                <h3 className="section-title" style={{ color: 'var(--text-muted)' }}>💡 延伸練習</h3>
                                <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)' }}>
                                    {unit.exercises.map((e, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{e}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className={`view-result fade-in ${viewMode === 'result' ? 'active-view' : 'hidden-view'}`}>
                        <header style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.4rem' }}>📊 策略執行與終端輸出</h2>
                            <button className="close-result-btn" onClick={handleBackToTheory} style={{ padding: '8px 16px' }}>
                                返回內容解說 ✕
                            </button>
                        </header>

                        {stats && (
                            <div className="section-card result-dashboard">
                                <div className="mini-stats">
                                    <div className="ms-item"><span className="ms-lab">總報酬</span><span className={`ms-val ${stats.total_return >= 0 ? 'up' : 'down'}`}>{stats.total_return}%</span></div>
                                    <div className="ms-item"><span className="ms-lab">夏普比率</span><span className="ms-val">{stats.sharpe_ratio}</span></div>
                                    <div className="ms-item"><span className="ms-lab">勝率</span><span className="ms-val">{stats.win_rate}%</span></div>
                                </div>
                                <div className="chart-area" style={{ height: '360px', marginTop: '1rem' }}>
                                    <canvas id="result-chart"></canvas>
                                </div>
                            </div>
                        )}

                        <div className="section-card console-card">
                            <h3 className="section-title" style={{ fontSize: '0.9rem' }}>📟 終端機輸出 (Output)</h3>
                            <div className="full-console" style={{ minHeight: '300px' }}>
                                {outputLogs.map((log, i) => (
                                    <div key={i} className={`log-line ${log.type}`}>{log.text}</div>
                                ))}
                                {isRunning && <span className="blink">▋</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="unit-editor-panel">
                {unit.params && unit.params.length > 0 && (
                    <div className="params-dock top-dock">
                        <div className="dock-header">⚙️ 策略參數即時調整</div>
                        <div className="dock-grid">
                            {unit.params.map(p => (
                                <div key={p.id} className="dock-item">
                                    <div className="dock-label">
                                        <span>{p.label}</span>
                                        <span className="dock-val">{p.format(params[p.id] ?? p.default)}</span>
                                    </div>
                                    <input
                                        type="range"
                                        className="p-slider"
                                        min={p.min} max={p.max} step={p.step}
                                        value={params[p.id] ?? p.default}
                                        onChange={e => handleParamChange(p.id, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="editor-toolbar">
                    <div className="toolbar-label">
                        {viewMode === 'result' && (
                            <button className="x-return-btn" onClick={handleBackToTheory} style={{ marginRight: 10 }}>✕</button>
                        )}
                        程式碼編輯器
                    </div>
                    <div className="btn-group">
                        <button className="btn-action btn-copy" onClick={handleCopy}>
                            <span>📄</span> 複製
                        </button>
                        <button
                            className={`btn-action btn-execute ${isRunning ? 'active' : ''}`}
                            disabled={isRunning}
                            onClick={handleRun}
                        >
                            <span>{isRunning ? '⏱' : '▶'}</span> {isRunning ? '中斷' : '執行'}
                        </button>
                    </div>
                </div>

                <div className="editor-container" ref={editorRef} />
            </div>
        </div>
    );
}
