"use strict";

// 【20-project-io.js】保存・読み込み（.json）
// app.jsを機械的に分割したファイル（index.htmlの<script>の並び順どおりに読み込む。
// 全ファイルが同じグローバルスコープを共有するので、順序を変えると初期化順（TDZ）が壊れる）。

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
  if (!data || typeof data !== "object") throw new Error("invalid project data");
  // 状態を書き換える前に必須項目を確認する（途中で例外になって半端な状態が残るのを防ぐ）。
  if (data.mode === "pdf" ? typeof data.pdfDataUrl !== "string" : typeof data.docHTML !== "string") {
    throw new Error("invalid project data");
  }
  const loadedNotes = normalizeNotesByAnchor(data.notesByAnchor);
  const hasNotesArray = Array.isArray(data.notesByAnchor);
  // 「項番設定」パネルの内容もこのファイルの値で上書きする（モードに関わらず共通、無ければ既定値）。
  paraStyleSettings = mergeParaStyleSettings(data.paraStyleSettings);
  numberingSettings = mergeNumberingSettings(data.numberingSettings);
  refreshStyleSettingInputs();
  refreshNumberingSettingInputs();
  updateFooterInfo();   // 見出しスタイル設定はファイルごとに変わるため、読み込み時にも反映する

  if (data.mode === "pdf") {
    notesByAnchor.clear();
    loadedNotes.forEach(([anchorId, notes]) => notesByAnchor.set(anchorId, notes));
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
    return renderPdfFromDataUrl(data.pdfDataUrl, Array.isArray(data.pdfAnchors) ? data.pdfAnchors.filter(isValidPdfAnchor) : []);
  }

  // サニタイズは状態を触る前に行う（ライブラリ未読込で例外になる場合も、現在の文書を壊さない）。
  const cleanHtml = sanitizeDocHtml(data.docHTML);
  setMode("text");
  doc.innerHTML = cleanHtml;
  notesByAnchor.clear();

  if (hasNotesArray) {
    loadedNotes.forEach(([anchorId, notes]) => notesByAnchor.set(anchorId, notes));
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
