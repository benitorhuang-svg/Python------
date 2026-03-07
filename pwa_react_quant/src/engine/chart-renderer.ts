/**
 * chart-renderer.ts — Chart.js 圖表渲染
 */
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

const C = {
    green: '#22c55e', red: '#ef4444', cyan: '#06b6d4', blue: '#60a5fa',
    amber: '#fbbf24', purple: '#a855f7', white: '#e2e8f0', muted: '#64748b',
    grid: 'rgba(148,163,184,0.08)', cyanA: 'rgba(6,182,212,0.1)',
    benchmark: 'rgba(148,163,184,0.4)',
    redA: 'rgba(239, 68, 68, 0.2)', greenA: 'rgba(34, 197, 94, 0.2)'
};

const charts: Record<string, Chart> = {};

function destroy(id: string) {
    if (charts[id]) { charts[id].destroy(); delete charts[id]; }
}

const crosshairSyncPlugin = {
    id: 'crosshairSync',
    afterEvent: (chart: any, args: any) => {
        const { event } = args;
        const nativeEvent = event.native;
        const match = chart.canvas.id.match(/^(.*)-(price|macd|adx|emv|equity|aroon|indicator|volume)$/);
        if (!match) return;

        const baseId = match[1];

        if (event.type === 'mousemove') {
            const elements = chart.getElementsAtEventForMode(nativeEvent, 'index', { intersect: false }, true);
            if (elements.length > 0) {
                const index = elements[0].index;
                Object.entries(charts).forEach(([id, c]) => {
                    if (id !== chart.canvas.id && id.startsWith(baseId)) {
                        const activeElements = c.data.datasets.map((_: any, idx: number) => ({ datasetIndex: idx, index }));
                        c.setActiveElements(activeElements);
                        if ((c as any).tooltip) (c as any).tooltip.setActiveElements(activeElements, { x: 0, y: 0 });
                        c.update('none');
                    }
                });
            } else {
                Object.entries(charts).forEach(([id, c]) => {
                    if (id !== chart.canvas.id && id.startsWith(baseId)) {
                        c.setActiveElements([]);
                        if ((c as any).tooltip) (c as any).tooltip.setActiveElements([], { x: 0, y: 0 });
                        c.update('none');
                    }
                });
            }
        } else if (event.type === 'mouseout') {
            Object.entries(charts).forEach(([id, c]) => {
                if (id !== chart.canvas.id && id.startsWith(baseId)) {
                    c.setActiveElements([]);
                    if ((c as any).tooltip) (c as any).tooltip.setActiveElements([], { x: 0, y: 0 });
                    c.update('none');
                }
            });
        }
    }
};

Chart.register(crosshairSyncPlugin);

const baseOpts: any = {
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 600, easing: 'easeOutQuart' as const },
    interaction: { mode: 'index', intersect: false },
    plugins: {
        legend: { labels: { color: C.muted, font: { family: "'Noto Sans TC', sans-serif", size: 11 }, usePointStyle: true, padding: 16 } },
        tooltip: {
            backgroundColor: 'rgba(17,24,39,0.95)', titleColor: C.white, bodyColor: C.muted, borderColor: C.grid, borderWidth: 1, cornerRadius: 8, padding: 12,
            callbacks: {
                afterLabel: function (context: any) {
                    const dsLabel = context.dataset.label || '';
                    if (dsLabel.includes('買入') || dsLabel.includes('賣出')) {
                        const info = context.raw?.reason || context.dataset.reasons?.[context.dataIndex];
                        if (info) return '📝 理由: ' + info;
                    }
                    return '';
                }
            }
        }
    },
    scales: {
        x: { grid: { color: C.grid }, ticks: { color: C.muted, font: { size: 10 }, maxTicksLimit: 10 } },
        y: { grid: { color: C.grid }, ticks: { color: C.muted, font: { family: "'JetBrains Mono', monospace", size: 11 } } }
    }
};

export function renderEquityCurve(canvasId: string, data: any): void {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create Gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(34, 211, 238, 0.3)');
    gradient.addColorStop(1, 'rgba(34, 211, 238, 0.0)');

    const { equity_curve, dates, trades, initial_capital, closes } = data;
    const labels = dates.map((d: string, i: number) => i % Math.ceil(dates.length / 30) === 0 ? d : '');
    const buy = new Array(equity_curve.length).fill(null);
    const sell = new Array(equity_curve.length).fill(null);
    const short = new Array(equity_curve.length).fill(null);
    const cover = new Array(equity_curve.length).fill(null);
    const reasons = new Array(equity_curve.length).fill('');
    trades?.forEach((t: any) => {
        const idx = t.index;
        reasons[idx] = t.reason || '';
        if (t.type === 'BUY') buy[idx] = equity_curve[idx];
        else if (t.type === 'SELL') sell[idx] = equity_curve[idx];
        else if (t.type === 'SHORT') short[idx] = equity_curve[idx];
        else if (t.type === 'COVER') cover[idx] = equity_curve[idx];
    });

    // Benchmark calculation (Buy & Hold)
    let benchmark: number[] | null = null;
    if (closes && closes.length > 0 && closes[0] !== 0) {
        const firstPrice = closes[0];
        benchmark = closes.map((p: number) => (p / firstPrice) * initial_capital);
    }

    const datasets: any[] = [
        { label: '策略資金', data: equity_curve, borderColor: C.cyan, backgroundColor: gradient, fill: true, borderWidth: 2.5, pointRadius: 0, tension: 0.35 },
    ];

    if (benchmark) {
        datasets.push({ label: '基準收益 (B&H)', data: benchmark, borderColor: C.benchmark, borderWidth: 1.5, pointRadius: 0, tension: 0.1, fill: false });
    }

    datasets.push(
        { label: '初始資金', data: Array(equity_curve.length).fill(initial_capital), borderColor: C.muted, borderDash: [5, 5], borderWidth: 1, pointRadius: 0, fill: false },
        // @ts-ignore
        { label: '買入 ▲', data: buy, reasons: reasons, borderColor: C.green, backgroundColor: C.green, pointRadius: 6, pointStyle: 'triangle' as const, showLine: false },
        // @ts-ignore
        { label: '賣出 ▼', data: sell, reasons: reasons, borderColor: C.red, backgroundColor: C.red, pointRadius: 6, pointStyle: 'triangle' as const, pointRotation: 180, showLine: false },
        // @ts-ignore
        { label: '賣空 ▼', data: short, reasons: reasons, borderColor: C.amber, backgroundColor: C.amber, pointRadius: 6, pointStyle: 'triangle' as const, pointRotation: 180, showLine: false },
        // @ts-ignore
        { label: '平空 ▲', data: cover, reasons: reasons, borderColor: C.blue, backgroundColor: C.blue, pointRadius: 6, pointStyle: 'triangle' as const, showLine: false }
    );

    charts[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets
        },
        options: {
            ...baseOpts,
            plugins: { ...baseOpts.plugins, title: { display: true, text: '📈 資金曲線與基準對照 (Equity Curve)', color: C.white, font: { family: "'Noto Sans TC'", size: 14, weight: 'bold' as const }, padding: { bottom: 16 } } }
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
    const short = new Array(closes.length).fill(null);
    const cover = new Array(closes.length).fill(null);
    const reasons = new Array(closes.length).fill('');
    trades?.forEach((t: any) => {
        const idx = t.index;
        reasons[idx] = t.reason || '';
        if (t.type === 'BUY') buy[idx] = closes[idx];
        else if (t.type === 'SELL') sell[idx] = closes[idx];
        else if (t.type === 'SHORT') short[idx] = closes[idx];
        else if (t.type === 'COVER') cover[idx] = closes[idx];
    });

    const ds: any[] = [
        { label: '收盤價', data: closes, borderColor: C.white, borderWidth: 1.5, pointRadius: 0, tension: 0.1 }
    ];
    if (ma_short) ds.push({ label: `MA${data.short_period ?? 5}`, data: ma_short, borderColor: C.amber, borderWidth: 1.5, pointRadius: 0, tension: 0.3 });
    if (ma_long) ds.push({ label: `MA${data.long_period ?? 20}`, data: ma_long, borderColor: C.purple, borderWidth: 1.5, pointRadius: 0, tension: 0.3 });
    ds.push(
        // @ts-ignore
        { label: '買入', data: buy, reasons: reasons, borderColor: C.green, backgroundColor: C.green, pointRadius: 5, pointStyle: 'triangle' as const, showLine: false },
        // @ts-ignore
        { label: '賣出', data: sell, reasons: reasons, borderColor: C.red, backgroundColor: C.red, pointRadius: 5, pointStyle: 'triangle' as const, pointRotation: 180, showLine: false },
        // @ts-ignore
        { label: '賣空', data: short, reasons: reasons, borderColor: C.amber, backgroundColor: C.amber, pointRadius: 5, pointStyle: 'triangle' as const, pointRotation: 180, showLine: false },
        // @ts-ignore
        { label: '平空', data: cover, reasons: reasons, borderColor: C.blue, backgroundColor: C.blue, pointRadius: 5, pointStyle: 'triangle' as const, showLine: false }
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

export function renderVolumeChart(canvasId: string, data: any): void {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!ctx) return;

    const { volumes, closes, dates } = data;
    const labels = dates.map((d: string, i: number) => i % Math.ceil(dates.length / 30) === 0 ? d : '');

    // Volume color based on price change
    const backgroundColors = volumes.map((_: number, i: number) => {
        if (i === 0) return C.grid;
        return closes[i] >= closes[i - 1] ? 'rgba(52, 211, 153, 0.4)' : 'rgba(251, 113, 133, 0.4)';
    });

    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: '成交量',
                data: volumes,
                backgroundColor: backgroundColors,
                borderWidth: 0,
                barThickness: 'flex'
            }]
        },
        options: {
            ...baseOpts,
            plugins: {
                ...baseOpts.plugins,
                title: { display: true, text: '📊 成交量 (Volume)', color: C.white, font: { size: 12 } },
                legend: { display: false }
            },
            scales: {
                ...baseOpts.scales,
                y: { display: true, grid: { display: false }, ticks: { display: false } }
            }
        }
    });
}

export function renderUnderwaterChart(canvasId: string, data: any): void {
    destroy(canvasId);
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { drawdown_series, dates } = data;
    const labels = dates.map((d: string, i: number) => i % Math.ceil(dates.length / 30) === 0 ? d : '');

    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(244, 63, 94, 0.4)');
    gradient.addColorStop(1, 'rgba(244, 63, 94, 0.05)');

    charts[canvasId] = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: '回撤深度 (%)',
                data: drawdown_series.map((v: number) => -v),
                borderColor: C.red,
                backgroundColor: gradient,
                fill: true,
                borderWidth: 1.5,
                pointRadius: 0,
                tension: 0.2
            }]
        },
        options: {
            ...baseOpts,
            plugins: { ...baseOpts.plugins, title: { display: true, text: '🔻 回撤壓力圖 (Underwater Chart)', color: C.red, font: { size: 12 } } },
            scales: {
                ...baseOpts.scales,
                y: { ...baseOpts.scales.y, ticks: { ...baseOpts.scales.y.ticks, callback: (v: any) => v + '%' } }
            }
        }
    });
}

export function renderDistributionChart(canvasId: string, data: any): void {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!ctx) return;

    const { wins, losses } = data;
    // Simple histogram-like grouping
    const bins: Record<string, number> = {};
    const all = [...wins, ...losses];
    all.forEach(p => {
        const bin = Math.floor(p / 1) * 1; // 1% bins
        const label = `${bin}% ~ ${bin + 1}%`;
        bins[label] = (bins[label] || 0) + 1;
    });

    const sortedLabels = Object.keys(bins).sort((a, b) => parseFloat(a) - parseFloat(b));

    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedLabels,
            datasets: [{
                label: '成交次數',
                data: sortedLabels.map(l => bins[l]),
                backgroundColor: sortedLabels.map(l => parseFloat(l) >= 0 ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'),
                borderRadius: 4
            }]
        },
        options: {
            ...baseOpts,
            plugins: { ...baseOpts.plugins, title: { display: true, text: '📊 盈虧分佈 (Win/Loss Distribution)', color: C.white, font: { size: 12 } }, legend: { display: false } },
            scales: { ...baseOpts.scales, x: { ...baseOpts.scales.x, grid: { display: false } } }
        }
    });
}

export function renderOptimizationBarChart(canvasId: string, scanResults: any[], onClick?: (index: number) => void): void {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!ctx) return;

    const topResults = scanResults.slice(0, 30);
    const labels = topResults.map(r => Object.values(r.params).join(' | '));
    const data = topResults.map(r => r.return);
    const bgColors = data.map(d => d > 0 ? C.greenA : C.redA);
    const borderColors = data.map(d => d > 0 ? C.green : C.red);

    charts[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: '總報酬率 %',
                data: data,
                backgroundColor: bgColors,
                borderColor: borderColors,
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            ...baseOpts,
            onClick: (e, elements, chart) => {
                if (elements.length > 0 && onClick) {
                    onClick(elements[0].index);
                }
            },
            onHover: (e, elements) => {
                if (e.native?.target) {
                    (e.native.target as HTMLElement).style.cursor = elements.length ? 'pointer' : 'default';
                }
            },
            plugins: {
                ...baseOpts.plugins,
                title: { display: true, text: '🏆 最佳參數組合 (Top 30 Returns)', color: C.amber, font: { family: "'Noto Sans TC', sans-serif", size: 14, weight: 'bold' as const }, padding: { bottom: 16 } },
                legend: { display: false },
                tooltip: {
                    ...baseOpts.plugins.tooltip,
                    callbacks: {
                        afterLabel: function (context) {
                            const r = topResults[context.dataIndex];
                            return [
                                `風報比 Score: ${r.score.toFixed(3)}`,
                                `勝率 Win Rate: ${r.winRate.toFixed(1)}%`,
                                `(點擊以套用此參數並查看詳細回測)`
                            ];
                        }
                    }
                }
            },
            scales: {
                ...baseOpts.scales,
                x: { ...baseOpts.scales.x, ticks: { ...baseOpts.scales.x.ticks, maxRotation: 45, minRotation: 45 } },
                y: { ...baseOpts.scales.y, title: { display: true, text: '總報酬率 %', color: C.muted } }
            }
        }
    });
}

export function renderOptimizationScatterChart(canvasId: string, scanResults: any[]): void {
    destroy(canvasId);
    const ctx = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!ctx) return;

    const topResults = scanResults.slice(0, 150); // limit scatter points

    const scatterData = topResults.map(r => ({
        x: r.winRate || 0,
        y: r.return,
        _params: Object.values(r.params).join(' | '),
        _score: r.score
    }));

    charts[canvasId] = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: '參數績效 (Top 150)',
                data: scatterData,
                backgroundColor: scatterData.map(d => d.y > 0 ? C.greenA : C.redA),
                borderColor: scatterData.map(d => d.y > 0 ? C.green : C.red),
                borderWidth: 1,
                pointRadius: 5,
                pointHoverRadius: 8
            }]
        },
        options: {
            ...baseOpts,
            plugins: {
                ...baseOpts.plugins,
                title: { display: true, text: '💡 參數優化分佈 (Return vs Win Rate)', color: C.white, font: { family: "'Noto Sans TC', sans-serif", size: 14, weight: 'bold' as const }, padding: { bottom: 16 } },
                tooltip: {
                    ...baseOpts.plugins.tooltip,
                    callbacks: {
                        label: function (context: any) {
                            const d = context.raw;
                            return [
                                `參數組合: ${d._params}`,
                                `報酬率: ${d.y.toFixed(2)}%`,
                                `勝率: ${d.x.toFixed(1)}%`,
                                `風報比: ${d._score.toFixed(3)}`
                            ];
                        }
                    }
                }
            },
            scales: {
                ...baseOpts.scales,
                x: { ...baseOpts.scales.x, title: { display: true, text: '勝率 %', color: C.muted } },
                y: { ...baseOpts.scales.y, title: { display: true, text: '總報酬率 %', color: C.muted } }
            }
        }
    });
}
