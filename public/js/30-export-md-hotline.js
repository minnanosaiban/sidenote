"use strict";

// 【30-export-md-hotline.js】.md／hotline用の書き出しと保存先フォルダ
// app.jsを機械的に分割したファイル（index.htmlの<script>の並び順どおりに読み込む。
// 全ファイルが同じグローバルスコープを共有するので、順序を変えると初期化順（TDZ）が壊れる）。

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
    // Markdownのリンク先に空白や括弧があると記法が壊れるため、<>で囲む（CommonMark）。
    const dest = /[\s()]/.test(href) ? `<${href}>` : href;
    return `[${childText()}](${dest})`;
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

// セル内の改行（Shift+EnterのBR。paraInlineToMarkdownでは"\n"）は、表の行を割らないよう<br>で書く（GFM・GitHubと同じ。
// md-parser.jsのsplitTableRowが逆に"\n"へ戻す。2026-09-20。以前は生の改行のまま書き出していたため、保存すると表が壊れた）。
function tableRowToMarkdown(cells) {
  return `| ${cells.map((c) => c.replace(/\|/g, "\\|").replace(/\n/g, "<br>")).join(" | ")} |`;
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

// 保存結果の知らせ。ヒーローの#saveStatusは画面の一番上にあり、本文を編集している最中は見えない（Ctrl+Sの結果が
// 分からず、上書きに失敗してダウンロードされても気づけなかった）ので、画面の下にも短く出す（2026-09-20）。
let toastTimer = null;
function showToast(msg, isError = false) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.toggle("toast-error", isError);
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, isError ? 9000 : 3000);
}
function notifySave(msg, isError = false) {
  setStatus(msg);
  showToast(msg, isError);
}

const MD_FILE_TYPES = [{ description: "Markdown", accept: { "text/markdown": [".md", ".markdown"], "text/plain": [".txt"] } }];

// 「.md」ボタン／Ctrl+Sの実体。開いたファイルへの上書きを最優先にする：
//  1) openedMdFileHandleがあれば、そこへ直接上書きする。
//  2) 書き込めなかった時、またはハンドルが無い時（ドラッグ＆ドロップ等で取得できなかった場合）は、ダウンロードへ逃げずに
//     「保存先を選ぶ」ダイアログ（showSaveFilePicker）を出す。同じファイルを選べば上書きになり、選んだファイルを以後の
//     Ctrl+Sの上書き先にする。以前は、書き込みに1度失敗するとハンドルを捨て、以後ずっとダウンロード保存になっていた
//     （2026-09-20、Ctrl+Sがなぜかダウンロードになったという指摘）。
//  3) 保存先ダイアログが使えないブラウザ（Firefox/Safari等）、または.mdを開いていない時は、従来通りダウンロードで保存する。
// 許可ダイアログで「拒否」された時や、保存先ダイアログを閉じた時は、勝手にダウンロードせず、保存していないことを知らせる。
async function saveMarkdown() {
  const text = docToMarkdown();
  const namePart = projectTitle() ? `-${sanitizeFilename(projectTitle())}` : "";
  const filename = openedMdFilename || `sidenote${namePart}-${timestamp()}.md`;

  if (openedMdFileHandle) {
    try {
      await writeTextToFileHandle(openedMdFileHandle, text);
      notifySave(`上書き保存：${filename}`);
      return;
    } catch (err) {
      console.error(err);
      if (err && err.message === "readwrite permission denied") {
        // 拒否は一時的なもの。ハンドルは捨てず、次のCtrl+Sでもう一度許可を求められるようにする。
        notifySave(`書き込みが許可されなかったため、保存していません。もう一度Ctrl+Sを押して、許可してください：${filename}`, true);
        return;
      }
      // それ以外（ファイルが見つからない・他のソフトが使用中・同期の都合など）は、下の「保存先を選ぶ」へ進む。
    }
  }

  if (openedMdFilename && window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: MD_FILE_TYPES,
        ...(openedMdFileHandle ? { startIn: openedMdFileHandle } : {}),
      });
      await writeTextToFileHandle(handle, text);
      openedMdFileHandle = handle;
      openedMdFilename = handle.name || filename;
      updateOpenedFileNote();
      notifySave(`上書き保存：${openedMdFilename}`);
      return;
    } catch (err) {
      if (err && err.name === "AbortError") {
        notifySave(`保存をキャンセルしました（保存されていません）：${filename}`, true);
        return;
      }
      console.error(err);   // 保存先ダイアログ自体が使えなかった（操作から時間が空いた等）時は、下のダウンロードへ
    }
  }

  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  downloadBlob(blob, filename);
  notifySave(`書き出しました（ダウンロード）：${filename}`);
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

// ---- hotline書面用として書き出す（本文DOM → hotlineサイトの生HTMLへの変換） ----
// docs/trial*/md（・docs/trial*/.parts）に置いてそのままウェブに反映できる形で書き出す。
// hotlineサイトは2026-09-21まで、独自マーカー（:N X:）をMkDocsフックdoc_indent.py（削除済み）が
// 生HTMLへ焼き込んでいた。今の本番ファイルはその焼き込み結果そのものなので、フックの規則
// （_class_for）をそのままここへ移植する。今のデータモデル（data-indent-level・data-hanging）は
// 元々このフックのn・kindと1対1（hanging 0/1/2/3 → i/h/h2/h3）に対応しているため、段落側に
// 新しいUIは要らない。
//   n=indentLevel（0〜9）／hanging=0〜3
//   hanging=0: n>0→"pad{n} idt" / n=0→"doc"
//   hanging=1/2/3: n>0→"pad{n} hg-idt{,2,3}" / n=0→"hg-idt{,2,3}"単独
// 既知のギャップ：n=0でも字下げだけ欲しい稀なケース（本番で"doc idt"。旧フックではnを無視する
// 独立した種別「d」だったため、今のインデント段数だけでは判別できない）はここでは作れない。
// 実例は本文全体で5箇所のみなので、必要な時だけ書き出し後に手でクラスを直す
// （center・doc-gap-top等、既に手作業運用の稀な装飾と同列に扱う）。
function hotlineParaClass(indentLevel, hanging, align) {
  const n = Number(indentLevel) || 0;
  const pad = n > 0 ? `pad${n}` : "";
  const hg = { 1: "hg-idt", 2: "hg-idt2", 3: "hg-idt3" }[hanging];
  let base;
  if (!hg) base = pad ? `${pad} idt` : "doc";
  else base = pad ? `${pad} ${hg}` : hg;
  return align === "center" ? `${base} center` : base;
}

// インライン要素→生HTML。inlineNodeToMarkdown（上）と対になる関数だが、Markdown記法ではなく
// 実際のタグ（<b>・<u>・<a href>）で出す（hotline側の本文はMarkdownではなく生HTMLの段落のため）。
// 注釈（note-anchor）は引用元のプレーンテキストだけを残す（本文中に印は付けない。本番ファイルと
// 同じ）。ノート本体は呼び出し側（paraNoteAsidesHtml）が段落の直後に別ブロックのasideとして続ける。
function hotlineInlineHtml(node) {
  if (node.nodeType === Node.TEXT_NODE) return escapeHtml(node.textContent).replace(/​/g, "");
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  if (node.tagName === "BR") return "<br>";
  if (node.classList && node.classList.contains("li-marker")) return "";
  if (node.classList && node.classList.contains("note-anchor")) {
    return escapeHtml(node.querySelector("span")?.textContent || "");
  }
  const children = () => Array.from(node.childNodes).map(hotlineInlineHtml).join("");
  if (node.classList && node.classList.contains("kenten")) {
    return `<span style="-webkit-text-emphasis-style: filled dot; text-emphasis-style: filled dot;">${children()}</span>`;
  }
  if (node.tagName === "STRONG" || node.tagName === "B") return `<b>${children()}</b>`;
  if (node.tagName === "U") return `<u>${children()}</u>`;
  if (node.tagName === "A") return `<a href="${escapeAttr(node.getAttribute("href") || "")}">${children()}</a>`;
  return children();
}

// 段落に付いたノート1件を本番の<aside class="sn-note">形へ。返信スレッド（同じ範囲への複数ノート）は
// <br>区切りで1つのasideにまとめ、色が赤（重要）のノートだけ、そのノート自身を<span class="strong-rd">
// で包む（本番ファイルの実例と同じ。ノート番号・sn-note-importantクラスは今の本番フォーマットには無い
// ため付けない）。相互参照リンク・バッジ等を含む「認否ノート」相当の装飾はここでは作らない
// （import_argument.py・手作業の領分。README参照）。
function hotlineNoteAsideHtml(anchorEl) {
  const notes = notesByAnchor.get(anchorEl.dataset.anchorId) || [];
  if (!notes.length) return "";
  const body = notes.map((note) => {
    const html = formatNoteText(note.text);
    return note.color === "red" ? `<span class="strong-rd">${html}</span>` : html;
  }).join("<br>");
  return `\n\n<aside class="sn-note">${body}</aside>`;
}
function paraNoteAsidesHtml(paraEl) {
  return Array.from(paraEl.querySelectorAll(".note-anchor")).map(hotlineNoteAsideHtml).join("");
}

// 1ブロック（.para系要素）→ hotline用HTML。画像・表・区切り線・改ページ・箇条書きはこのジャンル
// （裁判文書）では使わない想定のため対象外（混入時は書き出し件数をhotlineExportRunBtn側で案内する）。
const HOTLINE_SKIP_CLASSES = ["para-image", "para-table", "para-hr", "para-pagebreak", "para-li"];
function blockParaToHotline(paraEl) {
  if (HOTLINE_SKIP_CLASSES.some((c) => paraEl.classList.contains(c))) return null;
  const text = Array.from(paraEl.childNodes).map(hotlineInlineHtml).join("").trim();
  if (!text) return null;
  const cls = hotlineParaClass(Number(paraEl.dataset.indentLevel || 0), Number(paraEl.dataset.hanging || 0), paraEl.dataset.align);
  return `<p class="${cls}">\n${text}\n</p>${paraNoteAsidesHtml(paraEl)}`;
}

function buildHotlineExport() {
  const paras = Array.from(doc.children).filter((el) => el.classList && el.classList.contains("para"));
  const skipped = paras.filter((p) => HOTLINE_SKIP_CLASSES.some((c) => p.classList.contains(c))).length;
  const blocks = paras.map(blockParaToHotline).filter(Boolean);
  if (!blocks.length) return null;
  return { html: blocks.join("\n\n") + "\n", skipped };
}

// ---- 保存先フォルダへ直接書き込み（File System Access API） ----
// 「ダウンロード→探す→貼り付け」を無くすため、選んだフォルダのハンドルをIndexedDBに記憶し、
// 次回以降はファイル名を聞くだけで直接書き込む（sidenote-pdf-webの同名機構を移植。非対応ブラウザ
// ＝Firefox等ではwindow.showDirectoryPickerが無いため、常に.md.txtのダウンロードにフォールバックする）。
const HOTLINE_IDB_NAME = "sidenote-hotline-export";
const HOTLINE_IDB_STORE = "handles";
const HOTLINE_EXPORT_DIR_KEY = "exportDir";

function hotlineIdbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(HOTLINE_IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(HOTLINE_IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function hotlineIdbGet(key) {
  const db = await hotlineIdbOpen();
  return new Promise((resolve, reject) => {
    const rq = db.transaction(HOTLINE_IDB_STORE, "readonly").objectStore(HOTLINE_IDB_STORE).get(key);
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  });
}
async function hotlineIdbSet(key, value) {
  const db = await hotlineIdbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(HOTLINE_IDB_STORE, "readwrite");
    tx.objectStore(HOTLINE_IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let hotlineExportDirHandle = null;

// 記憶した保存先（無ければ選ばせる）を返す。非対応ブラウザではnull。
async function pickHotlineExportDir(forceRepick) {
  if (!window.showDirectoryPicker) return null;
  let dir = null;
  if (!forceRepick) {
    try { dir = await hotlineIdbGet(HOTLINE_EXPORT_DIR_KEY); } catch (err) { /* 初回等、無ければ選ばせる */ }
  }
  if (dir) {
    // 保存済みハンドルの権限はセッションごとに失効するため、毎回確認→必要なら再要求する
    // （requestPermissionはユーザー操作起点でしか呼べないが、ここはボタンクリック中なのでOK）。
    let perm = await dir.queryPermission({ mode: "readwrite" });
    if (perm !== "granted") perm = await dir.requestPermission({ mode: "readwrite" });
    if (perm !== "granted") dir = null;
  }
  if (!dir) {
    dir = await window.showDirectoryPicker({ mode: "readwrite" });
    try { await hotlineIdbSet(HOTLINE_EXPORT_DIR_KEY, dir); } catch (err) { /* 保存失敗しても今回分の書き込みは続行 */ }
  }
  return dir;
}

async function writeHotlineFileTo(dir, filename, text) {
  const fileHandle = await dir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(text);
  await writable.close();
}

function updateHotlineExportDirLabel() {
  hotlineExportDirLabelEl.textContent = hotlineExportDirHandle
    ? `保存先：${hotlineExportDirHandle.name}`
    : "保存先：未選択（書き出す時に選べます）";
}

async function pickHotlineExportDirAndUpdate(forceRepick) {
  try {
    const dir = await pickHotlineExportDir(forceRepick);
    if (dir) { hotlineExportDirHandle = dir; updateHotlineExportDirLabel(); }
  } catch (err) {
    if (err && err.name !== "AbortError") console.error(err);
  }
}

function hotlineExportFilenameSuggestion() {
  return `${sanitizeFilename(projectTitle()) || "doc"}.md.txt`;
}

// ---- 「hotline用」ボタン・書き出しパネル ----
saveHotlineBtn.onclick = () => {
  toggleDropdownPanel(hotlineExportPanel, saveHotlineBtn);
  if (hotlineExportPanel.hidden) return;
  if (!hotlineExportFilenameInput.value) hotlineExportFilenameInput.value = hotlineExportFilenameSuggestion();
  const dirSupported = !!window.showDirectoryPicker;
  hotlineExportPickDirBtn.hidden = !dirSupported;
  hotlineExportDirLabelEl.hidden = !dirSupported;
  updateHotlineExportDirLabel();
  hotlineExportFilenameInput.focus();
};
hotlineExportClose.onclick = () => { hotlineExportPanel.hidden = true; saveHotlineBtn.focus(); };
hotlineExportPickDirBtn.onclick = () => pickHotlineExportDirAndUpdate(true);

hotlineExportRunBtn.onclick = async () => {
  const built = buildHotlineExport();
  if (!built) { setStatus("書き出す本文がありません。"); return; }
  let filename = (hotlineExportFilenameInput.value || "").trim() || hotlineExportFilenameSuggestion();
  if (!/\.md\.txt$/i.test(filename)) filename = `${filename.replace(/\.[^.]*$/, "")}.md.txt`;
  filename = sanitizeFilename(filename);
  const warn = built.skipped ? `（画像・表など${built.skipped}件は対象外のため省きました）` : "";

  if (window.showDirectoryPicker) {
    try {
      if (!hotlineExportDirHandle) await pickHotlineExportDirAndUpdate(false);
      if (!hotlineExportDirHandle) return;   // フォルダ選択をキャンセルした
      await writeHotlineFileTo(hotlineExportDirHandle, filename, built.html);
      hotlineExportPanel.hidden = true;
      notifySave(`書き出しました：${hotlineExportDirHandle.name}/${filename}${warn}`);
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
      console.error(err);
      setStatus("フォルダへの書き込みに失敗しました。ダウンロードに切り替えます。");
    }
  }
  const blob = new Blob([built.html], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, filename);
  hotlineExportPanel.hidden = true;
  notifySave(`書き出しました（ダウンロード）：${filename}${warn}`);
};

document.addEventListener("mousedown", (e) => {
  if (hotlineExportPanel.hidden || hotlineExportPanel.contains(e.target) || saveHotlineBtn.contains(e.target)) return;
  hotlineExportPanel.hidden = true;
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !hotlineExportPanel.hidden) { hotlineExportPanel.hidden = true; saveHotlineBtn.focus(); }
});
