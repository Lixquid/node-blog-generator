import type { ISODate } from "./types.ts";

/** The base URL that the site is deployed at. */
export const siteUrl = "https://blog.lixquid.com";

/** The absolute path of the RSS feed on the site. */
export const rssPath = "/rss.xml";

/**
 * Escapes a string for inclusion in XML element text or attribute values.
 */
export function escapeXml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

/**
 * Formats an ISO-8601 date string (e.g. `2025-06-25`) as an RFC-822 date
 * (e.g. `Wed, 25 Jun 2025 00:00:00 GMT`) as required by RSS.
 */
export function formatRfc822(date: ISODate): string {
    return new Date(date).toUTCString();
}

/** The per-post data used to build the RSS feed. */
export interface RssPost {
    title: string;
    date: ISODate;
    slug: string;
    description: string | undefined;
}

/**
 * Renders an RSS 2.0 feed document for the given posts, most recent first.
 * Hidden posts should be filtered out by the caller.
 */
export function renderRss(posts: RssPost[]): string {
    const sorted = [...posts].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const items = sorted.map((post) => {
        const url = `${siteUrl}/${post.slug}/`;
        const lines = [
            "        <item>",
            `            <title>${escapeXml(post.title)}</title>`,
            `            <link>${escapeXml(url)}</link>`,
            `            <guid isPermaLink="true">${escapeXml(url)}</guid>`,
            `            <pubDate>${formatRfc822(post.date)}</pubDate>`,
        ];
        if (post.description !== undefined) {
            lines.push(
                `            <description>${
                    escapeXml(post.description)
                }</description>`,
            );
        }
        lines.push("        </item>");
        return lines.join("\n");
    });

    // The most recent post's date; omitted entirely for an empty blog.
    const lastBuildDate = sorted.length > 0
        ? `\n        <lastBuildDate>${formatRfc822(sorted[0].date)}</lastBuildDate>`
        : "";

    return [
        `<?xml version="1.0" encoding="UTF-8"?>`,
        `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">`,
        `    <channel>`,
        `        <title>${escapeXml("Lixquid's Blog")}</title>`,
        `        <link>${siteUrl}/</link>`,
        `        <description>${escapeXml("Posts from Lixquid's blog.")}</description>`,
        `        <language>en</language>${lastBuildDate}`,
        `        <atom:link href="${siteUrl}${rssPath}" rel="self" type="application/rss+xml" />`,
        ...items,
        `    </channel>`,
        `</rss>`,
        "",
    ].join("\n");
}
