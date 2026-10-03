"use strict";

// 【95-layout.js】通し番号とサイドノートの配置
// app.jsを機械的に分割したファイル（index.htmlの<script>の並び順どおりに読み込む。
// 全ファイルが同じグローバルスコープを共有するので、順序を変えると初期化順（TDZ）が壊れる）。

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
