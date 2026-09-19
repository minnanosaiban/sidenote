"use strict";

// ==================================================================
// 簡易Markdownパーサー（基本構文のみ対応・依存ライブラリ無し）
// ------------------------------------------------------------------
// AIチャットが出力する典型的なMarkdown（見出し・段落・強調・リンク・
// リスト・引用・水平線・表・コードブロック・画像）を、DOMに依存しない
// ブロックの配列に変換する。実際のDOM構築（#docへの挿入）はapp.js側で行う。
// CommonMark完全準拠は狙わない（「基本的なMarkdown」を実用範囲でカバーする方針）。
// ==================================================================

// ---- インライン構文（**太字**・*斜体*・`コード`・[リンク](url)・~~取消線~~） ----
// 1) まずHTMLエスケープ → 2) `コード`を最優先で確定（中身は以降の処理から保護）→
// 3) 太字・斜体・取消線・リンクの順で変換する。
function escapeHtmlMd(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// リンクURLの簡易サニタイズ（javascript:等の実行系スキームを弾く）。
function isSafeUrl(url) {
  const trimmed = url.trim();
  if (/^(https?:|mailto:)/i.test(trimmed)) return true;
  if (/^[#./]/.test(trimmed)) return true;   // ページ内リンク・相対パス
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return true;   // スキームが無い＝相対パス扱い
  return false;
}

function inlineToHtml(raw) {
  if (!raw) return "";
  let s = escapeHtmlMd(raw);

  // `コード`：中身をプレースホルダに退避し、後段の太字/斜体等の対象から外す。
  const codeStash = [];
  s = s.replace(/`([^`]+?)`/g, (_, code) => {
    codeStash.push(code);
    return ` CODE${codeStash.length - 1} `;
  });

  // **太字** / __太字__
  s = s.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__([^_]+?)__/g, "<strong>$1</strong>");
  // ~~取消線~~
  s = s.replace(/~~([^~]+?)~~/g, "<del>$1</del>");
  // *斜体* / _斜体_（太字を処理した後なので単独の*/_だけが残っている）
  s = s.replace(/\*([^*]+?)\*/g, "<em>$1</em>");
  s = s.replace(/(^|[^\w])_([^_]+?)_(?!\w)/g, "$1<em>$2</em>");
  // [文字](URL)
  s = s.replace(/\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g, (m, text, url) => {
    if (!isSafeUrl(url)) return text;
    return `<a href="${escapeHtmlMd(url)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });

  // 退避しておいた`コード`を戻す（中身はHTMLエスケープ済みのまま＝安全）。
  s = s.replace(/ CODE(\d+) /g, (_, i) => `<code>${codeStash[Number(i)]}</code>`);
  // 段落内の改行（Shift+Enterで入れた<br>を、app.js側のMarkdown書き出しが"\n"にしたもの）を
  // <br>へ戻す。空行区切り（＝新しい段落）とは違い、段落を分けない改行なので余白は付かない
  // （2026-09、Shift+Enterの改行が保存・再読み込みで失われる指摘を受けて対応）。
  s = s.replace(/\n/g, "<br>");
  return s;
}

// ---- 表の1行を分割（\|でエスケープされたパイプは分割対象にしない） ----
function splitTableRow(line) {
  let t = line.trim();
  if (t.startsWith("|")) t = t.slice(1);
  if (t.endsWith("|") && !t.endsWith("\\|")) t = t.slice(0, -1);
  const cells = [];
  let cur = "";
  for (let i = 0; i < t.length; i++) {
    if (t[i] === "\\" && t[i + 1] === "|") { cur += "|"; i++; continue; }
    if (t[i] === "|") { cells.push(cur.trim()); cur = ""; continue; }
    cur += t[i];
  }
  cells.push(cur.trim());
  return cells;
}

function isTableSeparatorRow(line) {
  const cells = splitTableRow(line);
  if (!cells.length) return false;
  return cells.every((c) => /^:?-{1,}:?$/.test(c.trim()));
}

function cellAlign(sep) {
  const t = sep.trim();
  const left = t.startsWith(":");
  const right = t.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return null;
}

const RE_HEADING = /^(#{1,6})\s+(.*)$/;
const RE_HR = /^\s*((?:-\s*){3,}|(?:\*\s*){3,}|(?:_\s*){3,})\s*$/;
const RE_QUOTE = /^\s*>\s?(.*)$/;
const RE_LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const RE_IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/;
const RE_CODE_FENCE = /^```(.*)$/;
// 改ページの目印。Markdownに改ページの標準記法は無いので、他のビューアでは何も表示されないHTMLコメント
// （pagebreak）を1行だけ書く形にする。大文字小文字・前後の空白は問わない。ツールの「MDで書き出す」も
// 同じ1行を書き出す（2026-09）。
const RE_PAGEBREAK = /^\s*<!--\s*pagebreak\s*-->\s*$/i;

// ---- ブロック分割（1文書 → ブロックの配列） ----
// 各ブロック: { type: "heading"|"paragraph"|"blockquote"|"hr"|"li"|"table"|"code"|"image"|"pagebreak", ... }
function parseMarkdownBlocks(text) {
  const lines = String(text).replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (/^\s*$/.test(line)) { i++; continue; }

    let m;

    // フェンス付きコードブロック
    if ((m = line.match(RE_CODE_FENCE))) {
      const lang = m[1].trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) { codeLines.push(lines[i]); i++; }
      if (i < lines.length) i++;   // 閉じ```を読み飛ばす
      blocks.push({ type: "code", lang, text: codeLines.join("\n") });
      continue;
    }

    // 見出し
    if ((m = line.match(RE_HEADING))) {
      blocks.push({ type: "heading", level: m[1].length, text: m[2].trim() });
      i++; continue;
    }

    // 改ページ（HTMLコメントpagebreakだけの1行）。他のどの構文とも紛れないので、見出しの直後に判定する。
    if (RE_PAGEBREAK.test(line)) {
      blocks.push({ type: "pagebreak" });
      i++; continue;
    }

    // 水平線（リストのマーカーと紛らわしいので見出し・リストより後、表より前に判定）
    if (RE_HR.test(line)) {
      blocks.push({ type: "hr" });
      i++; continue;
    }

    // 表（次行が区切り行 ---|--- であることで判定）
    if (line.includes("|") && i + 1 < lines.length && isTableSeparatorRow(lines[i + 1])) {
      const header = splitTableRow(line);
      const aligns = splitTableRow(lines[i + 1]).map(cellAlign);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim() !== "" && lines[i].includes("|")) {
        rows.push(splitTableRow(lines[i]));
        i++;
      }
      blocks.push({ type: "table", header, aligns, rows });
      continue;
    }

    // 引用（連続する > 行を1ブロックにまとめる）
    if ((m = line.match(RE_QUOTE))) {
      const quoteLines = [m[1]];
      i++;
      while (i < lines.length && RE_QUOTE.test(lines[i])) {
        quoteLines.push(lines[i].match(RE_QUOTE)[1]);
        i++;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join(" ").trim() });
      continue;
    }

    // 単独行の画像 ![alt](url)
    if ((m = line.match(RE_IMAGE_LINE))) {
      blocks.push({ type: "image", alt: m[1], url: m[2] });
      i++; continue;
    }

    // リスト項目（インデント2字＝1階層、最大2階層まで）
    if ((m = line.match(RE_LIST))) {
      const indentLevel = Math.min(2, Math.floor(m[1].length / 2));
      const marker = m[2];
      const ordered = /^\d/.test(marker);
      const startNum = ordered ? parseInt(marker, 10) : null;
      let itemText = m[3];
      i++;
      // 継続行（インデントされた折り返し行。新しい項目・空行ではない）はそのまま連結する。
      while (i < lines.length && lines[i].trim() !== "" &&
        /^\s{2,}\S/.test(lines[i]) && !RE_LIST.test(lines[i])) {
        itemText += " " + lines[i].trim();
        i++;
      }
      blocks.push({ type: "li", ordered, startNum, indentLevel, text: itemText.trim() });
      continue;
    }

    // 段落（見出し等の特殊行に出会うまで連続する行を1段落にまとめる）。行の連結は"\n"で行う
    // （空行を挟まない連続行＝Shift+Enterで入れた段落内改行として区別するため。2026-09、
    // 以前はスペース結合で改行を消していたのを変更。inlineToHtml側で"\n"を<br>に戻す）。
    const paraLines = [line];
    i++;
    while (i < lines.length && lines[i].trim() !== "" &&
      !RE_HEADING.test(lines[i]) && !RE_QUOTE.test(lines[i]) && !RE_HR.test(lines[i]) && !RE_PAGEBREAK.test(lines[i]) &&
      !RE_LIST.test(lines[i]) && !RE_CODE_FENCE.test(lines[i]) && !RE_IMAGE_LINE.test(lines[i]) &&
      !(lines[i].includes("|") && i + 1 < lines.length && isTableSeparatorRow(lines[i + 1]))) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: "paragraph", text: paraLines.join("\n").trim() });
  }

  assignOrderedListNumbers(blocks);
  return blocks;
}

// 順序付きリストの表示番号を確定する。同じ階層で連続する項目は自動連番、
// 別の階層・別のブロックを挟んだ場合はその項目自身の記載番号（無ければ1）から数え直す。
function assignOrderedListNumbers(blocks) {
  const counters = new Map();   // indentLevel -> 直近の番号
  let lastLiIndent = -1;
  blocks.forEach((b) => {
    if (b.type !== "li") { counters.clear(); lastLiIndent = -1; return; }
    if (!b.ordered) { lastLiIndent = b.indentLevel; return; }
    if (b.indentLevel !== lastLiIndent || !counters.has(b.indentLevel)) {
      counters.set(b.indentLevel, b.startNum != null ? b.startNum : 1);
    } else {
      counters.set(b.indentLevel, counters.get(b.indentLevel) + 1);
    }
    b.displayNum = counters.get(b.indentLevel);
    lastLiIndent = b.indentLevel;
  });
}

if (typeof window !== "undefined") {
  window.MdParser = { parseMarkdownBlocks, inlineToHtml, escapeHtmlMd };
}
