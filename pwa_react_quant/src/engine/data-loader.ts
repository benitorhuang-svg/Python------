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

export async function loadStockData(symbol = '2330.TW'): Promise<LoadResult> {
    try {
        // Yahoo Finance API endpoint for OHLC data (2 years, daily)
        const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=2y&interval=1d`;

        // Use allorigins as a CORS proxy to bypass browser restrictions
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`;

        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });

        if (res.ok) {
            const json = await res.json();
            const result = json.chart?.result?.[0];

            if (result && result.timestamp && result.indicators?.quote?.[0]) {
                const timestamps = result.timestamp as number[];
                const quote = result.indicators.quote[0];

                const data: OHLCVBar[] = [];
                for (let i = 0; i < timestamps.length; i++) {
                    if (quote.open[i] === null || quote.close[i] === null) continue;

                    const dateObj = new Date(timestamps[i] * 1000);
                    // Format as YYYY-MM-DD
                    const dateStr = dateObj.toISOString().slice(0, 10);

                    data.push({
                        Date: dateStr,
                        Open: quote.open[i],
                        High: quote.high[i],
                        Low: quote.low[i],
                        Close: quote.close[i],
                        Volume: quote.volume[i] || 0
                    });
                }

                if (data.length > 50) {
                    console.log(`[Data] Yahoo Finance 真實數據: ${symbol} (${data.length} 根K線)`);
                    return { data, source: 'real', symbol };
                }
            }
        }
        console.warn(`[Data] Yahoo API did not return valid chart data for ${symbol}`);
    } catch (e) {
        console.warn('[Data] Yahoo Finance API 請求失敗，改用模擬數據:', (e as Error).message);
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
