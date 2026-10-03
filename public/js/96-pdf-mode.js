"use strict";

// 【96-pdf-mode.js】PDFモード（pdf.js）と、その印刷版面・Undo履歴の初回セット
// app.jsを機械的に分割したファイル（index.htmlの<script>の並び順どおりに読み込む。
// 全ファイルが同じグローバルスコープを共有するので、順序を変えると初期化順（TDZ）が壊れる）。

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
  saveHotlineBtn.hidden = isPdf;
  if (isPdf) hotlineExportPanel.hidden = true;
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
