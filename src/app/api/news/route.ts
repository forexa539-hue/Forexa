import { NextResponse } from 'next/server';

const NEWS_API_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY || '';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    if (!NEWS_API_KEY) {
        return NextResponse.json({ error: 'API key missing' }, { status: 500 });
    }

    const query = category && category.trim()
        ? `${category} market`
        : 'stock market OR crypto OR forex';

    try {
        const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=9&apikey=${NEWS_API_KEY}`;

        const res = await fetch(url, { next: { revalidate: 3600 } });

        if (!res.ok) {
            return NextResponse.json(
                { error: `GNews API error: ${res.status} ${res.statusText}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('News proxy error:', error);
        return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }
}
