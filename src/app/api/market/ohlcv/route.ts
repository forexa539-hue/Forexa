import { NextResponse } from 'next/server';

const TWELVE_DATA_KEY = process.env.NEXT_PUBLIC_TWELVE_DATA_API_KEY || '';

type MarketSource = 'coingecko' | 'twelvedata';

interface OHLCVRow {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

// Simple in-memory cache
const CACHE: Record<string, { data: OHLCVRow[]; expiry: number }> = {};

function getCache(key: string) {
    const item = CACHE[key];
    if (item && item.expiry > Date.now()) {
        return item.data;
    }
    return null;
}

function setCache(key: string, data: OHLCVRow[], ttlSeconds: number) {
    CACHE[key] = {
        data,
        expiry: Date.now() + ttlSeconds * 1000,
    };
}

function parseSource(source: string | null): MarketSource | null {
    if (source === 'coingecko' || source === 'twelvedata') return source;
    return null;
}

const VALID_COINGECKO_DAYS = new Set(['1', '7', '90']);
const VALID_TWELVE_INTERVALS = new Set(['1min', '5min', '15min', '1h', '1day']);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const source = parseSource(searchParams.get('source'));
    const symbol = searchParams.get('symbol');
    const timeframe = searchParams.get('timeframe') || '1day';

    if (!symbol) {
        return NextResponse.json({ error: 'Symbol missing' }, { status: 400 });
    }
    if (!source) {
        return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
    }

    if (source === 'coingecko' && !VALID_COINGECKO_DAYS.has(timeframe)) {
        return NextResponse.json({ error: 'Invalid CoinGecko timeframe' }, { status: 400 });
    }
    if (source === 'twelvedata' && !VALID_TWELVE_INTERVALS.has(timeframe)) {
        return NextResponse.json({ error: 'Invalid TwelveData timeframe' }, { status: 400 });
    }
    if (source === 'twelvedata' && !TWELVE_DATA_KEY) {
        return NextResponse.json({ error: 'TwelveData API key missing' }, { status: 500 });
    }

    const cacheKey = `ohlcv_${source}_${symbol}_${timeframe}`;
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    try {
        let result: OHLCVRow[] = [];

        if (source === 'coingecko') {
            // Days parameter for CoinGecko
            const res = await fetch(
                `https://api.coingecko.com/api/v3/coins/${symbol}/ohlc?vs_currency=usd&days=${timeframe}`,
                { headers: { 'Accept': 'application/json' } }
            );

            if (!res.ok) throw new Error(`CoinGecko status: ${res.status}`);
            const data = await res.json() as number[][];

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
            const data = await res.json() as {
                values?: Array<{
                    datetime?: string;
                    open?: string;
                    high?: string;
                    low?: string;
                    close?: string;
                    volume?: string;
                }>;
                message?: string;
            };

            if (typeof data.message === 'string' && data.message.trim()) {
                throw new Error(data.message);
            }

            if (data.values && Array.isArray(data.values)) {
                result = data.values
                    .map((v) => ({
                        time: Math.floor(new Date(v.datetime || '').getTime() / 1000),
                        open: parseFloat(v.open || ''),
                        high: parseFloat(v.high || ''),
                        low: parseFloat(v.low || ''),
                        close: parseFloat(v.close || ''),
                        volume: parseFloat(v.volume || '0'),
                    }))
                    .filter((row) =>
                        Number.isFinite(row.time) && row.time > 0 &&
                        Number.isFinite(row.open) &&
                        Number.isFinite(row.high) &&
                        Number.isFinite(row.low) &&
                        Number.isFinite(row.close) &&
                        Number.isFinite(row.volume)
                    )
                    .reverse();
            }
        }

        if (result.length === 0) {
            return NextResponse.json({ error: 'No OHLCV data returned' }, { status: 502 });
        }

        setCache(cacheKey, result, 300); // 5 min cache
        return NextResponse.json(result, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });

    } catch (error: unknown) {
        console.error('OHLCV API error:', error);

        const messageText = error instanceof Error ? error.message : 'Failed to fetch OHLCV';

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

