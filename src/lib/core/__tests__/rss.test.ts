import assert from "node:assert/strict";
import test from "node:test";
import { escapeXml, formatRfc822, renderRss } from "../rss.ts";
import type { ISODate } from "../types.ts";

function isoDate(date: string): ISODate {
    return date as ISODate;
}

test("escapeXml escapes XML special characters", () => {
    assert.equal(
        escapeXml(`a & b < c > d " e ' f`),
        "a &amp; b &lt; c &gt; d &quot; e &apos; f",
    );
});

test("formatRfc822 formats ISO dates", () => {
    assert.equal(formatRfc822(isoDate("2024-01-01")), "Mon, 01 Jan 2024 00:00:00 GMT");
});

test("renderRss sorts posts newest-first and links them", () => {
    const xml = renderRss([
        {
            title: "Older Post",
            date: isoDate("2024-01-01"),
            slug: "20240101-older",
            description: "First & foremost",
        },
        {
            title: "Newer Post",
            date: isoDate("2024-03-01"),
            slug: "20240301-newer",
            description: undefined,
        },
    ]);

    assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
    assert.match(xml, /<rss version="2.0" xmlns:atom=/);
    assert.match(xml, /<link>https:\/\/blog\.lixquid\.com\/<\/link>/);
    assert.match(xml, /<title>Lixquid&apos;s Blog<\/title>/);

    // Items appear newest-first.
    const newerIndex = xml.indexOf("20240301-newer");
    const olderIndex = xml.indexOf("20240101-older");
    assert.ok(newerIndex >= 0 && olderIndex >= 0 && newerIndex < olderIndex);

    // Permalink GUIDs, canonical post URLs, and RFC-822 publication dates.
    assert.match(
        xml,
        /<link>https:\/\/blog\.lixquid\.com\/20240101-older\/<\/link>/,
    );
    assert.match(
        xml,
        /<guid isPermaLink="true">https:\/\/blog\.lixquid\.com\/20240101-older\/<\/guid>/,
    );
    assert.match(xml, /<pubDate>Mon, 01 Jan 2024 00:00:00 GMT<\/pubDate>/);

    // Descriptions are escaped for XML.
    assert.match(xml, /<description>First &amp; foremost<\/description>/);
});

test("renderRss omits description elements when there is none", () => {
    const xml = renderRss([
        { title: "T", date: isoDate("2024-01-01"), slug: "s", description: undefined },
    ]);
    const item = xml.slice(xml.indexOf("<item>"), xml.indexOf("</item>"));
    assert.ok(item.includes("<title>T</title>"));
    assert.ok(!item.includes("<description>"));
});

test("renderRss omits lastBuildDate for an empty blog", () => {
    assert.doesNotMatch(renderRss([]), /<lastBuildDate>/);
    assert.doesNotMatch(renderRss([]), /<item>/);
});

test("renderRss includes the channel lastBuildDate", () => {
    const xml = renderRss([
        { title: "T", date: isoDate("2024-01-01"), slug: "a", description: undefined },
        { title: "T", date: isoDate("2024-03-01"), slug: "b", description: undefined },
    ]);
    assert.match(
        xml,
        /<lastBuildDate>Fri, 01 Mar 2024 00:00:00 GMT<\/lastBuildDate>/,
    );
});
