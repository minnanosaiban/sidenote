"use strict";

// 【50-print.js】A4 PDF化（印刷）
// app.jsを機械的に分割したファイル（index.htmlの<script>の並び順どおりに読み込む。
// 全ファイルが同じグローバルスコープを共有するので、順序を変えると初期化順（TDZ）が壊れる）。

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
      // 未読み込みの外部画像（srcが無い）は、通信を起こさないよう印刷版面にも出さない。
      if (imgEl.getAttribute("src")) {
        const printImg = document.createElement("img");
        printImg.className = "print-img";
        printImg.src = imgEl.src;
        printDocEl.appendChild(printImg);
      }

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
