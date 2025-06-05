import { SitemapStream, streamToPromise } from "sitemap";

const SITEMAP_CACHE_DURATION_SECONDS = 3600;

export const GET = async () => {
    try {
        const stream = new SitemapStream({ hostname: 'https://ralvo.be' });

        stream.write({ url: '/', changefreq: 'daily', priority: 1.0 });

        stream.end();

        const sitemap = await streamToPromise(stream).then((data) => data.toString());

        return new Response(sitemap, {
            status: 200,
            headers: {
                'Content-Type': 'application/xml',
                'Cache-Control': `public, max-age=${SITEMAP_CACHE_DURATION_SECONDS}`,
            },
        });

    } catch (e) {
        console.error(e);
        return new Response('Internal Server Error', { status: 500 });
    }
};
