"use strict";

// 【60-open-autosave-undo.js】ファイルを開く・ドラッグ＆ドロップ・自動保存・元に戻す／やり直し
// app.jsを機械的に分割したファイル（index.htmlの<script>の並び順どおりに読み込む。
// 全ファイルが同じグローバルスコープを共有するので、順序を変えると初期化順（TDZ）が壊れる）。

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
let autoSaveFailureNotified = false;

function autoSave() {
  const snap = serializeProject();
  commitUndoHistory(snap);
  try {
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snap));
  } catch (err) {
    // 容量超過等（特にPDFモードは元PDFを丸ごと含むため起きやすい）。致命的ではないが、
    // 黙って止まると気づけないので、セッションにつき1回だけ知らせる。
    if (!autoSaveFailureNotified) {
      autoSaveFailureNotified = true;
      showToast("ブラウザ内への自動保存ができませんでした（容量不足の可能性）。「保存」で.jsonに書き出してください。", true);
    }
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
      normalizeNotesByAnchor(snap.notesByAnchor).forEach(([anchorId, notes]) => notesByAnchor.set(anchorId, notes));
      anchorIdSeq = typeof snap.anchorIdSeq === "number" ? snap.anchorIdSeq : anchorIdSeq;
      replyIdSeq = typeof snap.replyIdSeq === "number" ? snap.replyIdSeq : replyIdSeq;
      titleInput.value = snap.title || "";
      if (snap.colorNames && snap.colorNames.black) colorNames.black = snap.colorNames.black;
      if (snap.colorNames && snap.colorNames.blue) colorNames.blue = snap.colorNames.blue;
      updateColorSwatchLabels();
      if (snap.theme) applyTheme(snap.theme);
      pdfViewerEl.querySelectorAll(".pdf-mark").forEach((el) => el.remove());
      pdfAnchors = [];
      rebuildPdfAnchors((snap.pdfAnchors || []).filter(isValidPdfAnchor));
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
