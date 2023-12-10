function isHTMLSpanElement(el: Element): el is HTMLSpanElement {
    return el.tagName === "SPAN";
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
        if (!isHTMLSpanElement(e)) continue;

        const date = new Date(e.innerText);
        if (isNaN(date.getTime())) continue;
        e.innerText = relativeTime((Date.now() - date.getTime()) / 86_400_000);
        e.title = date.toLocaleDateString();
    }
});
