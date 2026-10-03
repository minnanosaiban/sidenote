"use strict";

// 【10-sanitize-paste.js】ノート本文の整形、.json読み込み値の無害化、貼り付け（Ctrl+V）
// app.jsを機械的に分割したファイル（index.htmlの<script>の並び順どおりに読み込む。
// 全ファイルが同じグローバルスコープを共有するので、順序を変えると初期化順（TDZ）が壊れる）。

// ---- ノート本文は簡易Markdown（**太字**と<u>下線</u>のみ許可） ----
function formatNoteText(raw) {
  const esc = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, "<u>$1</u>");
}

const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// 属性値（"..."の中）に入れる文字列用。引用符も潰さないと属性を抜け出せる。
const escapeAttr = (s) => escapeHtml(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// ---- .jsonのdocHTML（本文を丸ごと保存/復元する値）の無害化 ----
// .jsonは「保存の続き」だけでなく、README記載の通り共有相手とやり取りする双方向のファイル形式でもある。
// テキストエディタで自由に書き換えられる以上、docHTMLの中身は信用できない外部入力として扱う必要がある
// （相手から届いた.jsonのdocHTMLに<img src=x onerror="...">等を仕込まれ、「開く」を押した瞬間に
// このオリジン上で任意JSが実行される＝XSS。2026-09発見）。
// Markdown取り込み・貼り付け・表セルはMdParser.inlineToHtml／escapeHtml経由でHTMLエスケープ＋許可タグ
// のみ通す作りだが、docHTML（＝#doc.innerHTMLの丸ごと保存/復元）だけはこれまでノーチェックで
// innerHTMLへ差し戻していたため、ここだけこの対策が必要になる。
// DOMPurify（vendor/dompurify、Apache License 2.0 / MPL 2.0。THIRD_PARTY_NOTICES.md参照）で、
// このアプリ自身が実際に組み立てるタグ・属性だけを許可するアローリストとして無害化する
// （画像・表・区切り線ブロックの「＋ノート」「×」ボタンとそのSVGアイコンも#doc内の実DOMなので対象に含む。
// 削らないと再読み込み後にbindImageParaEvents等のquerySelectorがnullになりTypeErrorで初期化が止まる）。
const DOC_HTML_ALLOWED_TAGS = [
  "div", "span", "sup", "b", "u", "strong", "em", "i", "del", "code", "a", "br",
  "table", "thead", "tbody", "tr", "th", "td", "img", "hr", "button", "svg", "path",
];
const DOC_HTML_ALLOWED_ATTR = [
  "class", "contenteditable", "style", "href", "target", "rel", "src", "alt", "title", "type",
  "xmlns", "viewbox", "fill", "aria-hidden", "d",
];
// http(s)・mailto・ページ内相対リンクに加え、画像挿入／貼り付けが使うdata:image/...;base64,のみ許可する
// （isSafeUrl()と同じ考え方をURIの許可判定にも適用。javascript:・data:text/html等はこの正規表現に
// マッチせず、DOMPurifyが自動的にその属性ごと除去する）。
const DOC_HTML_ALLOWED_URI = /^(?:(?:https?|mailto):|data:image\/[a-z0-9.+-]+;base64,|[^a-z:]|[a-z][a-z0-9+.-]*(?:[^a-z0-9+.-:]|$))/i;

// 保存データのstyle属性は、このアプリが書き込むプロパティだけに絞る。
// position:fixed等を許すと、共有された.jsonに「画面全体を覆うリンク」を仕込まれて
// クリックを乗っ取られる（url()による外部読み込みも同様に塞ぐ）。
const DOC_HTML_ALLOWED_STYLE_PROPS = [
  "text-align", "padding-left", "text-indent", "font-size", "font-weight", "font-style",
  "color", "text-decoration",
];
function restrictStyleAttr(node) {
  if (!node.getAttribute || !node.hasAttribute("style")) return;
  const kept = [];
  const st = node.style;
  for (let i = 0; i < st.length; i++) {
    const prop = st[i];
    const value = st.getPropertyValue(prop);
    if (DOC_HTML_ALLOWED_STYLE_PROPS.includes(prop) && !/url\s*\(|expression|javascript:/i.test(value)) {
      kept.push(`${prop}:${value}`);
    }
  }
  if (kept.length) node.setAttribute("style", kept.join(";"));
  else node.removeAttribute("style");
}

function sanitizeDocHtml(html) {
  if (typeof window.DOMPurify === "undefined") {
    // 同梱のvendor/dompurifyが何らかの理由で読み込めていない場合、無害化できないまま
    // innerHTMLへ入れる（＝対策が効かない）よりは読み込みそのものを拒否する方が安全（フェイルクローズ）。
    throw new Error("サニタイズ用ライブラリの読み込みに失敗しました。ページを再読み込みしてから、もう一度お試しください。");
  }
  window.DOMPurify.addHook("afterSanitizeAttributes", restrictStyleAttr);
  try {
    return window.DOMPurify.sanitize(html, {
      ALLOWED_TAGS: DOC_HTML_ALLOWED_TAGS,
      ALLOWED_ATTR: DOC_HTML_ALLOWED_ATTR,
      ALLOWED_URI_REGEXP: DOC_HTML_ALLOWED_URI,
      ALLOW_DATA_ATTR: true,   // data-anchor-id・data-para-id等、段落の状態を持たせるdata-*属性一式
    });
  } finally {
    window.DOMPurify.removeHook("afterSanitizeAttributes");
  }
}

// ---- .json／自動保存から読み込んだ値の形の検証 ----
// 形が違う値（手で書き換えた・壊れたファイル）は、状態を書き換える前に弾く／捨てる。
function normalizeNotesByAnchor(raw) {
  const out = [];
  if (!Array.isArray(raw)) return out;
  raw.forEach((entry) => {
    if (!Array.isArray(entry) || typeof entry[0] !== "string" || !Array.isArray(entry[1])) return;
    const notes = entry[1]
      .filter((n) => n && typeof n === "object" && typeof n.text === "string")
      .map((n) => ({ id: String(n.id), text: n.text, color: ["black", "blue", "red"].includes(n.color) ? n.color : "black" }));
    out.push([entry[0], notes]);
  });
  return out;
}
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
function isValidPdfAnchor(a) {
  if (!a || typeof a !== "object" || typeof a.anchorId !== "string" || !Number.isInteger(a.page) || a.page < 0) return false;
  const isRect = (r) => r && isNum(r.x) && isNum(r.y) && isNum(r.w) && isNum(r.h);
  if (a.kind === "text") return Array.isArray(a.rects) && a.rects.length > 0 && a.rects.every(isRect);
  if (a.kind === "point") return !!a.point && isNum(a.point.x) && isNum(a.point.y);
  if (a.kind === "rect") return isRect(a.rect);
  return false;
}

// 選択範囲がロック済み注釈（.note-anchor）やオペーク型ブロック（画像・表・水平線）にかかっていないか確認する。
// 原文の改変を防ぐため、これらをまたぐ選択には太字/下線もノート追加も適用しない。
function rangeOverlapsLockedAnchor(range) {
  return Array.from(doc.querySelectorAll(".note-anchor, .para-opaque")).some((el) => range.intersectsNode(el));
}

// ---- 貼り付け（Ctrl+V）はMarkdownとして取り込む ----
// このツールはAIチャットが書き出したMarkdownを扱うためのものなので、貼り付けも「開く」で
// .mdファイルを選ぶのと同じ「Markdownとして解釈する」挙動にする（かつては専用の
// 「MD貼付け」パネルがこの役割を持っていたが、貼り付け自体を取り込みにして廃止した）。
//   ・本文が空のとき  → 文書全体の取り込み（タイトル欄は変えず、本文だけ丸ごと置き換え）
//   ・すでに何か書かれているとき → カーソルのある段落の直後へブロックとして挿入
// どちらの経路もDOMを直接組み立てるためブラウザのネイティブundoの対象ではないが、
// 独自のUndo/Redo（Ctrl+Z/Ctrl+Y。autoSave経由でのcommitUndoHistory参照）の対象には含まれる。
// パーサーが読めていない場合だけ、従来のプレーンテキスト挿入（1行＝1段落）へ落とす。
function linesToParaHtml(text) {
  return text.split(/\r\n|\r|\n/)
    .map((line) => line.length ? `<div class="para">${escapeHtml(line)}</div>` : `<div class="para"><br></div>`)
    .join("");
}

// 本文が実質空か（プレースホルダーの判定と同じ条件）。空なら貼り付けを全文取り込みにする。
function docIsEmpty() {
  return doc.textContent.trim() === "" && doc.querySelectorAll(".note-anchor, .para-opaque").length === 0;
}

// クリップボードに画像が含まれる場合は画像ブロックとして挿入し、無ければMarkdownとして取り込む。
doc.addEventListener("paste", (e) => {
  const cd = e.clipboardData || window.clipboardData;
  const imageItem = Array.from(cd.items || []).find((it) => it.type && it.type.startsWith("image/"));
  if (imageItem) {
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (file) insertImageBlock(file);
    return;
  }
  e.preventDefault();
  const text = cd.getData("text/plain");
  if (!text) return;
  // 改行を含まない一行だけの貼り付けは、単語や一文をコピペしたいだけの操作とみなし、
  // Markdownブロックとしての取り込み（常に現在の段落の後ろに新しい段落を作ってしまい、
  // カーソル位置を無視する）ではなく、今のカーソル位置にそのままインラインで挿し込む
  // （普通のテキストエディタと同じ挙動。本文が空の時は従来通り全文をMarkdown取り込みする）。
  // ただし、直前にこのアプリ内で「段落まるごと」コピー／切り取りしたテキストと一致する場合は
  // 改行が無くても段落として扱う（＝新しい段落として貼り付け、文中にインラインで混ぜない）。
  const isCopiedWholeParagraph = lastCopiedWasWholeParagraph && text === lastCopiedText;
  if (!isCopiedWholeParagraph && !/\r|\n/.test(text) && !docIsEmpty()) {
    document.execCommand("insertText", false, text);
    return;
  }
  if (docIsEmpty()) {
    if (window.MdParser) importMarkdownText(text, "");
    else document.execCommand("insertHTML", false, linesToParaHtml(text));
    return;
  }
  if (!window.MdParser) {
    document.execCommand("insertHTML", false, linesToParaHtml(text));
    return;
  }
  const inserted = insertMarkdownBlocks(MdParser.parseMarkdownBlocks(text));
  setStatus(inserted
    ? `貼り付けたMarkdownを取り込みました（${inserted}ブロック）。`
    : "貼り付けた内容から取り込めるものがありませんでした。");
});

// 文書は常に最低1つの.para（空でも）を持つ状態にしておく。
function resetDoc() {
  doc.innerHTML = '<div class="para"><br></div>';
}

// 空の時にplaceholderを出す（contenteditableはネイティブ対応が無いためCSSではなくJSで判定）。
// pdfモードは「空の本文」という概念自体が無い（PDFを開いた時点で必ず中身がある）ので何もしない。
function updatePlaceholder() {
  if (currentMode === "pdf") return;
  doc.classList.toggle("empty", doc.textContent.trim() === "" && doc.querySelectorAll(".note-anchor, .para-opaque").length === 0);
}
// 画像・表ブロックもBackspace/Deleteでのブラウザ標準の削除に対応しているため、
// テキストの編集と同じ"input"イベントでも通し番号・サイドノート欄を必ず作り直す。
doc.addEventListener("input", () => { updatePlaceholder(); renumberAndLayout(); autoSaveDebounced(); });
resetDoc();
updatePlaceholder();
// 通し番号・書式ツールバーの状態反映などの初期化は、全ファイルの定義が揃ってから
// 99-init.jsでまとめて行う（別ファイルの関数を呼ぶため）。
