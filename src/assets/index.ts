function isHTMLElement(el: Element): el is HTMLElement {
    return el instanceof HTMLElement;
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
        e.style.color = `hsl(${hue}, 30%, 74%)`;
    }

    for (const btn of Array.from(
        document.querySelectorAll(".codeblock-copy"),
    )) {
        if (!isHTMLElement(btn)) continue;

        btn.addEventListener("click", () => {
            const code = btn.closest(".codeblock")?.querySelector("code");
            const text = btn.querySelector(".codeblock-copy-text");
            if (!code) return;

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
