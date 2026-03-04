/**
 * data-loader.ts — 雙數據源管理
 */

export interface OHLCVBar {
    Date: string;
    Open: number;
    High: number;
    Low: number;
    Close: number;
    Volume: number;
}

export interface LoadResult {
    data: OHLCVBar[];
    source: 'real' | 'simulated';
    symbol: string;
}

const TW_STOCK_BASE = 'https://benitorhuang-svg.github.io/tw-stock-app';
let priceIndex: Record<string, string> | null = null;

export async function loadStockData(symbol = '2330'): Promise<LoadResult> {
    try {
        if (!priceIndex) {
            const res = await fetch(`${TW_STOCK_BASE}/data/price_index.json`, {
                signal: AbortSignal.timeout(5000)
            });
            if (res.ok) priceIndex = await res.json();
        }

        if (priceIndex?.[symbol]) {
            const csvRes = await fetch(
                `${TW_STOCK_BASE}/data/prices/${priceIndex[symbol]}`,
                { signal: AbortSignal.timeout(8000) }
            );
            if (csvRes.ok) {
                const data = parseCSV(await csvRes.text());
                if (data.length > 50) {
                    console.log(`[Data] 真實數據: ${symbol} (${data.length} 根K線)`);
                    return { data, source: 'real', symbol };
                }
            }
        }
    } catch (e) {
        console.warn('[Data] 真實數據不可用，改用模擬:', (e as Error).message);
    }

    const data = generateSimulatedData(500);
    return { data, source: 'simulated', symbol: '模擬股票' };
}

function parseCSV(csv: string): OHLCVBar[] {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];

    const h = lines[0].split(',').map(s => s.trim().toLowerCase());
    const idx = {
        date: h.findIndex(x => x.includes('date')),
        open: h.findIndex(x => x.includes('open')),
        high: h.findIndex(x => x.includes('high')),
        low: h.findIndex(x => x.includes('low')),
        close: h.findIndex(x => x.includes('close')),
        vol: h.findIndex(x => x.includes('vol'))
    };

    return lines.slice(1).map(line => {
        const c = line.split(',').map(s => s.trim());
        const o = parseFloat(c[idx.open]), hi = parseFloat(c[idx.high]);
        const lo = parseFloat(c[idx.low]), cl = parseFloat(c[idx.close]);
        if ([o, hi, lo, cl].some(isNaN)) return null!;
        return { Date: c[idx.date] ?? '', Open: o, High: hi, Low: lo, Close: cl, Volume: parseInt(c[idx.vol]) || 0 };
    }).filter(Boolean);
}

export function generateSimulatedData(n = 500, startPrice = 100): OHLCVBar[] {
    const data: OHLCVBar[] = [];
    let price = startPrice;
    const today = new Date();

    for (let i = 0; i < n; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (n - i));
        const trend = Math.sin(i / 80) * 0.002;
        const noise = (Math.random() - 0.48) * 0.03;
        const change = price * (trend + noise);
        const open = price, close = price + change;
        const high = Math.max(open, close) * (1 + Math.random() * 0.015);
        const low = Math.min(open, close) * (1 - Math.random() * 0.015);

        data.push({
            Date: date.toISOString().slice(0, 10),
            Open: Math.round(open * 100) / 100,
            High: Math.round(high * 100) / 100,
            Low: Math.round(low * 100) / 100,
            Close: Math.round(close * 100) / 100,
            Volume: Math.floor(5000 + Math.random() * 15000)
        });
        price = close;
    }
    return data;
}
