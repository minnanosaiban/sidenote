"use strict";

// 【00-core.js】アイコン・DOM参照・状態変数・定数（起動時に最初に必要なもの）
// app.jsを機械的に分割したファイル（index.htmlの<script>の並び順どおりに読み込む。
// 全ファイルが同じグローバルスコープを共有するので、順序を変えると初期化順（TDZ）が壊れる）。

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
const saveHotlineBtn = document.getElementById("saveHotlineBtn");
const hotlineExportPanel = document.getElementById("hotlineExportPanel");
const hotlineExportClose = document.getElementById("hotlineExportClose");
const hotlineExportFilenameInput = document.getElementById("hotlineExportFilenameInput");
const hotlineExportDirLabelEl = document.getElementById("hotlineExportDirLabel");
const hotlineExportPickDirBtn = document.getElementById("hotlineExportPickDirBtn");
const hotlineExportRunBtn = document.getElementById("hotlineExportRunBtn");
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
const darkModeToggleBtn = document.getElementById("darkModeToggleBtn");
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
// 起動時（99-init.js）に初回呼び出しされるため、それまでにここで初期化しておく必要がある。
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
