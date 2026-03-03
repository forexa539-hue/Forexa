import { NextResponse } from 'next/server';

const TWELVE_DATA_KEY = process.env.NEXT_PUBLIC_TWELVE_DATA_API_KEY || '';

// Simple in-memory cache for the server instance
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
    const source = searchParams.get('source'); // 'coingecko' | 'twelvedata'
    const symbolParam = searchParams.get('symbol');

    if (!symbolParam) {
        return NextResponse.json({ error: 'Symbol missing' }, { status: 400 });
    }

    // Split symbols to check cache individually later if needed, 
    // but for now we'll just cache the request URL or key based on the csv string
    const cacheKey = `price_${source}_${symbolParam}`;
    const cached = getCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    try {
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const results: Record<string, any> = {};
        /* eslint-enable @typescript-eslint/no-explicit-any */

        if (source === 'coingecko') {
            // CoinGecko supports ids=bitcoin,ethereum
            const res = await fetch(
                `https://api.coingecko.com/api/v3/simple/price?ids=${symbolParam}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`,
                { headers: { 'Accept': 'application/json' } }
            );
            if (!res.ok) throw new Error(`CoinGecko status: ${res.status}`);
            const data = await res.json();

            // Transform each key
            Object.keys(data).forEach(key => {
                const coin = data[key];
                results[key] = {
                    price: coin.usd,
                    change24h: coin.usd * (coin.usd_24h_change / 100),
                    changePercent24h: coin.usd_24h_change || 0,
                    high24h: coin.usd * 1.05,
                    low24h: coin.usd * 0.95,
                    timestamp: Date.now(),
                };
            });

        } else if (source === 'twelvedata') {
            // Twelve Data supports symbol=EUR/USD,GBP/USD
            const res = await fetch(
                `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbolParam)}&apikey=${TWELVE_DATA_KEY}`
            );
            if (!res.ok) throw new Error(`TwelveData status: ${res.status}`);
            const data = await res.json();

            // If single symbol, data is { price: "..." }
            // If multiple, data is { "EUR/USD": { price: "..." }, "GBP/USD": { ... } }

            if (data.price) {
                // Single result
                const price = parseFloat(data.price);
                results[symbolParam] = {
                    price,
                    change24h: 0,
                    changePercent24h: 0,
                    high24h: price,
                    low24h: price,
                    timestamp: Date.now(),
                };
            } else {
                // Batch result
                Object.keys(data).forEach(key => {
                    if (data[key].price) {
                        const price = parseFloat(data[key].price);
                        results[key] = {
                            price,
                            change24h: 0,
                            changePercent24h: 0,
                            high24h: price,
                            low24h: price,
                            timestamp: Date.now(),
                        };
                    }
                });
            }
        } else {
            return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
        }

        setCache(cacheKey, results, 30); // 30s cache
        return NextResponse.json(results, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        });

    } catch (error: any) {
        console.error('Market API error:', error);

        const status = error.message.includes('429') ? 429 : 500;
        const message = error.message.includes('429')
            ? 'API Rate Limit Exceeded'
            : (error.message || 'Failed to fetch price');

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
