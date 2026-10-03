"use strict";

// 【40-export-docx.js】.docxの書き出し
// app.jsを機械的に分割したファイル（index.htmlの<script>の並び順どおりに読み込む。
// 全ファイルが同じグローバルスコープを共有するので、順序を変えると初期化順（TDZ）が壊れる）。

// ---- .docxとして書き出す（本文DOM → Wordファイルへの変換） ----
// .mdと同じくDOMを1段落＝1ブロックとして歩くが、こちらはMarkdown文字列ではなくvendor/docx
// （THIRD_PARTY_NOTICES.md参照。<script>で先読みし、グローバルwindow.docxとして触れる）の
// Paragraph/TextRunを組み立てて実際に.docxのバイト列を生成する。
// .mdでは表現できなかった2点をここでは実物に近い形で再現する：
//   ・傍点 → Wordの圏点（w:em、TextRunのemphasisMark）
//   ・サイドノート（.note-anchor） → Wordのコメント機能（引用範囲にCommentRangeStart/Endでアンカーし、
//     複数返信は1つのコメント本文にまとめる）
// 一方、画像・表に付いたノート（img-note-anchor/tbl-note-anchor）はWordコメントのアンカー先が
// 図表そのものになり実装コストに見合わないため、簡略化して本文中に「［サイドノート］」の段落として
// 差し込むだけにする（sideNoteFallbackParagraph参照）。
const DOCX_INDENT_TWIP_PER_LEVEL = 240;   // 全角1文字≒12pt≒240twip（本文12pt想定。INDENT_STEP_EMのdocx版）
const DOCX_MONO_FONT = "JetBrains Mono";
const DOCX_MAX_IMAGE_PX = 550;   // A4・1インチ余白の版面幅(約560pt)に収まる程度の上限

function docxStripMarkup(raw) {
  return String(raw || "").replace(/\*\*(.+?)\*\*/g, "$1").replace(/<u>(.+?)<\/u>/g, "$1");
}

function docxImageType(dataUrl) {
  const m = /^data:image\/([a-zA-Z0-9.+-]+);base64,/.exec(dataUrl || "");
  if (!m) return null;
  const sub = m[1].toLowerCase() === "jpeg" ? "jpg" : m[1].toLowerCase();
  return ["png", "jpg", "gif", "bmp"].includes(sub) ? sub : "png";   // svg等の非対応形式はpngとして扱う（既知の簡略化）
}

// paraEl.dataset.style（H1〜H3）とMarkdown取り込み由来の.para-hNクラス（h1〜h6）の両方を見るのは
// blockParaToMarkdownのheadingLevel判定と同じ理由（app.js内、docToMarkdown参照）。
function docxHeadingLevel(paraEl, HeadingLevel) {
  const styleLevel = /^h([1-3])$/.exec(paraEl.dataset.style || "");
  const hClassMatch = paraEl.className.match(/\bpara-h([1-6])\b/);
  const n = styleLevel ? Number(styleLevel[1]) : (hClassMatch ? Number(hClassMatch[1]) : null);
  return n ? HeadingLevel["HEADING_" + n] : null;
}

async function buildDocxBlob() {
  if (!window.docx) throw new Error("docxライブラリが読み込めていません。ページを再読み込みしてください。");
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle, WidthType, PageBreak, LineRuleType,
    EmphasisMarkType, ImageRun, Table, TableRow, TableCell, ExternalHyperlink,
    CommentRangeStart, CommentRangeEnd, CommentReference,
  } = window.docx;

  function makeTextRun(text, marks) {
    return new TextRun({
      text,
      bold: !!marks.bold,
      italics: !!marks.italics,
      strike: !!marks.strike,
      underline: marks.underline ? {} : undefined,
      emphasisMark: marks.kenten ? { type: EmphasisMarkType.DOT } : undefined,
      font: marks.mono ? DOCX_MONO_FONT : undefined,
      style: marks.link ? "Hyperlink" : undefined,
      size: marks.sizePt ? marks.sizePt * 2 : undefined,   // docxのsizeは half-point 単位
    });
  }

  // #doc内の1インライン要素をdocxのTextRun/ExternalHyperlink等へ再帰変換し、outへ積む。
  // .note-anchorに実際の返信（notesByAnchor）が付いている場合だけWordコメントとしてアンカーし、
  // 内容を持たない（未使用）アンカーはただの引用文として素通しする。
  function collectInlineRuns(node, marks, out, comments) {
    if (node.nodeType === Node.TEXT_NODE) {
      // ゼロ幅スペース(U+200B)は箇条書きマーカー直後の入力安定化のための内部的な目印
      // （insertBulletMarker参照）で、書き出しには含めない。
      const text = node.textContent.replace(/​/g, "");
      if (text) out.push(makeTextRun(text, marks));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.tagName === "BR") { out.push(new TextRun({ text: "", break: 1 })); return; }
    if (node.classList.contains("li-marker")) return;   // 行頭バッジは本文ではないので除外（.md書き出しと同じ）
    if (node.classList.contains("note-anchor")) {
      const notes = notesByAnchor.get(node.dataset.anchorId) || [];
      const quoteSpan = node.querySelector("span");
      const walkQuote = (target) => { if (quoteSpan) Array.from(quoteSpan.childNodes).forEach((c) => collectInlineRuns(c, marks, target, comments)); };
      if (notes.length) {
        const commentId = comments.length;
        out.push(new CommentRangeStart(commentId));
        walkQuote(out);
        out.push(new CommentRangeEnd(commentId));
        out.push(new TextRun({ children: [new CommentReference(commentId)] }));
        comments.push(notes);
      } else {
        walkQuote(out);
      }
      return;
    }
    if (node.classList.contains("kenten")) {
      Array.from(node.childNodes).forEach((c) => collectInlineRuns(c, { ...marks, kenten: true }, out, comments));
      return;
    }
    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      const innerRuns = [];
      Array.from(node.childNodes).forEach((c) => collectInlineRuns(c, { ...marks, link: true }, innerRuns, comments));
      out.push(new ExternalHyperlink({ link: href, children: innerRuns }));
      return;
    }
    const next = { ...marks };
    if (node.tagName === "STRONG" || node.tagName === "B") next.bold = true;
    if (node.tagName === "U") next.underline = true;
    if (node.tagName === "EM" || node.tagName === "I") next.italics = true;
    if (node.tagName === "DEL") next.strike = true;
    if (node.tagName === "CODE") next.mono = true;
    Array.from(node.childNodes).forEach((c) => collectInlineRuns(c, next, out, comments));
  }

  // 画像・表に付いたノート（本文アンカーと違いWordコメントとして図表そのものに刺すのは実装コストに
  // 見合わないため簡略化）を、本文中の小さな段落として差し込む。
  function sideNoteFallbackParagraph(notes) {
    const text = notes.map((n) => `${colorLabel(n.color)}：${docxStripMarkup(n.text)}`).join("／");
    return new Paragraph({ children: [new TextRun({ text: `［サイドノート］${text}`, italics: true, color: "666666", size: 20 })] });
  }

  function imageBlockToDocx(paraEl, comments) {
    const out = [];
    const img = paraEl.querySelector(".para-image-img");
    const type = img && docxImageType(img.src);
    if (img && type) {
      let w = img.naturalWidth || 300, h = img.naturalHeight || 200;
      if (w > DOCX_MAX_IMAGE_PX) { h = Math.round((h * DOCX_MAX_IMAGE_PX) / w); w = DOCX_MAX_IMAGE_PX; }
      out.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ type, data: img.src, transformation: { width: w, height: h } })],
      }));
    }
    const notes = notesByAnchor.get(paraEl.dataset.paraId) || [];
    if (notes.length) out.push(sideNoteFallbackParagraph(notes));
    return out;
  }

  function tableBlockToDocx(paraEl, comments) {
    const out = [];
    const tableEl = paraEl.querySelector(".para-table-el");
    if (tableEl) {
      const rows = Array.from(tableEl.rows).map((tr) => new TableRow({
        children: Array.from(tr.cells).map((cell) => {
          const runs = [];
          Array.from(cell.childNodes).forEach((c) => collectInlineRuns(c, {}, runs, comments));
          if (!runs.length) runs.push(new TextRun(""));
          return new TableCell({ children: [new Paragraph({ children: runs })] });
        }),
      }));
      // 列幅（columnWidths）を明示しないとgridColが既定の小さい値のまま残り、width指定(100%)と
      // 食い違って表示が崩れることがあるビューアがあるため、A4・1インチ余白の版面幅を均等割りする。
      const colCount = tableEl.rows[0] ? tableEl.rows[0].cells.length : 0;
      const columnWidths = colCount ? Array(colCount).fill(Math.floor(9026 / colCount)) : undefined;
      if (rows.length) out.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE }, columnWidths }));
    }
    const notes = notesByAnchor.get(paraEl.dataset.paraId) || [];
    if (notes.length) out.push(sideNoteFallbackParagraph(notes));
    return out;
  }

  function blockToDocx(paraEl, comments) {
    if (paraEl.classList.contains("para-image")) return imageBlockToDocx(paraEl, comments);
    if (paraEl.classList.contains("para-table")) return tableBlockToDocx(paraEl, comments);
    if (paraEl.classList.contains("para-pagebreak")) {
      if (isTrailingPageBreak(paraEl)) return [];   // 後ろに中身が無い末尾の改ページは、白紙ページになるだけなので出さない
      // 改ページ記号だけの段落。改ページの後ろに残る段落記号ぶんの空行が次のページの先頭に出ないよう、
      // 行の高さを1pt（20twip）に固定して前後の余白も0にする。
      return [new Paragraph({ spacing: { before: 0, after: 0, line: 20, lineRule: LineRuleType.EXACT }, children: [new PageBreak()] })];
    }
    if (paraEl.classList.contains("para-hr")) {
      return [new Paragraph({ border: { bottom: { color: "999999", space: 4, style: BorderStyle.SINGLE, size: 6 } } })];
    }

    const heading = docxHeadingLevel(paraEl, HeadingLevel);
    const styleLook = heading ? paraStyleSettings[paraEl.dataset.style] : null;
    const baseMarks = {};
    if (styleLook && styleLook.bold) baseMarks.bold = true;
    // 書式ツールバーの「文字サイズ」で個別指定した段落は、見出しの既定サイズより優先する（applyParaStylesと同じ）。
    if (paraEl.dataset.fontSizePt) baseMarks.sizePt = Number(paraEl.dataset.fontSizePt);
    else if (styleLook && styleLook.fontSizePt) baseMarks.sizePt = styleLook.fontSizePt;
    if (paraEl.classList.contains("para-code")) baseMarks.mono = true;

    const runs = [];
    Array.from(paraEl.childNodes).forEach((c) => collectInlineRuns(c, baseMarks, runs, comments));
    if (!runs.length) runs.push(new TextRun(""));

    const alignment = paraEl.dataset.align === "center" ? AlignmentType.CENTER
      : paraEl.dataset.align === "right" ? AlignmentType.RIGHT : undefined;

    if (paraEl.classList.contains("para-li")) {
      const level = Number(paraEl.dataset.indentLevel || 0);
      const markerText = (paraEl.querySelector(".li-marker")?.textContent || "").trim();
      return [new Paragraph({
        alignment,
        indent: { left: (level + 1) * DOCX_INDENT_TWIP_PER_LEVEL, hanging: DOCX_INDENT_TWIP_PER_LEVEL },
        children: [new TextRun(markerText ? `${markerText} ` : ""), ...runs],
      })];
    }
    if (paraEl.classList.contains("para-quote")) {
      return [new Paragraph({ alignment, indent: { left: DOCX_INDENT_TWIP_PER_LEVEL }, children: runs })];
    }

    const indentLevel = Number(paraEl.dataset.indentLevel || 0);
    const hangingChars = Number(paraEl.dataset.hanging || 0);
    const indent = (indentLevel || hangingChars) ? {
      left: indentLevel * DOCX_INDENT_TWIP_PER_LEVEL + hangingChars * DOCX_INDENT_TWIP_PER_LEVEL,
      hanging: hangingChars ? hangingChars * DOCX_INDENT_TWIP_PER_LEVEL : undefined,
    } : undefined;
    return [new Paragraph({ heading: heading || undefined, alignment, indent, children: runs })];
  }

  const comments = [];   // [[{id,text,color}, ...], ...]（インデックス＝Wordコメントid）
  const paragraphs = [];
  const title = projectTitle();
  if (title) paragraphs.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(title)] }));
  Array.from(doc.children)
    .filter((el) => el.classList && el.classList.contains("para"))
    .forEach((paraEl) => { blockToDocx(paraEl, comments).forEach((b) => paragraphs.push(b)); });

  const docxDoc = new Document({
    styles: { default: { document: { run: { font: "游明朝", size: 24 } } } },   // 本文12pt・游明朝を既定に（テーマごとのフォントは反映しない簡略化）
    comments: {
      children: comments.map((notes, id) => ({
        id,
        author: notes.length === 1 ? colorLabel(notes[0].color) : "サイドノート",
        initials: "SN",
        date: new Date(),
        children: notes.map((n) => new Paragraph({
          children: [
            new TextRun({ text: `${colorLabel(n.color)}：`, bold: true }),
            new TextRun({ text: docxStripMarkup(n.text) }),
          ],
        })),
      })),
    },
    sections: [{ children: paragraphs }],
  });
  return Packer.toBlob(docxDoc);
}

saveDocxBtn.onclick = async () => {
  try {
    setStatus("Wordファイルを作成中…");
    const blob = await buildDocxBlob();
    const namePart = projectTitle() ? `-${sanitizeFilename(projectTitle())}` : "";
    const filename = `sidenote${namePart}-${timestamp()}.docx`;
    downloadBlob(blob, filename);
    setStatus(`書き出しました：${filename}`);
  } catch (err) {
    console.error(err);
    setStatus("Wordファイルの作成に失敗しました。");
  }
};
