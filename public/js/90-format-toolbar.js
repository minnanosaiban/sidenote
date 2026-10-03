"use strict";

// 【90-format-toolbar.js】段落ホバー操作・書式ツールバー・コメント削除
// app.jsを機械的に分割したファイル（index.htmlの<script>の並び順どおりに読み込む。
// 全ファイルが同じグローバルスコープを共有するので、順序を変えると初期化順（TDZ）が壊れる）。

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
