function isHTMLElement(el: Element): el is HTMLElement {
    return el instanceof HTMLElement;
}

/**
 * Builds the full HTML document rendered inside an `htmldemo` iframe.
 *
 * This is the client-side counterpart of `htmlDemoDocument` in
 * `src/transformers/codeBlock.ts`; keep the two in sync.
 *
 * The code is wrapped in an `<article>` so that form-control styling (scoped
 * under `article` in the stylesheet) applies inside the iframe as well. The
 * body gets the `htmldemo-body` class for iframe-only padding; keep in sync
 * with `htmlDemoDocument` in `src/transformers/codeBlock.ts`.
 */
function htmlDemoDocument(code: string): string {
    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><link rel="stylesheet" href="/assets/modern-normalize.css" /><link rel="stylesheet" href="/assets/index.css" /></head><body class="htmldemo-body"><article>${code}</article></body></html>`;
}

document.addEventListener("DOMContentLoaded", () => {
    function relativeTime(days: number): string {
        if (days < 1) {
            return "Today";
        } else if (days < 2) {
            return "Yesterday";
        } else if (days < 30) {
            return `${Math.round(days)} days ago`;
        } else if (days <= 45) {
            return "1 month ago";
        } else if (days < 365) {
            return `${Math.round(days / 30)} months ago`;
        } else if (days <= 545) {
            return "1 year ago";
        }
        return `${Math.round(days / 365)} years ago`;
    }

    for (const e of Array.from(document.querySelectorAll(".relative-date"))) {
        if (!isHTMLElement(e)) continue;

        const date = new Date(e.getAttribute("datetime") ?? e.innerText);
        if (isNaN(date.getTime())) continue;
        e.innerText = relativeTime((Date.now() - date.getTime()) / 86_400_000);
        e.title = date.toLocaleDateString();
    }

    function stringToHue(s: string): number {
        let hash = 0;
        for (let i = 0; i < s.length; i++) {
            hash = s.charCodeAt(i) + (hash << 5);
        }
        return Math.abs(hash % 360);
    }

    for (const e of Array.from(document.querySelectorAll(".coloured-tag"))) {
        if (!isHTMLElement(e)) continue;

        const hue = stringToHue(e.innerText);
        e.style.setProperty("--color-primary", `hsl(${hue}, 30%, 74%)`);
    }

    // htmldemo code blocks: re-render the iframe whenever the textarea is
    // edited. Without JavaScript, the server-rendered srcdoc stays visible.
    for (const block of Array.from(
        document.querySelectorAll(".codeblock-htmldemo"),
    )) {
        const textarea = block.querySelector(".htmldemo-textarea");
        const frame = block.querySelector(".htmldemo-frame");
        if (
            !(textarea instanceof HTMLTextAreaElement) ||
            !(frame instanceof HTMLIFrameElement)
        ) {
            continue;
        }

        // Browsers may restore the user's last-edited textarea value on
        // reload (form state restoration / session history), which would
        // desync the textarea from the server-rendered iframe srcdoc. Reset
        // it to the page's original contents, which the transformer stored
        // in the `data-original` attribute (attribute values are unescaped
        // automatically when read via getAttribute).
        const original = textarea.getAttribute("data-original") ?? textarea.value;
        textarea.value = original;
        frame.srcdoc = htmlDemoDocument(original);

        textarea.addEventListener("input", () => {
            frame.srcdoc = htmlDemoDocument(textarea.value);
        });
    }

    for (const btn of Array.from(
        document.querySelectorAll(".codeblock-copy"),
    )) {
        if (!isHTMLElement(btn)) continue;

        btn.addEventListener("click", () => {
            const text = btn.querySelector(".codeblock-copy-text");
            const code = btn.closest(".codeblock")?.querySelector("code");
            if (!code || !(text instanceof HTMLElement)) return;

            navigator.clipboard
                .writeText(code.textContent ?? "")
                .then(() => {
                    if (!isHTMLElement(text)) return;
                    const original = text.innerText;
                    text.innerText = "Copied!";
                    window.setTimeout(() => {
                        text.innerText = original;
                    }, 2000);
                });
        });
    }
});
