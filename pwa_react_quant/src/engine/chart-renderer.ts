/**
 * chart-renderer.ts — Chart.js 圖表渲染
 */
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const C = {
    green: '#22c55e', red: '#ef4444', cyan: '#06b6d4', blue: '#3b82f6',
    amber: '#f59e0b', purple: '#a855f7', white: '#e2e8f0', muted: '#64748b',
    grid: 'rgba(148,163,184,0.08)', cyanA: 'rgba(6,182,212,0.1)'
};

const charts: Record<string, Chart> = {};

function destroy(id: string) {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

const baseOpts: any = {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' as const },
    plugins: {
        legend: { labels: { color: C.muted, font: { family: "'Noto Sans TC', sans-serif", size: 11 }, usePointStyle: true, padding: 16 } },
        tooltip: { backgroundColor: 'rgba(17,24,39,0.95)', titleColor: C.white, bodyColor: C.muted, borderColor: C.grid, borderWidth: 1, cornerRadius: 8, padding: 12 }
    },
    scales: {
        x: { grid: { color: C.grid }, ticks: { color: C.muted, font: { size: 10 }, maxTicksLimit: 10 } },
        y: { grid: { color: C.grid }, ticks: { color: C.muted, font: { family: "'JetBrains Mono', monospace", size: 11 } } }
    }
};

export function renderEquityCurve(canvasId: string, data: any): void {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!ctx) return;

    const { equity_curve, dates, trades, initial_capital } = data;
    const labels = dates.map((d: string, i: number) => i % Math.ceil(dates.length / 30) === 0 ? d : '');
    const buy = new Array(equity_curve.length).fill(null);
    const sell = new Array(equity_curve.length).fill(null);
    trades?.forEach((t: any) => {
        if (t.type === 'BUY') buy[t.index] = equity_curve[t.index];
        if (t.type === 'SELL') sell[t.index] = equity_curve[t.index];
    });

    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: '資金曲線', data: equity_curve, borderColor: C.cyan, backgroundColor: C.cyanA, fill: true, borderWidth: 2, pointRadius: 0, tension: 0.3 },
                { label: '初始資金', data: Array(equity_curve.length).fill(initial_capital), borderColor: C.muted, borderDash: [5, 5], borderWidth: 1, pointRadius: 0, fill: false },
                { label: '買入 ▲', data: buy, borderColor: C.green, backgroundColor: C.green, pointRadius: 6, pointStyle: 'triangle' as const, showLine: false },
                { label: '賣出 ▼', data: sell, borderColor: C.red, backgroundColor: C.red, pointRadius: 6, pointStyle: 'triangle' as const, pointRotation: 180, showLine: false }
            ]
        },
        options: {
            ...baseOpts,
            plugins: { ...baseOpts.plugins, title: { display: true, text: '📈 資金曲線', color: C.white, font: { family: "'Noto Sans TC'", size: 14, weight: 'bold' as const }, padding: { bottom: 16 } } }
        }
    });
}

export function renderPriceWithMA(canvasId: string, data: any): void {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!ctx) return;

    const { closes, dates, ma_short, ma_long, trades } = data;
    const labels = dates.map((d: string, i: number) => i % Math.ceil(dates.length / 30) === 0 ? d : '');
    const buy = new Array(closes.length).fill(null);
    const sell = new Array(closes.length).fill(null);
    trades?.forEach((t: any) => {
        if (t.type === 'BUY') buy[t.index] = closes[t.index];
        if (t.type === 'SELL') sell[t.index] = closes[t.index];
    });

    const ds: any[] = [
        { label: '收盤價', data: closes, borderColor: C.white, borderWidth: 1.5, pointRadius: 0, tension: 0.1 }
    ];
    if (ma_short) ds.push({ label: `MA${data.short_period ?? 5}`, data: ma_short, borderColor: C.amber, borderWidth: 1.5, pointRadius: 0, tension: 0.3 });
    if (ma_long) ds.push({ label: `MA${data.long_period ?? 20}`, data: ma_long, borderColor: C.purple, borderWidth: 1.5, pointRadius: 0, tension: 0.3 });
    ds.push(
        { label: '買入', data: buy, borderColor: C.green, backgroundColor: C.green, pointRadius: 5, pointStyle: 'triangle' as const, showLine: false },
        { label: '賣出', data: sell, borderColor: C.red, backgroundColor: C.red, pointRadius: 5, pointStyle: 'triangle' as const, pointRotation: 180, showLine: false }
    );

    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: ds },
        options: { ...baseOpts, plugins: { ...baseOpts.plugins, title: { display: true, text: '📊 價格走勢 + 均線', color: C.white, font: { family: "'Noto Sans TC'", size: 14, weight: 'bold' as const }, padding: { bottom: 16 } } } }
    });
}

export function renderMultiLine(canvasId: string, data: any): void {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!ctx) return;

    const { series, labels, title } = data;
    const colors = [C.green, C.cyan, C.amber, C.red, C.purple];

    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: series.map((s: any, i: number) => ({
                label: s.name, data: s.data, borderColor: colors[i % colors.length],
                borderWidth: 2, pointRadius: 0, tension: 0.3, fill: false
            }))
        },
        options: {
            ...baseOpts,
            plugins: { ...baseOpts.plugins, title: { display: true, text: title ?? '比較圖', color: C.white, font: { family: "'Noto Sans TC'", size: 14, weight: 'bold' as const }, padding: { bottom: 16 } } },
            scales: {
                ...baseOpts.scales,
                y: { ...baseOpts.scales.y, type: 'logarithmic' as const, ticks: { ...baseOpts.scales.y.ticks, callback: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toFixed(0) } }
            }
        }
    });
}
