export interface NewsArticle {
    title: string;
    description: string;
    url: string;
    source: string;
    publishedAt: string;
    imageUrl?: string;
    category: string;
}

interface NewsApiResponseArticle {
    title?: string;
    description?: string;
    url?: string;
    source?: {
        name?: string;
    };
    publishedAt?: string;
    image?: string;
    urlToImage?: string;
}

interface NewsApiResponse {
    articles?: NewsApiResponseArticle[];
}

const ALLOWED_CATEGORIES = new Set(['forex', 'crypto', 'indices']);

function sanitizeCategory(category?: string) {
    const normalized = (category || '').trim().toLowerCase();
    return ALLOWED_CATEGORIES.has(normalized) ? normalized : undefined;
}

function toSafeArticle(a: NewsApiResponseArticle, category: string): NewsArticle | null {
    if (!a.title || !a.url) return null;
    const safeUrl = a.url.startsWith('http://') || a.url.startsWith('https://') ? a.url : '#';
    return {
        title: a.title,
        description: a.description || 'No description available.',
        url: safeUrl,
        source: a.source?.name || 'Unknown',
        publishedAt: a.publishedAt || new Date().toISOString(),
        imageUrl: a.image || a.urlToImage,
        category,
    };
}

export async function fetchMarketNews(category?: string): Promise<NewsArticle[]> {
    try {
        const validCategory = sanitizeCategory(category);
        const params = new URLSearchParams();
        if (validCategory) params.append('category', validCategory);

        // Call our own internal API route which proxies to GNews
        // Use full URL if on server, relative if on client? 
        // fetch works with relative URLs in browser.
        const res = await fetch(`/api/news?${params.toString()}`);

        if (!res.ok) {
            console.error(`News API error: ${res.status}`);
            return getFallbackNews();
        }

        const data = await res.json() as NewsApiResponse;

        if (!data.articles || !Array.isArray(data.articles)) {
            console.warn('News API returned unexpected format, using fallback');
            return getFallbackNews();
        }

        const mapped = data.articles
            .map((a) => toSafeArticle(a, validCategory || 'general'))
            .filter((a): a is NewsArticle => a !== null);

        return mapped.length > 0 ? mapped : getFallbackNews();

    } catch (err) {
        console.error('Failed to fetch news:', err);
        return getFallbackNews();
    }
}

function getFallbackNews(): NewsArticle[] {
    return [
        {
            title: 'Markets Rally as Fed Signals Cautious Approach',
            description: 'Major indices posted gains as the Federal Reserve indicated a measured pace for future policy changes.',
            url: '#',
            source: 'Market Wire',
            publishedAt: new Date().toISOString(),
            category: 'indices',
        },
        {
            title: 'Bitcoin Holds Key Support Level Amid Volatility',
            description: 'BTC/USD remains resilient above critical support levels as crypto markets navigate macroeconomic uncertainty.',
            url: '#',
            source: 'Crypto Daily',
            publishedAt: new Date().toISOString(),
            category: 'crypto',
        },
        {
            title: 'EUR/USD Consolidates Near Multi-Week Highs',
            description: 'The euro remains supported against the dollar as European economic data surprises to the upside.',
            url: '#',
            source: 'FX Street',
            publishedAt: new Date().toISOString(),
            category: 'forex',
        },
        {
            title: 'NASDAQ Hits New Highs on Tech Earnings',
            description: 'Technology sector earnings continue to exceed expectations, driving the composite to fresh records.',
            url: '#',
            source: 'Market Wire',
            publishedAt: new Date().toISOString(),
            category: 'indices',
        },
        {
            title: 'Ethereum Upgrades Drive Network Activity',
            description: 'ETH sees increased on-chain activity as protocol improvements boost transaction throughput and reduce fees.',
            url: '#',
            source: 'Crypto Daily',
            publishedAt: new Date().toISOString(),
            category: 'crypto',
        },
        {
            title: 'GBP/USD Eyes Resistance After BoE Decision',
            description: 'The British pound tests key resistance levels following the Bank of England\'s latest monetary policy decision.',
            url: '#',
            source: 'FX Street',
            publishedAt: new Date().toISOString(),
            category: 'forex',
        },
    ];
}
