"use strict";

// 【80-blocks-import.js】画像・表・区切り線・改ページのブロックとMarkdown取り込み
// app.jsを機械的に分割したファイル（index.htmlの<script>の並び順どおりに読み込む。
// 全ファイルが同じグローバルスコープを共有するので、順序を変えると初期化順（TDZ）が壊れる）。

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

// altは「Markdownの![説明](url)の説明」。画面のalt属性は常に「画像」のままにし、書き出し用に元の説明だけをdata-altで持つ
// （.md書き出しで説明が消えないようにするため。貼り付け・挿入した画像は説明が無いので空のまま）。
function buildImageParaEl(paraId, src, alt) {
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
  img.alt = "画像";
  if (alt) img.dataset.alt = String(alt);
  if (isInlineImageSrc(src)) {
    img.src = src;
  } else {
    // 外部URL（Markdownの![](https://…)等）は自動では読み込まない（ensureExternalImagePlaceholder参照）。
    img.dataset.externalSrc = String(src);
  }
  inner.appendChild(img);

  const notesRow = document.createElement("div");
  notesRow.className = "para-image-notes";
  wrap.appendChild(notesRow);
  wrap.appendChild(inner);

  ensureExternalImagePlaceholder(wrap);
  return wrap;
}

// 外部URLの画像は、開いた・取り込んだだけで外部へアクセスしないよう、画像の代わりにURLと
// 「読み込む」ボタンを出す（利用者が押した時だけ読み込む）。.json／自動保存の復元時は
// sanitizeDocHtmlがsrcを外してdata-external-srcへ退避するので、読み込み済みだった画像も
// 開き直すとここで再び「未読み込み」に戻る（開くたびに許可を求める＝安全側）。
function ensureExternalImagePlaceholder(wrap) {
  const img = wrap.querySelector(".para-image-img");
  const url = img && img.dataset.externalSrc;
  const existing = wrap.querySelector(".para-image-external");
  if (!img || !url || img.getAttribute("src")) { if (existing) existing.remove(); return; }
  img.hidden = true;
  let box = existing;
  if (!box) {
    box = document.createElement("div");
    box.className = "para-image-external";
    const msg = document.createElement("div");
    msg.className = "para-image-external-msg";
    msg.textContent = "外部の画像です（通信が発生するため、自動では読み込んでいません）";
    const urlEl = document.createElement("div");
    urlEl.className = "para-image-external-url";
    urlEl.textContent = url;
    box.appendChild(msg);
    box.appendChild(urlEl);
    if (/^https?:/i.test(url)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "para-image-load-btn";
      btn.textContent = "読み込む";
      box.appendChild(btn);
    }
    img.parentNode.insertBefore(box, img);
  }
  const loadBtn = box.querySelector(".para-image-load-btn");
  if (loadBtn) {
    loadBtn.onclick = () => {
      img.hidden = false;
      img.onload = () => renumberAndLayout();
      img.src = url;
      box.remove();
      autoSaveDebounced();
    };
  }
}

function bindImageParaEvents(wrap) {
  ensureExternalImagePlaceholder(wrap);
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
  if (b.type === "image") return buildImageParaEl("img" + imageIdSeq++, b.url, b.alt);
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
