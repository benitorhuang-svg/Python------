/**
 * useBacktest.ts — Encapsulates backtest execution logic
 */
import { useState, useCallback } from 'react';
import type { UnitDef } from '../units/types';
import type { StrategyStats } from '../types/backtest';
import { getCode } from '../engine/editor';
import { runAndGetResult, setGlobal } from '../engine/pyodide-runner';
import { loadStockData, generateSimulatedData } from '../engine/data-loader';

interface UseBacktestOptions {
    unit: UnitDef;
    unitId: string;
    pyodideReady: boolean;
    dataSource: 'real' | 'simulated';
    symbol: string;
    dataLoaded: boolean;
    setDataLoaded: (v: boolean) => void;
    onRunStart?: () => void;
}

export function useBacktest({
    unit, unitId, pyodideReady, dataSource, symbol,
    dataLoaded, setDataLoaded, onRunStart
}: UseBacktestOptions) {
    const [outputLogs, setOutputLogs] = useState<{ text: string; type: string }[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [stats, setStats] = useState<StrategyStats | null>(null);

    const handleRun = useCallback(async () => {
        onRunStart?.();
        setIsRunning(true);
        setStats(null);
        setOutputLogs([{ text: '> 正在初始化回測引擎...', type: 'info' }]);

        try {
            if (unit.needsData) {
                if (!dataLoaded) {
                    setOutputLogs(prev => [...prev, { text: '> 正在載入股票數據，請稍候...', type: 'info' }]);
                    const loadResult = dataSource === 'real'
                        ? await loadStockData(symbol || '2330.TW')
                        : {
                            data: generateSimulatedData(500),
                            source: 'simulated' as const,
                            symbol: '模擬股票'
                        };
                    await setGlobal('stock_data', loadResult.data);
                    setDataLoaded(true);
                    setOutputLogs(prev => [...prev, { text: `> 數據載入完成: ${loadResult.symbol} (${loadResult.source})`, type: 'info' }]);
                } else {
                    setOutputLogs(prev => [...prev, { text: `> 使用快取完成: ${symbol || '模擬股票'}`, type: 'info' }]);
                }
            }

            const code = getCode();
            const res = await runAndGetResult(code, unit.resultVar, (text, type) => {
                setOutputLogs(prev => [...prev, {
                    text: `[${new Date().toLocaleTimeString([], { hour12: false })}] ${text}`,
                    type
                }]);
            });

            if (res.success && res.data) {
                setStats(res.data as StrategyStats);
                return res.data as StrategyStats;
            } else if (!res.success) {
                setOutputLogs(prev => [...prev, { text: 'ERROR: ' + (res.error || 'Execution failed'), type: 'error' }]);
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            setOutputLogs(prev => [...prev, { text: 'ERROR: ' + msg, type: 'error' }]);
        }
        setIsRunning(false);
        return null;
    }, [unit, unitId, pyodideReady, dataSource, symbol, dataLoaded, setDataLoaded, onRunStart]);

    const clearStats = useCallback(() => setStats(null), []);

    return {
        outputLogs, setOutputLogs,
        isRunning, setIsRunning,
        stats, setStats, clearStats,
        handleRun
    };
}
