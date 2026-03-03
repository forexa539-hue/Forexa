import { NextResponse } from 'next/server';

const TWELVE_DATA_KEY = process.env.NEXT_PUBLIC_TWELVE_DATA_API_KEY || '';

// Simple in-memory cache
/* eslint-disable @typescript-eslint/no-explicit-any */
const CACHE: Record<string, { data: any; expiry: number }> = {};
/* eslint-enable @typescript-eslint/no-explicit-any */

function getCache(key: string) {
    const item = CACHE[key];
    if (item && item.expiry > Date.now()) {
        return item.data;
    }
    return null;
}

function setCache(key: string, data: any, ttlSeconds: number) {
    CACHE[key] = {
        data,
        expiry: Date.now() + ttlSeconds * 1000,
    };
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const symbol = searchParams.get('symbol');
    const timeframe = searchParams.get('timeframe') || '1day';

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol missing' }, { status: 400 });
    }

    const cacheKey = `ohlcv_${source}_${symbol}_${timeframe}`;
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    try {
        let result = [];

        if (source === 'coingecko') {
            // Days parameter for CoinGecko
            const res = await fetch(
                `https://api.coingecko.com/api/v3/coins/${symbol}/ohlc?vs_currency=usd&days=${timeframe}`,
                { headers: { 'Accept': 'application/json' } }
            );

            if (!res.ok) throw new Error(`CoinGecko status: ${res.status}`);
            const data = await res.json();

            if (Array.isArray(data)) {
                result = data.map((d: number[]) => ({
                    time: Math.floor(d[0] / 1000),
                    open: d[1],
                    high: d[2],
                    low: d[3],
                    close: d[4],
                    volume: 0,
                }));
            }

        } else if (source === 'twelvedata') {
            const res = await fetch(
                `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${timeframe}&outputsize=100&apikey=${TWELVE_DATA_KEY}`
            );

            if (!res.ok) throw new Error(`TwelveData status: ${res.status}`);
            const data = await res.json();

            if (data.values && Array.isArray(data.values)) {
                result = data.values.map((v: any) => ({
                    time: Math.floor(new Date(v.datetime).getTime() / 1000),
                    open: parseFloat(v.open),
                    high: parseFloat(v.high),
                    low: parseFloat(v.low),
                    close: parseFloat(v.close),
                    volume: parseFloat(v.volume || '0'),
                })).reverse();
            }
        } else {
            return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
        }

        setCache(cacheKey, result, 300); // 5 min cache
        return NextResponse.json(result, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });

    } catch (error: any) {
        console.error('OHLCV API error:', error);

        const status = error.message.includes('429') ? 429 : 500;
        const message = error.message.includes('429')
            ? 'API Rate Limit Exceeded'
            : (error.message || 'Failed to fetch OHLCV');

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

