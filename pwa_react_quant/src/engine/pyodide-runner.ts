/**
 * pyodide-runner.ts — Worker 管理介面
 */

export interface RunResult {
    success: boolean;
    output: string;
    data?: any;
    error?: string;
}

import PyodideWorker from './pyodide-worker?worker';

let worker: Worker | null = null;
let ready = false;
const readyCallbacks: (() => void)[] = [];
let pendingResolvers: Record<string, (res: RunResult) => void> = {};
let currentOutputHandler: ((text: string, type: 'info' | 'error') => void) | null = null;

export async function initPyodide(onProgress?: (msg: string) => void): Promise<void> {
    if (worker) return;

    onProgress?.('正在啟動後台線程...');

    worker = new PyodideWorker();

    worker.onmessage = (e) => {
        const { type, ...payload } = e.data;
        if (type === 'READY') {
            ready = true;
            readyCallbacks.forEach(cb => cb());
            readyCallbacks.length = 0;
            console.log('[Worker] READY');
        } else if (type === 'STDOUT') {
            currentOutputHandler?.(payload.text, 'info');
        } else if (type === 'STDERR') {
            currentOutputHandler?.(payload.text, 'error');
        } else if (type === 'RESULT') {
            // 解析回報的結果
            const resolver = pendingResolvers['run'];
            if (resolver) {
                resolver(payload as RunResult);
                delete pendingResolvers['run'];
            }
        } else if (type === 'ERROR') {
            console.error('[Worker] ERROR:', payload.error);
        }
    };

    const baseUrl = import.meta.env.BASE_URL || '/';
    worker.postMessage({ type: 'INIT', baseUrl });
}

export async function runPython(
    code: string,
    onOutput?: (text: string, type: 'info' | 'error') => void
): Promise<RunResult> {
    return runAndGetResult(code, null, onOutput);
}

export async function runAndGetResult(
    code: string,
    resultVar: string | null,
    onOutput?: (text: string, type: 'info' | 'error') => void
): Promise<RunResult> {
    if (!worker || !ready) throw new Error('Python 環境尚未就緒');

    currentOutputHandler = onOutput || null;

    return new Promise((resolve) => {
        pendingResolvers['run'] = resolve;
        worker?.postMessage({ type: 'RUN', code, resultVar });
    });
}

export async function setGlobal(name: string, value: unknown): Promise<void> {
    if (!worker || !ready) return;
    worker.postMessage({ type: 'SET_GLOBAL', name, value });
}

export function onReady(callback: () => void): void {
    if (ready) callback();
    else readyCallbacks.push(callback);
}

export function isReady(): boolean { return ready; }
