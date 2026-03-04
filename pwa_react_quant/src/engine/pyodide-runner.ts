/**
 * pyodide-runner.ts — Pyodide 生命週期管理
 */

// Pyodide 全域型別宣告
declare const loadPyodide: (options: {
    indexURL: string;
}) => Promise<PyodideInterface>;

interface PyodideInterface {
    loadPackage: (name: string) => Promise<void>;
    runPythonAsync: (code: string) => Promise<unknown>;
    globals: { get: (name: string) => unknown; set: (name: string, value: unknown) => void; };
    toPy: (value: unknown) => unknown;
    setStdout: (cfg: { batched: (text: string) => void }) => void;
    setStderr: (cfg: { batched: (text: string) => void }) => void;
    FS: { writeFile: (path: string, content: string) => void };
}

export interface RunResult {
    success: boolean;
    output: string;
    data?: unknown;
    error?: string;
}

let pyodide: PyodideInterface | null = null;
let ready = false;
const readyCallbacks: (() => void)[] = [];

export async function initPyodide(onProgress?: (msg: string) => void): Promise<void> {
    try {
        onProgress?.('正在載入 Python 核心...');
        pyodide = await loadPyodide({
            indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.5/full/'
        });

        onProgress?.('正在安裝 numpy 套件...');
        await pyodide.loadPackage('numpy');

        onProgress?.('正在載入回測模組...');
        await loadCustomModules();

        ready = true;
        readyCallbacks.forEach(cb => cb());
        readyCallbacks.length = 0;
        console.log('[PyRunner] 初始化完成');
    } catch (err) {
        console.error('[PyRunner] 初始化失敗:', err);
        throw err;
    }
}

async function loadCustomModules(): Promise<void> {
    if (!pyodide) return;
    const baseUrl = import.meta.env.BASE_URL || '/';
    const [engineCode, indCode] = await Promise.all([
        fetch(`${baseUrl}py/backtest_engine.py`).then(r => r.text()),
        fetch(`${baseUrl}py/indicators.py`).then(r => r.text())
    ]);

    pyodide.FS.writeFile('/home/pyodide/backtest_engine.py', engineCode);
    pyodide.FS.writeFile('/home/pyodide/indicators.py', indCode);

    await pyodide.runPythonAsync(`
import sys
if '/home/pyodide' not in sys.path:
    sys.path.insert(0, '/home/pyodide')
import backtest_engine
import indicators
print("✅ 回測引擎與技術指標模組載入完成")
  `);
}

export async function runPython(
    code: string,
    onOutput?: (text: string, type: 'info' | 'error') => void
): Promise<RunResult> {
    if (!pyodide || !ready) throw new Error('Python 環境尚未就緒');

    let output = '';
    pyodide.setStdout({
        batched: (text: string) => { output += text + '\n'; onOutput?.(text, 'info'); }
    });
    pyodide.setStderr({
        batched: (text: string) => { output += text + '\n'; onOutput?.(text, 'error'); }
    });

    try {
        await pyodide.runPythonAsync(code);
        return { success: true, output };
    } catch (err) {
        const msg = (err as Error).message || String(err);
        onOutput?.(msg, 'error');
        return { success: false, output, error: msg };
    }
}

export async function runAndGetResult(
    code: string,
    resultVar: string,
    onOutput?: (text: string, type: 'info' | 'error') => void
): Promise<RunResult> {
    const res = await runPython(code, onOutput);
    if (!res.success || !pyodide) return res;

    try {
        await pyodide.runPythonAsync(`
import json as _json
_result_json = _json.dumps(${resultVar})
`);
        const jsonStr = pyodide.globals.get('_result_json') as string;
        return { success: true, data: JSON.parse(jsonStr), output: res.output };
    } catch (e) {
        console.warn('[PyRunner] 無法取回結果:', (e as Error).message);
        return { success: true, data: null, output: res.output };
    }
}

export async function setGlobal(name: string, value: unknown): Promise<void> {
    if (!pyodide || !ready) return;
    pyodide.globals.set(name, pyodide.toPy(value));
}

export function onReady(callback: () => void): void {
    if (ready) callback();
    else readyCallbacks.push(callback);
}

export function isReady(): boolean { return ready; }
