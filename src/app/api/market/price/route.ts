import { NextResponse } from 'next/server';

const TWELVE_DATA_KEY = process.env.NEXT_PUBLIC_TWELVE_DATA_API_KEY || '';

type MarketSource = 'coingecko' | 'twelvedata';

interface PricePayload {
    price: number;
    change24h: number;
    changePercent24h: number;
    high24h: number;
    low24h: number;
    timestamp: number;
}

type PriceResultMap = Record<string, PricePayload>;

// Simple in-memory cache for the server instance
const CACHE: Record<string, { data: PriceResultMap; expiry: number }> = {};

function getCache(key: string) {
    const item = CACHE[key];
    if (item && item.expiry > Date.now()) {
        return item.data;
    }
    return null;
}

function setCache(key: string, data: PriceResultMap, ttlSeconds: number) {
    CACHE[key] = {
        data,
        expiry: Date.now() + ttlSeconds * 1000,
    };
}

function parseSource(source: string | null): MarketSource | null {
    if (source === 'coingecko' || source === 'twelvedata') return source;
    return null;
}

function parseSymbols(symbolParam: string) {
    return symbolParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const source = parseSource(searchParams.get('source'));
    const symbolParam = searchParams.get('symbol');

    if (!symbolParam) {
        return NextResponse.json({ error: 'Symbol missing' }, { status: 400 });
    }
    if (!source) {
        return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
    }

    const symbols = parseSymbols(symbolParam);
    if (symbols.length === 0 || symbols.length > 25) {
        return NextResponse.json({ error: 'Invalid symbol list' }, { status: 400 });
    }
    if (source === 'twelvedata' && !TWELVE_DATA_KEY) {
        return NextResponse.json({ error: 'TwelveData API key missing' }, { status: 500 });
    }

    // Split symbols to check cache individually later if needed, 
    // but for now we'll just cache the request URL or key based on the csv string
    const cacheKey = `price_${source}_${symbolParam}`;
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    try {
        const results: PriceResultMap = {};

        if (source === 'coingecko') {
            // CoinGecko supports ids=bitcoin,ethereum
            const res = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${symbolParam}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`,
                { headers: { 'Accept': 'application/json' } }
            );
            if (!res.ok) throw new Error(`CoinGecko status: ${res.status}`);
            const data = await res.json() as Record<string, { usd?: number; usd_24h_change?: number }>;

            // Transform each key
            Object.keys(data).forEach(key => {
                const coin = data[key];
                if (!coin || !Number.isFinite(coin.usd)) return;
                const usd = coin.usd as number;
                const changePercent = Number.isFinite(coin.usd_24h_change) ? (coin.usd_24h_change as number) : 0;
                results[key] = {
                    price: usd,
                    change24h: usd * (changePercent / 100),
                    changePercent24h: changePercent,
                    high24h: usd * 1.05,
                    low24h: usd * 0.95,
                    timestamp: Date.now(),
                };
            });

        } else if (source === 'twelvedata') {
            const fetchSingle = async (symbol: string) => {
                const res = await fetch(
                    `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${TWELVE_DATA_KEY}`
                );
                if (!res.ok) throw new Error(`TwelveData status: ${res.status}`);
                const data = await res.json() as { price?: string; message?: string };

                if (typeof data.message === 'string' && data.message.trim()) {
                    throw new Error(`${symbol}: ${data.message}`);
                }

                const price = parseFloat(data.price || '');
                if (!Number.isFinite(price)) {
                    throw new Error(`${symbol}: invalid price payload`);
                }

                results[symbol] = {
                    price,
                    change24h: 0,
                    changePercent24h: 0,
                    high24h: price,
                    low24h: price,
                    timestamp: Date.now(),
                };
            };

            if (symbols.length === 1) {
                await fetchSingle(symbols[0]);
            } else {
                const settled = await Promise.allSettled(symbols.map((s) => fetchSingle(s)));
                const rejected = settled.filter((r) => r.status === 'rejected');
                if (rejected.length === symbols.length) {
                    const reason = rejected[0]?.status === 'rejected' ? rejected[0].reason : 'No valid price data returned';
                    throw new Error(reason instanceof Error ? reason.message : 'No valid price data returned');
                }
            }
        } else {
            return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
        }

        if (Object.keys(results).length === 0) {
            return NextResponse.json({ error: 'No valid price data returned' }, { status: 502 });
        }

        setCache(cacheKey, results, 30); // 30s cache
        return NextResponse.json(results, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });

    } catch (error: unknown) {
        console.error('Market API error:', error);

        const messageText = error instanceof Error ? error.message : 'Failed to fetch price';

        const status = messageText.includes('429') ? 429 : 500;
        const message = messageText.includes('429')
            ? 'API Rate Limit Exceeded'
            : messageText;

        return NextResponse.json(
            { error: message },
            {
                status: status,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                }
            }
        );
    }
}

export async function OPTIONS() {
    return NextResponse.json({}, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
