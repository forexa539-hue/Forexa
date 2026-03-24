import { NextResponse } from 'next/server';

const NEWS_API_KEY = process.env.NEWS_API_KEY || process.env.NEXT_PUBLIC_NEWS_API_KEY || '';
const ALLOWED_CATEGORIES = new Set(['forex', 'crypto', 'indices']);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category')?.trim().toLowerCase() || '';

    if (category && !ALLOWED_CATEGORIES.has(category)) {
        return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    if (!NEWS_API_KEY) {
        return NextResponse.json({ error: 'API key missing' }, { status: 500 });
    }

    const query = category
        ? `${category} market`
        : 'stock market OR crypto OR forex';

    try {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&pageSize=9&sortBy=publishedAt&apiKey=${NEWS_API_KEY}`;

        const res = await fetch(url, { next: { revalidate: 3600 } });

        if (!res.ok) {
            return NextResponse.json(
                { error: `News API upstream error: ${res.status} ${res.statusText}` },
                { status: 502 }
            );
        }

        const data = await res.json() as { articles?: unknown[]; status?: string; message?: string };
        if (!Array.isArray(data.articles)) {
            return NextResponse.json(
                { error: data.message || 'Invalid response from news provider' },
                { status: 502 }
            );
        }
        return NextResponse.json(data);
    } catch (error) {
        console.error('News proxy error:', error);
        return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }
}
