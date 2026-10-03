"use strict";

// 【70-ui-panels.js】範囲選択ポップオーバー・色・Markdownモード・テーマ・項番設定パネル
// app.jsを機械的に分割したファイル（index.htmlの<script>の並び順どおりに読み込む。
// 全ファイルが同じグローバルスコープを共有するので、順序を変えると初期化順（TDZ）が壊れる）。

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
// （applyMarkdownMode()の初回呼び出しは99-init.jsで行う）

// 上段メニュー固定の代わりの「↑」ボタン：ページの一番上（ヒーロー）ではなく、「新しい作業」「開く」などの
// ファイル操作の行（#toolbarMenu1）の位置へ戻す（2026-09指定。ヒーローまで戻ると、そこからまた下へ
// スクロールし直す手間が要るため）。その行が画面の上へ外れて見えなくなった時だけボタンを出す（常時
// 出しっぱなしだと最初から見えてしまい、固定機能の代わりという役割が伝わらないため。行が見えている間に
// 出すと、押しても動かないボタンになってしまう）。
const toolbarMenu1El = document.getElementById("toolbarMenu1");
const BACK_TO_MENU_MARGIN = 12;   // 戻った時に、行の上へ残す余白（px）
function updateBackToTopBtn() {
  backToTopBtn.hidden = toolbarMenu1El.getBoundingClientRect().bottom > 0;
}
document.addEventListener("scroll", updateBackToTopBtn);
window.addEventListener("resize", updateBackToTopBtn);
backToTopBtn.onclick = () => {
  const top = toolbarMenu1El.getBoundingClientRect().top + window.scrollY - BACK_TO_MENU_MARGIN;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
};
updateBackToTopBtn();

// ---- デザイン（テーマ）切替 ----
// 2026-09、「ダークUI」を独立したテーマから外し、どのテーマにも重ねられる「ダークモード」トグル
// （デザイン見出し右の太陽アイコン、下のtoggleDarkMode参照）へ作り替えた。並びは
// 「公文書風→雑誌風→和モダン→和風２段」「フラット→フラット２段→サイト→カスタマイズ」（指定を受けて変更）。
const THEMES = [
  { id: "minimal", label: "文書（ミニマル）", desc: "公文書仕様に近い白黒" },
  { id: "editorial", label: "エディトリアル", desc: "雑誌風・明朝・ゆったり" },
  { id: "wamodan", label: "和モダン", desc: "エディトリアルより余白広め" },
  { id: "twocol", label: "和風２段", desc: "和モダン＋本文16pt（2ページ/枚の印刷で11pt前後）" },
  { id: "flat", label: "フラット", desc: "カード区切りのSaaS系" },
  { id: "flat2col", label: "フラット２段", desc: "フラット＋本文16pt（2ページ/枚の印刷で11pt前後）" },
  { id: "site", label: "サイト", desc: "紺×朱、公開サイトの配色" },
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

// ダークモード：本文（#doc・サイドノート・印刷対象外）の色だけを暗くするトグル。書体・角丸は
// 選んだデザイン（THEMES）のまま変えない（themes.cssのhtml.dark-mode参照）。デザインとは独立の
// on/offなので、THEMESには含めず別のキーでlocalStorageに保存する。
const DARK_MODE_KEY = "sidenote-dark-mode-v1";
let darkMode = false;

function applyDarkMode(on) {
  darkMode = !!on;
  document.documentElement.classList.toggle("dark-mode", darkMode);
  darkModeToggleBtn.classList.toggle("active", darkMode);
  darkModeToggleBtn.setAttribute("aria-pressed", String(darkMode));
  try { localStorage.setItem(DARK_MODE_KEY, darkMode ? "1" : "0"); } catch (err) { /* noop */ }
}
darkModeToggleBtn.onclick = () => { applyDarkMode(!darkMode); autoSaveDebounced(); };

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
// 「和風２段」「フラット２段」は、PDFを2ページ/枚に割り付けて読む前提で、本文16pt・1行30字
// （A4縦・1段のまま。style.cssの「デザイン『2段組』」参照）。割り付けの縮小率はLetter横で約0.67倍・
// A4横で約0.71倍なので、本文は10.7〜11.4ptになる。数値自体は色・書体に依らないため両テーマで共有する。
const TWOCOL_PRINT_LAYOUT = {
  bodyPt: 16, headPt: [22, 19, 17], chars: 30, layout: "A4縦・1段",
  note: "PDFを2ページ/枚に割り付けた時に本文が11pt前後（Letter横で約10.7pt、A4横で約11.4pt）になる大きさです。h1〜h3は、Markdownの見出し（#〜###）の大きさです（ツールバーの見出しは項番設定どおり）。サイドノートがある文書は従来のサイドバー付きの版面になります。",
};
const NO_SIDEBAR_PRINT_LAYOUT = {
  twocol: TWOCOL_PRINT_LAYOUT,
  flat2col: TWOCOL_PRINT_LAYOUT,
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
  let savedDark = false;
  try {
    saved = localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
    savedDark = localStorage.getItem(DARK_MODE_KEY) === "1";
  } catch (err) { /* noop */ }
  // 旧「ダークUI」（独立テーマ）を選んでいたユーザーへの移行措置：テーマ名は無効化されて
  // 既定（文書）へ自動で戻るが（applyThemeのフォールバック）、暗さの意図は引き継ぎ、
  // ダークモードをオンにした状態で開始する。
  if (saved === "dark") savedDark = true;
  applyTheme(saved);
  applyDarkMode(savedDark);
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
