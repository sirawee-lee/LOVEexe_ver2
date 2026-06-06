// WordBank.ts
// คลังคำสำหรับเกม Type Blast — คำที่เจอบ่อยจาก html / css / js / react
// ใช้ตัวอักษร a-z ล้วน (ไม่มีสัญลักษณ์/ตัวพิมพ์ใหญ่) เพื่อให้พิมพ์ลื่น

export const WORD_BANK: { [lang: string]: string[] } = {
    html: [
        "div", "span", "body", "head", "form", "input", "button", "label",
        "header", "footer", "nav", "section", "article", "image", "video",
        "table", "anchor", "script", "style", "title", "main", "aside",
        "list", "link", "meta", "audio", "select",
    ],
    css: [
        "color", "margin", "padding", "border", "width", "height", "flex",
        "grid", "display", "position", "absolute", "relative", "opacity",
        "radius", "background", "font", "weight", "align", "center", "hover",
        "active", "transform", "transition", "shadow", "block", "inline",
        "fixed", "sticky", "gap",
    ],
    js: [
        "const", "let", "var", "function", "return", "async", "await",
        "console", "document", "window", "array", "object", "string",
        "number", "boolean", "promise", "filter", "map", "reduce", "fetch",
        "event", "click", "query", "export", "import", "class", "then",
        "catch", "value", "length", "push",
    ],
    react: [
        "props", "state", "hook", "jsx", "render", "component", "fragment",
        "context", "reducer", "redux", "router", "effect", "memo", "ref",
        "mount", "children", "provider", "usestate", "useeffect", "useref",
        "usememo", "usecallback", "usecontext",
    ],
};

// สีประจำแต่ละหมวด (ใช้ระบายป้ายคำ)
export const LANG_COLOR: { [lang: string]: cc.Color } = {
    html: cc.color(255, 140, 80),     // ส้ม
    css: cc.color(120, 220, 140),     // เขียว
    js: cc.color(255, 215, 90),       // เหลือง
    react: cc.color(97, 218, 251),    // ฟ้า React
};

export const LANGS = ["html", "css", "js", "react"];
