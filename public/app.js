"use strict";

// アイコン（Bootstrap Icons, MIT License）を絵文字の代わりに生SVGで埋め込む。
const ICON_X =
  '<svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">' +
  '<path d="M2.146 2.854a.5.5 0 1 1 .708-.708L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8z"/></svg>';
const ICON_IMAGE =
  '<svg class="icon" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">' +
  '<path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0"/>' +
  '<path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1z"/></svg>';

const doc = document.getElementById("doc");
const docLeftEl = document.querySelector(".doc-left");
const docRightEl = document.getElementById("docRight");
const popoverEl = document.getElementById("notePopover");
const popoverInput = document.getElementById("notePopoverInput");
const titleInput = document.getElementById("titleInput");
const openedFileNoteEl = document.getElementById("openedFileNote");
const saveBtn = document.getElementById("saveBtn");
const saveMdBtn = document.getElementById("saveMdBtn");
const savePdfBtn = document.getElementById("savePdfBtn");
const pdfColorPanel = document.getElementById("pdfColorPanel");
const pdfColorBtn = document.getElementById("pdfColorBtn");
const pdfBwBtn = document.getElementById("pdfBwBtn");
const pdfColorClose = document.getElementById("pdfColorClose");
const saveDocxBtn = document.getElementById("saveDocxBtn");
const printDocEl = document.getElementById("printDoc");
const loadInput = document.getElementById("loadInput");
const saveStatusEl = document.getElementById("saveStatus");
const appFooterEl = document.getElementById("appFooter");
const resumeApplyBtn = document.getElementById("resumeApply");
const resumeDiscardBtn = document.getElementById("resumeDiscard");
// 「サイドノートに名前を表示する」の色ごとのチェックボックス（サイドノート欄の上部、2026-09に
// 設定パネルから移設）。設定ボタン自体（黒／青の名前のカスタム変更）は同時に廃止した
// （colorNames.black/blueは既定値のまま固定。.jsonに保存済みの名前は読み込み時のみそのまま反映する）。
const showLabelInputs = {
  black: document.getElementById("showLabelBlack"),
  blue: document.getElementById("showLabelBlue"),
  red: document.getElementById("showLabelRed"),
};
// メニュー1（ファイル操作の.toolbar）・メニュー2（書式ツールバー.toolbar-format）を、それぞれ独立に
// 編集メニュー（書式ツールバー）だけ画面上部へ固定できる（ツールバー右の「編集メニューを固定」。
// 上段＝ファイル操作の行は2026-09に固定機能を廃止し、代わりに#backToTopBtnを設けた）。
// position:stickyを付けるのは行そのもの（#formatToolbar）ではなく、それを包む.toolbar-sticky
// ラッパー（#toolbarMenu2Wrap）。sticky要素は「自分の親」の高さの範囲でしか固定され続けない
// ため、ラッパーをbody直下（＝ページ全体ぶんの高さがある親）にする必要がある。
const toolbarMenu2WrapEl = document.getElementById("toolbarMenu2Wrap");
const menu2VisibleToggle = document.getElementById("menu2VisibleToggle");
const menu2StickyToggle = document.getElementById("menu2StickyToggle");
const backToTopBtn = document.getElementById("backToTopBtn");
// 「デザイン」はドロップダウンではなく、ヒーロー内に常時表示するグリッド（2026-09、当初の
// アプリイメージに合わせて変更。ボタン自体はテーマを直接適用し、開閉は不要）。
const themeGrid = document.getElementById("themeGrid");
// ---- 本文の書式ツールバー（配置／インデント／ぶら下げ／太字下線／傍点／スタイル）と
// 「項番設定」パネル、PDFモード用の要素参照（sidenote-pdf-docから移植） ----
const formatToolbarEl = document.getElementById("formatToolbar");
const alignBtns = Array.from(formatToolbarEl.querySelectorAll("[data-align]"));
const indentDecBtn = document.getElementById("indentDecBtn");
const indentIncBtn = document.getElementById("indentIncBtn");
const hangingDecBtn = document.getElementById("hangingDecBtn");
const hangingIncBtn = document.getElementById("hangingIncBtn");
const hangingLabel = document.getElementById("hangingLabel");
const fontSizeDecBtn = document.getElementById("fontSizeDecBtn");
const fontSizeIncBtn = document.getElementById("fontSizeIncBtn");
const fontSizeLabel = document.getElementById("fontSizeLabel");
const boldBtn = document.getElementById("boldBtn");
const underlineBtn = document.getElementById("underlineBtn");
const kentenBtn = document.getElementById("kentenBtn");
const styleBtns = Array.from(formatToolbarEl.querySelectorAll("[data-style]"));
const bulletListBtn = document.getElementById("bulletListBtn");
const orderedListBtn = document.getElementById("orderedListBtn");
const insertTableBtn = document.getElementById("insertTableBtn");
const insertImageBtn = document.getElementById("insertImageBtn");
const insertImageFileInput = document.getElementById("insertImageFile");
const insertHrBtn = document.getElementById("insertHrBtn");
const insertPageBreakBtn = document.getElementById("insertPageBreakBtn");
const markdownModeToggle = document.getElementById("markdownModeToggle");
const docStackEl = document.getElementById("docStack");
const docLabelEl = document.getElementById("docLabel");
const pdfViewerEl = document.getElementById("pdfViewer");
// 「デザイン」パネル内の「カスタマイズ」だけはテーマではなく「項番設定」パネルを開く特殊ボタン
// （見た目はテーマ一覧に並ぶが、選ぶ動作は他のスウォッチと違う。index.html参照）。
const customizeThemeBtn = document.getElementById("customizeThemeBtn");
const numberingPanel = document.getElementById("numberingPanel");
const numberingClose = document.getElementById("numberingClose");
const applyNumberingBtn = document.getElementById("applyNumberingBtn");
// 見出し（H1〜H3）の見た目設定。文字サイズ(pt)は空欄可（本文と同じ＝上書きしない）、太字はON/OFFのみ。
const styleSettingInputs = {
  h1: { size: document.getElementById("h1SizeInput"), bold: document.getElementById("h1BoldToggle") },
  h2: { size: document.getElementById("h2SizeInput"), bold: document.getElementById("h2BoldToggle") },
  h3: { size: document.getElementById("h3SizeInput"), bold: document.getElementById("h3BoldToggle") },
};
// 項番（行頭の型）ごとのインデント・ぶら下げ設定。
const numberingSettingInputs = {
  dai:    { indent: document.getElementById("numDaiIndent"),    hanging: document.getElementById("numDaiHanging") },
  arabic: { indent: document.getElementById("numArabicIndent"), hanging: document.getElementById("numArabicHanging") },
  paren:  { indent: document.getElementById("numParenIndent"),  hanging: document.getElementById("numParenHanging") },
  kana:   { indent: document.getElementById("numKanaIndent"),   hanging: document.getElementById("numKanaHanging") },
};

let anchorIdSeq = 1;
let replyIdSeq = 1;
let imageIdSeq = 1;
let tableIdSeq = 1;
let hrIdSeq = 1;

// ---- モード（本文＝打ち込み編集 か PDF＝既存PDFへの注釈 か。sidenote-pdfから移植） ----
// 「開く」で.pdfを選ぶとpdfモードへ切り替わる（新規ボタンは増やさない方針、handleOpenedFile参照）。
// notesByAnchor・色・返信スレッドの仕組みは両モード共通。異なるのは「本文をどう表示し、
// どこにノートを固定するか」だけなので、そこだけモード別の実装（renumberAndLayoutText/Pdf、
// buildPrintDoc/Pdf）に分け、共通部分（layoutSidenotes・ポップオーバー・色選択等）は分岐しない。
let currentMode = "text";   // "text" | "pdf"
let currentPdfDoc = null;         // pdf.jsのPDFDocumentProxy（再レンダリング等では今のところ使わない。将来用に保持）
let currentPdfDataUrl = null;     // 保存(.json)にそのまま埋め込む元PDFのdata URL
// Markdownモード（「表を挿入」の右のチェックボックス）。.md書き出しに反映されない書式・サイドノートを
// グレーアウトする（updateFormatToolbarState・handleSelection参照）。updateFormatToolbarStateは
// このファイル下部で初回呼び出しされるため、その時点までにここで初期化しておく必要がある。
const MARKDOWN_MODE_KEY = "sidenote-markdown-mode-v1";
let markdownMode = false;
try { markdownMode = localStorage.getItem(MARKDOWN_MODE_KEY) === "1"; } catch (err) { /* noop */ }
// pdfモードでの注釈の「正本」。#doc（docHTML）に相当する存在で、DOM上の.pdf-markは
// これを描画した結果に過ぎない（ページの再描画時はこの配列から作り直す）。
let pdfAnchors = [];

// インデント／ぶら下げインデント／スタイルは.paraのdata属性（data-indent-level・data-hanging・
// data-style）で持たせ、画面・印刷（PDF化）の両方がこの属性から表示用のスタイルを組み立てる
// （値そのものは属性が正、スタイルは都度の計算結果というのが唯一の情報源になる）。
const INDENT_LEVEL_MAX = 6;
// ぶら下げは1〜3文字幅から選べる（0＝なし）。1文字＝1em（本文の37字組版と同じ「全角1文字≒1em」の前提）。
const HANGING_CHAR_EM = 1;
const HANGING_MAX = 3;
// 文字サイズ（書式ツールバーの「文字サイズ」）は段落ごとにpt単位で個別指定できる。
// updateFormatToolbarState()がページ初期化時（下のresetDoc()直後）に即座に呼ばれるため、
// この定数は他の定数と同じくファイル冒頭で必ず定義しておく（2026-09、下の方で定義していたところ
// TDZ（初期化前アクセス）で起動時に例外が出て以後の初期化が全部止まる不具合を起こした教訓）。
const FONT_SIZE_MIN_PT = 6;
const FONT_SIZE_MAX_PT = 72;
const FONT_SIZE_DEFAULT_PT = 12;   // 「既定」から＋／−を押した時の出発点（本文のPDF書き出し既定に合わせる）
// スタイルは「本文」＋見出し3段階（H1〜H3）の離散的な4択。data-styleが無い＝本文（フォントサイズ・
// 太さともに素のまま）。各見出しの実際の見た目（文字サイズpt・太字）は「項番設定」パネルで
// 文書ごとに変えられる設定（paraStyleSettings、下のDEFAULT_PARA_STYLE_SETTINGSが初期値）にした。
// fontSizePtがnull＝本文と同じ文字サイズのまま太字だけ変える、という指定にも対応する。
// 2026-09、H2・H3の既定がfontSizePt:null（＝本文と同じ大きさのまま太字だけ）だと、太字ボタンを
// 押しただけの見た目と紛らわしく「見出しにしたのに小さい」という指摘を繰り返し受けたため、
// 既定から本文より一段階ずつ大きくする（H1=16pt > H2=14pt > H3=13pt > 本文12pt）。
// 元の「本文と同じ」挙動が欲しい場合は「項番設定（カスタマイズ）」の文字サイズを空欄にすれば戻る。
const DEFAULT_PARA_STYLE_SETTINGS = {
  h1: { fontSizePt: 16, bold: false },
  h2: { fontSizePt: 14, bold: true },
  h3: { fontSizePt: 13, bold: true },
};
let paraStyleSettings = JSON.parse(JSON.stringify(DEFAULT_PARA_STYLE_SETTINGS));

// ---- 項番（行頭の型）の自動判定 ----
// 「第１」「１、」「⑴」「ア、」のような行頭の型ごとに、インデント・ぶら下げをまとめて設定できる
// （numberingSettings、下のDEFAULT_NUMBERING_SETTINGSが初期値）。「項番を一括適用」ボタン
// （applyNumbering）を押すと、文書内の全段落を先頭のテキストで判定し、一致した型の設定を書き込む。
const NUMBERING_TYPES = ["dai", "arabic", "paren", "kana"];
const NUMBERING_PATTERNS = {
  dai:    /^第[0-9０-９一二三四五六七八九十百千]+/,
  arabic: /^[0-9０-９]+[\s　、，,．.）)]/,
  paren:  /^([⑴-⒇]|[（(][0-9０-９]+[）)])/,
  kana:   /^[ア-ン][\s　、，,．.）)]/,
};
const DEFAULT_NUMBERING_SETTINGS = {
  dai:    { indentLevel: 0, hanging: 1 },
  arabic: { indentLevel: 1, hanging: 1 },
  paren:  { indentLevel: 2, hanging: 1 },
  kana:   { indentLevel: 3, hanging: 1 },
};
let numberingSettings = JSON.parse(JSON.stringify(DEFAULT_NUMBERING_SETTINGS));

// .jsonから読み込んだ設定を既定値へマージする（旧ファイル・欠損・改ざんされた値でも壊れないように）。
function mergeParaStyleSettings(loaded) {
  const merged = JSON.parse(JSON.stringify(DEFAULT_PARA_STYLE_SETTINGS));
  if (loaded && typeof loaded === "object") {
    Object.keys(merged).forEach((key) => {
      const s = loaded[key];
      if (!s || typeof s !== "object") return;
      merged[key].fontSizePt = Number.isFinite(s.fontSizePt) ? s.fontSizePt : null;
      merged[key].bold = !!s.bold;
    });
  }
  return merged;
}
function mergeNumberingSettings(loaded) {
  const merged = JSON.parse(JSON.stringify(DEFAULT_NUMBERING_SETTINGS));
  if (loaded && typeof loaded === "object") {
    NUMBERING_TYPES.forEach((type) => {
      const r = loaded[type];
      if (!r || typeof r !== "object") return;
      if (Number.isFinite(r.indentLevel)) merged[type].indentLevel = Math.max(0, Math.min(INDENT_LEVEL_MAX, r.indentLevel));
      if (Number.isFinite(r.hanging)) merged[type].hanging = Math.max(0, Math.min(HANGING_MAX, r.hanging));
    });
  }
  return merged;
}

// 直前に開いた.md/.markdown/.txtの元のファイル名（拡張子込み）。「MDで書き出す」で同じ名前を
// 使う（＝実質的な上書き保存）ため、また Ctrl+S の保存先（.json/.md）の振り分けにも使う。
// .jsonを開く／自動保存を復元する／「新しい作業」を始めると null に戻り、Ctrl+Sは.json保存に戻る。
let openedMdFilename = null;
// 上と対で、File System Access API（Chrome/Edge等）経由で開いた場合だけFileSystemFileHandleを保持する。
// これがあれば保存時に元のローカルファイルへ直接上書きできる（非対応ブラウザや<input type="file">・
// ドラッグ＆ドロップで掴めなかった場合はnullのままで、従来通りダウンロードでの保存にフォールバックする）。
let openedMdFileHandle = null;

// ヒーロー側に「ファイル：〇〇.md」と実ファイル名を表示する（openedMdFilenameが
// 変わる4箇所――.mdを開く／.jsonを開く／自動保存から復元／新しい作業――すべてから呼ぶ）。
// タイトル欄（titleInput）は.json等の保存名のもとになる別の値（本文には出さない）なので、
// 実際にCtrl+Sで上書きされるファイルがどれかが分かるよう、あえて別の場所に出す。
function updateOpenedFileNote() {
  if (openedMdFilename) {
    openedFileNoteEl.textContent = `ファイル：${openedMdFilename}`;
    openedFileNoteEl.hidden = false;
  } else {
    openedFileNoteEl.hidden = true;
  }
}

// anchorId -> [{id, text, color}, ...]（1つの一文・画像・表に複数のコメントを重ねられる＝返信スレッド形式）
// 引用された原文自体はDOM（.note-anchorのspan）がそのまま保持するのでここには持たない。
const notesByAnchor = new Map();
let pendingTarget = null;   // { type: "text", range } | { type: "image"|"table", paraEl } | { type: "reply", anchorId }
// 直前にCtrl+C/Ctrl+Xでコピーした内容の記憶（同じセッション内での貼り付け判定にだけ使う）。
// 段落をまるごとコピーした場合、貼り付け側でそれと分かるようにするための目印。
// クリップボードの中身自体は改変しない（他アプリへの貼り付けは通常通りプレーンテキストのまま）ので、
// 別タブ・別セッションや外部からの貼り付けでは単に一致せず、これまで通りの改行の有無での判定に戻る。
let lastCopiedText = null;
let lastCopiedWasWholeParagraph = false;
let lastUsedColor = "black";          // 直前に選んだ色をポップオーバーの初期選択にする
const AUTHOR_COLOR_HEX = { black: "#31333f", blue: "#1a73e8", red: "#d33" };
// 黒・青は「誰か」を表す名前を「設定」で自由に変えられる（例：黒=Tomo、青=Toko）。赤は「重要」固定。
const colorNames = { black: "自分", blue: "共有相手" };
function colorLabel(color) {
  return color === "red" ? "重要" : (colorNames[color] || color);
}
// サイドノートに「自分：」等の名前を表示するかどうか（色ごと。デフォルトは全色オフ＝表示しない。
// 色分けだけで足りる場合が多いため。サイドノート欄上部のチェックボックスで色ごとに切り替える）。
const showAuthorLabelByColor = { black: false, blue: false, red: false };

const debounce = (fn, ms) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};
const setStatus = (msg) => { saveStatusEl.textContent = msg || ""; };
const timestamp = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

// ---- ノート本文は簡易Markdown（**太字**と<u>下線</u>のみ許可） ----
function formatNoteText(raw) {
  const esc = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/&lt;u&gt;(.+?)&lt;\/u&gt;/g, "<u>$1</u>");
}

const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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

function sanitizeDocHtml(html) {
  if (typeof window.DOMPurify === "undefined") {
    // 同梱のvendor/dompurifyが何らかの理由で読み込めていない場合、無害化できないまま
    // innerHTMLへ入れる（＝対策が効かない）よりは読み込みそのものを拒否する方が安全（フェイルクローズ）。
    throw new Error("サニタイズ用ライブラリの読み込みに失敗しました。ページを再読み込みしてから、もう一度お試しください。");
  }
  return window.DOMPurify.sanitize(html, {
    ALLOWED_TAGS: DOC_HTML_ALLOWED_TAGS,
    ALLOWED_ATTR: DOC_HTML_ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: DOC_HTML_ALLOWED_URI,
    ALLOW_DATA_ATTR: true,   // data-anchor-id・data-para-id等、段落の状態を持たせるdata-*属性一式
  });
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
// 初回読み込み時もrenumberAndLayout()を呼んでおく（呼ばないとlayoutSidenotes()が一度も走らず、
// 注釈0件時のグレーアウトの見本カードが最初の入力までサイドに出ない）。
renumberAndLayout();
updateFormatToolbarState();
// Undo/Redo履歴の初回セットは、このファイルの一番最後（currentTheme等、後ろの方でlet宣言される
// 変数もserializeProject()が参照するため、それらの初期化が終わるのを待つ必要がある）で行う。

// ---- 保存・読み込み（.jsonファイル） ----
function projectTitle() {
  return titleInput.value.trim();
}

function serializeProject() {
  const base = {
    app: "sidenote",
    version: 2,
    title: projectTitle(),
    savedAt: new Date().toISOString(),
    mode: currentMode,
    notesByAnchor: Array.from(notesByAnchor.entries()),   // [anchorId, [{id,text,color}, ...]][]
    anchorIdSeq,
    replyIdSeq,
    colorNames: { ...colorNames },
    // 「項番設定」パネルの内容（見出しH1〜H3の見た目、項番の型ごとのインデント・ぶら下げ）も
    // 文書ごとの設定としてファイルに残す（無い旧ファイルはmergeXxxSettings側で既定値になる）。
    paraStyleSettings: JSON.parse(JSON.stringify(paraStyleSettings)),
    numberingSettings: JSON.parse(JSON.stringify(numberingSettings)),
    theme: currentTheme,
  };
  if (currentMode === "pdf") {
    // 元PDFをdata URLのまま内包する（画像を.jsonに内包しているのと同じ考え方）。
    return { ...base, pdfDataUrl: currentPdfDataUrl, pdfAnchors };
  }
  return { ...base, docHTML: doc.innerHTML, imageIdSeq, tableIdSeq, hrIdSeq };
}

async function applyProjectData(data) {
  if (!data) throw new Error("invalid project data");
  // 「項番設定」パネルの内容もこのファイルの値で上書きする（モードに関わらず共通、無ければ既定値）。
  paraStyleSettings = mergeParaStyleSettings(data.paraStyleSettings);
  numberingSettings = mergeNumberingSettings(data.numberingSettings);
  refreshStyleSettingInputs();
  refreshNumberingSettingInputs();
  updateFooterInfo();   // 見出しスタイル設定はファイルごとに変わるため、読み込み時にも反映する

  if (data.mode === "pdf") {
    if (typeof data.pdfDataUrl !== "string") throw new Error("invalid pdf project data");
    notesByAnchor.clear();
    if (Array.isArray(data.notesByAnchor)) data.notesByAnchor.forEach(([anchorId, notes]) => notesByAnchor.set(anchorId, notes || []));
    anchorIdSeq = typeof data.anchorIdSeq === "number" ? data.anchorIdSeq : notesByAnchor.size + 1;
    replyIdSeq = typeof data.replyIdSeq === "number" ? data.replyIdSeq : replyIdSeq;
    if (data.colorNames && data.colorNames.black) colorNames.black = data.colorNames.black;
    if (data.colorNames && data.colorNames.blue) colorNames.blue = data.colorNames.blue;
    updateColorSwatchLabels();
    titleInput.value = data.title || "";
    if (data.theme) applyTheme(data.theme);
    openedMdFilename = null;   // .jsonを開いた＝以後のCtrl+Sは.json保存に戻す
    openedMdFileHandle = null;
    updateOpenedFileNote();
    return renderPdfFromDataUrl(data.pdfDataUrl, Array.isArray(data.pdfAnchors) ? data.pdfAnchors : []);
  }

  if (typeof data.docHTML !== "string") throw new Error("invalid project data");
  setMode("text");
  doc.innerHTML = sanitizeDocHtml(data.docHTML);
  notesByAnchor.clear();

  if (Array.isArray(data.notesByAnchor)) {
    data.notesByAnchor.forEach(([anchorId, notes]) => notesByAnchor.set(anchorId, notes || []));
    anchorIdSeq = typeof data.anchorIdSeq === "number" ? data.anchorIdSeq : notesByAnchor.size + 1;
    replyIdSeq = typeof data.replyIdSeq === "number" ? data.replyIdSeq : replyIdSeq;
  } else if (Array.isArray(data.notes)) {
    // 旧形式（1範囲=1ノート、data-note-id属性）の.jsonとの後方互換。
    doc.querySelectorAll("[data-note-id]").forEach((el) => {
      el.dataset.anchorId = el.dataset.noteId;
      el.removeAttribute("data-note-id");
    });
    data.notes.forEach(([anchorId, text]) => {
      notesByAnchor.set(anchorId, [{ id: "r" + replyIdSeq++, text, color: "black" }]);
    });
    anchorIdSeq = typeof data.noteIdSeq === "number" ? data.noteIdSeq : notesByAnchor.size + 1;
  }

  imageIdSeq = typeof data.imageIdSeq === "number" ? data.imageIdSeq : doc.querySelectorAll(".para-image").length + 1;
  tableIdSeq = typeof data.tableIdSeq === "number" ? data.tableIdSeq : doc.querySelectorAll(".para-table").length + 1;
  hrIdSeq = typeof data.hrIdSeq === "number" ? data.hrIdSeq : doc.querySelectorAll(".para-hr").length + 1;
  if (data.colorNames && data.colorNames.black) colorNames.black = data.colorNames.black;
  if (data.colorNames && data.colorNames.blue) colorNames.blue = data.colorNames.blue;
  updateColorSwatchLabels();
  titleInput.value = data.title || "";
  if (data.theme) applyTheme(data.theme);
  // innerHTMLの再代入で各ブロックのボタン等のイベントリスナーは失われるため、必ず再バインドする。
  doc.querySelectorAll(".para-image").forEach(bindImageParaEvents);
  doc.querySelectorAll(".para-table").forEach(bindTableParaEvents);
  doc.querySelectorAll(".para-hr").forEach(bindHrParaEvents);
  doc.querySelectorAll(".para-pagebreak").forEach(bindPageBreakParaEvents);
  // 配置・インデント・ぶら下げ・スタイルはdocHTMLに焼き込まれたインラインstyleでそのまま復元されるが、
  // 旧バージョン・手編集されたファイル等でdata属性だけがありstyleが伴わない場合に備え、念のため再計算する。
  applyParaStyles(Array.from(doc.querySelectorAll(".para:not(.para-opaque)")));
  renumberAndLayout();
  updatePlaceholder();
  updateFormatToolbarState();
}

// ファイル名に使えない文字を落とすだけの軽いサニタイズ（Windows/Mac共通のNG文字を除外）。
const sanitizeFilename = (s) => s.replace(/[\\/:*?"<>|]/g, "_");

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

saveBtn.onclick = () => {
  const data = serializeProject();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const namePart = projectTitle() ? `-${sanitizeFilename(projectTitle())}` : "";
  const filename = `sidenote${namePart}-${timestamp()}.json`;
  downloadBlob(blob, filename);
  setStatus(`保存しました：${filename}`);
};

// ---- .mdとして書き出す（本文DOM → Markdownテキストへの逆変換） ----
// 対応関係はmd-parser.jsのinlineToHtml／app.jsのbuildBlockEl系と鏡写し。注釈（note-anchor）は
// 引用元のプレーンテキストだけを書き出し、注釈そのもの（コメント・色）はMarkdownに表現できないため
// 含めない（印刷用のbuildPrintNodeと同じ考え方）。CommonMark完全準拠は狙わない。
// Bはブラウザ標準のexecCommand("bold")（本文でのCtrl+B）が作るタグ。STRONGと同じ**扱いにする
// （2026-09-13、本文へのCtrl+B対応で追加。無いと.md書き出しで太字が消える）。
const MD_INLINE_WRAP = { STRONG: "**", B: "**", EM: "*", DEL: "~~", CODE: "`" };
function inlineNodeToMarkdown(node) {
  // ゼロ幅スペース(U+200B)は箇条書きマーカー直後の入力安定化のための内部的な目印（insertBulletMarker
  // 参照）で、書き出しには含めない。
  if (node.nodeType === Node.TEXT_NODE) return node.textContent.replace(/​/g, "");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  if (node.tagName === "BR") return "\n";
  if (node.classList && node.classList.contains("note-anchor")) {
    return node.querySelector("span")?.textContent || "";
  }
  const childText = () => Array.from(node.childNodes).map(inlineNodeToMarkdown).join("");
  if (node.tagName === "A") {
    const href = node.getAttribute("href") || "";
    return `[${childText()}](${href})`;
  }
  if (node.tagName === "U") return `<u>${childText()}</u>`;
  const wrap = MD_INLINE_WRAP[node.tagName];
  return wrap ? `${wrap}${childText()}${wrap}` : childText();
}
// li-marker（• / 1. のバッジ）はp本文ではないため、変換対象から除外する。
function paraInlineToMarkdown(paraEl) {
  return Array.from(paraEl.childNodes)
    .filter((n) => !(n.nodeType === 1 && n.classList && n.classList.contains("li-marker")))
    .map(inlineNodeToMarkdown)
    .join("")
    .trim();
}

function tableRowToMarkdown(cells) {
  return `| ${cells.map((c) => c.replace(/\|/g, "\\|")).join(" | ")} |`;
}

// 1ブロック（.para系要素）→ Markdown文字列（前後の空行は呼び出し側で調整する）。
function blockParaToMarkdown(paraEl) {
  if (paraEl.classList.contains("para-image")) {
    const img = paraEl.querySelector(".para-image-img");
    return { type: "image", text: `![](${img ? img.src : ""})` };
  }
  if (paraEl.classList.contains("para-hr")) return { type: "hr", text: "---" };
  if (paraEl.classList.contains("para-pagebreak")) return { type: "pagebreak", text: "<!-- pagebreak -->" };
  if (paraEl.classList.contains("para-table")) {
    const table = paraEl.querySelector(".para-table-el");
    const rows = table ? Array.from(table.rows).map((tr) =>
      Array.from(tr.cells).map((cell) => paraInlineToMarkdown(cell))) : [];
    if (!rows.length) return { type: "table", text: "" };
    const [header, ...body] = rows;
    const aligns = table ? Array.from(table.rows[0].cells).map((cell) => cell.style.textAlign || "") : [];
    const sepCell = (a) => (a === "center" ? ":---:" : a === "right" ? "---:" : a === "left" ? ":---" : "---");
    const lines = [
      tableRowToMarkdown(header),
      tableRowToMarkdown(header.map((_, i) => sepCell(aligns[i]))),
      ...body.map(tableRowToMarkdown),
    ];
    return { type: "table", text: lines.join("\n") };
  }
  if (paraEl.classList.contains("para-li")) {
    const markerText = (paraEl.querySelector(".li-marker")?.textContent || "").trim();
    const orderedMatch = markerText.match(/^(\d+)\./);
    const indent = "  ".repeat(Number(paraEl.dataset.indentLevel || 0));
    const prefix = orderedMatch ? `${orderedMatch[1]}. ` : "- ";
    return { type: "li", text: `${indent}${prefix}${paraInlineToMarkdown(paraEl)}` };
  }
  // 見出しは2通りありうる：Markdown取り込み由来の.para-hNクラス（h1〜h6）と、書式ツールバーの
  // 「スタイル」ボタン（配置・インデントと同じdata-style属性、h1〜h3のみ）。後者はこれまでこの
  // 判定に含まれておらず、ツールバーでH1〜H3にした段落が.md書き出しで#の付かないただの段落に
  // なってしまっていた（2026-09指摘）。data-styleを優先し、無ければクラスを見る。
  const styleLevel = /^h([1-3])$/.exec(paraEl.dataset.style || "");
  const hClassMatch = paraEl.className.match(/\bpara-h([1-6])\b/);
  const hLevel = styleLevel ? Number(styleLevel[1]) : (hClassMatch ? Number(hClassMatch[1]) : null);
  if (hLevel) return { type: "heading", text: `${"#".repeat(hLevel)} ${paraInlineToMarkdown(paraEl)}` };
  if (paraEl.classList.contains("para-quote")) return { type: "blockquote", text: `> ${paraInlineToMarkdown(paraEl)}` };
  if (paraEl.classList.contains("para-code")) return { type: "code", text: "```\n" + paraEl.textContent + "\n```" };
  return { type: "paragraph", text: paraInlineToMarkdown(paraEl) };
}

// 空段落（見た目の余白調整用。取り込み時にbuildMarkdownBlocksFragmentが入れる1行ぶんの空行など）は
// 内容を持たないので読み飛ばす。ブロック同士の空行は、取り込み側(SELF_SPACING_TYPES)と対称になるよう
// ここで組み立て直す（li同士・画像/表/水平線が絡む境界には空行を入れない）。
function docToMarkdown() {
  const blocks = Array.from(doc.children)
    .filter((el) => el.classList && el.classList.contains("para"))
    .map(blockParaToMarkdown)
    .filter((b) => b.text !== "" || b.type === "hr");

  // ファイル名（タイトル欄）を本文の先頭に「# 」見出しとして足すことはしない（2026-09指定）。以前は
  // 本文の先頭が見出しでない時に「# ファイル名」を自動で付けていたため、mdを開いてCtrl+S（元ファイルへ
  // 上書き）／「MDで書き出す」をするたび、元のmdの先頭にファイル名のH1が勝手に増え、次に開くと本文の
  // H1になっていた。タイトル欄は保存名（.json/.md/.docx）に使うだけで、書き出す本文は本文のまま。
  const lines = [];

  blocks.forEach((b, i) => {
    lines.push(b.text);
    const next = blocks[i + 1];
    if (next && !(b.type === "li" && next.type === "li") &&
        !SELF_SPACING_TYPES.has(b.type) && !SELF_SPACING_TYPES.has(next.type)) {
      lines.push("");
    }
  });

  return lines.join("\n");
}

// openedMdFileHandleへ直接書き込む（対応ブラウザでファイルを開いている場合のみ呼ばれる）。
// write権限は初回リクエスト時に小さな許可UIが出ることがあるが、許可済みなら再度は出ない。
async function writeTextToFileHandle(handle, text) {
  if ((await handle.queryPermission({ mode: "readwrite" })) !== "granted") {
    if ((await handle.requestPermission({ mode: "readwrite" })) !== "granted") {
      throw new Error("readwrite permission denied");
    }
  }
  const writable = await handle.createWritable();
  await writable.write(text);
  await writable.close();
}

// 「.md」ボタン／Ctrl+Sの実体。openedMdFileHandleがあれば元のファイルへ直接上書きし、
// 無ければ（非対応ブラウザ、または.md以外から始めた場合）従来通りダウンロードで保存する。
async function saveMarkdown() {
  const text = docToMarkdown();
  const namePart = projectTitle() ? `-${sanitizeFilename(projectTitle())}` : "";
  const filename = openedMdFilename || `sidenote${namePart}-${timestamp()}.md`;

  if (openedMdFileHandle) {
    try {
      await writeTextToFileHandle(openedMdFileHandle, text);
      setStatus(`上書き保存：${filename}`);
      return;
    } catch (err) {
      console.error(err);
      setStatus(`${filename}への上書きに失敗したため、ダウンロードで保存します。`);
      openedMdFileHandle = null;   // ハンドルが無効化された可能性があるため、以後は安全にダウンロード保存へ戻す
    }
  }
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, filename);
  setStatus(`書き出しました：${filename}`);
}

saveMdBtn.onclick = () => { saveMarkdown(); };

// Ctrl+S（Macはcmd+S）はブラウザ標準の「ページを保存」を横取りする。直前に.md/.markdown/.txtを
// 開いていれば「MDで書き出す」（同じファイル名＝実質の上書き）、それ以外は従来通り「保存」(.json)。
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    if (openedMdFilename) saveMdBtn.click(); else saveBtn.click();
  }
});

// ---- .docxとして書き出す（本文DOM → Wordファイルへの変換） ----
// .mdと同じくDOMを1段落＝1ブロックとして歩くが、こちらはMarkdown文字列ではなくvendor/docx
// （THIRD_PARTY_NOTICES.md参照。<script>で先読みし、グローバルwindow.docxとして触れる）の
// Paragraph/TextRunを組み立てて実際に.docxのバイト列を生成する。
// .mdでは表現できなかった2点をここでは実物に近い形で再現する：
//   ・傍点 → Wordの圏点（w:em、TextRunのemphasisMark）
//   ・サイドノート（.note-anchor） → Wordのコメント機能（引用範囲にCommentRangeStart/Endでアンカーし、
//     複数返信は1つのコメント本文にまとめる）
// 一方、画像・表に付いたノート（img-note-anchor/tbl-note-anchor）はWordコメントのアンカー先が
// 図表そのものになり実装コストに見合わないため、簡略化して本文中に「［サイドノート］」の段落として
// 差し込むだけにする（sideNoteFallbackParagraph参照）。
const DOCX_INDENT_TWIP_PER_LEVEL = 240;   // 全角1文字≒12pt≒240twip（本文12pt想定。INDENT_STEP_EMのdocx版）
const DOCX_MONO_FONT = "JetBrains Mono";
const DOCX_MAX_IMAGE_PX = 550;   // A4・1インチ余白の版面幅(約560pt)に収まる程度の上限

function docxStripMarkup(raw) {
  return String(raw || "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/<u>(.+?)<\/u>/g, "$1");
}

function docxImageType(dataUrl) {
  const m = /^data:image\/([a-zA-Z0-9.+-]+);base64,/.exec(dataUrl || "");
  if (!m) return null;
  const sub = m[1].toLowerCase() === "jpeg" ? "jpg" : m[1].toLowerCase();
  return ["png", "jpg", "gif", "bmp"].includes(sub) ? sub : "png";   // svg等の非対応形式はpngとして扱う（既知の簡略化）
}

// paraEl.dataset.style（H1〜H3）とMarkdown取り込み由来の.para-hNクラス（h1〜h6）の両方を見るのは
// blockParaToMarkdownのheadingLevel判定と同じ理由（app.js内、docToMarkdown参照）。
function docxHeadingLevel(paraEl, HeadingLevel) {
  const styleLevel = /^h([1-3])$/.exec(paraEl.dataset.style || "");
  const hClassMatch = paraEl.className.match(/\bpara-h([1-6])\b/);
  const n = styleLevel ? Number(styleLevel[1]) : (hClassMatch ? Number(hClassMatch[1]) : null);
  return n ? HeadingLevel["HEADING_" + n] : null;
}

async function buildDocxBlob() {
  if (!window.docx) throw new Error("docxライブラリが読み込めていません。ページを再読み込みしてください。");
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, WidthType, PageBreak, LineRuleType,
    EmphasisMarkType, ImageRun, Table, TableRow, TableCell, ExternalHyperlink,
    CommentRangeStart, CommentRangeEnd, CommentReference,
  } = window.docx;

  function makeTextRun(text, marks) {
    return new TextRun({
      text,
      bold: !!marks.bold,
      italics: !!marks.italics,
      strike: !!marks.strike,
      underline: marks.underline ? {} : undefined,
      emphasisMark: marks.kenten ? { type: EmphasisMarkType.DOT } : undefined,
      font: marks.mono ? DOCX_MONO_FONT : undefined,
      style: marks.link ? "Hyperlink" : undefined,
      size: marks.sizePt ? marks.sizePt * 2 : undefined,   // docxのsizeは half-point 単位
    });
  }

  // #doc内の1インライン要素をdocxのTextRun/ExternalHyperlink等へ再帰変換し、outへ積む。
  // .note-anchorに実際の返信（notesByAnchor）が付いている場合だけWordコメントとしてアンカーし、
  // 内容を持たない（未使用）アンカーはただの引用文として素通しする。
  function collectInlineRuns(node, marks, out, comments) {
    if (node.nodeType === Node.TEXT_NODE) {
      // ゼロ幅スペース(U+200B)は箇条書きマーカー直後の入力安定化のための内部的な目印
      // （insertBulletMarker参照）で、書き出しには含めない。
      const text = node.textContent.replace(/​/g, "");
      if (text) out.push(makeTextRun(text, marks));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName === "BR") { out.push(new TextRun({ text: "", break: 1 })); return; }
    if (node.classList.contains("li-marker")) return;   // 行頭バッジは本文ではないので除外（.md書き出しと同じ）
    if (node.classList.contains("note-anchor")) {
      const notes = notesByAnchor.get(node.dataset.anchorId) || [];
      const quoteSpan = node.querySelector("span");
      const walkQuote = (target) => { if (quoteSpan) Array.from(quoteSpan.childNodes).forEach((c) => collectInlineRuns(c, marks, target, comments)); };
      if (notes.length) {
        const commentId = comments.length;
        out.push(new CommentRangeStart(commentId));
        walkQuote(out);
        out.push(new CommentRangeEnd(commentId));
        out.push(new TextRun({ children: [new CommentReference(commentId)] }));
        comments.push(notes);
      } else {
        walkQuote(out);
      }
      return;
    }
    if (node.classList.contains("kenten")) {
      Array.from(node.childNodes).forEach((c) => collectInlineRuns(c, { ...marks, kenten: true }, out, comments));
      return;
    }
    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      const innerRuns = [];
      Array.from(node.childNodes).forEach((c) => collectInlineRuns(c, { ...marks, link: true }, innerRuns, comments));
      out.push(new ExternalHyperlink({ link: href, children: innerRuns }));
      return;
    }
    const next = { ...marks };
    if (node.tagName === "STRONG" || node.tagName === "B") next.bold = true;
    if (node.tagName === "U") next.underline = true;
    if (node.tagName === "EM" || node.tagName === "I") next.italics = true;
    if (node.tagName === "DEL") next.strike = true;
    if (node.tagName === "CODE") next.mono = true;
    Array.from(node.childNodes).forEach((c) => collectInlineRuns(c, next, out, comments));
  }

  // 画像・表に付いたノート（本文アンカーと違いWordコメントとして図表そのものに刺すのは実装コストに
  // 見合わないため簡略化）を、本文中の小さな段落として差し込む。
  function sideNoteFallbackParagraph(notes) {
    const text = notes.map((n) => `${colorLabel(n.color)}：${docxStripMarkup(n.text)}`).join("／");
    return new Paragraph({ children: [new TextRun({ text: `［サイドノート］${text}`, italics: true, color: "666666", size: 20 })] });
  }

  function imageBlockToDocx(paraEl, comments) {
    const out = [];
    const img = paraEl.querySelector(".para-image-img");
    const type = img && docxImageType(img.src);
    if (img && type) {
      let w = img.naturalWidth || 300, h = img.naturalHeight || 200;
      if (w > DOCX_MAX_IMAGE_PX) { h = Math.round((h * DOCX_MAX_IMAGE_PX) / w); w = DOCX_MAX_IMAGE_PX; }
      out.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ type, data: img.src, transformation: { width: w, height: h } })],
      }));
    }
    const notes = notesByAnchor.get(paraEl.dataset.paraId) || [];
    if (notes.length) out.push(sideNoteFallbackParagraph(notes));
    return out;
  }

  function tableBlockToDocx(paraEl, comments) {
    const out = [];
    const tableEl = paraEl.querySelector(".para-table-el");
    if (tableEl) {
      const rows = Array.from(tableEl.rows).map((tr) => new TableRow({
        children: Array.from(tr.cells).map((cell) => {
          const runs = [];
          Array.from(cell.childNodes).forEach((c) => collectInlineRuns(c, {}, runs, comments));
          if (!runs.length) runs.push(new TextRun(""));
          return new TableCell({ children: [new Paragraph({ children: runs })] });
        }),
      }));
      // 列幅（columnWidths）を明示しないとgridColが既定の小さい値のまま残り、width指定(100%)と
      // 食い違って表示が崩れることがあるビューアがあるため、A4・1インチ余白の版面幅を均等割りする。
      const colCount = tableEl.rows[0] ? tableEl.rows[0].cells.length : 0;
      const columnWidths = colCount ? Array(colCount).fill(Math.floor(9026 / colCount)) : undefined;
      if (rows.length) out.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths }));
    }
    const notes = notesByAnchor.get(paraEl.dataset.paraId) || [];
    if (notes.length) out.push(sideNoteFallbackParagraph(notes));
    return out;
  }

  function blockToDocx(paraEl, comments) {
    if (paraEl.classList.contains("para-image")) return imageBlockToDocx(paraEl, comments);
    if (paraEl.classList.contains("para-table")) return tableBlockToDocx(paraEl, comments);
    if (paraEl.classList.contains("para-pagebreak")) {
      if (isTrailingPageBreak(paraEl)) return [];   // 後ろに中身が無い末尾の改ページは、白紙ページになるだけなので出さない
      // 改ページ記号だけの段落。改ページの後ろに残る段落記号ぶんの空行が次のページの先頭に出ないよう、
      // 行の高さを1pt（20twip）に固定して前後の余白も0にする。
      return [new Paragraph({ spacing: { before: 0, after: 0, line: 20, lineRule: LineRuleType.EXACT }, children: [new PageBreak()] })];
    }
    if (paraEl.classList.contains("para-hr")) {
      return [new Paragraph({ border: { bottom: { color: "999999", space: 4, style: BorderStyle.SINGLE, size: 6 } } })];
    }

    const heading = docxHeadingLevel(paraEl, HeadingLevel);
    const styleLook = heading ? paraStyleSettings[paraEl.dataset.style] : null;
    const baseMarks = {};
    if (styleLook && styleLook.bold) baseMarks.bold = true;
    // 書式ツールバーの「文字サイズ」で個別指定した段落は、見出しの既定サイズより優先する（applyParaStylesと同じ）。
    if (paraEl.dataset.fontSizePt) baseMarks.sizePt = Number(paraEl.dataset.fontSizePt);
    else if (styleLook && styleLook.fontSizePt) baseMarks.sizePt = styleLook.fontSizePt;
    if (paraEl.classList.contains("para-code")) baseMarks.mono = true;

    const runs = [];
    Array.from(paraEl.childNodes).forEach((c) => collectInlineRuns(c, baseMarks, runs, comments));
    if (!runs.length) runs.push(new TextRun(""));

    const alignment = paraEl.dataset.align === "center" ? AlignmentType.CENTER
      : paraEl.dataset.align === "right" ? AlignmentType.RIGHT : undefined;

    if (paraEl.classList.contains("para-li")) {
      const level = Number(paraEl.dataset.indentLevel || 0);
      const markerText = (paraEl.querySelector(".li-marker")?.textContent || "").trim();
      return [new Paragraph({
        alignment,
        indent: { left: (level + 1) * DOCX_INDENT_TWIP_PER_LEVEL, hanging: DOCX_INDENT_TWIP_PER_LEVEL },
        children: [new TextRun(markerText ? `${markerText} ` : ""), ...runs],
      })];
    }
    if (paraEl.classList.contains("para-quote")) {
      return [new Paragraph({ alignment, indent: { left: DOCX_INDENT_TWIP_PER_LEVEL }, children: runs })];
    }

    const indentLevel = Number(paraEl.dataset.indentLevel || 0);
    const hangingChars = Number(paraEl.dataset.hanging || 0);
    const indent = (indentLevel || hangingChars) ? {
      left: indentLevel * DOCX_INDENT_TWIP_PER_LEVEL + hangingChars * DOCX_INDENT_TWIP_PER_LEVEL,
      hanging: hangingChars ? hangingChars * DOCX_INDENT_TWIP_PER_LEVEL : undefined,
    } : undefined;
    return [new Paragraph({ heading: heading || undefined, alignment, indent, children: runs })];
  }

  const comments = [];   // [[{id,text,color}, ...], ...]（インデックス＝Wordコメントid）
  const paragraphs = [];
  const title = projectTitle();
  if (title) paragraphs.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(title)] }));
  Array.from(doc.children)
    .filter((el) => el.classList && el.classList.contains("para"))
    .forEach((paraEl) => { blockToDocx(paraEl, comments).forEach((b) => paragraphs.push(b)); });

  const docxDoc = new Document({
    styles: { default: { document: { run: { font: "游明朝", size: 24 } } } },   // 本文12pt・游明朝を既定に（テーマごとのフォントは反映しない簡略化）
    comments: {
      children: comments.map((notes, id) => ({
        id,
        author: notes.length === 1 ? colorLabel(notes[0].color) : "サイドノート",
        initials: "SN",
        date: new Date(),
        children: notes.map((n) => new Paragraph({
          children: [
            new TextRun({ text: `${colorLabel(n.color)}：`, bold: true }),
            new TextRun({ text: docxStripMarkup(n.text) }),
          ],
        })),
      })),
    },
    sections: [{ children: paragraphs }],
  });
  return Packer.toBlob(docxDoc);
}

saveDocxBtn.onclick = async () => {
  try {
    setStatus("Wordファイルを作成中…");
    const blob = await buildDocxBlob();
    const namePart = projectTitle() ? `-${sanitizeFilename(projectTitle())}` : "";
    const filename = `sidenote${namePart}-${timestamp()}.docx`;
    downloadBlob(blob, filename);
    setStatus(`書き出しました：${filename}`);
  } catch (err) {
    console.error(err);
    setStatus("Wordファイルの作成に失敗しました。");
  }
};

// ---- A4 PDF化（ブラウザの印刷機能を使う）----
// 独自にPDFを組み立てるのではなく、印刷用CSSを当てた#printDocをブラウザの印刷（→PDFに保存）に渡す方式。
// サイドノートは段落を分割せず、注釈の直後にインラインで埋め込んだ上でfloat:right＋マイナスマージンにより
// 段落の右の余白へ逃がす（Tufte CSSとして知られる余白注釈の定番手法）。ページをまたぐレイアウトでは
// 絶対座標（画面と同じ方式）が使えないため、float方式を使う。

// #doc内のノードをprintDoc用のDOMへ再帰的に組み立てる。
// Bはブラウザ標準のexecCommand("bold")（本文でのCtrl+B）が作るタグ。STRONGと同じ扱いにする
// （2026-09-13、本文へのCtrl+B対応で追加。無いとPDF書き出しで太字が消える）。
const PRINT_INLINE_TAG_MAP = { STRONG: "strong", B: "strong", U: "u", EM: "em", CODE: "code", DEL: "del" };
function buildPrintNode(node) {
  // ゼロ幅スペース(U+200B)は箇条書きマーカー直後の入力安定化のための内部的な目印（insertBulletMarker
  // 参照）で、印刷（PDF化）には含めない。
  if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent.replace(/​/g, ""));
  if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();
  if (node.tagName === "BR") return document.createElement("br");
  if (node.classList && node.classList.contains("note-anchor")) {
    const frag = document.createDocumentFragment();
    const quoted = node.querySelector("span")?.textContent || "";
    frag.appendChild(document.createTextNode(quoted));
    const num = node.querySelector(".note-num")?.textContent;
    if (num) {
      const sup = document.createElement("sup");
      sup.textContent = num;
      frag.appendChild(sup);
      // サイドノート本文を、対応する一文のすぐ後ろにインラインで埋め込む。段落を分割しないため、
      // ここに差し込んでもテキストの流れは途切れない（見た目はCSS側のfloatが担当する）。
      const notes = notesByAnchor.get(node.dataset.anchorId) || [];
      if (notes.length) frag.appendChild(buildPrintAsideEl(num, notes));
    }
    return frag;
  }
  // 傍点（.kenten）はexecCommandではなく独自のspanなので、クラスごと複製して印刷側でも
  // 同じCSS（text-emphasis-style）が当たるようにする（sidenote-pdf-docから移植）。
  if (node.classList && node.classList.contains("kenten")) {
    const span = document.createElement("span");
    span.className = "kenten";
    Array.from(node.childNodes).forEach((child) => span.appendChild(buildPrintNode(child)));
    return span;
  }
  // 箇条書き・番号付きのマーカー（.li-marker）。素のテキストのまま出すと「• 」の幅が1emより狭く、1行目の
  // 本文だけ折り返し行（padding-left:1em）より数px左に寄ってしまう（画面と同じ問題）。画面と同じく
  // 1em幅の箱に入れて頭を揃える（style.cssの.print-li-marker参照）。
  if (node.classList && node.classList.contains("li-marker")) {
    const span = document.createElement("span");
    span.className = "print-li-marker";
    span.textContent = node.textContent;
    return span;
  }
  if (node.tagName === "A") {
    const a = document.createElement("a");
    a.href = node.getAttribute("href") || "#";
    Array.from(node.childNodes).forEach((child) => a.appendChild(buildPrintNode(child)));
    return a;
  }
  const wrapTag = PRINT_INLINE_TAG_MAP[node.tagName] || null;
  const container = wrapTag ? document.createElement(wrapTag) : document.createDocumentFragment();
  Array.from(node.childNodes).forEach((child) => container.appendChild(buildPrintNode(child)));
  return container;
}

function buildPrintAsideEl(num, notes) {
  const aside = document.createElement("aside");
  aside.className = "print-aside";
  const sup = document.createElement("sup");
  sup.textContent = num;
  aside.appendChild(sup);
  aside.appendChild(document.createTextNode(" "));
  notes.forEach((note, i) => {
    if (i > 0) aside.appendChild(document.createElement("br"));
    if (showAuthorLabelByColor[note.color]) {
      const strong = document.createElement("strong");
      strong.textContent = `${colorLabel(note.color)}：`;
      aside.appendChild(strong);
    }
    const span = document.createElement("span");
    span.style.color = AUTHOR_COLOR_HEX[note.color] || AUTHOR_COLOR_HEX.black;
    span.innerHTML = formatNoteText(note.text);
    aside.appendChild(span);
  });
  return aside;
}

// 段落は分割せず1つの要素のまま保つ（注釈のサイドノートはbuildPrintNode内で対応する一文の
// 直後にインラインで埋め込み済み。見た目の位置はCSS側のfloatが担当する）。
// 見出し・引用・コードブロックは専用タグ（h1〜h6/blockquote/pre）で出力し、それ以外
// （プレーン段落・リスト項目）は従来通り<p class="print-para">のままにする。
function buildPrintPara(paraEl) {
  const level = Number(paraEl.dataset.indentLevel || 0);
  const hangingChars = Number(paraEl.dataset.hanging || 0);
  const base = level * INDENT_STEP_EM;

  const hMatch = paraEl.className.match(/\bpara-h([1-6])\b/);
  const isQuote = paraEl.classList.contains("para-quote");
  const isCode = paraEl.classList.contains("para-code");
  const tag = hMatch ? `h${hMatch[1]}` : isCode ? "pre" : isQuote ? "blockquote" : "p";
  const el = document.createElement(tag);
  el.className = hMatch ? `print-h${hMatch[1]}` : isCode ? "print-code" : isQuote ? "print-quote" : "print-para";
  // リスト項目（.para-li）は画面と同じく項目間を詰めたいので、印刷側だけ余白を打ち消す目印を足す
  // （style.cssの.print-li参照。2026-09、段落間の余白を空段落からmarginへ変えたのに合わせて追加）。
  if (paraEl.classList.contains("para-li")) el.classList.add("print-li");
  if (level > 0 || hangingChars > 0) {
    el.style.paddingLeft = `${base + hangingChars * HANGING_CHAR_EM}em`;
    el.style.textIndent = hangingChars > 0 ? `-${hangingChars * HANGING_CHAR_EM}em` : "0";
  }
  // 配置・スタイルも画面（#doc）側の書式ツールバーで付けたdata属性をそのまま踏襲する
  // （スタイルの実際の見た目＝文字サイズ・太字は「項番設定」パネルのparaStyleSettingsから引く。
  //   sidenote-pdf-docから移植）。
  if (paraEl.dataset.align) el.style.textAlign = paraEl.dataset.align;
  const styleLook = paraStyleSettings[paraEl.dataset.style];
  // 書式ツールバーの「文字サイズ」で個別指定した段落は、見出しの既定サイズより優先する（applyParaStylesと同じ）。
  if (paraEl.dataset.fontSizePt) el.style.fontSize = `${paraEl.dataset.fontSizePt}pt`;
  else if (styleLook && styleLook.fontSizePt) el.style.fontSize = `${styleLook.fontSizePt}pt`;
  if (styleLook && styleLook.bold) el.style.fontWeight = "700";
  Array.from(paraEl.childNodes).forEach((n) => el.appendChild(buildPrintNode(n)));
  return el;
}

// 文書の末尾・改ページの直前（＝節の末尾）に並ぶ空の段落は、後ろに何も続かず見た目に効かないので、印刷版面から外す。
// 残すと、ページがほぼ埋まっている時に空段落だけが次のページへ押し出されて、白紙のページが1枚できてしまう
// （末尾が図のmdを取り込むと、編集用の空段落が付く。本文が大きい「2段組」で発生）。文書の途中の空行は、
// ユーザーが打った余白なのでそのまま残す。
function trimPrintSectionEndings() {
  const isEmptyPara = (el) => el.classList.contains("print-para") && !el.querySelector("img, table, hr, .print-aside") &&
    el.textContent.replace(/\u200b/g, "").trim() === "";
  let endsSection = true;   // 直後が「文書の終わり」「改ページ」「すでに外した空段落」なら、この要素は節の末尾
  Array.from(printDocEl.children).reverse().forEach((el) => {
    if (el.classList.contains("print-pagebreak")) { endsSection = true; return; }
    if (endsSection && isEmptyPara(el)) { el.remove(); return; }
    endsSection = false;
  });
}

function buildPrintDoc() {
  printDocEl.innerHTML = "";

  // PDFの先頭には、ファイル名（タイトル欄）を出さない（2026-09指定。以前は先頭に太字で印字していた）。
  // タイトル欄は.json/.md/.docxの保存名などに使うだけで、印刷（PDF化）には含めない。

  Array.from(doc.children).forEach((child) => {
    if (!child.classList || !child.classList.contains("para")) return;

    if (child.classList.contains("para-image")) {
      const imgEl = child.querySelector(".para-image-img");
      const printImg = document.createElement("img");
      printImg.className = "print-img";
      printImg.src = imgEl.src;
      printDocEl.appendChild(printImg);

      const badge = child.querySelector(".note-anchor");
      const num = badge?.querySelector(".note-num")?.textContent;
      const notes = badge ? notesByAnchor.get(badge.dataset.anchorId) || [] : [];
      if (num && notes.length) printDocEl.appendChild(buildPrintAsideEl(num, notes));
    } else if (child.classList.contains("para-table")) {
      const srcTable = child.querySelector(".para-table-el");
      if (srcTable) {
        const printTable = document.createElement("table");
        printTable.className = "print-table";
        printTable.innerHTML = srcTable.innerHTML;
        printDocEl.appendChild(printTable);
      }
      const badge = child.querySelector(".note-anchor");
      const num = badge?.querySelector(".note-num")?.textContent;
      const notes = badge ? notesByAnchor.get(badge.dataset.anchorId) || [] : [];
      if (num && notes.length) printDocEl.appendChild(buildPrintAsideEl(num, notes));
    } else if (child.classList.contains("para-hr")) {
      const hr = document.createElement("hr");
      hr.className = "print-hr";
      printDocEl.appendChild(hr);
    } else if (child.classList.contains("para-pagebreak")) {
      // 改ページ：高さ0の目印。ここから次のブロックは次のページの先頭から始まる（style.cssの.print-pagebreak参照）。
      if (isTrailingPageBreak(child)) return;   // 後ろに中身が無い末尾の改ページは、白紙ページになるだけなので出さない
      const pageBreakEl = document.createElement("div");
      pageBreakEl.className = "print-pagebreak";
      printDocEl.appendChild(pageBreakEl);
    } else {
      // buildPrintNode/buildPrintParaは再帰的なDOM構築のみ（複雑な分割ロジックは無い）なので
      // 通常は失敗しないはずだが、想定外の構造でも印刷全体が巻き添えで消えないよう、
      // 念のためこの段落だけの簡易フォールバック（注釈・書式は失われるがテキストだけは残す）を用意しておく。
      try {
        printDocEl.appendChild(buildPrintPara(child));
      } catch (err) {
        console.error("buildPrintPara failed, falling back for this paragraph:", err, child);
        const p = document.createElement("p");
        p.className = "print-para";
        p.textContent = child.textContent;
        printDocEl.appendChild(p);
      }
    }
  });

  trimPrintSectionEndings();

  // 左にfloatする画像・表・区切り線（と、その右隣のサイドノート）の直後に、高さ0の「フロート終了」の
  // 目印を置く。これが無いと、次の見出しの上の余白（margin-top）がfloatの高さに吸収されて、図の直下に
  // 見出しが密着してしまう（2026-09指摘：PDFの「６」の上）。詳しくはstyle.cssの.print-clear参照。
  printDocEl.querySelectorAll(":scope > .print-img, :scope > .print-table, :scope > .print-hr").forEach((floatEl) => {
    let last = floatEl;
    if (last.nextElementSibling && last.nextElementSibling.classList.contains("print-aside")) last = last.nextElementSibling;
    const clearEl = document.createElement("div");
    clearEl.className = "print-clear";
    last.insertAdjacentElement("afterend", clearEl);
  });

  // サイドノートが1件も無い文書は、右側のサイドノート欄（幅48mm）を使わないぶん本文を広く・大きく
  // 組む（本文12pt・幅170mm＝全角1行40字。CSS側のbody.print-active.no-sidenoteが対応。
  // Markdownモード中は画面（#doc）の1行もこれと同じ40字に揃える＝style.cssの--line-max参照）。
  document.body.classList.toggle("no-sidenote", notesByAnchor.size === 0);

  // 直後にwindow.print()（またはプレビュー用のクラス切り替え）が呼ばれる前に、大量のfloat要素を
  // 書き換えた後のレイアウトを強制的に確定させる（読み取りアクセスでリフローを強制する定番の手法）。
  void printDocEl.offsetHeight;
}

// モードに応じて#printDocの中身を組み立てる（本文モードは既存のbuildPrintDoc、pdfモードは
// このファイルの後半で定義するbuildPrintDocPdf。sidenote-pdf-docから移植）。
function buildPrintDocForCurrentMode() {
  if (currentMode === "pdf") { buildPrintDocPdf(); return; }
  buildPrintDoc();
}

// ---- 「.pdf」ボタン：カラー／白黒を選んでから印刷ダイアログを開く ----
// ボタンを押すと小さな選択パネル（#pdfColorPanel）が開き、「カラー」「白黒」のどちらかを選ぶとそのまま
// 印刷ダイアログ（保存先で「PDFに保存」を選ぶ）が開く。Chromeの印刷ダイアログの「カラー」設定は
// 「PDFに保存」では出ないため、色はこちらで決める。白黒は、画像を灰色の画像に変換し
// （convertPrintImagesToGray）、文字・線・番号の色を全て黒にする（style.cssの.print-bw）。
// 前回の選択はlocalStorageに覚えておき、パネルを開いた時にそれを濃く表示・フォーカスする
// （Enterで同じ選択を繰り返せる）。
const PDF_COLOR_KEY = "sidenote-pdf-color-v1";   // "color" | "bw"
let lastPdfColor = "color";
try { if (localStorage.getItem(PDF_COLOR_KEY) === "bw") lastPdfColor = "bw"; } catch (err) { /* noop */ }

// 画像（data URL）を輝度だけの灰色の画像に変換して、そのdata URLを返す。透過PNGは白地に敷いてから変換する
// （透明部分が黒く塗られないように）。元がJPEG（PDFモードのページ画像）ならJPEGのまま、それ以外はPNGで返す。
// CanvasのctxのfilterはSafariが未対応なので使わず、画素を直接計算する。
// 画像の読み込み完了を待つ。decode()は使わない（タブが裏に回っている間は解決せず、印刷が始まらなくなる）。
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}
async function grayscaleDataUrl(src) {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);   // 外部URLの画像だとここで例外になる（呼び出し側で握る）
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const g = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
    px[i] = px[i + 1] = px[i + 2] = g;
  }
  ctx.putImageData(data, 0, 0);
  return /^data:image\/jpe?g/i.test(src) ? canvas.toDataURL("image/jpeg", 0.92) : canvas.toDataURL("image/png");
}

// #printDoc内の画像（本文の画像ブロック・PDFモードのページ画像）を全て灰色にする。戻り値＝変換できなかった
// 画像の数（外部URLの画像など。その画像はカラーのまま残る）。
async function convertPrintImagesToGray() {
  let failed = 0;
  for (const img of Array.from(printDocEl.querySelectorAll("img"))) {
    try {
      const gray = await grayscaleDataUrl(img.src);
      await new Promise((resolve) => { img.onload = img.onerror = resolve; img.src = gray; });   // 差し替えた画像の読み込み完了まで待つ
    } catch (err) {
      console.error("grayscale failed for a print image:", err);
      failed++;
    }
  }
  return failed;
}

// 印刷版面を組み立て、白黒なら画像も灰色にして、印刷できる状態にする（.print-bwの付け外しもここ）。
// 戻り値＝白黒に変換できなかった画像の数。
async function preparePrintDoc(bw) {
  buildPrintDocForCurrentMode();
  const failed = bw ? await convertPrintImagesToGray() : 0;
  document.body.classList.toggle("print-bw", bw);
  return failed;
}

async function runPdfPrint(bw) {
  pdfColorPanel.hidden = true;
  lastPdfColor = bw ? "bw" : "color";
  try { localStorage.setItem(PDF_COLOR_KEY, lastPdfColor); } catch (err) { /* noop */ }
  try {
    const failed = await preparePrintDoc(bw);
    if (failed) setStatus(`${failed}枚の画像は白黒に変換できず、カラーのままです。`);
    document.body.classList.add("print-active");
    window.print();   // Chromeではこの呼び出しはダイアログが閉じるまでブロックするので、直後にクラスを外してよい
  } catch (err) {
    console.error("PDF print failed:", err);
    setStatus("PDF化の準備に失敗しました。");
  } finally {
    document.body.classList.remove("print-active", "print-bw");
  }
}

savePdfBtn.onclick = () => {
  toggleDropdownPanel(pdfColorPanel, savePdfBtn);
  if (pdfColorPanel.hidden) return;
  pdfColorBtn.classList.toggle("is-last", lastPdfColor === "color");
  pdfBwBtn.classList.toggle("is-last", lastPdfColor === "bw");
  (lastPdfColor === "bw" ? pdfBwBtn : pdfColorBtn).focus();
};
pdfColorBtn.onclick = () => runPdfPrint(false);
pdfBwBtn.onclick = () => runPdfPrint(true);
pdfColorClose.onclick = () => { pdfColorPanel.hidden = true; savePdfBtn.focus(); };
// パネルの外をクリックするかEscapeで閉じる（一時的な選択パネルなので、他のパネルと違い置きっぱなしにしない）。
document.addEventListener("mousedown", (e) => {
  if (pdfColorPanel.hidden || pdfColorPanel.contains(e.target) || savePdfBtn.contains(e.target)) return;
  pdfColorPanel.hidden = true;
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !pdfColorPanel.hidden) { pdfColorPanel.hidden = true; savePdfBtn.focus(); }
});

// デバッグ用：印刷版面をネイティブの印刷ダイアログを開かずに画面上でそのままプレビューする（Ctrl+Alt+P）。
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "p") {
    e.preventDefault();
    buildPrintDocForCurrentMode();
    document.body.classList.toggle("print-active");
  }
});

// ---- ファイルを開く（.json＝続きから編集／.md・.markdown・.txt＝Markdown取り込み） ----
// handleは File System Access API（showOpenFilePicker／ドラッグ＆ドロップのgetAsFileSystemHandle）
// で取得できた場合だけ渡される。.mdならそれをopenedMdFileHandleとして保持し、以後の保存で
// 元のファイルへ直接上書きできるようにする（<input type="file">からの場合はhandle省略＝null）。
function handleOpenedFile(file, handle = null) {
  const name = file.name || "";
  // .pdf＝既存PDFへの直接注釈モード（sidenote-pdf-docから移植）。「開く」経由の入り口として
  // ここでまとめて振り分ける（ボタンは増やさない方針は他の拡張子と同じ）。
  if (file.type === "application/pdf" || /\.pdf$/i.test(name)) {
    openPdfFile(file);
    return;
  }
  if (/\.(md|markdown|txt)$/i.test(name)) {
    const reader = new FileReader();
    reader.onload = () => {
      importMarkdownText(String(reader.result), name.replace(/\.(md|markdown|txt)$/i, ""));
      openedMdFilename = name;   // 「MDで書き出す」・Ctrl+Sで同じファイル名へ書き出すために覚えておく
      openedMdFileHandle = handle;
      updateOpenedFileNote();
    };
    reader.onerror = () => setStatus("読み込みに失敗しました。");
    reader.readAsText(file);
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      await applyProjectData(JSON.parse(String(reader.result)));
      initUndoHistory();
      setStatus("");   // .json読み込み成功時は表示なし（前回の保存結果等が残っていればここで消す）
    } catch (err) {
      console.error(err);
      setStatus("読み込みに失敗しました。ファイルが壊れているか、対応していない形式です。");
    }
  };
  reader.onerror = () => setStatus("読み込みに失敗しました。");
  reader.readAsText(file);
}

loadInput.onchange = (e) => {
  const file = e.target.files && e.target.files[0];
  loadInput.value = "";   // 同じファイルを続けて開き直せるようにリセット
  if (!file) return;
  handleOpenedFile(file);
};

// File System Access API対応ブラウザ（Chrome/Edge等）では、<input type="file">の既定のファイル選択
// ダイアログの代わりにshowOpenFilePicker()でファイルハンドルを取得する。これによりCtrl+S等で
// 元のファイルへ直接上書きできるようになる。非対応ブラウザ（Firefox/Safari等）では何もせず、
// <input type="file">の既定動作（従来どおりの読み込み・ダウンロード保存）のままにする。
if (window.showOpenFilePicker) {
  const openLabelEl = document.getElementById("openLabel");
  openLabelEl.addEventListener("click", async (e) => {
    e.preventDefault();   // <input type="file">の既定のファイル選択ダイアログを出さない
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: "Markdown / JSON / PDF",
          accept: {
            "text/markdown": [".md", ".markdown"],
            "text/plain": [".txt"],
            "application/json": [".json"],
            "application/pdf": [".pdf"],
          },
        }],
      });
      const file = await handle.getFile();
      handleOpenedFile(file, handle);
    } catch (err) {
      if (err?.name !== "AbortError") {   // ピッカーの「キャンセル」はエラー扱いしない
        console.error(err);
        setStatus("ファイルを開けませんでした。");
      }
    }
  });
}

// ---- ドラッグ＆ドロップで.md/.jsonを開く（画像ファイルは既存のペーストと同じ扱いで画像ブロックに） ----
["dragover", "dragenter"].forEach((evt) => {
  docLeftEl.addEventListener(evt, (e) => {
    if (!Array.from(e.dataTransfer?.types || []).includes("Files")) return;
    e.preventDefault();
    docLeftEl.classList.add("drag-over");
  });
});
["dragleave", "dragend"].forEach((evt) => {
  docLeftEl.addEventListener(evt, () => docLeftEl.classList.remove("drag-over"));
});
docLeftEl.addEventListener("drop", async (e) => {
  docLeftEl.classList.remove("drag-over");
  const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (!file) return;
  e.preventDefault();
  if (file.type && file.type.startsWith("image/")) {
    insertImageBlock(file);
    return;
  }
  // 「開く」ボタンと同じく、対応ブラウザではドロップされたアイテムからもファイルハンドルを取得する
  // （取れればCtrl+S等で元のファイルへ直接上書きできる。取れない場合はhandleがnullのまま＝従来通り）。
  let handle = null;
  const item = e.dataTransfer.items && e.dataTransfer.items[0];
  if (item && typeof item.getAsFileSystemHandle === "function") {
    try { handle = await item.getAsFileSystemHandle(); } catch (err) { handle = null; }
  }
  handleOpenedFile(file, handle);
});

// ---- 自動保存（ブラウザ内・安全網） ----
const AUTOSAVE_KEY = "sidenote-autosave-v1";

function autoSave() {
  const snap = serializeProject();
  commitUndoHistory(snap);
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snap));
  } catch (err) {
    // 容量超過等は無視。明示保存（.json書き出し）があるため致命的ではない。
  }
}
const autoSaveDebounced = debounce(autoSave, 800);

function checkAutoSaveOnLoad() {
  let raw;
  try { raw = localStorage.getItem(AUTOSAVE_KEY); } catch (err) { raw = null; }
  let data = null;
  if (raw) {
    try { data = JSON.parse(raw); } catch (err) { data = null; }
  }
  const hasContent = !!(data && (
    (data.mode === "pdf" && data.pdfDataUrl) ||
    (data.mode !== "pdf" && data.docHTML && data.docHTML !== '<div class="para"><br></div>')
  ));

  resumeApplyBtn.disabled = !hasContent;
  resumeApplyBtn.title = hasContent
    ? `ブラウザ内の自動保存を読み込みます（${data.title ? `「${data.title}」・` : ""}自動保存: ${data.savedAt ? new Date(data.savedAt).toLocaleString("ja-JP") : "不明な日時"}）`
    : "復元できる自動保存がありません";

  resumeApplyBtn.onclick = async () => {
    if (!hasContent) return;
    try {
      await applyProjectData(data);
      initUndoHistory();
      setStatus("自動保存された内容を復元しました。");
    } catch (err) {
      console.error(err);
      setStatus("復元に失敗しました。");
    }
  };
}
checkAutoSaveOnLoad();

// ---- 元に戻す／やり直し（Ctrl+Z / Ctrl+Y） ----
// 変更箇所ごとに個別の記録を仕込むのではなく、保存（serializeProject）と同じ形のスナップショットを
// 履歴として積む方式にする。記録のタイミングは既存の自動保存（autoSave。本文入力・書式・
// 画像/表/区切り線/サイドノートの追加削除など、状態を変える操作の最後に必ず呼ばれている）に
// 相乗りすることで記録漏れを防ぐ（画像貼り付け等、従来Ctrl+Zの対象外だった操作も含めて全て対象になる）。
// 連続する入力はautoSaveDebounced自体の800ms猶予でまとまるため、1文字ごとに履歴が増えることもない。
const MAX_UNDO_HISTORY = 100;
let undoHistoryStack = [];
let undoHistoryPointer = -1;
let isRestoringHistory = false;

// 新しい文書を開いた・作り直した時（起動時の空文書、.json/.md/PDFを開く、「新しい作業」等）に
// 履歴をその状態1件だけへリセットする。呼び出し箇所はimportMarkdownBlocks・resumeDiscardBtn・
// renderPdfFromDataUrl（PDFを開く経路の共通入口）・handleOpenedFileとresumeApplyBtn（.json読み込み）参照。
function initUndoHistory() {
  undoHistoryStack = [serializeProject()];
  undoHistoryPointer = 0;
}

// savedAtは呼ぶたびに変わってしまうため、比較時だけ除いて見る（実質変化が無いのに
// タイムスタンプだけの違いで履歴が増え続けるのを防ぐ。Undo/Redoでの復元直後の
// autoSave自身の記録もこれで無視される）。pdfDataUrl（元PDFのbase64、数MBになりうる）も
// 同じPDFを開いているセッション内では常に同一の値なので、比較のたびに丸ごと文字列化しないよう除く。
function snapshotForCompare(s) {
  const { savedAt, pdfDataUrl, ...rest } = s;
  return rest;
}
function snapshotsEqualIgnoringSavedAt(a, b) {
  if (!a || !b) return false;
  return JSON.stringify(snapshotForCompare(a)) === JSON.stringify(snapshotForCompare(b));
}

function commitUndoHistory(snap) {
  if (isRestoringHistory) return;
  if (snapshotsEqualIgnoringSavedAt(undoHistoryStack[undoHistoryPointer], snap)) return;
  undoHistoryStack = undoHistoryStack.slice(0, undoHistoryPointer + 1);
  undoHistoryStack.push(snap);
  if (undoHistoryStack.length > MAX_UNDO_HISTORY) undoHistoryStack.shift();
  undoHistoryPointer = undoHistoryStack.length - 1;
}

// pdfモードはapplyProjectData経由で復元するとPDF自体を毎回再レンダリングしてしまい重く、
// スクロール位置も失われるため、ページはそのままに注釈（notesByAnchor・pdfAnchors）だけを
// 復元する専用の経路にする（画像・表と同じ「DOM直接操作なので明示的に自前で行う」考え方）。
async function applyUndoSnapshot(snap) {
  isRestoringHistory = true;
  try {
    if (snap.mode === "pdf") {
      paraStyleSettings = mergeParaStyleSettings(snap.paraStyleSettings);
      numberingSettings = mergeNumberingSettings(snap.numberingSettings);
      refreshStyleSettingInputs();
      refreshNumberingSettingInputs();
      notesByAnchor.clear();
      (snap.notesByAnchor || []).forEach(([anchorId, notes]) => notesByAnchor.set(anchorId, notes || []));
      anchorIdSeq = typeof snap.anchorIdSeq === "number" ? snap.anchorIdSeq : anchorIdSeq;
      replyIdSeq = typeof snap.replyIdSeq === "number" ? snap.replyIdSeq : replyIdSeq;
      titleInput.value = snap.title || "";
      if (snap.colorNames && snap.colorNames.black) colorNames.black = snap.colorNames.black;
      if (snap.colorNames && snap.colorNames.blue) colorNames.blue = snap.colorNames.blue;
      updateColorSwatchLabels();
      if (snap.theme) applyTheme(snap.theme);
      pdfViewerEl.querySelectorAll(".pdf-mark").forEach((el) => el.remove());
      pdfAnchors = [];
      rebuildPdfAnchors(snap.pdfAnchors || []);
      renumberAndLayout();
    } else {
      await applyProjectData(snap);   // initUndoHistory()は呼ばない版（このパス専用、履歴を消さない）
    }
  } finally {
    isRestoringHistory = false;
  }
  autoSaveDebounced();
}

function undoEdit() {
  if (undoHistoryPointer <= 0) { setStatus("これ以上元に戻せません。"); return; }
  undoHistoryPointer--;
  applyUndoSnapshot(undoHistoryStack[undoHistoryPointer]);
}

function redoEdit() {
  if (undoHistoryPointer >= undoHistoryStack.length - 1) { setStatus("これ以上やり直せません。"); return; }
  undoHistoryPointer++;
  applyUndoSnapshot(undoHistoryStack[undoHistoryPointer]);
}

// 通常の入力欄（タイトル・ノート本文・数値設定等）にフォーカスがある間は、ブラウザ標準の
// Undo/Redo（1文字ごとの取り消し）にそのまま任せる。それ以外（本文#doc・表のセル・
// PDFモードなど）はここでまとめて処理する（画像貼り付け等、従来Ctrl+Zが効かなかった操作も含む）。
function isNativeUndoField(el) {
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
}

document.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;
  const key = e.key.toLowerCase();
  const isUndo = key === "z" && !e.shiftKey;
  const isRedo = (key === "z" && e.shiftKey) || key === "y";
  if (!isUndo && !isRedo) return;
  if (isNativeUndoField(document.activeElement)) return;
  e.preventDefault();
  if (isUndo) undoEdit(); else redoEdit();
});

// 「新しい作業」：本文・ノート・画像・表に加えてタイトルも空にし、自動保存も消す（＝別の案件を新規に始める）。
// pdfモードで押した場合も本文モード（打ち込み編集）へ戻す＝「PDFを開く」はあくまで「開く」経由の
// 個別の入り口という位置づけのため（sidenote-pdf-docから移植）。
resumeDiscardBtn.onclick = () => {
  try { localStorage.removeItem(AUTOSAVE_KEY); } catch (err) { /* noop */ }
  setMode("text");
  pdfViewerEl.innerHTML = "";
  currentPdfDoc = null;
  currentPdfDataUrl = null;
  pdfAnchors = [];
  resetDoc();
  notesByAnchor.clear();
  titleInput.value = "";
  openedMdFilename = null;
  openedMdFileHandle = null;
  updateOpenedFileNote();
  // 「項番設定」パネルの内容も文書ごとの設定なので、新しい案件では既定値に戻す。
  paraStyleSettings = JSON.parse(JSON.stringify(DEFAULT_PARA_STYLE_SETTINGS));
  numberingSettings = JSON.parse(JSON.stringify(DEFAULT_NUMBERING_SETTINGS));
  refreshStyleSettingInputs();
  refreshNumberingSettingInputs();
  updateFooterInfo();
  renumberAndLayout();
  updatePlaceholder();
  updateFormatToolbarState();
  initUndoHistory();
  checkAutoSaveOnLoad();
  setStatus("新しい作業を始めます。");
};

// ---- 範囲選択→コメント追加ポップオーバー（本文テキスト向け） ----
doc.addEventListener("mouseup", handleSelection);
doc.addEventListener("touchend", handleSelection);

function getNodePara(node) {
  const el = node.nodeType === 1 ? node : node.parentElement;
  return el ? el.closest(".para") : null;
}

function handleSelection() {
  if (markdownMode) return;   // Markdownモード中はサイドノート追加不可（.md書き出しに残らないため）
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!doc.contains(range.commonAncestorContainer)) return;
  if (rangeOverlapsLockedAnchor(range)) return;
  const startPara = getNodePara(range.startContainer);
  const endPara = getNodePara(range.endContainer);
  if (!startPara || !endPara || startPara !== endPara) return;
  // 段落の先頭〜末尾までまるごと選択したか（コピー時、貼り付け側が「段落として扱うか／
  // 文中にインラインで挿し込むか」を判定するための目印に使う。setPendingHighlight等では未使用）。
  const isWholeParagraph = range.toString() === startPara.textContent;
  pendingTarget = { type: "text", range: range.cloneRange(), isWholeParagraph };
  openPopover(range.getBoundingClientRect());
}

// ---- 色選択（自分／共有相手／重要）----
const colorPickerEl = document.getElementById("colorPicker");
function updateColorPickerSelection() {
  colorPickerEl.querySelectorAll(".color-swatch").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.color === lastUsedColor);
  });
}
function updateColorSwatchLabels() {
  colorPickerEl.querySelectorAll(".color-swatch").forEach((btn) => {
    btn.textContent = colorLabel(btn.dataset.color);
  });
  // サイドノート欄上部の「自分／共有相手／重要」チェックボックスのラベルも、色の名前設定に合わせる。
  document.querySelectorAll(".label-toggle").forEach((label) => {
    const text = label.querySelector(".label-text");
    if (text) text.textContent = colorLabel(label.dataset.color);
  });
}
colorPickerEl.querySelectorAll(".color-swatch").forEach((btn) => {
  btn.onclick = () => {
    lastUsedColor = btn.dataset.color;
    updateColorPickerSelection();
  };
});
updateColorSwatchLabels();
// 黒・青の名前（自分／共有相手）を変える「設定」ボタンは2026-09に廃止した（既定名のまま固定。
// .jsonに保存済みの名前は開いた時だけそのまま反映する＝applyProjectData参照）。

// 「サイドノートに名前を表示する」は色ごとの3つのチェックボックスにして、サイドノート欄の
// 上部に常時表示する（2026-09、設定パネルの中に隠れていて気づきにくいという指摘を受けて変更。
// アプリイメージの「□自分 □共有相手 □重要」参照）。オンにした色のノートだけ名前を添えて表示する。
const SHOW_LABEL_KEY = "sidenote-show-labels-v1";
(function loadShowLabelDefaults() {
  try {
    const raw = localStorage.getItem(SHOW_LABEL_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    ["black", "blue", "red"].forEach((c) => {
      if (typeof parsed[c] === "boolean") showAuthorLabelByColor[c] = parsed[c];
    });
  } catch (err) { /* noop */ }
})();
Object.keys(showLabelInputs).forEach((c) => {
  showLabelInputs[c].checked = showAuthorLabelByColor[c];
  showLabelInputs[c].onchange = () => {
    showAuthorLabelByColor[c] = showLabelInputs[c].checked;
    try { localStorage.setItem(SHOW_LABEL_KEY, JSON.stringify(showAuthorLabelByColor)); } catch (err) { /* noop */ }
    renumberAndLayout();
  };
});

// 編集メニュー（書式ツールバー）は「表示/非表示」「固定/解除」をそれぞれ独立に選べる
// （ツールバー右の「編集メニューを表示」「編集メニューを固定」チェックボックス。この端末の
// 個人設定としてlocalStorageへ。既定は表示=false・固定=false。2026-09、既定を表示にしていたが
// 初見では余計な情報量になるという判断でオフに変更）。.menu-stickyを付けるのは
// 行を包む.toolbar-stickyラッパー側（toolbarMenu2WrapEl）、表示/非表示は中身の#formatToolbar
// 自体（PDFモードでの強制非表示＝setMode()と両立させるため、applyEditMenuVisibility()に集約する）。
const MENU2_STICKY_KEY = "sidenote-menu2-sticky-v1";
const MENU2_VISIBLE_KEY = "sidenote-menu2-visible-v1";
const menuStickyState = { menu2: false };
const menuVisibleState = { menu2: false };
try {
  const rawSticky = localStorage.getItem(MENU2_STICKY_KEY);
  if (rawSticky !== null) menuStickyState.menu2 = rawSticky === "1";
  const rawVisible = localStorage.getItem(MENU2_VISIBLE_KEY);
  if (rawVisible !== null) menuVisibleState.menu2 = rawVisible === "1";
} catch (err) { /* noop */ }

function applyMenuSticky() {
  toolbarMenu2WrapEl.classList.toggle("menu-sticky", menuStickyState.menu2);
  menu2StickyToggle.checked = menuStickyState.menu2;
}
// PDFモードでは書式ツールバー自体が使えないため常に非表示（setMode参照）。それ以外は
// 「編集メニューを表示」チェックボックスの状態に従う。
function applyEditMenuVisibility() {
  formatToolbarEl.hidden = currentMode === "pdf" || !menuVisibleState.menu2;
  menu2VisibleToggle.checked = menuVisibleState.menu2;
}
applyMenuSticky();
applyEditMenuVisibility();
menu2StickyToggle.onchange = () => {
  menuStickyState.menu2 = menu2StickyToggle.checked;
  applyMenuSticky();
  try { localStorage.setItem(MENU2_STICKY_KEY, menuStickyState.menu2 ? "1" : "0"); } catch (err) { /* noop */ }
};
menu2VisibleToggle.onchange = () => {
  menuVisibleState.menu2 = menu2VisibleToggle.checked;
  applyEditMenuVisibility();
  try { localStorage.setItem(MENU2_VISIBLE_KEY, menuVisibleState.menu2 ? "1" : "0"); } catch (err) { /* noop */ }
};

// ---- Markdownモード（「表を挿入」の右のチェックボックス） ----
// .md書き出し（docToMarkdown）には、配置・インデント（箇条書きの入れ子以外）・ぶら下げ・
// 文字サイズ・傍点は一切反映されず、サイドノート（注釈）も引用元のプレーンテキストだけが残り
// コメント本体は消える（docToMarkdown・help.htmlの「MDで書き出す」説明と同じ理解）。
// Markdown書き出しを前提に編集する人が、書いても消えてしまう装飾に気づかず使ってしまわないよう、
// このチェックを付けている間はそれらの操作をグレーアウトして使えなくする（本体のデータは消さない。
// 既に付いている書式・サイドノートは.jsonには残ったままで、チェックを外せばまた使える）。
// 文書ごとではなく端末側の編集時プリファレンスなので、他のメニュー表示設定と同じくlocalStorageに置く
// （markdownMode自体の宣言・localStorage読み込みはファイル冒頭のモード変数群でまとめて行う。
// updateFormatToolbarStateの初回呼び出しがこのブロックより前にあるため、宣言だけ先出しが必要）。
function applyMarkdownMode() {
  document.body.classList.toggle("markdown-mode-active", markdownMode);
  markdownModeToggle.checked = markdownMode;
  updateFormatToolbarState();
}
markdownModeToggle.onchange = () => {
  markdownMode = markdownModeToggle.checked;
  try { localStorage.setItem(MARKDOWN_MODE_KEY, markdownMode ? "1" : "0"); } catch (err) { /* noop */ }
  applyMarkdownMode();
  // Markdownモード中は本文の1行の長さ（1行40字）・ページ幅がCSSで変わり、折り返し位置＝各段落の高さが
  // 変わるため、サイドノートの縦位置を測り直す。ページ最下部の「1行◯字」の表記も合わせて書き直す。
  // （起動時のapplyMarkdownMode()呼び出しからは呼ばない：その時点では後ろの方でconst宣言される
  //  変数がまだ初期化前でTDZになりうる。起動時は下のapplyTheme→updateFooterInfoが同じ役目を担う。）
  renumberAndLayout();
  updateFooterInfo();
};
applyMarkdownMode();

// 上段メニュー固定の代わりの「トップに戻る」ボタン：ヒーローを過ぎてある程度スクロールした時だけ
// 出す（常時出しっぱなしだと最初から見えてしまい、固定機能の代わりという役割が伝わらないため）。
const BACK_TO_TOP_SHOW_AT = 400;
document.addEventListener("scroll", () => {
  backToTopBtn.hidden = window.scrollY < BACK_TO_TOP_SHOW_AT;
});
backToTopBtn.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });

// ---- デザイン（テーマ）切替 ----
const THEMES = [
  { id: "editorial", label: "エディトリアル", desc: "雑誌風・明朝・ゆったり" },
  { id: "minimal", label: "文書（ミニマル）", desc: "公文書仕様に近い白黒" },
  { id: "flat", label: "フラット", desc: "カード区切りのSaaS系" },
  { id: "dark", label: "ダークUI", desc: "分析ツール風・集中読解" },
  { id: "wamodan", label: "和モダン", desc: "エディトリアルより余白広め" },
  { id: "site", label: "サイト", desc: "紺×朱、公開サイトの配色" },
  { id: "twocol", label: "2段組", desc: "和モダン＋本文14pt（2ページ/枚の印刷で9〜10pt）" },
];
const DEFAULT_THEME = "minimal";
const THEME_KEY = "sidenote-theme-v1";
let currentTheme = DEFAULT_THEME;

function applyTheme(themeId) {
  const valid = THEMES.some((t) => t.id === themeId) ? themeId : DEFAULT_THEME;
  currentTheme = valid;
  document.documentElement.dataset.theme = valid;
  themeGrid.querySelectorAll("[data-theme-id]").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.themeId === valid);
  });
  try { localStorage.setItem(THEME_KEY, valid); } catch (err) { /* noop */ }
  updateFooterInfo();
}

// ---- ページ最下部「文字サイズ・1行文字数の目安」の注記 ----
// フォント名だけデザイン（テーマ）ごとに違う（サイズ・段組み幅はテーマ共通の固定値。例外は「2段組」＝NO_SIDEBAR_PRINT_LAYOUT）ので、
// テーマ切り替えのたびにここで書き直す。画面用は--font-body、PDF用は--p-font-body
// （themes.css参照。body.print-active時だけ定義される値なので、一瞬だけクラスを付けて読む＝
// buildPrintDocPdf末尾の強制リフローと同じ「同期処理内で完結させ画面には反映しない」考え方）。
function firstFontName(cssFontFamilyValue) {
  const first = String(cssFontFamilyValue || "").split(",")[0].trim();
  return first.replace(/^['"]|['"]$/g, "") || "?";
}

// h1〜h3の実際のサイズは、ツールバーの見出しボタンで付けた場合は常にparaStyleSettings（見出し
// スタイル設定）どおりになり、テーマの影響を受けない（Markdown取り込みが付ける.para-hNクラス側の
// テーマ別CSSは、ツールバー適用の見出しには乗らないため）。既定はH1が16pt、H2・H3は「本文と同じ」。
function headingSizeLabel(styleKey, bodySizeLabel) {
  const s = paraStyleSettings[styleKey];
  return s && s.fontSizePt ? `${s.fontSizePt}pt` : `${bodySizeLabel}（本文と同じ）`;
}

// Markdown取り込みが付ける.para-h2クラス側の上部余白（画面のみ・デザインごとに異なる。
// 印刷はどのデザインでも.print-h1〜h3を含め常にmargin:0 0 .6emで統一しており見出し独自の
// 上部余白を持たないため、画面表示の行にだけ添える）。ツールバーの見出しボタン（data-style、
// クラス無し）にはこの上部余白は乗らないため、あくまで「Markdownの##見出しを取り込んだ場合」の
// 目安。一時的に非表示のプローブ要素を作って実測し、フォント名と同様デザイン切り替え時に測り直す。
function probeHeadingMarginTopEm(level) {
  const probe = document.createElement("div");
  probe.className = `para para-h${level}`;
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;left:0;top:0;";
  doc.appendChild(probe);
  const cs = getComputedStyle(probe);
  const marginPx = parseFloat(cs.marginTop);
  const fontPx = parseFloat(cs.fontSize);
  probe.remove();
  return fontPx ? marginPx / fontPx : 0;
}

// デザインごとに違う、PDF（サイドバーなし）の組み。ここに無いデザインは既定（本文12pt・1行40字）。
// 「2段組」は、PDFを2ページ/枚に割り付けて読む前提で、本文14pt・1行34字（A4縦・1段のまま。style.cssの
// 「デザイン『2段組』」参照）。割り付けの縮小率はLetter横で約0.67倍・A4横で約0.71倍なので、本文は9.3〜9.9ptになる。
const NO_SIDEBAR_PRINT_LAYOUT = {
  twocol: {
    bodyPt: 14, headPt: [19, 17, 15], chars: 34, layout: "A4縦・1段",
    note: "「2段組」は、PDFを2ページ/枚に割り付けた時に本文が9〜10pt（Letter横で約9.3pt、A4横で約9.9pt）になる大きさです。h1〜h3は、Markdownの見出し（#〜###）の大きさです（ツールバーの見出しは項番設定どおり）。サイドノートがある文書は従来のサイドバー付きの版面になります。",
  },
};

function updateFooterInfo() {
  if (!appFooterEl) return;
  const screenFont = firstFontName(getComputedStyle(document.documentElement).getPropertyValue("--font-body"));
  document.body.classList.add("print-active");
  const printFont = firstFontName(getComputedStyle(document.body).getPropertyValue("--p-font-body"));
  document.body.classList.remove("print-active");
  const h2MarginTopEm = Math.round(probeHeadingMarginTopEm(2) * 10) / 10;

  const section = (title, rows) =>
    `<div class="footer-section"><div class="footer-section-title">${title}</div>` +
    rows.map(([label, value]) => `<div>${label}：${value}</div>`).join("") +
    `</div>`;

  // 画面の1行の字数：Markdownモード中はPDF（サイドバーなし）と同じ40字（style.cssの--line-max参照）。
  const nsp = NO_SIDEBAR_PRINT_LAYOUT[currentTheme];   // このデザイン固有のPDF（サイドバーなし）の組み。無ければ既定
  const screenLineChars = markdownMode ? (nsp ? nsp.chars : 40) : 37;
  appFooterEl.innerHTML =
    section("画面表示", [
      ["本文", `${screenFont}・15px・1行${screenLineChars}字`],
      ["サイドバー", `${screenFont}・13px・1行18字`],
      ["h1", `${screenFont}・${headingSizeLabel("h1", "15px")}`],
      ["h2", `${screenFont}・${headingSizeLabel("h2", "15px")}・上部余白${h2MarginTopEm}em（Markdown取り込み時）`],
      ["h3", `${screenFont}・${headingSizeLabel("h3", "15px")}`],
    ]) +
    section("PDF（サイドバーあり）", [
      ["本文", `${printFont}・10.5pt・1行31字`],
      ["サイドバー", `${printFont}・8.5pt・1行16字`],
      ["h1", `${printFont}・${headingSizeLabel("h1", "10.5pt")}`],
      ["h2", `${printFont}・${headingSizeLabel("h2", "10.5pt")}`],
      ["h3", `${printFont}・${headingSizeLabel("h3", "10.5pt")}`],
    ]) +
    section("PDF（サイドバーなし）", nsp ? [
      ["本文", `${printFont}・${nsp.bodyPt}pt・${nsp.layout}（1行${nsp.chars}字）`],
      ["h1", `${printFont}・${nsp.headPt[0]}pt`],
      ["h2", `${printFont}・${nsp.headPt[1]}pt`],
      ["h3", `${printFont}・${nsp.headPt[2]}pt`],
    ] : [
      ["本文", `${printFont}・12pt・1行40字（2cm余白の残り幅で改行）`],
      ["h1", `${printFont}・${headingSizeLabel("h1", "12pt")}`],
      ["h2", `${printFont}・${headingSizeLabel("h2", "12pt")}`],
      ["h3", `${printFont}・${headingSizeLabel("h3", "12pt")}`],
    ]) +
    `<div class="footer-section footer-section-note">全角1文字≒1em換算。見出しの実際の大きさは「項番設定（カスタマイズ）」の見出しスタイルで変えられます。${nsp ? nsp.note : ""}</div>`;
}
themeGrid.querySelectorAll("[data-theme-id]").forEach((btn) => {
  btn.onclick = () => { applyTheme(btn.dataset.themeId); autoSaveDebounced(); };
});
(function loadThemeDefault() {
  let saved = DEFAULT_THEME;
  try { saved = localStorage.getItem(THEME_KEY) || DEFAULT_THEME; } catch (err) { /* noop */ }
  applyTheme(saved);
})();

// 「設定」「デザイン」は同じ開閉パターン（同じボタンをもう一度押す、または他方を開くと閉じる）。
function toggleDropdownPanel(panelEl, btnEl) {
  const opening = panelEl.hidden;
  document.querySelectorAll(".dropdown-panel").forEach((el) => { el.hidden = true; });
  closePopover();
  if (!opening) return;
  const rect = btnEl.getBoundingClientRect();
  panelEl.hidden = false;
  panelEl.style.top = `${window.scrollY + rect.bottom + 6}px`;
  panelEl.style.left = `${window.scrollX + rect.left}px`;
}
// 「デザイン」グリッド内の「カスタマイズ」は他のスウォッチと違い、テーマを適用せず「項番設定」
// パネルを開く（sidenote-pdf-docの書式機能をこの入り口にまとめる。カスタマイズの中身は
// 見出し（H1〜H3）の見た目と項番の型ごとのインデント・ぶら下げ）。
customizeThemeBtn.onclick = () => toggleDropdownPanel(numberingPanel, customizeThemeBtn);
numberingClose.onclick = () => { numberingPanel.hidden = true; };

// ---- 「項番設定」パネル：見出し（H1〜H3）の見た目と、項番の型ごとのインデント・ぶら下げ
// （sidenote-pdf-docから移植）----
// どちらも.jsonに保存する文書ごとの設定（serializeProject/applyProjectData参照）なので、
// localStorageへの端末既定値は持たない（colorNames等とは違う扱い）。
// パネルの入力欄をparaStyleSettings/numberingSettingsの現在値に合わせて表示し直す。
// .json読み込み・「新しい作業」での初期化のたびに呼ぶ。
function refreshStyleSettingInputs() {
  Object.keys(styleSettingInputs).forEach((key) => {
    const s = paraStyleSettings[key];
    styleSettingInputs[key].size.value = s.fontSizePt != null ? String(s.fontSizePt) : "";
    styleSettingInputs[key].bold.checked = !!s.bold;
  });
}
function refreshNumberingSettingInputs() {
  NUMBERING_TYPES.forEach((type) => {
    numberingSettingInputs[type].indent.value = String(numberingSettings[type].indentLevel);
    numberingSettingInputs[type].hanging.value = String(numberingSettings[type].hanging);
  });
}
// 見出しの文字サイズ・太字を変えたら、既にH1〜H3を付けている段落全部に即反映する
// （data属性ではなくparaStyleSettings側が変わるため、単発のapplyParaStyles(paras)では拾えない）。
function reapplyAllParaStyles() {
  applyParaStyles(Array.from(doc.querySelectorAll(".para:not(.para-opaque)")));
  updateFooterInfo();   // 見出しスタイル設定の変更はページ最下部の目安表示にも反映する
}
Object.keys(styleSettingInputs).forEach((key) => {
  styleSettingInputs[key].size.oninput = () => {
    const raw = styleSettingInputs[key].size.value.trim();
    paraStyleSettings[key].fontSizePt = raw === "" ? null : Number(raw);
    reapplyAllParaStyles();
    autoSaveDebounced();
  };
  styleSettingInputs[key].bold.onchange = () => {
    paraStyleSettings[key].bold = styleSettingInputs[key].bold.checked;
    reapplyAllParaStyles();
    autoSaveDebounced();
  };
});
NUMBERING_TYPES.forEach((type) => {
  numberingSettingInputs[type].indent.onchange = () => {
    numberingSettings[type].indentLevel = Number(numberingSettingInputs[type].indent.value) || 0;
    autoSaveDebounced();
  };
  numberingSettingInputs[type].hanging.onchange = () => {
    numberingSettings[type].hanging = Number(numberingSettingInputs[type].hanging.value) || 0;
    autoSaveDebounced();
  };
});
refreshStyleSettingInputs();
refreshNumberingSettingInputs();

// 段落の行頭テキストが項番の型（第１型／１型／⑴型／ア型）のどれかに一致するかを判定する。
// マッチしなければnull。textContentは配下のspan（傍点・note-anchor等）の入れ子に関わらず
// フラットな文字列を返すので、DOM構造に関わらずこの判定が使える。
function detectNumberingType(paraEl) {
  const text = (paraEl.textContent || "").trimStart();
  for (const type of NUMBERING_TYPES) {
    if (NUMBERING_PATTERNS[type].test(text)) return type;
  }
  return null;
}

// 「項番を一括適用」：文書内の全段落（画像・表・水平線を除く）を先頭から判定し、一致した型の設定
// （インデント・ぶら下げ）を書き込む。既にインデント・ぶら下げを持つ段落のうち、それが
// このボタン自身の適用でついたもの（data-numbered）ではない＝手動で書式を変えた段落は
// 対象から外して保護する（インデント・ぶら下げのボタンを直接押すとdata-numberedは外れる）。
function applyNumbering() {
  const paras = Array.from(doc.querySelectorAll(".para:not(.para-opaque)"));
  let applied = 0, skipped = 0;
  paras.forEach((p) => {
    const type = detectNumberingType(p);
    if (!type) return;
    const hasManualFormat = (p.dataset.indentLevel || p.dataset.hanging) && !p.dataset.numbered;
    if (hasManualFormat) { skipped++; return; }
    const rule = numberingSettings[type];
    if (rule.indentLevel > 0) p.dataset.indentLevel = String(rule.indentLevel); else delete p.dataset.indentLevel;
    if (rule.hanging > 0) p.dataset.hanging = String(rule.hanging); else delete p.dataset.hanging;
    p.dataset.numbered = type;
    applied++;
  });
  applyParaStyles(paras);
  updateFormatToolbarState();
  autoSaveDebounced();
  setStatus(`項番を適用しました（${applied}段落に適用／手動書式のため${skipped}段落をスキップ）`);
}
applyNumberingBtn.onclick = applyNumbering;

// ポップオーバーが開くとフォーカスが#docから外れ、ブラウザ標準の選択ハイライト（青）が
// 消えてしまう。これだと今どのテキストへコピー・切り取り・削除が効くのか見えず紛らわしいため、
// CSS Custom Highlight APIで選択が消えた後も同じ見た目を重ねておく（DOM構造には触れない）。
// 非対応ブラウザでは黙って何もしない（機能自体は変わらず、見た目が付かないだけ）。
const PENDING_HIGHLIGHT_NAME = "sidenote-pending";
const supportsCustomHighlight = "Highlight" in window && !!CSS.highlights;
function setPendingHighlight() {
  if (!supportsCustomHighlight || !pendingTarget?.range) return;
  CSS.highlights.set(PENDING_HIGHLIGHT_NAME, new Highlight(pendingTarget.range));
}
function clearPendingHighlight() {
  if (supportsCustomHighlight) CSS.highlights.delete(PENDING_HIGHLIGHT_NAME);
}

function openPopover(rect) {
  numberingPanel.hidden = true;
  popoverInput.value = "";
  popoverEl.hidden = false;
  updateColorPickerSelection();
  updateColorSwatchLabels();
  const top = window.scrollY + rect.bottom + 6;
  const maxLeft = window.scrollX + document.documentElement.clientWidth - popoverEl.offsetWidth - 12;
  const left = Math.min(window.scrollX + rect.left, Math.max(12, maxLeft));
  popoverEl.style.top = `${top}px`;
  popoverEl.style.left = `${left}px`;
  popoverInput.focus();
  setPendingHighlight();
}

function closePopover() {
  pendingTarget = null;
  popoverEl.hidden = true;
  clearPendingHighlight();
}

function cancelPopover() {
  closePopover();
  window.getSelection()?.removeAllRanges();
}
document.getElementById("notePopoverCancel").onclick = cancelPopover;

// Escapeでポップオーバーを閉じる（「キャンセル」と同じ動作）。フォーカスが入力欄・色ボタンの
// どちらにあっても効くよう、popoverInput個別ではなくdocument全体で「開いているかどうか」だけ見て拾う。
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !popoverEl.hidden) {
    e.preventDefault();
    cancelPopover();
  }
});

document.getElementById("notePopoverAdd").onclick = () => {
  const text = popoverInput.value.trim();
  if (!text || !pendingTarget) return;

  if (pendingTarget.type === "text") {
    addTextNote(pendingTarget.range, text, lastUsedColor);
  } else if (pendingTarget.type === "image") {
    addImageNote(pendingTarget.paraEl, text, lastUsedColor);
  } else if (pendingTarget.type === "table") {
    addTableNote(pendingTarget.paraEl, text, lastUsedColor);
  } else if (pendingTarget.type === "reply") {
    addNoteToAnchor(pendingTarget.anchorId, text, lastUsedColor);
  } else if (pendingTarget.type === "pdftext") {
    addPdfTextNote(pendingTarget.pageEl, pendingTarget.rectsPdf, pendingTarget.quote, text, lastUsedColor);
  } else if (pendingTarget.type === "pdfpoint") {
    addPdfPointNote(pendingTarget.pageEl, pendingTarget.point, text, lastUsedColor);
  } else if (pendingTarget.type === "pdfrect") {
    addPdfRectNote(pendingTarget.pageEl, pendingTarget.rect, text, lastUsedColor);
  }

  closePopover();
  window.getSelection()?.removeAllRanges();
  renumberAndLayout();
  updatePlaceholder();
  // "image"/"table"/"reply"はnotesByAnchorへのMap操作のみでDOMのinputイベントを伴わないため、
  // ここで明示的に呼ぶ（他の種類は既にexecCommand経由/各addPdf*Note内で呼ばれているが、
  // 二重に呼んでも自動保存はデバウンスされるだけなので無害）。
  autoSaveDebounced();
};

// anchorId（一文のロック範囲、または画像・表）に1件コメントを積む（＝返信スレッドへの追加）。
function addNoteToAnchor(anchorId, text, color) {
  const note = { id: "r" + replyIdSeq++, text, color: color || "black" };
  if (!notesByAnchor.has(anchorId)) notesByAnchor.set(anchorId, []);
  notesByAnchor.get(anchorId).push(note);
  return note;
}

function addTextNote(range, text, color) {
  const anchorId = "a" + anchorIdSeq++;
  const quoted = range.toString();
  const html = `<span class="note-anchor" contenteditable="false" data-anchor-id="${anchorId}">` +
    `<sup class="note-num"></sup><span>${escapeHtml(quoted)}</span></span>`;

  // 段落の一番先頭／末尾ちょうどでcontenteditable="false"の要素をinsertHTMLすると、Chromeがその要素を
  // 段落の外へ押し出してしまう既知の挙動があるため、ゼロ幅スペースで「ちょうど」の条件を崩してから挿入する。
  const paraEl = (range.startContainer.nodeType === Node.ELEMENT_NODE
    ? range.startContainer
    : range.startContainer.parentElement)?.closest(".para");
  let zwsp = null;
  if (paraEl) {
    const probe = document.createRange();
    probe.setStart(paraEl, 0);
    probe.setEnd(range.startContainer, range.startOffset);
    if (probe.toString().length === 0) {
      zwsp = document.createTextNode("​");
      paraEl.insertBefore(zwsp, paraEl.firstChild);
    }
  }
  let zwspEnd = null;
  if (paraEl) {
    const probeEnd = document.createRange();
    probeEnd.setStart(range.endContainer, range.endOffset);
    probeEnd.setEnd(paraEl, paraEl.childNodes.length);
    if (probeEnd.toString().length === 0) {
      zwspEnd = document.createTextNode("​");
      paraEl.appendChild(zwspEnd);
    }
  }

  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  // execCommand('insertHTML')経由にすると、ノート追加も#docのinputイベントを発火し、
  // autoSave経由の独自Undo/Redoの対象になる。
  document.execCommand && document.execCommand("insertHTML", false, html);
  if (zwsp) zwsp.remove();
  if (zwspEnd) zwspEnd.remove();
  if (!doc.querySelector(`[data-anchor-id="${anchorId}"]`)) {
    // 本当に失敗した場合のみのフォールバック（ブラウザのネイティブundoには乗らないが、
    // 独自のUndo/Redoはこの後のaddNoteToAnchor()を含めた状態全体を見るため問題ない）
    const anchor = document.createElement("span");
    anchor.className = "note-anchor";
    anchor.contentEditable = "false";
    anchor.dataset.anchorId = anchorId;
    const sup = document.createElement("sup");
    sup.className = "note-num";
    anchor.appendChild(sup);
    const contentSpan = document.createElement("span");
    contentSpan.appendChild(range.extractContents());
    anchor.appendChild(contentSpan);
    range.insertNode(anchor);
  }
  addNoteToAnchor(anchorId, text, color);
}

// ---- 画像ブロック（スクショ・MD内の画像） ----
function getCurrentParaOrLast() {
  return getCurrentPara() || doc.querySelector(".para:last-child") || doc.lastElementChild;
}

function buildAndInsertImageBlock(file, afterEl, onInserted) {
  const reader = new FileReader();
  reader.onload = () => {
    const paraId = "img" + imageIdSeq++;
    const wrap = buildImageParaEl(paraId, reader.result);
    if (afterEl && afterEl.parentElement === doc) afterEl.insertAdjacentElement("afterend", wrap);
    else doc.appendChild(wrap);
    if (!wrap.nextElementSibling) {
      const trailingPara = document.createElement("div");
      trailingPara.className = "para";
      trailingPara.innerHTML = "<br>";
      wrap.insertAdjacentElement("afterend", trailingPara);
    }
    bindImageParaEvents(wrap);
    updatePlaceholder();
    renumberAndLayout();
    autoSaveDebounced();
    onInserted && onInserted(wrap);
  };
  reader.readAsDataURL(file);
}

function insertImageBlock(file) {
  buildAndInsertImageBlock(file, getCurrentParaOrLast());
}

// ---- 表の挿入（書式ツールバーの「表を挿入」。画像挿入と同じ「現在の段落の直後に置く」方式） ----
// セルは表自体のcontenteditable="true"（buildTableParaEl参照）でそのまま書き換えられる。
// 行・列の追加/削除UIは無く既定の行列数（見出し1行＋本文2行×3列）のまま。もっと大きい表が
// 要る場合は今のところMarkdown取り込みを使うか、複数の表を並べる想定（2026-09、既知の簡略化）。
function insertTableBlock() {
  const cols = 3, rows = 2;
  const paraId = "tbl" + tableIdSeq++;
  const wrap = buildTableParaEl(paraId, Array(cols).fill(""), null, Array.from({ length: rows }, () => Array(cols).fill("")));
  const afterEl = getCurrentParaOrLast();
  if (afterEl && afterEl.parentElement === doc) afterEl.insertAdjacentElement("afterend", wrap);
  else doc.appendChild(wrap);
  if (!wrap.nextElementSibling) {
    const trailingPara = document.createElement("div");
    trailingPara.className = "para";
    trailingPara.innerHTML = "<br>";
    wrap.insertAdjacentElement("afterend", trailingPara);
  }
  bindTableParaEvents(wrap);
  updatePlaceholder();
  renumberAndLayout();
  autoSaveDebounced();
  wrap.querySelector("th, td")?.focus();
}
insertTableBtn.onclick = insertTableBlock;

// ---- 画像の挿入（書式ツールバーの「画像を挿入」。表・区切り線と同じ「現在の段落の直後に置く」方式） ----
// 段落ホバーの「＋画像」（paraHoverFile）・Ctrl+Vの貼り付け・ドラッグ＆ドロップと同じ画像ブロック
// （buildAndInsertImageBlock）を作る。画像はdata URLとして本文に持つので、Markdownで書き出すと
// 「![](data:image/png;base64,…)」になり（blockParaToMarkdown）、そのMarkdownを取り込み直せば
// 同じ画像ブロックに戻る。ファイル選択ダイアログを開くとカーソル位置が分からなくなる恐れがあるため、
// 挿入先の段落はボタンを押した時点で控えておく（複数枚選んだ場合は、選んだ順にその直後へ並べる）。
let insertImageAfterEl = null;
insertImageBtn.onclick = () => {
  insertImageAfterEl = getCurrentParaOrLast();
  insertImageFileInput.click();
};
insertImageFileInput.onchange = (e) => {
  const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
  insertImageFileInput.value = "";
  if (!files.length) return;
  const afterEl = insertImageAfterEl && doc.contains(insertImageAfterEl) ? insertImageAfterEl : getCurrentParaOrLast();
  insertImageAfterEl = null;
  insertImageFilesAfter(files, afterEl);
};

// ---- 区切り線の挿入（書式ツールバーの「区切り線」。画像・表と同じ「現在の段落の直後に置く」方式） ----
// Markdownの「---」貼り付け/取り込みで作られるものと同じ.para-hrブロック（buildHrParaEl）を使う。
// 削除は挿入済みの区切り線にマウスを乗せた時に出る×ボタン（bindHrParaEvents）で行う（画像・表と同じ）。
function insertHrBlock() {
  const wrap = buildHrParaEl("hr" + hrIdSeq++);
  const afterEl = getCurrentParaOrLast();
  if (afterEl && afterEl.parentElement === doc) afterEl.insertAdjacentElement("afterend", wrap);
  else doc.appendChild(wrap);
  if (!wrap.nextElementSibling) {
    const trailingPara = document.createElement("div");
    trailingPara.className = "para";
    trailingPara.innerHTML = "<br>";
    wrap.insertAdjacentElement("afterend", trailingPara);
  }
  bindHrParaEvents(wrap);
  updatePlaceholder();
  renumberAndLayout();
  autoSaveDebounced();
}
insertHrBtn.onclick = insertHrBlock;

// ---- 改ページの挿入（書式ツールバーの「改ページ」。区切り線と同じ「現在の段落の直後に置く」方式） ----
// Markdownの改ページ（HTMLコメントpagebreakの1行）の取り込みで作られるものと同じ.para-pagebreakブロック
// （buildPageBreakParaEl）を使う。削除は挿入済みの改ページの×ボタン（bindPageBreakParaEvents）で行う。
function insertPageBreakBlock() {
  const wrap = buildPageBreakParaEl("pb" + hrIdSeq++);
  const afterEl = getCurrentParaOrLast();
  if (afterEl && afterEl.parentElement === doc) afterEl.insertAdjacentElement("afterend", wrap);
  else doc.appendChild(wrap);
  if (!wrap.nextElementSibling) {
    const trailingPara = document.createElement("div");
    trailingPara.className = "para";
    trailingPara.innerHTML = "<br>";
    wrap.insertAdjacentElement("afterend", trailingPara);
  }
  bindPageBreakParaEvents(wrap);
  updatePlaceholder();
  renumberAndLayout();
  autoSaveDebounced();
}
insertPageBreakBtn.onclick = insertPageBreakBlock;

function buildImageParaEl(paraId, src) {
  const wrap = document.createElement("div");
  wrap.className = "para para-image para-opaque";
  wrap.contentEditable = "false";
  wrap.dataset.paraId = paraId;

  const inner = document.createElement("div");
  inner.className = "para-image-inner";

  const meta = document.createElement("div");
  meta.className = "para-image-meta";

  const noteBtn = document.createElement("button");
  noteBtn.type = "button";
  noteBtn.className = "para-image-note-btn";
  noteBtn.textContent = "＋ ノート";
  noteBtn.title = "この画像にコメントを追加（出典はサイドノートに記載してください）";
  meta.appendChild(noteBtn);

  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "para-image-del-btn";
  delBtn.innerHTML = ICON_X;
  delBtn.title = "この画像を削除";
  meta.appendChild(delBtn);

  inner.appendChild(meta);

  const img = document.createElement("img");
  img.className = "para-image-img";
  img.src = src;
  img.alt = "画像";
  inner.appendChild(img);

  const notesRow = document.createElement("div");
  notesRow.className = "para-image-notes";
  wrap.appendChild(notesRow);
  wrap.appendChild(inner);

  return wrap;
}

function bindImageParaEvents(wrap) {
  const noteBtn = wrap.querySelector(".para-image-note-btn");
  noteBtn.onclick = () => {
    pendingTarget = { type: "image", paraEl: wrap };
    openPopover(noteBtn.getBoundingClientRect());
  };
  wrap.querySelector(".para-image-del-btn").onclick = () => deletePara(wrap);
}

function addImageNote(paraEl, text, color) {
  addNoteToAnchor(paraEl.dataset.paraId, text, color);
  ensureImageNoteBadge(paraEl);
}

function ensureImageNoteBadge(paraEl) {
  const notesRow = paraEl.querySelector(".para-image-notes");
  if (notesRow.querySelector(".note-anchor")) return;
  const badge = document.createElement("span");
  badge.className = "note-anchor img-note-anchor";
  badge.dataset.anchorId = paraEl.dataset.paraId;
  const sup = document.createElement("sup");
  sup.className = "note-num";
  badge.appendChild(sup);
  notesRow.appendChild(badge);
}

function insertImageFilesAfter(files, afterEl) {
  let cur = afterEl;
  const insertNext = (i) => {
    if (i >= files.length) return;
    buildAndInsertImageBlock(files[i], cur, (wrap) => {
      cur = wrap;
      insertNext(i + 1);
    });
  };
  insertNext(0);
}

// ---- 表ブロック（Markdownの表を取り込んだ時に使う。画像ブロックと同じ「オペーク型」の作り） ----
function buildTableParaEl(paraId, header, aligns, rows) {
  const wrap = document.createElement("div");
  wrap.className = "para para-table para-opaque";
  wrap.contentEditable = "false";
  wrap.dataset.paraId = paraId;

  const notesRow = document.createElement("div");
  notesRow.className = "para-table-notes";
  wrap.appendChild(notesRow);

  const inner = document.createElement("div");
  inner.className = "para-table-inner";

  const meta = document.createElement("div");
  meta.className = "para-table-meta";
  const noteBtn = document.createElement("button");
  noteBtn.type = "button";
  noteBtn.className = "para-table-note-btn";
  noteBtn.textContent = "＋ ノート";
  noteBtn.title = "この表にコメントを追加";
  meta.appendChild(noteBtn);
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "para-table-del-btn";
  delBtn.innerHTML = ICON_X;
  delBtn.title = "この表を削除";
  meta.appendChild(delBtn);
  inner.appendChild(meta);

  const table = document.createElement("table");
  table.className = "para-table-el";
  // 表自体はcontenteditable="true"の島にして、セルの文字をそのまま書き換えられるようにする
  // （外側の.para-tableは行・列の追加/削除UIが無いままなのでcontenteditable="false"のまま。
  // 2026-09、「表を挿入」ボタン追加に合わせてMarkdown取り込みの表も含め編集可能にした）。
  table.contentEditable = "true";
  if (header && header.length) {
    const thead = document.createElement("thead");
    const tr = document.createElement("tr");
    header.forEach((cell, i) => {
      const th = document.createElement("th");
      th.innerHTML = window.MdParser ? MdParser.inlineToHtml(cell) : escapeHtml(cell);
      if (aligns && aligns[i]) th.style.textAlign = aligns[i];
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    table.appendChild(thead);
  }
  const tbody = document.createElement("tbody");
  (rows || []).forEach((row) => {
    const tr = document.createElement("tr");
    row.forEach((cell, i) => {
      const td = document.createElement("td");
      td.innerHTML = window.MdParser ? MdParser.inlineToHtml(cell) : escapeHtml(cell);
      if (aligns && aligns[i]) td.style.textAlign = aligns[i];
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  inner.appendChild(table);
  wrap.appendChild(inner);

  return wrap;
}

function bindTableParaEvents(wrap) {
  const noteBtn = wrap.querySelector(".para-table-note-btn");
  noteBtn.onclick = () => {
    pendingTarget = { type: "table", paraEl: wrap };
    openPopover(noteBtn.getBoundingClientRect());
  };
  wrap.querySelector(".para-table-del-btn").onclick = () => deletePara(wrap);
}

function addTableNote(paraEl, text, color) {
  addNoteToAnchor(paraEl.dataset.paraId, text, color);
  ensureTableNoteBadge(paraEl);
}

function ensureTableNoteBadge(paraEl) {
  const notesRow = paraEl.querySelector(".para-table-notes");
  if (notesRow.querySelector(".note-anchor")) return;
  const badge = document.createElement("span");
  badge.className = "note-anchor tbl-note-anchor";
  badge.dataset.anchorId = paraEl.dataset.paraId;
  const sup = document.createElement("sup");
  sup.className = "note-num";
  badge.appendChild(sup);
  notesRow.appendChild(badge);
}

// ---- 水平線ブロック（Markdownの--- 区切り線） ----
function buildHrParaEl(paraId) {
  const wrap = document.createElement("div");
  wrap.className = "para para-hr para-opaque";
  wrap.contentEditable = "false";
  wrap.dataset.paraId = paraId;
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "para-hr-del-btn";
  delBtn.innerHTML = ICON_X;
  delBtn.title = "この区切り線を削除";
  wrap.appendChild(delBtn);
  wrap.appendChild(document.createElement("hr"));
  return wrap;
}
function bindHrParaEvents(wrap) {
  wrap.querySelector(".para-hr-del-btn").onclick = () => deletePara(wrap);
}

// ---- 改ページブロック（Markdownの改ページ＝HTMLコメントpagebreakの1行。Wordの改ページ相当） ----
// 画面では点線と「改ページ」の文字を出すだけの.para-opaqueブロック（区切り線と同じ作り・同じ×ボタン）。
// 実際にページを分けるのはPDF化（buildPrintDocの.print-pagebreak）とWord書き出し（blockToDocx）。
// idの連番は区切り線と同じhrIdSeqを共用する（"pb"接頭辞で区別）。これで.jsonの保存項目が増えず、
// 改ページ導入前の.jsonもそのまま読める。
// 後ろに印刷する中身（文字のある段落・画像・表・区切り線）が何も無い改ページか。そういう末尾の改ページは
// 最後に白紙ページが1枚できるだけなので、PDF化とWord書き出しでは出さない（後ろが空の段落や別の改ページだけ
// の場合も同じ。途中に連続する改ページ＝白紙ページを意図的に挟む使い方は、後ろに中身があるので影響しない）。
function isTrailingPageBreak(paraEl) {
  for (let n = paraEl.nextElementSibling; n; n = n.nextElementSibling) {
    if (!n.classList.contains("para") || n.classList.contains("para-pagebreak")) continue;
    if (n.classList.contains("para-opaque") || n.textContent.trim() !== "") return false;
  }
  return true;
}
function buildPageBreakParaEl(paraId) {
  const wrap = document.createElement("div");
  wrap.className = "para para-pagebreak para-opaque";
  wrap.contentEditable = "false";
  wrap.dataset.paraId = paraId;
  const delBtn = document.createElement("button");
  delBtn.type = "button";
  delBtn.className = "para-hr-del-btn para-pagebreak-del-btn";   // 見た目は区切り線の×ボタンと共通
  delBtn.innerHTML = ICON_X;
  delBtn.title = "この改ページを削除";
  wrap.appendChild(delBtn);
  const mark = document.createElement("div");
  mark.className = "para-pagebreak-mark";
  mark.textContent = "改ページ";
  wrap.appendChild(mark);
  return wrap;
}
function bindPageBreakParaEvents(wrap) {
  wrap.querySelector(".para-pagebreak-del-btn").onclick = () => deletePara(wrap);
}

// ---- 見出し・引用・コード・リスト項目（テキスト型ブロック。注釈・ホバー削除は既存の仕組みがそのまま効く） ----
function buildHeadingParaEl(level, innerHtml) {
  const el = document.createElement("div");
  el.className = `para para-h${level}`;
  el.innerHTML = innerHtml || "<br>";
  return el;
}
function buildQuoteParaEl(innerHtml) {
  const el = document.createElement("div");
  el.className = "para para-quote";
  el.innerHTML = innerHtml || "<br>";
  return el;
}
function buildCodeParaEl(text) {
  const el = document.createElement("div");
  el.className = "para para-code";
  el.textContent = text || "";
  if (!text) el.innerHTML = "<br>";
  return el;
}
function buildListItemParaEl(ordered, displayNum, indentLevel, innerHtml) {
  const el = document.createElement("div");
  el.className = "para para-li";
  el.dataset.indentLevel = String(indentLevel || 0);
  el.dataset.hanging = "1";
  const markerText = ordered ? `${displayNum || 1}. ` : "• ";
  el.innerHTML = `<span class="li-marker" contenteditable="false">${escapeHtml(markerText)}</span>${innerHtml || ""}`;
  return el;
}

// ---- Markdown取り込み（md-parser.jsのブロック配列 → #docのDOM） ----
function buildBlockEl(b) {
  if (b.type === "heading") return buildHeadingParaEl(Math.min(Math.max(b.level, 1), 6), MdParser.inlineToHtml(b.text));
  if (b.type === "paragraph") {
    const el = document.createElement("div");
    el.className = "para";
    el.innerHTML = MdParser.inlineToHtml(b.text) || "<br>";
    return el;
  }
  if (b.type === "blockquote") return buildQuoteParaEl(MdParser.inlineToHtml(b.text));
  if (b.type === "code") return buildCodeParaEl(b.text);
  if (b.type === "li") return buildListItemParaEl(b.ordered, b.displayNum, b.indentLevel, MdParser.inlineToHtml(b.text));
  if (b.type === "hr") return buildHrParaEl("hr" + hrIdSeq++);
  if (b.type === "pagebreak") return buildPageBreakParaEl("pb" + hrIdSeq++);
  if (b.type === "table") return buildTableParaEl("tbl" + tableIdSeq++, b.header, b.aligns, b.rows);
  if (b.type === "image") return buildImageParaEl("img" + imageIdSeq++, b.url);
  return null;
}

const SELF_SPACING_TYPES = new Set(["image", "hr", "table"]);

// blocks（MdParserの出力）を.paraの並びへ組み立てて返す。全置換（importMarkdownBlocks）と
// カーソル位置への挿入（insertMarkdownBlocks）で同じ余白の入れ方を共有するために切り出した。
function buildMarkdownBlocksFragment(blocks) {
  const frag = document.createDocumentFragment();
  let lastEl = null;

  // 見出し・段落・引用・コード・表・画像・水平線の切れ目に、以前は空行ぶんの空段落（line-height
  // まるまる1行分の余白）を自動で挟んでいたが、Enterで改行していない箇所まで間延びして見える
  // という指摘を受けて廃止した（2026-09）。段落間の余白はCSS側の.para margin-bottomという
  // 一定量に統一し、それ以上の余白が欲しい時はユーザーが実際に空行（Enter）を打つ、という
  // 「見た目どおりの余白」にする。docToMarkdown側は元々この空段落の有無に頼らずブロックの型だけで
  // 空行の要不要を組み立て直しており（空文字の段落は書き出し時に読み飛ばす）、この変更の影響を受けない。
  blocks.forEach((b) => {
    const el = buildBlockEl(b);
    if (!el) return;
    frag.appendChild(el);
    lastEl = el;
  });

  return { frag, lastEl };
}

// 画像・表・水平線（contenteditable="false"のブロック）の中のボタンを配線し直す。
// bind*はどれもonclickの代入なので、既に配線済みの要素へ再実行しても二重登録にならない。
function bindOpaqueParaEvents() {
  doc.querySelectorAll(".para-image").forEach(bindImageParaEvents);
  doc.querySelectorAll(".para-table").forEach(bindTableParaEvents);
  doc.querySelectorAll(".para-hr").forEach(bindHrParaEvents);
  doc.querySelectorAll(".para-pagebreak").forEach(bindPageBreakParaEvents);
}

function importMarkdownBlocks(blocks) {
  const { frag, lastEl } = buildMarkdownBlocksFragment(blocks);

  if (!lastEl) {
    const empty = document.createElement("div");
    empty.className = "para";
    empty.innerHTML = "<br>";
    frag.appendChild(empty);
  } else if (lastEl.classList.contains("para-opaque")) {
    // 末尾が画像・表・水平線だと続きを打つ場所が無くなるため、空の段落を1つ足す。
    const trailing = document.createElement("div");
    trailing.className = "para";
    trailing.innerHTML = "<br>";
    frag.appendChild(trailing);
  }

  doc.innerHTML = "";
  doc.appendChild(frag);
  notesByAnchor.clear();
  anchorIdSeq = 1;
  replyIdSeq = 1;
  bindOpaqueParaEvents();
  renumberAndLayout();
  updatePlaceholder();
  autoSaveDebounced();
  initUndoHistory();   // 本文を丸ごと置き換える＝別の文書を開いた扱いなので、履歴もリセットする
}

// blocksをカーソルのある段落の直後へ挿入する（既にある本文・サイドノートは残す）。
// 段落の途中にカーソルがあっても、ブロック単位なので「その段落の後ろ」へ入る（貼り付け位置の
// 文中に割り込む挙動は持たない）。戻り値は挿入したブロック数（0なら何も入らなかった）。
function insertMarkdownBlocks(blocks) {
  const { frag, lastEl } = buildMarkdownBlocksFragment(blocks);
  if (!lastEl) return 0;
  // 末尾が画像・表・水平線のままだと、その後ろに文字を打つ場所が無くなる。
  if (lastEl.classList.contains("para-opaque")) {
    const trailing = document.createElement("div");
    trailing.className = "para";
    trailing.innerHTML = "<br>";
    frag.appendChild(trailing);
  }
  const inserted = frag.childNodes.length;

  const anchorPara = getCurrentParaOrLast();
  if (anchorPara && doc.contains(anchorPara)) {
    const wasEmpty = !anchorPara.classList.contains("para-opaque") &&
      anchorPara.textContent.trim() === "" && !anchorPara.querySelector(".note-anchor");
    anchorPara.after(frag);
    if (wasEmpty) anchorPara.remove();   // 貼り付け前の空段落を残さない
  } else {
    doc.appendChild(frag);
  }

  bindOpaqueParaEvents();
  renumberAndLayout();
  updatePlaceholder();
  autoSaveDebounced();
  return inserted;
}

// Markdown全文を取り込んで本文を丸ごと置き換える（「開く」で.jsonを開く時と同じ「全置換」の考え方）。
// タイトル欄（＝保存時のファイル名）は常にfallbackTitle（実際に開いたファイル名）を使う。
// 先頭のH1見出しは本文とは別物の可能性がある（ファイル名と見出しが一致しないmdファイルもあるため）
// ので、タイトル欄には取り込まず、そのまま本文の見出しとして残す。
function importMarkdownText(text, fallbackTitle) {
  if (!window.MdParser) { setStatus("Markdownパーサーの読み込みに失敗しました。"); return; }
  const blocks = MdParser.parseMarkdownBlocks(text);
  titleInput.value = fallbackTitle || "";
  importMarkdownBlocks(blocks);
  setStatus(`Markdownを取り込みました（${blocks.length}ブロック）。`);
}

// ---- 段落ホバー時の操作（＋画像／×削除） ----
const paraHoverEl = document.getElementById("paraHover");
const paraHoverFileInput = document.getElementById("paraHoverFile");
const paraHoverDelBtn = document.getElementById("paraHoverDel");
let hoveredPara = null;

function showParaHover(para) {
  cancelParaHoverHide();
  if (para === hoveredPara) return;
  hoveredPara = para;
  const pRect = para.getBoundingClientRect();
  const hostRect = docLeftEl.getBoundingClientRect();
  paraHoverEl.style.top = `${pRect.top - hostRect.top - 4}px`;
  paraHoverEl.hidden = false;
}
function hideParaHover() {
  hoveredPara = null;
  paraHoverEl.hidden = true;
}

let paraHoverHideTimer = null;
function scheduleParaHoverHide() {
  clearTimeout(paraHoverHideTimer);
  paraHoverHideTimer = setTimeout(hideParaHover, 400);
}
function cancelParaHoverHide() {
  clearTimeout(paraHoverHideTimer);
}

doc.addEventListener("mouseover", (e) => {
  const para = e.target.closest(".para");
  // オペーク型ブロック（画像・表・水平線）は専用の削除ボタンを自身の中に持つため対象外にする。
  if (para && !para.classList.contains("para-opaque")) showParaHover(para);
});
doc.addEventListener("mouseout", scheduleParaHoverHide);
paraHoverEl.addEventListener("mouseenter", cancelParaHoverHide);
paraHoverEl.addEventListener("mouseleave", scheduleParaHoverHide);

paraHoverFileInput.onchange = (e) => {
  const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
  paraHoverFileInput.value = "";
  if (!files.length || !hoveredPara) return;
  insertImageFilesAfter(files, hoveredPara);
};

paraHoverDelBtn.onclick = () => {
  if (hoveredPara) deletePara(hoveredPara);
};

// 段落（テキスト・画像・表・水平線いずれも）を1つ削除する。文書は常に最低1つの.paraを持つ、
// というresetDoc()以来の前提を守るため、残り1つになる場合は削除せず空のテキスト段落に戻す。
function deletePara(para) {
  const remaining = doc.querySelectorAll(".para").length;
  if (remaining <= 1) {
    para.className = "para";
    para.removeAttribute("data-para-id");
    para.removeAttribute("data-indent-level");
    para.removeAttribute("data-hanging");
    para.removeAttribute("contenteditable");
    para.removeAttribute("style");   // 配置・インデント・ぶら下げ・スタイルの見た目もリセットする
    delete para.dataset.align;
    delete para.dataset.style;
    delete para.dataset.numbered;
    para.innerHTML = "<br>";
  } else {
    para.remove();
  }
  hideParaHover();
  updatePlaceholder();
  renumberAndLayout();
  autoSaveDebounced();
}

// Ctrl+B / Ctrl+U で選択範囲を **太字** / <u>下線</u> に囲む（ノート入力欄）
function wrapSelection(textarea, before, after) {
  const start = textarea.selectionStart, end = textarea.selectionEnd;
  const value = textarea.value;
  const selected = value.slice(start, end);
  const insertion = before + selected + after;
  textarea.focus();
  textarea.setSelectionRange(start, end);
  const inserted = document.execCommand && document.execCommand("insertText", false, insertion);
  if (!inserted) textarea.value = value.slice(0, start) + insertion + value.slice(end);
  const selStart = start + before.length;
  textarea.setSelectionRange(selStart, selStart + selected.length);
}
popoverInput.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && (e.key === "b" || e.key === "B")) { e.preventDefault(); wrapSelection(popoverInput, "**", "**"); return; }
  if (mod && (e.key === "u" || e.key === "U")) { e.preventDefault(); wrapSelection(popoverInput, "<u>", "</u>"); return; }

  // ノート入力欄が空のままCtrl+C／Ctrl+X／Delete・Backspaceが来た場合は、ノートを書くつもりではなく
  // 選んだ元のテキストそのものへの操作（コピー・切り取り・削除）だと見なして横取りする。
  // フォーカスがポップオーバーのinputへ移った直後はCtrl+C等がこのinput自身（＝空文字）に働いてしまい、
  // 選択した本文テキストをコピー・削除できなくなってしまうため。
  if (popoverInput.value !== "" || !pendingTarget) return;

  if (mod && (e.key === "c" || e.key === "C")) {
    e.preventDefault();
    copyPendingTargetText();
    return;
  }
  if (pendingTarget.type !== "text") return;   // 切り取り・削除は本文テキスト選択のみ対応（PDFテキストは読み取り専用のため）

  if (mod && (e.key === "x" || e.key === "X")) {
    e.preventDefault();
    lastCopiedText = pendingTarget.range.toString();
    lastCopiedWasWholeParagraph = pendingTarget.isWholeParagraph;
    runDocCommandOnPendingRange("cut");
    closePopover();
  } else if (e.key === "Delete" || e.key === "Backspace") {
    e.preventDefault();
    runDocCommandOnPendingRange("delete");
    closePopover();
  }
});

// ポップオーバー表示中のCtrl+C：保存済みのpendingTarget（選択時点でcloneした元のテキスト）をコピーする。
// "text"（本文）はexecCommand("copy")経由、"pdftext"（PDFテキストレイヤー）は引用文字列を直接書き込む。
function copyPendingTargetText() {
  if (pendingTarget.type === "text") {
    runDocCommandOnPendingRange("copy");
    lastCopiedText = pendingTarget.range.toString();
    lastCopiedWasWholeParagraph = pendingTarget.isWholeParagraph;
    popoverInput.focus({ preventScroll: true });   // ノートを書き続けられるよう、コピー後はinputへフォーカスを戻す
  } else if (pendingTarget.type === "pdftext") {
    if (pendingTarget.quote) navigator.clipboard.writeText(pendingTarget.quote).catch(() => {});
  }
}

// #doc側のフォーカスと選択範囲を、選択時点で保存したRangeへ戻した上でcopy/cut/deleteを実行する。
// execCommand経由にすることで、#docのinputイベント（renumberAndLayout・自動保存・
// それに相乗りする独自Undo/Redoの記録）に自然に乗る（段落挿入と同じ考え方）。
// {preventScroll:true}が無いと、長い文書の下の方で操作した時にfocus()の既定動作で
// #doc（本文全体を包む1つの巨大なcontenteditable）の先頭が画面内に来るようスクロールされてしまい、
// 文書の先頭へ戻ったように見えてしまう。
function runDocCommandOnPendingRange(command) {
  doc.focus({ preventScroll: true });
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(pendingTarget.range);
  document.execCommand(command);
}

doc.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); insertNewParagraph(); return; }
  // 表のセル内でのTab／Shift+Tabは、次／前のセルへ移動する（Excel・Wordと同じ操作感）。
  // ネイティブのcontenteditableテーブルにはこの挙動が無いため自前で実装する。表は
  // contentEditable=falseの外殻(.para-table)の中にcontentEditable=trueの<table>だけがある
  // 構造なので、focusは常に#doc側のまま＝e.targetは使えず、選択範囲から現在のセルを辿る
  // （行・列の追加/削除UIは無いので、最後のセルでのTabは何もしない）。
  if (e.key === "Tab") {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const node = sel.getRangeAt(0).startContainer;
    const cell = (node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement)?.closest("td, th");
    if (!cell) return;
    e.preventDefault();
    const table = cell.closest("table");
    const cells = Array.from(table.querySelectorAll("td, th"));
    const target = cells[cells.indexOf(cell) + (e.shiftKey ? -1 : 1)];
    if (!target) return;
    const r = document.createRange();
    r.selectNodeContents(target);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
    return;
  }
  // Ctrl+Z/Ctrl+Yはここでは何も処理しない＝document.addEventListener("keydown", ...)側の
  // 独自Undo/Redo（initUndoHistory等）が拾う（本文はブラウザのネイティブundoの対象にはしない）。
});

// Enterで新しい.paraを作る。見出し・引用等の途中でEnterしても常にプレーンな段落が続く
// （構造の変更はしない・軽い手直しに留める、というこのアプリの前提に合わせた仕様）が、
// 箇条書き（.para-li）だけは例外でリストを継続する（2026-09追加。inheritParaFormat内の
// continueBulletList参照。空の箇条書きでEnterした場合は標準的なエディタと同様にリストを抜ける）。
function insertNewParagraph() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!doc.contains(range.commonAncestorContainer)) return;
  if (rangeOverlapsLockedAnchor(range)) return;

  // execCommand("insertHTML")に段落の分割を任せると、
  //   ・段落が既に空の状態でもう一度Enterを押しても2つ目の空段落が生まれない
  //     （2026-09-13指摘：Enterを2回続けても空行が増えない）
  //   ・段落の途中にカーソルを置いてEnterで割ると「前半／余分な空段落／後半」の3つになる
  //     （同日、上の修正時に発覚した別バグ）
  // という不具合があったため、この2パターン（段落が空、またはカーソルより後ろに何か残っている）
  // だけは自前のRange操作で確実に2つに割る（ブラウザのネイティブundoの対象にはならないが、
  // 独自のUndo/Redoは対象にするため下でinputイベントを手動発火してautoSave経由の記録に乗せる）。
  // カーソルが段落の末尾にあるだけの最も多い操作は、これまで通りexecCommand経由で処理する。
  const currentPara = getCurrentPara();
  if (currentPara && range.collapsed) {
    const tailRange = document.createRange();
    tailRange.setStart(range.startContainer, range.startOffset);
    if (currentPara.lastChild) tailRange.setEndAfter(currentPara.lastChild);
    else tailRange.setEnd(currentPara, 0);
    const isEmpty = currentPara.textContent === "";
    const hasTail = tailRange.toString().length > 0;
    if (isEmpty || hasTail) {
      const afterFragment = tailRange.extractContents();
      const newPara = document.createElement("div");
      newPara.className = "para";
      newPara.appendChild(afterFragment);
      if (!newPara.hasChildNodes()) newPara.innerHTML = "<br>";
      if (!currentPara.hasChildNodes()) currentPara.innerHTML = "<br>";
      currentPara.after(newPara);
      inheritParaFormat(currentPara, newPara);
      const r = document.createRange();
      // continueBulletList()が箇条書きマーカーをnewParaの先頭に足していたら、
      // カーソルはマーカー（編集不可）の後ろ＝1番目の子から始める。
      r.setStart(newPara, newPara.classList.contains("para-li") ? 1 : 0);
      r.collapse(true);
      sel.removeAllRanges();
      sel.addRange(r);
      doc.dispatchEvent(new Event("input"));
      return;
    }
  }

  document.execCommand("insertHTML", false, '<div class="para" data-new-para="1"><br></div>');
  const newPara = doc.querySelector('.para[data-new-para="1"]');
  if (!newPara) return;
  newPara.removeAttribute("data-new-para");
  if (currentPara) inheritParaFormat(currentPara, newPara);

  const r = document.createRange();
  r.setStart(newPara, newPara.classList.contains("para-li") ? 1 : 0);
  r.collapse(true);
  sel.removeAllRanges();
  sel.addRange(r);
}

// 見出し・引用・リスト項目・書式ツールバーのインデント／ぶら下げインデントは、印刷（PDF化）側の
// 表示ロジックで使う（1em ≒ 全角1文字の近似。画面側も同じ1em刻みでpadding-left/text-indentを
// 当てている＝style.css参照）。
const INDENT_STEP_EM = 1;

function getCurrentPara() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return null;
  let node = sel.getRangeAt(0).commonAncestorContainer;
  if (node.nodeType !== 1) node = node.parentElement;
  return node ? node.closest(".para") : null;
}

// ---- 本文（#doc）の書式ツールバー：配置／インデント／ぶら下げ／太字下線／傍点／スタイル
// （sidenote-pdf-docから移植）----
// 配置・インデント・ぶら下げ・スタイルは「段落」の属性として扱う（カーソルのある1段落、
// または選択範囲が複数段落にまたがる場合はその全段落）。太字・下線・傍点だけは選択した文字への
// 適用にする。画像・表・水平線（.para-opaque）はテキストの書式という性質上、対象から外す。
// 段落pの内容が選択範囲rangeと実際に重なっているか（両端が触れているだけ＝実際には0文字の
// 重なりは除く）。range.intersectsNode(p)は使わない：ある段落をちょうど末尾まで選択した時
// （triple-clickでの1段落選択が典型）、選択範囲の終端が「次の段落の先頭（offset 0）」という
// 形で表現されることがあり、その場合intersectsNodeは次の段落にも触れているとみなしてtrueを
// 返してしまう（次の段落にも書式が漏れて適用されるバグになる）。両端の厳密な前後比較なら
// この「触れているだけ」のケースを正しく除外できる。
function paraOverlapsRange(p, range) {
  const pRange = document.createRange();
  pRange.selectNodeContents(p);
  const startsBeforeParaEnds = range.compareBoundaryPoints(Range.END_TO_START, pRange) < 0;
  const endsAfterParaStarts = range.compareBoundaryPoints(Range.START_TO_END, pRange) > 0;
  return startsBeforeParaEnds && endsAfterParaStarts;
}

function getTargetParas() {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
    const range = sel.getRangeAt(0);
    if (doc.contains(range.commonAncestorContainer)) {
      const paras = Array.from(doc.querySelectorAll(".para:not(.para-opaque)"))
        .filter((p) => paraOverlapsRange(p, range));
      if (paras.length) return paras;
    }
  }
  const cur = getCurrentPara();
  return cur && !cur.classList.contains("para-opaque") ? [cur] : [];
}

// data属性（唯一の情報源）から、画面表示用のインラインスタイルを組み立て直す。
// applyProjectData()での.json読み込み直後にも呼び、旧ファイル・手編集ファイルとの整合を保つ。
function applyParaStyles(paras) {
  paras.forEach((p) => {
    const level = Number(p.dataset.indentLevel || 0);
    const hangingChars = Number(p.dataset.hanging || 0);
    if (level > 0 || hangingChars > 0) {
      p.style.paddingLeft = `${level * INDENT_STEP_EM + hangingChars * HANGING_CHAR_EM}em`;
      p.style.textIndent = hangingChars > 0 ? `-${hangingChars * HANGING_CHAR_EM}em` : "0";
    } else {
      p.style.paddingLeft = "";
      p.style.textIndent = "";
    }
    p.style.textAlign = p.dataset.align || "";
    // 見出しの実際の見た目（文字サイズ・太字）は「項番設定」パネルのparaStyleSettingsから引く
    // （fontSizePtがnull＝本文と同じ文字サイズのまま、boldだけ独立して効かせる）。
    // 書式ツールバーの「文字サイズ」で個別に指定した段落（data-font-size-pt）は、見出しの既定より優先する。
    const styleLook = paraStyleSettings[p.dataset.style];
    const sizePt = p.dataset.fontSizePt ? Number(p.dataset.fontSizePt) : (styleLook && styleLook.fontSizePt) || null;
    p.style.fontSize = sizePt ? `${sizePt}pt` : "";
    p.style.fontWeight = (styleLook && styleLook.bold) ? "700" : "";
  });
}

// Enterで段落を分けた直後は、直前の段落の配置・インデント・ぶら下げ・文字サイズを引き継ぐ
// （準備書面等の番号付き項目を続けて書く時、行ごとに書式を付け直さずに済むようにするため）。
// 太字・下線は文字への書式なので対象外（新しい行の頭は素の状態から始まる）。
// スタイル（見出しH1〜H3）は引き継がない：見出しの途中でEnterしても常にプレーンな段落が続く、
// というこのアプリの前提（下のinsertNewParagraph側のコメント参照）に合わせる
// （2026-09、見出しボタンで付けた見出しだけEnter後も見出しのまま続いてしまう不具合を修正）。
// 加えて、直前の段落が箇条書き（.para-li）だった場合はリストを継続する（下部参照）。
function inheritParaFormat(fromPara, toPara) {
  ["indentLevel", "hanging", "align", "fontSizePt"].forEach((key) => {
    if (fromPara.dataset[key] !== undefined) toPara.dataset[key] = fromPara.dataset[key];
  });
  applyParaStyles([toPara]);
  continueBulletList(fromPara, toPara);
}

// 箇条書きのマーカー（contenteditable="false"のspan）を段落の先頭に差し込む。
// マーカーの直後が既に文字ノードでない場合（空の段落＝<br>だけ、等）はゼロ幅スペース(U+200B)
// だけのテキストノードを1つ挟んでおく：contenteditable=false要素の「境界ちょうど」に
// カーソルを置いた直後に入力すると、Chromeの既知の挙動で選択範囲そのものが失われ、次の1文字が
// 別の場所（文書の先頭等）へ入ってしまう不具合があった（2026-09、箇条書き継続直後に発覚。
// addTextNoteのゼロ幅スペース対策と同じ理由だが、あちらは1回限りの挿入操作の最中だけ使って
// すぐ除去するのに対し、ここはユーザーが実際に入力するまで残しておく必要がある）。
// 空のテキストノードでは同じ問題が再発したため、必ずゼロ幅スペースを使う。書き出し側
// （inlineNodeToMarkdown・buildPrintNode・collectInlineRuns）で除去するので本文には残らない。
function insertBulletMarker(p, markerText) {
  const marker = document.createElement("span");
  marker.className = "li-marker";
  marker.contentEditable = "false";
  marker.textContent = markerText;
  p.insertBefore(marker, p.firstChild);
  if (!marker.nextSibling || marker.nextSibling.nodeType !== Node.TEXT_NODE) {
    p.insertBefore(document.createTextNode("​"), marker.nextSibling);
  }
  return marker;
}

// 直前の段落が箇条書き（.para-li）だった場合の続き：文字が残っていれば同じ種類のマーカー
// （• そのまま／番号付きは+1）を新しい段落にも差し込んでリストを継続する。マーカーだけ（本文が
// 空）でEnterした場合は、標準的なエディタと同様にリストを抜ける（空の箇条書きが残り続けるのを
// 防ぐため、直前の段落側もただの段落に戻す）。見出し・引用等はこの対象に含めない
// （insertNewParagraph側のコメント通り、この2つ以外は常にプレーンな段落のままにする方針）。
function continueBulletList(fromPara, toPara) {
  if (!fromPara.classList.contains("para-li")) return;
  const marker = fromPara.querySelector(".li-marker");
  const markerText = marker ? marker.textContent : "";
  // ゼロ幅スペース(U+200B)はinsertBulletMarker()が入力安定化のために挟む目印なので、
  // 「本文が空か」の判定からは除く（残っているだけで「空でない」と誤判定されるのを防ぐ）。
  const restText = Array.from(fromPara.childNodes).filter((n) => n !== marker).map((n) => n.textContent).join("").replace(/​/g, "").trim();
  if (!restText) {
    if (marker) marker.remove();
    fromPara.classList.remove("para-li");
    return;
  }
  const orderedMatch = markerText.match(/^(\d+)\./);
  insertBulletMarker(toPara, orderedMatch ? `${Number(orderedMatch[1]) + 1}. ` : markerText);
  toPara.classList.add("para-li");
}

function applyAlign(align) {
  const paras = getTargetParas();
  if (!paras.length) return;
  paras.forEach((p) => { if (align === "left") delete p.dataset.align; else p.dataset.align = align; });
  applyParaStyles(paras);
  updateFormatToolbarState();
  autoSaveDebounced();
}
alignBtns.forEach((btn) => { btn.onclick = () => applyAlign(btn.dataset.align); });

function applyIndentStep(delta) {
  const paras = getTargetParas();
  if (!paras.length) return;
  paras.forEach((p) => {
    const level = Math.max(0, Math.min(INDENT_LEVEL_MAX, Number(p.dataset.indentLevel || 0) + delta));
    if (level === 0) delete p.dataset.indentLevel; else p.dataset.indentLevel = String(level);
    delete p.dataset.numbered;   // 手動で変えた段落は「項番を一括適用」の対象から外して保護する
  });
  applyParaStyles(paras);
  updateFormatToolbarState();
  autoSaveDebounced();
}
indentDecBtn.onclick = () => applyIndentStep(-1);
indentIncBtn.onclick = () => applyIndentStep(1);

// ぶら下げは0（なし）〜3文字の幅から選ぶ（インデントと同じ−／＋のステッパー式）。
function applyHangingStep(delta) {
  const paras = getTargetParas();
  if (!paras.length) return;
  paras.forEach((p) => {
    const chars = Math.max(0, Math.min(HANGING_MAX, Number(p.dataset.hanging || 0) + delta));
    if (chars === 0) delete p.dataset.hanging; else p.dataset.hanging = String(chars);
    delete p.dataset.numbered;   // 手動で変えた段落は「項番を一括適用」の対象から外して保護する
  });
  applyParaStyles(paras);
  updateFormatToolbarState();
  autoSaveDebounced();
}
hangingDecBtn.onclick = () => applyHangingStep(-1);
hangingIncBtn.onclick = () => applyHangingStep(1);

// 文字サイズは段落ごとにpt単位で個別指定できる（インデント・ぶら下げと同じ−／＋のステッパー式。
// FONT_SIZE_*定数はファイル冒頭で定義済み）。既定（未指定）に戻ると「既定」表示に戻し、
// data-font-size-pt自体を消す（インデントの0と同じ考え方）。見出し（H1〜H3）の既定サイズより
// 優先する（applyParaStyles参照）。
function applyFontSizeStep(delta) {
  const paras = getTargetParas();
  if (!paras.length) return;
  paras.forEach((p) => {
    const current = Number(p.dataset.fontSizePt) || FONT_SIZE_DEFAULT_PT;
    const next = Math.max(FONT_SIZE_MIN_PT, Math.min(FONT_SIZE_MAX_PT, current + delta));
    if (next === FONT_SIZE_DEFAULT_PT) delete p.dataset.fontSizePt; else p.dataset.fontSizePt = String(next);
  });
  applyParaStyles(paras);
  updateFormatToolbarState();
  autoSaveDebounced();
}
fontSizeDecBtn.onclick = () => applyFontSizeStep(-1);
fontSizeIncBtn.onclick = () => applyFontSizeStep(1);

// 見出しには2つの仕組みがある（footerの注記・headingSizeLabel参照）：
//   ①.para-hNクラス（Markdown取り込みが付ける。文字サイズ・太さ・上余白は「デザイン」のCSSが決める）
//   ②data-style属性（このツールバーのスタイルボタンが付ける。文字サイズ・太さは「カスタマイズ」の
//     見出しスタイル設定＝pt指定で、デザインの影響を受けない）
// 以前は、ボタンが常に②だけを付け外ししていたため、md取り込み由来の見出し（多くはファイル先頭の「# 題」）に
// 「H2」ボタンを使っても、クラスが.para-h1のまま②のサイズ（14pt）が上書きされるだけで、mdの「##」見出しとは
// 別の大きさになっていた。「本文」ボタンも②しか外さないので、クラスの見出し（H1の大きさ）が解除できなかった
// （2026-09指摘）。今は次のように振り分ける：
//   ・すでに.para-hNクラスを持つ段落、およびMarkdownモード中の段落 → ①で切り替える（クラスを付け替え、
//     ②のdata-styleは外す）。mdの「##」と同じ見た目になり、H2の上余白もデザインどおり乗る。
//     Markdownモードでは文字サイズ（pt指定）が.md書き出しに残らないため、常にこちらに揃える。
//   ・上記以外（通常モードの素の段落） → 従来どおり②（pt指定の書面レイアウト）。
const HEADING_CLASS_RE = /^para-h[1-6]$/;
function hasHeadingClass(p) {
  return Array.from(p.classList).some((c) => HEADING_CLASS_RE.test(c));
}
// スタイルは「本文」（見出しなし）とH1〜H3の排他選択（配置と同じ考え方）。
function applyStyle(styleKey) {
  const paras = getTargetParas();
  if (!paras.length) return;
  paras.forEach((p) => {
    if (markdownMode || hasHeadingClass(p)) {
      Array.from(p.classList).forEach((c) => { if (HEADING_CLASS_RE.test(c)) p.classList.remove(c); });
      delete p.dataset.style;
      if (styleKey) p.classList.add(`para-${styleKey}`);
    } else if (!styleKey) {
      delete p.dataset.style;
    } else {
      p.dataset.style = styleKey;
    }
  });
  applyParaStyles(paras);
  updateFormatToolbarState();
  autoSaveDebounced();
}
styleBtns.forEach((btn) => { btn.onclick = () => applyStyle(btn.dataset.style); });

// 箇条書き（・）／番号付き（1.）の追加・解除（トグル）。.para-liクラス自体はどちらも共通で、
// 種類は.li-markerの中身（数字始まりかどうか）で見分ける（docToMarkdown等の書き出し側と同じ判定）。
// 対象段落が既に全て同じ種類のリストなら解除、そうでなければその種類へ揃える（別の種類のリストや
// 素の段落が混ざっていた場合は、既存マーカーを置き換えてその種類へ統一する）。
function liOrderedMarker(p) {
  const marker = p.querySelector(".li-marker");
  return !!(marker && /^\d+\./.test(marker.textContent.trim()));
}
function isBulletListPara(p) { return p.classList.contains("para-li") && !liOrderedMarker(p); }
function isOrderedListPara(p) { return p.classList.contains("para-li") && liOrderedMarker(p); }

function applyListMarker(paras, ordered) {
  let n = 1;
  paras.forEach((p) => {
    delete p.dataset.style;   // 見出しとリストは同時に成立しないため解除する
    const oldMarker = p.querySelector(".li-marker");
    if (oldMarker) oldMarker.remove();
    insertBulletMarker(p, ordered ? `${n++}. ` : "• ");
    p.classList.add("para-li");
    if (!p.dataset.hanging) p.dataset.hanging = "1";   // 折り返しがマーカーの下に潜り込まないように
  });
}
function removeListMarker(paras) {
  paras.forEach((p) => {
    const marker = p.querySelector(".li-marker");
    if (marker) marker.remove();
    p.classList.remove("para-li");
  });
}
function toggleBulletList() {
  const paras = getTargetParas();
  if (!paras.length) return;
  if (paras.every(isBulletListPara)) removeListMarker(paras); else applyListMarker(paras, false);
  applyParaStyles(paras);
  updateFormatToolbarState();
  autoSaveDebounced();
}
bulletListBtn.onclick = toggleBulletList;

// 番号付き（1. 2. 3. …）。Enterで続きの段落を作った時の自動採番はcontinueBulletList側
// （マーカーの数字を見て+1する既存ロジック）がそのまま使えるので、ここでは初回の割り当てだけ行う。
function toggleOrderedList() {
  const paras = getTargetParas();
  if (!paras.length) return;
  if (paras.every(isOrderedListPara)) removeListMarker(paras); else applyListMarker(paras, true);
  applyParaStyles(paras);
  updateFormatToolbarState();
  autoSaveDebounced();
}
orderedListBtn.onclick = toggleOrderedList;

// 太字・下線は選択した文字へ（execCommand経由＝#docのinputイベントを発火し、autoSave経由の
// 独自Undo/Redoの対象にもなる）。
// 選択が折りたたまれている（カーソルだけ）場合はブラウザ標準の挙動として、以後タイプする文字に適用される。
function applyInlineFormat(cmd) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  if (!doc.contains(range.commonAncestorContainer)) return;
  if (!sel.isCollapsed && rangeOverlapsLockedAnchor(range)) return;   // 既存の注釈・画像等をまたぐ範囲には適用しない
  document.execCommand(cmd);
  updateFormatToolbarState();
  autoSaveDebounced();
}
boldBtn.onclick = () => applyInlineFormat("bold");
underlineBtn.onclick = () => applyInlineFormat("underline");

// 傍点は太字・下線と違いブラウザ標準のexecCommandが無いため、note-anchor（範囲選択→ロック）と
// 同じ考え方の自前実装にする：選択範囲を<span class="kenten">で囲む（execCommand("insertHTML")
// 経由で#docのinputイベントを発火させ、autoSave経由の独自Undo/Redoの対象にする）。
// 既に選択範囲がまるごと1つの.kentenと一致する場合は解除する
// （removeNoteFromAnchor()の「注釈を外して原文を書き戻す」と同じ手順）。
// 太字・下線と違い「以後の入力に適用」は持たない（execCommandの標準機能ではないため）ので、
// 範囲選択が無い（カーソルだけの）場合は何もしない。
function toggleKenten() {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
  const range = sel.getRangeAt(0);
  if (!doc.contains(range.commonAncestorContainer)) return;
  if (rangeOverlapsLockedAnchor(range)) return;

  const container = range.commonAncestorContainer;
  const containerEl = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
  const existingKenten = containerEl ? containerEl.closest(".kenten") : null;

  if (existingKenten && doc.contains(existingKenten) && existingKenten.textContent === range.toString()) {
    const text = existingKenten.textContent;
    const r = document.createRange();
    r.selectNode(existingKenten);
    sel.removeAllRanges();
    sel.addRange(r);
    const deleted = document.execCommand && document.execCommand("delete", false);
    const replaced = deleted && document.execCommand("insertText", false, text);
    if (!replaced) existingKenten.replaceWith(document.createTextNode(text));
  } else {
    const html = `<span class="kenten">${escapeHtml(range.toString())}</span>`;
    document.execCommand("insertHTML", false, html);
  }
  updateFormatToolbarState();
  autoSaveDebounced();
}
kentenBtn.onclick = toggleKenten;

// ツールバーのボタンをクリックしても#docのフォーカス・選択範囲を失わないようにする
// （失うと、どの段落・どの文字範囲に適用すべきか分からなくなるため。定番のmousedown+preventDefault）。
//
// ただし文字を選択した直後はmouseup→handleSelection()がノート追加ポップオーバーを開き、
// popoverInput.focus()が#doc側の選択範囲を消してしまう（window.getSelection()がポップオーバー内の
// 空選択になる）。この状態のまま配置・インデント・ぶら下げ・スタイル・太字・下線・傍点のどれを押しても
// 対象の段落・文字範囲が見つからず、ボタンが効かないように見えてしまう（2026-09発見の不具合）。
// ポップオーバーが開いたまま書式ボタンを押した＝ノート追加ではなく書式を選んだ、とみなし、
// クリックの実処理が走る前（mousedown時点）に選択範囲をpendingTarget.rangeから復元し、
// ポップオーバーは閉じる。
formatToolbarEl.addEventListener("mousedown", (e) => {
  if (!e.target.closest("button")) return;
  e.preventDefault();
  if (!popoverEl.hidden && pendingTarget && pendingTarget.type === "text") {
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(pendingTarget.range.cloneRange());
    closePopover();
  }
});

// 現在のカーソル位置（または選択）に応じて、ツールバーの状態（選択中の配置・ぶら下げ・スタイルの
// 強調表示、インデントの上下限での無効化、太字・下線の強調表示）を更新する。
function updateFormatToolbarState() {
  const paras = getTargetParas();
  const p = paras[0] || null;

  const align = p ? (p.dataset.align || "left") : "left";
  alignBtns.forEach((btn) => {
    btn.classList.toggle("active", !!p && btn.dataset.align === align);
    btn.disabled = markdownMode;
  });

  const hangingChars = p ? Number(p.dataset.hanging || 0) : 0;
  hangingLabel.textContent = hangingChars > 0 ? `${hangingChars}字` : "オフ";
  hangingDecBtn.disabled = markdownMode || !p || hangingChars <= 0;
  hangingIncBtn.disabled = markdownMode || !p || hangingChars >= HANGING_MAX;

  // インデントは箇条書き・番号付きの入れ子（Markdownの2字下げネスト）には反映されるため、
  // Markdownモードでもリスト項目にいる間だけは塞がない（配置・ぶら下げ・文字サイズ・傍点は
  // リスト項目でもMarkdownに反映されないため無条件に塞ぐ。docToMarkdown参照）。
  const indentLevel = p ? Number(p.dataset.indentLevel || 0) : 0;
  const indentBlockedByMd = markdownMode && !(p && p.classList.contains("para-li"));
  indentDecBtn.disabled = indentBlockedByMd || !p || indentLevel <= 0;
  indentIncBtn.disabled = indentBlockedByMd || !p || indentLevel >= INDENT_LEVEL_MAX;

  const fontSizePt = p ? Number(p.dataset.fontSizePt || FONT_SIZE_DEFAULT_PT) : FONT_SIZE_DEFAULT_PT;
  fontSizeLabel.textContent = p && p.dataset.fontSizePt ? `${fontSizePt}pt` : "既定";
  fontSizeDecBtn.disabled = markdownMode || !p || fontSizePt <= FONT_SIZE_MIN_PT;
  fontSizeIncBtn.disabled = markdownMode || !p || fontSizePt >= FONT_SIZE_MAX_PT;

  // 見出しはdata-style（ツールバー由来）か.para-hNクラス（md取り込み・applyStyle参照）のどちらかで持つ。
  // クラス側のH1〜H3もその見出しのボタンを強調する（H4〜H6はボタンが無いので、どれも強調しない）。
  const headingClassMatch = p ? /(?:^|\s)para-h([1-6])(?:\s|$)/.exec(p.className) : null;
  const styleKey = !p ? "" : p.dataset.style
    || (headingClassMatch ? (Number(headingClassMatch[1]) <= 3 ? `h${headingClassMatch[1]}` : "-") : "");
  styleBtns.forEach((btn) => btn.classList.toggle("active", !!p && (btn.dataset.style || "") === styleKey));
  bulletListBtn.classList.toggle("active", !!p && isBulletListPara(p));
  orderedListBtn.classList.toggle("active", !!p && isOrderedListPara(p));

  let boldActive = false, underlineActive = false;
  try {
    boldActive = document.queryCommandState("bold");
    underlineActive = document.queryCommandState("underline");
  } catch (err) { /* 選択が#docの外にある等、状態取得できない場合は非アクティブ扱い */ }
  boldBtn.classList.toggle("active", boldActive);
  underlineBtn.classList.toggle("active", underlineActive);

  // 傍点にはqueryCommandStateの対応が無いため、選択位置が.kentenの中かどうかを自前で見る。
  const sel2 = window.getSelection();
  const anchorNode = sel2 && sel2.rangeCount ? sel2.anchorNode : null;
  const anchorEl = anchorNode && (anchorNode.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode.parentElement);
  kentenBtn.classList.toggle("active", !!(anchorEl && doc.contains(anchorEl) && anchorEl.closest(".kenten")));
  kentenBtn.disabled = markdownMode;
}
document.addEventListener("selectionchange", () => {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && doc.contains(sel.getRangeAt(0).commonAncestorContainer)) {
    updateFormatToolbarState();
  }
});

// ---- コメント削除（スレッドの1件だけ削除／最後の1件を消したらロックも解除） ----
function removeNoteFromAnchor(anchor, anchorId, noteId) {
  const remaining = (notesByAnchor.get(anchorId) || []).filter((n) => n.id !== noteId);

  if (remaining.length > 0) {
    notesByAnchor.set(anchorId, remaining);
  } else {
    notesByAnchor.delete(anchorId);
    // スレッドが空になった＝ロック解除。画像・表はバッジを外すだけ（本体は残す）、
    // テキストは引用していた原文をそのまま書き戻して編集可能に戻す。
    // pdfモードのマーク（テキスト／点／矩形）はそもそも「原文を差し替える」概念が無い
    // （PDFページ自体は不変）ので、正本のpdfAnchorsから外してマーク要素を消すだけでよい
    // （sidenote-pdf-docから移植）。
    if (anchor.classList.contains("pdf-mark")) {
      pdfAnchors = pdfAnchors.filter((a) => a.anchorId !== anchorId);
      anchor.remove();
    } else if (anchor.classList.contains("img-note-anchor") || anchor.classList.contains("tbl-note-anchor")) {
      anchor.remove();
    } else {
      const contentSpan = anchor.querySelector("span");
      const text = contentSpan ? contentSpan.textContent : "";
      const range = document.createRange();
      range.selectNode(anchor);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      const replaced = document.execCommand && document.execCommand("insertText", false, text);
      if (!replaced) anchor.replaceWith(document.createTextNode(text));
    }
  }

  renumberAndLayout();
  updatePlaceholder();
  autoSaveDebounced();
}

// ---- 通し番号を振り直して、右側にサイドノートを配置する ----
// 貼り付けで複数行分の<div class="para">...</div>をまとめてinsertHTMLすると、カーソルが既存の
// （多くは最初の空の）.paraの中にあった場合、Chromeがそれらを兄弟として展開せず入れ子にしてしまうことが
// あるため、入れ子の.paraを見つけたら1階層引き上げて自己修復する（編集の度に呼ばれるのでここに置く）。
function flattenNestedParas(root) {
  let changed = true;
  while (changed) {
    changed = false;
    Array.from(root.children).forEach((el) => {
      if (!el.classList || !el.classList.contains("para")) return;
      const hasNestedPara = Array.from(el.children).some((c) => c.classList && c.classList.contains("para"));
      if (!hasNestedPara) return;
      const frag = document.createDocumentFragment();
      Array.from(el.childNodes).forEach((n) => frag.appendChild(n));
      el.replaceWith(frag);
      changed = true;
    });
  }
}

// モードに応じて振り分ける（呼び出し側は既存のまま「renumberAndLayout()」を呼べばよい。
// sidenote-pdf-docから移植）。
function renumberAndLayout() {
  if (currentMode === "pdf") { renumberAndLayoutPdf(); return; }
  renumberAndLayoutText();
}

function renumberAndLayoutText() {
  flattenNestedParas(doc);
  const anchors = Array.from(doc.querySelectorAll(".note-anchor"));
  // 画像・表ブロックがBackspace等でDOMごと消えた場合、notesByAnchorにそのIDだけ残ってしまうので、
  // 実際に文書内に存在するIDだけ残す（ゴミの蓄積・書き出し時の混入を防ぐ）。
  const liveAnchorIds = new Set(anchors.map((a) => a.dataset.anchorId));
  Array.from(notesByAnchor.keys()).forEach((id) => {
    if (!liveAnchorIds.has(id)) notesByAnchor.delete(id);
  });

  const ordered = anchors.map((anchor, i) => {
    const num = i + 1;
    const supEl = anchor.querySelector(".note-num");
    if (supEl) supEl.textContent = String(num);
    const anchorId = anchor.dataset.anchorId;
    return { num, mark: anchor, anchorId, notes: notesByAnchor.get(anchorId) || [] };
  });
  updateImageNoteButtons();
  updateTableNoteButtons();
  layoutSidenotes(ordered);
}

// pdfモード版：マークはページをまたいで#pdfViewer内に散らばっているので、DOM登場順ではなく
// 「ページ番号→ページ内での縦位置」で明示的に並べ替えてから通し番号を振る（sidenote-pdf-docから移植）。
function renumberAndLayoutPdf() {
  const marks = Array.from(pdfViewerEl.querySelectorAll(".pdf-mark"));
  const liveAnchorIds = new Set(marks.map((m) => m.dataset.anchorId));
  Array.from(notesByAnchor.keys()).forEach((id) => {
    if (!liveAnchorIds.has(id)) notesByAnchor.delete(id);
  });
  pdfAnchors = pdfAnchors.filter((a) => liveAnchorIds.has(a.anchorId));

  marks.sort((a, b) => {
    const pa = Number(a.closest(".pdf-page").dataset.pageIndex);
    const pb = Number(b.closest(".pdf-page").dataset.pageIndex);
    if (pa !== pb) return pa - pb;
    return a.getBoundingClientRect().top - b.getBoundingClientRect().top;
  });

  const ordered = marks.map((mark, i) => {
    const num = i + 1;
    // テキスト／点マークは要素自身のtextContentが番号（バッジそのものなので）。
    // 矩形マークだけは要素自体が枠線の四角なので、角に乗せた子バッジ(.pdf-mark-rect-num)に書く。
    const numEl = mark.classList.contains("pdf-mark-rect") ? mark.querySelector(".pdf-mark-rect-num") : mark;
    if (numEl) numEl.textContent = String(num);
    const anchorId = mark.dataset.anchorId;
    return { num, mark, anchorId, notes: notesByAnchor.get(anchorId) || [] };
  });
  layoutSidenotes(ordered);
}

// コメントが既に付いている画像・表は、右のサイドノートにある「＋ 返信」で追記できるので、
// 自身の「＋ ノート」ボタンは（紛らわしいので）隠す。コメントが0件に戻れば再表示する。
function updateImageNoteButtons() {
  doc.querySelectorAll(".para-image").forEach((el) => {
    const hasNotes = (notesByAnchor.get(el.dataset.paraId) || []).length > 0;
    const btn = el.querySelector(".para-image-note-btn");
    if (btn) btn.hidden = hasNotes;
  });
}
function updateTableNoteButtons() {
  doc.querySelectorAll(".para-table").forEach((el) => {
    const hasNotes = (notesByAnchor.get(el.dataset.paraId) || []).length > 0;
    const btn = el.querySelector(".para-table-note-btn");
    if (btn) btn.hidden = hasNotes;
  });
}

// 画像・表のサイドノートは、バッジ自体ではなく画像／表の上端に高さを揃える方が分かりやすいため、
// 位置決めだけは本体要素のrectを使う（通し番号・スレッドの紐付けはバッジ＝mark側のまま変えない）。
function getPositionRect(mark) {
  if (mark.classList.contains("img-note-anchor")) {
    const img = mark.closest(".para-image")?.querySelector(".para-image-img");
    if (img) return img.getBoundingClientRect();
  }
  if (mark.classList.contains("tbl-note-anchor")) {
    const table = mark.closest(".para-table")?.querySelector(".para-table-el");
    if (table) return table.getBoundingClientRect();
  }
  return mark.getBoundingClientRect();
}

function layoutSidenotes(ordered) {
  docRightEl.innerHTML = "";
  if (ordered.length === 0) {
    const sample = document.createElement("div");
    sample.className = "sidenote-card sidenote-sample";
    sample.setAttribute("aria-hidden", "true");
    sample.style.top = "20px";
    sample.innerHTML = '<span class="sidenote-num">1</span>' +
      '<span class="sidenote-text">（例）ここに相手方や自分へのコメントが入ります</span>';
    docRightEl.appendChild(sample);
    return;
  }
  // 原点は「今表示している方」の左カラムの上端（本文モードは#doc、pdfモードは#pdfViewer）。
  const originTop = (currentMode === "pdf" ? pdfViewerEl : doc).getBoundingClientRect().top;
  const GAP = 20;
  let prevBottom = -Infinity;

  ordered.forEach((n) => {
    const card = document.createElement("div");
    card.className = "sidenote-card";

    const numEl = document.createElement("span");
    numEl.className = "sidenote-num";
    numEl.textContent = String(n.num);
    card.appendChild(numEl);

    n.notes.forEach((note) => {
      const entry = document.createElement("div");
      entry.className = "sidenote-entry";

      const textEl = document.createElement("span");
      textEl.className = "sidenote-text";
      textEl.style.color = AUTHOR_COLOR_HEX[note.color] || AUTHOR_COLOR_HEX.black;
      const namePrefix = showAuthorLabelByColor[note.color] ? `<strong>${escapeHtml(colorLabel(note.color))}：</strong>` : "";
      textEl.innerHTML = namePrefix + formatNoteText(note.text);

      const rmBtn = document.createElement("button");
      rmBtn.className = "sidenote-rm";
      rmBtn.type = "button";
      rmBtn.innerHTML = ICON_X;
      rmBtn.title = n.notes.length > 1 ? "このコメントを削除" : "このコメントを削除（ロックも解除）";
      rmBtn.onclick = () => removeNoteFromAnchor(n.mark, n.anchorId, note.id);

      entry.appendChild(textEl);
      entry.appendChild(rmBtn);
      card.appendChild(entry);
    });

    const replyBtn = document.createElement("button");
    replyBtn.type = "button";
    replyBtn.className = "sidenote-reply-btn";
    replyBtn.textContent = "＋ 返信";
    replyBtn.title = "この一文にコメントを追加する";
    replyBtn.onclick = () => {
      pendingTarget = { type: "reply", anchorId: n.anchorId };
      openPopover(replyBtn.getBoundingClientRect());
    };
    card.appendChild(replyBtn);

    docRightEl.appendChild(card);

    const r = getPositionRect(n.mark);
    let top = r.top - originTop;
    if (top < prevBottom + GAP) top = prevBottom + GAP;
    card.style.top = `${top}px`;
    prevBottom = top + card.getBoundingClientRect().height;
  });
}

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => renumberAndLayout(), 150);
});

// ================================================================
// ---- PDFモード（「開く」で.pdfを選んだ時。PDF.js／vendor/pdfjs、Apache License 2.0。
//       sidenote-pdf／sidenote-pdf-docから移植） ----
// 表示（doc-left）を#docから#pdfViewerへ切り替え、既存のPDFファイルへサイドノートを付けられるように
// する。右側（サイドノート欄）・ポップオーバー・色選択・返信スレッド（notesByAnchor）は本文モードと
// 完全に共通のまま使う。異なるのは「本文をどう表示し、どこにノートを固定するか」の部分だけ
// （renumberAndLayoutPdf・buildPrintDocPdfは既に上で定義済み／ここでは表示とノート追加を実装する）。
// ================================================================

function setMode(mode) {
  currentMode = mode;
  const isPdf = mode === "pdf";
  docStackEl.hidden = isPdf;
  pdfViewerEl.hidden = !isPdf;
  docLabelEl.textContent = isPdf ? "PDF" : "本文（Markdown・テキスト・画像）";
  // 本文用の編集メニュー（書式ツールバー）・.md/.docx書き出しはPDFページには適用できないため、
  // pdfモードでは隠す（編集メニューの表示/非表示ユーザー設定と合わせて決めるのでapplyEditMenuVisibility()経由）。
  applyEditMenuVisibility();
  saveMdBtn.hidden = isPdf;
  saveDocxBtn.hidden = isPdf;
  // モード切り替え時に前の状態を持ち越さない（本文モード側のホバーアイコン）。
  paraHoverEl.hidden = true;
  hoveredPara = null;
}

// ---- 「開く」で.pdfを選んだ時の入口 ----
function openPdfFile(file) {
  setStatus("PDFを読み込み中…");
  const reader = new FileReader();
  reader.onload = () => {
    startNewPdfProject(reader.result, file.name).catch((err) => {
      console.error(err);
      setStatus("PDFの読み込みに失敗しました。ファイルが壊れているか、対応していない形式の可能性があります。");
    });
  };
  reader.onerror = () => setStatus("PDFの読み込みに失敗しました。");
  // 画像と同じくdata URLとして丸ごと保持する（.json保存にそのまま埋め込むため）。
  reader.readAsDataURL(file);
}

// PDFを開く＝別の案件を新規に始める扱い（本文モードの「新しい作業」と同じ考え方）。
async function startNewPdfProject(dataUrl, filename) {
  notesByAnchor.clear();
  anchorIdSeq = 1;
  replyIdSeq = 1;
  pdfAnchors = [];
  titleInput.value = filename.replace(/\.pdf$/i, "");
  openedMdFilename = null;
  openedMdFileHandle = null;
  updateOpenedFileNote();
  await renderPdfFromDataUrl(dataUrl, []);
  setStatus(`PDFを開きました：${filename}`);
  autoSaveDebounced();
}

// PDF.js（vendor/pdfjs、Apache License 2.0。THIRD_PARTY_NOTICES.md参照）はESモジュール配布のみだが、
// 動的import()はクラシックスクリプト（app.js自体）からでも使えるため、別途<script type="module">の
// 橋渡しタグは用意せず、初めてPDFが必要になった時にここで読み込む（毎回のページ読み込みで1.7MB超の
// pdf.jsを無条件に取りに行かずに済む＝PDF機能を使わない人には影響が無い）。結果はキャッシュし、
// 2回目以降は再取得しない。
let pdfjsLibPromise = null;
function loadPdfjsLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import("./vendor/pdfjs/pdf.min.mjs").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = "vendor/pdfjs/pdf.worker.min.mjs";
      return mod;
    });
  }
  return pdfjsLibPromise;
}

// data:application/pdf;base64,.... → Uint8Array（pdf.jsのgetDocument({data})に渡す形）。
function dataUrlToUint8Array(dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// 新規に開く時・.json/自動保存から復元する時の両方から呼ぶ共通の描画処理。
// savedAnchorsを渡した場合は、全ページ描画後にそのマークを再構築する（notesByAnchor自体は
// 呼び出し側＝applyProjectDataが既に埋めている前提。ここでは触らない）。
async function renderPdfFromDataUrl(dataUrl, savedAnchors) {
  let pdfjsLib;
  try {
    pdfjsLib = await loadPdfjsLib();
  } catch (err) {
    setStatus("PDF機能の読み込みに失敗しました。通信環境を確認して、もう一度お試しください。");
    throw err;
  }
  currentPdfDataUrl = dataUrl;
  setMode("pdf");   // 先に表示を切り替える（hiddenのままだとページ幅の実測（clientWidth）が0になるため）
  pdfViewerEl.innerHTML = "";

  // cMapUrl：フォントを埋め込んでいないPDF（定義済みCJKエンコーディング参照のみのPDF）でも文字化けしない
  // よう、pdf.js純正のcmap一式（vendor/pdfjs/cmaps、同じくApache License 2.0）を渡す。
  // 埋め込みフォント済みのPDF（Wordの「PDFとして保存」等、大半のケース）では使われない。
  const pdf = await pdfjsLib.getDocument({
    data: dataUrlToUint8Array(dataUrl),
    cMapUrl: "vendor/pdfjs/cmaps/",
    cMapPacked: true,
  }).promise;
  currentPdfDoc = pdf;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    await renderPdfPage(pdf, pageNum);
  }

  if (savedAnchors && savedAnchors.length) rebuildPdfAnchors(savedAnchors);
  renumberAndLayout();
  // PDFを（新規に、または保存済みプロジェクトから）開く経路はここに必ず集約されるため、
  // Undo/Redoの履歴もここでリセットする（前の文書の状態へ戻ろうとしてしまわないように）。
  initUndoHistory();
}

// 1ページぶんの canvas（描画）＋テキストレイヤー（選択可能なテキストがあれば）＋
// 注釈レイヤー（マーク常設表示、スキャンページではクリック／ドラッグの受け口も兼ねる）を組み立てる。
// 表示幅は#pdfViewerの実際の幅にフィットさせる（.doc-leftの可変幅にそのまま追従、ウィンドウ幅が
// 変わっても再描画はしない＝本文モードの.para{max-width:37em}と同じく「開いた時の幅で固定」でよしとする）。
async function renderPdfPage(pdf, pageNum) {
  const pdfjsLib = await loadPdfjsLib();   // 既に読み込み済みなのでキャッシュされたPromiseがすぐ解決する
  const page = await pdf.getPage(pageNum);
  const containerWidth = pdfViewerEl.clientWidth || 600;
  const baseViewport = page.getViewport({ scale: 1 });   // ＝ノートの位置を保存する「ページ空間」の基準
  const scale = containerWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });

  const pageEl = document.createElement("div");
  pageEl.className = "pdf-page";
  pageEl.dataset.pageIndex = String(pageNum - 1);   // renumberAndLayoutPdf等の並び替えは0始まりで扱う
  pageEl.dataset.scale = String(scale);
  pageEl.dataset.baseWidth = String(baseViewport.width);    // 印刷書き出し（mm換算）で使う
  pageEl.dataset.baseHeight = String(baseViewport.height);
  pageEl.style.width = `${viewport.width}px`;
  pageEl.style.height = `${viewport.height}px`;
  // PDF.js純正TextLayerの内部実装が要求するカスタムプロパティ（.pdf-text-layerのCSSコメント参照）。
  // このページの実際の表示スケールと必ず一致させる。
  pageEl.style.setProperty("--total-scale-factor", String(scale));
  pageEl.style.setProperty("--scale-round-x", "1px");
  pageEl.style.setProperty("--scale-round-y", "1px");

  const canvas = document.createElement("canvas");
  const dpr = window.devicePixelRatio || 1;   // 内部解像度だけ上げて描画をくっきりさせる（CSSサイズは変えない）
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  pageEl.appendChild(canvas);
  await page.render({ canvasContext: ctx, viewport }).promise;

  // テキストが1文字も無ければ「スキャン」扱いにする（OCR済みスキャンは通常テキストを持つため、
  // その場合は自動的にテキストPDFと同じ扱いになる＝自己判定でよく、ユーザーに申告させない）。
  const textContent = await page.getTextContent();
  const hasText = textContent.items.some((it) => it.str && it.str.trim().length > 0);

  const textLayerEl = document.createElement("div");
  textLayerEl.className = "pdf-text-layer";
  pageEl.appendChild(textLayerEl);
  if (hasText) {
    const textLayer = new pdfjsLib.TextLayer({ textContentSource: textContent, container: textLayerEl, viewport });
    await textLayer.render();
  } else {
    textLayerEl.classList.add("pdf-text-layer-empty");
  }

  const annotLayerEl = document.createElement("div");
  annotLayerEl.className = "pdf-annot-layer";
  pageEl.appendChild(annotLayerEl);
  if (!hasText) bindScanPageInteraction(pageEl, annotLayerEl);   // テキストが無いページだけクリック／ドラッグを有効化

  pdfViewerEl.appendChild(pageEl);
  return pageEl;
}

// ---- テキストPDF：範囲選択→コメント追加ポップオーバー ----
// 本文モードのhandleSelection（doc.addEventListener("mouseup", ...)）と対になる、pdfViewer版。
pdfViewerEl.addEventListener("mouseup", handlePdfTextSelection);
pdfViewerEl.addEventListener("touchend", handlePdfTextSelection);

function handlePdfTextSelection() {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const anchorEl = range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
    ? range.commonAncestorContainer
    : range.commonAncestorContainer.parentElement;
  const textLayerEl = anchorEl?.closest(".pdf-text-layer");
  if (!textLayerEl) return;   // テキストレイヤーの外での選択（例：ページ間の余白）は無視
  const pageEl = textLayerEl.closest(".pdf-page");
  if (!pageEl) return;
  const quote = range.toString();
  if (!quote.trim()) return;

  // 選択範囲の各行の矩形を、ページ空間（scale=1）座標に変換して保持する
  // （テキストレイヤーのスパン自体はscale込みのpx位置なので、そのpageのscaleで割り戻す）。
  const scale = Number(pageEl.dataset.scale);
  const pageRect = pageEl.getBoundingClientRect();
  const rectsPdf = Array.from(range.getClientRects())
    .filter((r) => r.width > 0 && r.height > 0)
    .map((r) => ({
      x: (r.left - pageRect.left) / scale,
      y: (r.top - pageRect.top) / scale,
      w: r.width / scale,
      h: r.height / scale,
    }));
  if (!rectsPdf.length) return;

  pendingTarget = { type: "pdftext", pageEl, rectsPdf, quote };
  openPopover(range.getBoundingClientRect());
}

// ---- スキャンPDF：クリック（点）／ドラッグ（矩形）→コメント追加ポップオーバー ----
// テキストが無いページ（renderPdfPage参照）だけ、そのページの.pdf-annot-layerへ1度だけバインドする。
function bindScanPageInteraction(pageEl, annotLayerEl) {
  annotLayerEl.classList.add("scan-mode");   // pointer-events:autoにする＋カーソルをcrosshairに（CSS側）
  const DRAG_THRESHOLD_PX = 6;   // これ未満のマウス移動はドラッグではなくクリックとみなす
  let previewEl = null;

  const toPageSpace = (clientX, clientY) => {
    const scale = Number(pageEl.dataset.scale);
    const r = pageEl.getBoundingClientRect();
    return { x: (clientX - r.left) / scale, y: (clientY - r.top) / scale };
  };

  annotLayerEl.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;   // 左クリックのみ（右クリック等は無視）
    e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    let dragging = false;

    const onMove = (moveEv) => {
      const dx = moveEv.clientX - startX, dy = moveEv.clientY - startY;
      if (!dragging && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      dragging = true;
      if (!previewEl) {
        previewEl = document.createElement("div");
        previewEl.className = "pdf-drag-preview";
        annotLayerEl.appendChild(previewEl);
      }
      const layerRect = annotLayerEl.getBoundingClientRect();
      previewEl.style.left = `${Math.min(startX, moveEv.clientX) - layerRect.left}px`;
      previewEl.style.top = `${Math.min(startY, moveEv.clientY) - layerRect.top}px`;
      previewEl.style.width = `${Math.abs(moveEv.clientX - startX)}px`;
      previewEl.style.height = `${Math.abs(moveEv.clientY - startY)}px`;
    };

    const onUp = (upEv) => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (previewEl) { previewEl.remove(); previewEl = null; }

      if (dragging) {
        const p1 = toPageSpace(startX, startY);
        const p2 = toPageSpace(upEv.clientX, upEv.clientY);
        const rect = {
          x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y),
          w: Math.abs(p2.x - p1.x), h: Math.abs(p2.y - p1.y),
        };
        if (rect.w < 3 && rect.h < 3) return;   // ほぼ点にしかならない微小ドラッグは無視（誤操作対策）
        pendingTarget = { type: "pdfrect", pageEl, rect };
        openPopover(new DOMRect(upEv.clientX, upEv.clientY, 0, 0));
      } else {
        pendingTarget = { type: "pdfpoint", pageEl, point: toPageSpace(startX, startY) };
        openPopover(new DOMRect(startX, startY, 0, 0));
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}

// ---- マーク（テキスト番号バッジ／点ピン／矩形囲み）の登録・描画 ----
// pdfAnchors（正本）への追加と、対応するDOM要素の作成をまとめて行う共通入口。
// 新規追加（addPdfTextNote等）・保存データからの再構築（rebuildPdfAnchors）の両方がここを通る。
function registerPdfMark(anchorData) {
  pdfAnchors.push(anchorData);
  const pageEl = pdfViewerEl.querySelector(`.pdf-page[data-page-index="${anchorData.page}"]`);
  if (pageEl) drawPdfMark(pageEl, anchorData);   // 万一該当ページが無ければ静かに諦める（壊れたデータ対策）
}

function drawPdfMark(pageEl, a) {
  const annotLayerEl = pageEl.querySelector(".pdf-annot-layer");
  const scale = Number(pageEl.dataset.scale);
  const markEl = document.createElement("span");
  markEl.dataset.anchorId = a.anchorId;

  if (a.kind === "text") {
    markEl.className = "pdf-mark pdf-mark-text";
    const first = a.rects[0];
    markEl.style.left = `${first.x * scale}px`;
    markEl.style.top = `${first.y * scale}px`;
  } else if (a.kind === "point") {
    markEl.className = "pdf-mark pdf-mark-point";
    markEl.style.left = `${a.point.x * scale}px`;
    markEl.style.top = `${a.point.y * scale}px`;
  } else {
    markEl.className = "pdf-mark pdf-mark-rect";
    markEl.style.left = `${a.rect.x * scale}px`;
    markEl.style.top = `${a.rect.y * scale}px`;
    markEl.style.width = `${a.rect.w * scale}px`;
    markEl.style.height = `${a.rect.h * scale}px`;
    const num = document.createElement("span");
    num.className = "pdf-mark-rect-num";
    markEl.appendChild(num);
  }
  annotLayerEl.appendChild(markEl);
  return markEl;
}

// .json（または自動保存）から復元する時、全ページ描画後にまとめて呼ぶ（notesByAnchor自体は
// applyProjectData側が既に埋めているので、ここではpdfAnchors＋DOM上のマークだけ作る）。
function rebuildPdfAnchors(savedAnchors) {
  pdfAnchors = [];
  savedAnchors.forEach(registerPdfMark);
}

// ---- ノート追加（ポップオーバーの「追加」から呼ばれる。notePopoverAdd.onclick参照） ----
// 本文モードのaddTextNote/addImageNoteと対になる3種類（テキスト／点／矩形）。
// execCommandを経由しない直接のDOM操作なので、本文モードと違いinputイベント頼みのautoSaveは
// 起きない→ここで明示的に呼ぶ（画像挿入（buildAndInsertImageBlock）と同じ理由・同じパターン）。
function addPdfTextNote(pageEl, rectsPdf, quote, text, color) {
  const anchorId = "a" + anchorIdSeq++;
  registerPdfMark({ anchorId, page: Number(pageEl.dataset.pageIndex), kind: "text", quote, rects: rectsPdf });
  addNoteToAnchor(anchorId, text, color);
  autoSaveDebounced();
}
function addPdfPointNote(pageEl, point, text, color) {
  const anchorId = "a" + anchorIdSeq++;
  registerPdfMark({ anchorId, page: Number(pageEl.dataset.pageIndex), kind: "point", point });
  addNoteToAnchor(anchorId, text, color);
  autoSaveDebounced();
}
function addPdfRectNote(pageEl, rect, text, color) {
  const anchorId = "a" + anchorIdSeq++;
  registerPdfMark({ anchorId, page: Number(pageEl.dataset.pageIndex), kind: "rect", rect });
  addNoteToAnchor(anchorId, text, color);
  autoSaveDebounced();
}

// ---- PDFモードの印刷版面（PDF化） ----
// 本文モードはTufte CSS（float）方式だが、PDFページは1ページの中に複数の注釈がバラバラの高さで
// 乗るため、そのページ画像に対する絶対座標でサイドノートを置く（画面表示と同じ考え方）。
// ページ画像は既に画面用に描画済みのcanvasをそのまま書き出す（再描画しない）。
function buildPrintDocPdf() {
  printDocEl.innerHTML = "";
  // no-sidenote（本文モード専用の広幅レイアウト）がテキストモードから引き継がれて残らないようにする。
  document.body.classList.remove("no-sidenote");

  // 本文モード（buildPrintDoc）と同じく、PDFの先頭にファイル名（タイトル欄）は出さない（2026-09指定）。

  const PRINT_WIDTH_MM = 115;   // 本文モードの.print-para/.print-imgと同じ幅に揃える
  Array.from(pdfViewerEl.querySelectorAll(".pdf-page")).forEach((pageEl) => {
    const canvas = pageEl.querySelector("canvas");
    const baseWidth = Number(pageEl.dataset.baseWidth);   // ページ空間（scale=1）での幅＝ノート座標の基準
    const mmPerUnit = PRINT_WIDTH_MM / baseWidth;

    const wrap = document.createElement("div");
    wrap.className = "print-pdf-page";
    const img = document.createElement("img");
    img.className = "print-pdf-page-img";
    img.src = canvas.toDataURL("image/jpeg", 0.92);   // 枚数が多い証拠PDFでも書き出しが重くなり過ぎないようJPEGにする
    wrap.appendChild(img);

    const pageIndex = Number(pageEl.dataset.pageIndex);
    pdfAnchors.filter((a) => a.page === pageIndex).forEach((a) => {
      const markEl = pageEl.querySelector(`.pdf-mark[data-anchor-id="${a.anchorId}"]`);
      const num = markEl
        ? (a.kind === "rect" ? markEl.querySelector(".pdf-mark-rect-num")?.textContent : markEl.textContent)
        : null;
      if (!num) return;   // renumberAndLayoutPdfが未実行等、通し番号が振られていなければ出しようが無い

      const originPoint = a.kind === "text" ? a.rects[0] : a.kind === "point" ? a.point : a.rect;
      if (a.kind === "text") {
        const badge = document.createElement("span");
        badge.className = "print-pdf-mark-text";
        badge.textContent = num;
        badge.style.left = `${(originPoint.x * mmPerUnit).toFixed(2)}mm`;
        badge.style.top = `${(originPoint.y * mmPerUnit).toFixed(2)}mm`;
        wrap.appendChild(badge);
      } else if (a.kind === "point") {
        const pin = document.createElement("span");
        pin.className = "print-pdf-mark-point";
        pin.textContent = num;
        pin.style.left = `${(originPoint.x * mmPerUnit).toFixed(2)}mm`;
        pin.style.top = `${(originPoint.y * mmPerUnit).toFixed(2)}mm`;
        wrap.appendChild(pin);
      } else {
        const box = document.createElement("span");
        box.className = "print-pdf-mark-rect";
        box.style.left = `${(a.rect.x * mmPerUnit).toFixed(2)}mm`;
        box.style.top = `${(a.rect.y * mmPerUnit).toFixed(2)}mm`;
        box.style.width = `${(a.rect.w * mmPerUnit).toFixed(2)}mm`;
        box.style.height = `${(a.rect.h * mmPerUnit).toFixed(2)}mm`;
        const numSpan = document.createElement("span");
        numSpan.textContent = num;
        box.appendChild(numSpan);
        wrap.appendChild(box);
      }

      const notes = notesByAnchor.get(a.anchorId) || [];
      if (notes.length) {
        const aside = buildPrintAsideEl(num, notes);
        aside.style.top = `${(originPoint.y * mmPerUnit).toFixed(2)}mm`;
        wrap.appendChild(aside);
      }
    });

    printDocEl.appendChild(wrap);
  });

  void printDocEl.offsetHeight;   // buildPrintDoc()と同じ強制リフロー（float混在時の描画抜け対策の踏襲）
}

// Undo/Redo履歴の初回セット。ここ（ファイル最後）で呼ぶのは、serializeProject()がcurrentTheme等
// このファイルの後半でlet宣言される変数も参照するため、それらの初期化が全て終わった後にする必要が
// あるため（早い位置で呼ぶとTDZ（初期化前アクセス）のReferenceErrorになる）。
initUndoHistory();
