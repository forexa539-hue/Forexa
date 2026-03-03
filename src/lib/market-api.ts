export interface Instrument {
    id: string;
    name: string;
    symbol: string;
    category: 'indices' | 'crypto' | 'forex';
    apiSource: 'coingecko' | 'twelvedata';
    apiSymbol: string;
}

export const INSTRUMENTS: Instrument[] = [
    // Indices (using ETFs as proxies for free API access)
    { id: 'sp500', name: 'S&P 500 ETF', symbol: 'SPY', category: 'indices', apiSource: 'twelvedata', apiSymbol: 'SPY' },
    { id: 'nasdaq', name: 'NASDAQ ETF', symbol: 'QQQ', category: 'indices', apiSource: 'twelvedata', apiSymbol: 'QQQ' },
    { id: 'dowjones', name: 'Dow Jones ETF', symbol: 'DIA', category: 'indices', apiSource: 'twelvedata', apiSymbol: 'DIA' },
    { id: 'nifty50', name: 'NIFTY 50', symbol: 'NIFTY 50', category: 'indices', apiSource: 'twelvedata', apiSymbol: 'NIFTY50:NSE' },
    // Crypto
    { id: 'btcusd', name: 'Bitcoin', symbol: 'BTC/USD', category: 'crypto', apiSource: 'coingecko', apiSymbol: 'bitcoin' },
    { id: 'ethusd', name: 'Ethereum', symbol: 'ETH/USD', category: 'crypto', apiSource: 'coingecko', apiSymbol: 'ethereum' },
    { id: 'solanausd', name: 'Solana', symbol: 'SOL/USD', category: 'crypto', apiSource: 'coingecko', apiSymbol: 'solana' },
    // Forex
    { id: 'eurusd', name: 'EUR/USD', symbol: 'EUR/USD', category: 'forex', apiSource: 'twelvedata', apiSymbol: 'EUR/USD' },
    { id: 'gbpusd', name: 'GBP/USD', symbol: 'GBP/USD', category: 'forex', apiSource: 'twelvedata', apiSymbol: 'GBP/USD' },
    { id: 'usdjpy', name: 'USD/JPY', symbol: 'USD/JPY', category: 'forex', apiSource: 'twelvedata', apiSymbol: 'USD/JPY' },
    { id: 'usdchf', name: 'USD/CHF', symbol: 'USD/CHF', category: 'forex', apiSource: 'twelvedata', apiSymbol: 'USD/CHF' },
    { id: 'audusd', name: 'AUD/USD', symbol: 'AUD/USD', category: 'forex', apiSource: 'twelvedata', apiSymbol: 'AUD/USD' },
    { id: 'usdcad', name: 'USD/CAD', symbol: 'USD/CAD', category: 'forex', apiSource: 'twelvedata', apiSymbol: 'USD/CAD' },
    { id: 'nzdusd', name: 'NZD/USD', symbol: 'NZD/USD', category: 'forex', apiSource: 'twelvedata', apiSymbol: 'NZD/USD' },
    { id: 'usdinr', name: 'USD/INR', symbol: 'USD/INR', category: 'forex', apiSource: 'twelvedata', apiSymbol: 'USD/INR' },
    { id: 'eurgbp', name: 'EUR/GBP', symbol: 'EUR/GBP', category: 'forex', apiSource: 'twelvedata', apiSymbol: 'EUR/GBP' },
    { id: 'eurjpy', name: 'EUR/JPY', symbol: 'EUR/JPY', category: 'forex', apiSource: 'twelvedata', apiSymbol: 'EUR/JPY' },
    { id: 'euraud', name: 'EUR/AUD', symbol: 'EUR/AUD', category: 'forex', apiSource: 'twelvedata', apiSymbol: 'EUR/AUD' },
    { id: 'gbpjpy', name: 'GBP/JPY', symbol: 'GBP/JPY', category: 'forex', apiSource: 'twelvedata', apiSymbol: 'GBP/JPY' },
    { id: 'audnzd', name: 'AUD/NZD', symbol: 'AUD/NZD', category: 'forex', apiSource: 'twelvedata', apiSymbol: 'AUD/NZD' },
    { id: 'audcad', name: 'AUD/CAD', symbol: 'AUD/CAD', category: 'forex', apiSource: 'twelvedata', apiSymbol: 'AUD/CAD' },
];

export interface PriceData {
    price: number;
    change24h: number;
    changePercent24h: number;
    high24h: number;
    low24h: number;
    timestamp: number;
}

export interface OHLCVData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

const TIMEFRAME_MAP: Record<string, { coingeckoDays: string; twelveInterval: string }> = {
    '1m': { coingeckoDays: '1', twelveInterval: '1min' },
    '5m': { coingeckoDays: '1', twelveInterval: '5min' },
    '15m': { coingeckoDays: '1', twelveInterval: '15min' },
    '1h': { coingeckoDays: '7', twelveInterval: '1h' },
    '1d': { coingeckoDays: '90', twelveInterval: '1day' },
};

export async function fetchPrice(instrument: Instrument): Promise<PriceData> {
    try {
        const res = await fetch(
            `/api/market/price?source=${instrument.apiSource}&symbol=${instrument.apiSymbol}`
        );
        if (!res.ok) throw new Error('API Error');
        return await res.json();
    } catch (err) {
        console.warn(`Fetch price failed for ${instrument.symbol}`, err);
        return {
            price: 0,
            change24h: 0,
            changePercent24h: 0,
            high24h: 0,
            low24h: 0,
            timestamp: Date.now()
        };
    }
}

export async function fetchBatchPrices(instruments: Instrument[]): Promise<Record<string, PriceData>> {
    const results: Record<string, PriceData> = {};
    const coingeckoInsts = instruments.filter(i => i.apiSource === 'coingecko');
    const twelveDataInsts = instruments.filter(i => i.apiSource === 'twelvedata');

    const fetchGroup = async (source: string, group: Instrument[]) => {
        if (group.length === 0) return;
        const symbols = group.map(i => i.apiSymbol).join(',');

        try {
            const res = await fetch(`/api/market/price?source=${source}&symbol=${symbols}`);
            if (!res.ok) return; // Fail silently for individual batch
            const data = await res.json();

            group.forEach(inst => {
                if (data[inst.apiSymbol]) {
                    results[inst.id] = data[inst.apiSymbol];
                }
            });
        } catch (e) {
            console.error(`Batch fetch failed for ${source}`, e);
        }
    };

    await Promise.all([
        fetchGroup('coingecko', coingeckoInsts),
        fetchGroup('twelvedata', twelveDataInsts)
    ]);

    return results;
}

export async function fetchOHLCV(instrument: Instrument, timeframe: string): Promise<OHLCVData[]> {
    const tf = TIMEFRAME_MAP[timeframe] || TIMEFRAME_MAP['1h'];
    const param = instrument.apiSource === 'coingecko' ? tf.coingeckoDays : tf.twelveInterval;

    const res = await fetch(
        `/api/market/ohlcv?source=${instrument.apiSource}&symbol=${instrument.apiSymbol}&timeframe=${param}`
    );

    if (!res.ok) {
        let errorMessage = 'API Error';
        try {
            const errData = await res.json();
            errorMessage = errData.error || errorMessage;
        } catch { /* ignore */ }
        throw new Error(errorMessage);
    }

    return await res.json();
}

export function getInstrumentById(id: string): Instrument | undefined {
    return INSTRUMENTS.find((i) => i.id === id);
}
