"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { parseMarkdownBlocks, inlineToHtml, isSafeUrl } = require("../public/md-parser.js");

const blocks = (md) => parseMarkdownBlocks(md);

test("inlineToHtml: 基本の強調", () => {
  assert.equal(inlineToHtml("**太字**"), "<strong>太字</strong>");
  assert.equal(inlineToHtml("*斜体*"), "<em>斜体</em>");
  assert.equal(inlineToHtml("~~取消~~"), "<del>取消</del>");
  assert.equal(inlineToHtml("`code`"), "<code>code</code>");
  assert.equal(inlineToHtml(""), "");
});

test("inlineToHtml: 入力のHTMLはエスケープされる", () => {
  assert.equal(inlineToHtml("<script>alert(1)</script>"), "&lt;script&gt;alert(1)&lt;/script&gt;");
  assert.equal(inlineToHtml("a & b"), "a &amp; b");
});

test("inlineToHtml: コード内は強調記法の対象外", () => {
  assert.equal(inlineToHtml("`a*b*c`"), "<code>a*b*c</code>");
});

test("inlineToHtml: 本文中の ' CODE0 ' はコードのプレースホルダと衝突しない", () => {
  assert.equal(inlineToHtml("a CODE0 b"), "a CODE0 b");
  assert.equal(inlineToHtml("x CODE1 `y` CODE0 z"), "x CODE1 <code>y</code> CODE0 z");
});

test("inlineToHtml: 入力中の U+0000 では壊れない", () => {
  assert.equal(inlineToHtml("a\u00000\u0000b `c`"), "a0b <code>c</code>");
});

test("リンク: 通常のURL", () => {
  assert.equal(
    inlineToHtml("[q](http://x/?a=1&b=2)"),
    '<a href="http://x/?a=1&amp;b=2" target="_blank" rel="noopener noreferrer">q</a>',
  );
});

test("リンク: 引用符でhref属性を抜け出せない（属性注入XSSの回帰テスト）", () => {
  const html = inlineToHtml('[x](http://a"onmouseover="alert`1`)');
  assert.ok(!/"onmouseover/.test(html), html);
  assert.ok(!/ onmouseover=/.test(html), html);
  assert.match(html, /href="http:\/\/a&quot;onmouseover=&quot;/);
  const single = inlineToHtml("[x](http://a'onmouseover='alert`1`)");
  assert.ok(!/'onmouseover/.test(single), single);
});

test("リンク: javascript: などの実行系スキームはリンクにしない", () => {
  assert.ok(!inlineToHtml("[x](javascript:alert(1))").includes("<a "));
  assert.ok(!inlineToHtml("[x](javascript:alert)").includes("<a "));
  assert.ok(!inlineToHtml("[x](data:text/html,hi)").includes("<a "));
});

test("isSafeUrl", () => {
  for (const u of ["https://a", "HTTP://a", "mailto:a@b", "#x", "./a", "/a", "a/b"]) assert.equal(isSafeUrl(u), true, u);
  for (const u of ["javascript:x", "JaVaScRiPt:x", "data:text/html,x", "vbscript:x"]) assert.equal(isSafeUrl(u), false, u);
});

test("段落内の改行は<br>になる", () => {
  assert.equal(inlineToHtml("a\nb"), "a<br>b");
  assert.deepEqual(blocks("a\nb"), [{ type: "paragraph", text: "a\nb" }]);
});

test("見出し・水平線・改ページ", () => {
  assert.deepEqual(blocks("## 見出し"), [{ type: "heading", level: 2, text: "見出し" }]);
  assert.deepEqual(blocks("---"), [{ type: "hr" }]);
  assert.deepEqual(blocks("<!-- pagebreak -->"), [{ type: "pagebreak" }]);
  assert.deepEqual(blocks("  <!--PageBreak-->  "), [{ type: "pagebreak" }]);
});

test("空行で段落が分かれる／CRLFも扱える", () => {
  assert.equal(blocks("a\r\n\r\nb").length, 2);
});

test("コードブロック（閉じが無くても最後まで）", () => {
  assert.deepEqual(blocks("```js\nlet a = 1;\n```"), [{ type: "code", lang: "js", text: "let a = 1;" }]);
  assert.deepEqual(blocks("```\nx\ny"), [{ type: "code", lang: "", text: "x\ny" }]);
});

test("引用は連続行を1ブロックにまとめる", () => {
  assert.deepEqual(blocks("> a\n> b"), [{ type: "blockquote", text: "a b" }]);
});

test("単独行の画像", () => {
  assert.deepEqual(blocks("![alt](http://x/a.png)"), [{ type: "image", alt: "alt", url: "http://x/a.png" }]);
});

test("リスト: 階層（インデント2字＝1段）と連番", () => {
  const b = blocks("1. a\n2. b\n  - c\n3. d");
  assert.deepEqual(b.map((x) => [x.type, x.ordered, x.indentLevel]), [
    ["li", true, 0], ["li", true, 0], ["li", false, 1], ["li", true, 0],
  ]);
  assert.deepEqual(b.filter((x) => x.ordered).map((x) => x.displayNum), [1, 2, 3]);   // 階層が変わると、その項目自身の記載番号から数え直す（ここでは3.）
});

test("リスト: 記載番号から数え始める／段落を挟むと数え直す", () => {
  const b = blocks("3. a\n4. b\n\ntext\n\n1. c");
  assert.deepEqual(b.filter((x) => x.type === "li").map((x) => x.displayNum), [3, 4, 1]);
});

test("リスト: 折り返し行は項目に連結される", () => {
  assert.deepEqual(blocks("- aaa\n  bbb").map((x) => x.text), ["aaa bbb"]);
});

test("表: ヘッダー・配置・行", () => {
  const [t] = blocks("| a | b |\n|:--|--:|\n| 1 | 2 |\n| 3 | 4 |");
  assert.equal(t.type, "table");
  assert.deepEqual(t.header, ["a", "b"]);
  assert.deepEqual(t.aligns, ["left", "right"]);
  assert.deepEqual(t.rows, [["1", "2"], ["3", "4"]]);
});

test("表: セル内のエスケープした縦線は区切りにならず、<br>は改行になる", () => {
  const [t] = blocks("| a | b |\n|---|---|\n| x\\|y | p<br>q |");
  assert.deepEqual(t.rows[0], ["x|y", "p\nq"]);
  assert.equal(inlineToHtml(t.rows[0][1]), "p<br>q");
});

test("表: 区切り行が無ければ表にならない", () => {
  assert.equal(blocks("| a | b |")[0].type, "paragraph");
});

test("空の入力", () => {
  assert.deepEqual(blocks(""), []);
  assert.deepEqual(blocks("\n\n  \n"), []);
});
