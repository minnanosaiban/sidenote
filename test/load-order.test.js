"use strict";
// public/js/*.js の読み込み順（index.htmlの<script>の並び）を守るためのテスト。
//
// app.jsを分割したファイルは、同じグローバルスコープを共有するクラシックスクリプトとして順に読み込む。
// 単一ファイルの時は関数宣言の巻き上げで「後ろで定義した関数」を先頭から呼べたが、分割後は
// 「起動時（読み込み中）に実行される文」が、より後ろのファイルの関数・let/constに触れると
// ReferenceErrorで初期化が止まる。ブラウザで開かなくても気づけるよう、構文解析で検出する。
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const acorn = require("acorn");

const PUBLIC = path.join(__dirname, "..", "public");
const indexHtml = fs.readFileSync(path.join(PUBLIC, "index.html"), "utf8");
const order = [...indexHtml.matchAll(/<script src="(js\/[^"?]+)(?:\?[^"]*)?"><\/script>/g)].map((m) => m[1]);

// 呼ばれても「その場では実行されない」登録系（コールバックは起動時には動かない）。
const DEFERRING_CALLS = new Set(["addEventListener", "setTimeout", "setInterval", "requestAnimationFrame", "then", "observe", "debounce"]);
const isFn = (n) => /Function/.test(n.type);

function parseFile(rel) {
  const src = fs.readFileSync(path.join(PUBLIC, rel), "utf8");
  return acorn.parse(src, { ecmaVersion: 2022, sourceType: "script", locations: true });
}

// ノードを実行した時に評価される識別子（refs）と、直接呼ばれる関数名（calls）を集める。
// 関数の本体は「呼ばれた時」だけ辿る（宣言・代入しただけでは動かない）。
// プロパティ名（a.foo の foo）と、ローカルで宣言された名前（引数・内側のvar/let/const）は除く。
function collect(node, refs, calls, locals) {
  (function visit(n) {
    if (!n || typeof n.type !== "string") return;
    if (isFn(n)) return;
    if (n.type === "Identifier") { if (!locals.has(n.name)) refs.add(n.name); return; }
    if (n.type === "MemberExpression") {
      visit(n.object);
      if (n.computed) visit(n.property);
      return;
    }
    if (n.type === "Property") {
      if (n.computed) visit(n.key);
      visit(n.value);
      return;
    }
    if (n.type === "CallExpression") {
      visit(n.callee);
      if (n.callee.type === "Identifier" && !locals.has(n.callee.name)) calls.add(n.callee.name);
      const name = (n.callee.property && n.callee.property.name) || n.callee.name;
      const deferred = DEFERRING_CALLS.has(name);
      n.arguments.forEach((a) => {
        if (isFn(a)) { if (!deferred) visit(a.body); } else visit(a);
      });
      return;
    }
    for (const k of Object.keys(n)) {
      if (k === "type" || k === "loc") continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v.type === "string") visit(v);
    }
  })(node);
}

// 関数内で宣言された名前（引数・var/let/const・内側の関数宣言）。グローバルと同名の局所変数を誤検出しない。
function localNames(fn) {
  const names = new Set();
  const addPattern = (p) => {
    if (!p) return;
    if (p.type === "Identifier") names.add(p.name);
    else if (p.type === "ObjectPattern") p.properties.forEach((x) => addPattern(x.value || x.argument));
    else if (p.type === "ArrayPattern") p.elements.forEach(addPattern);
    else if (p.type === "AssignmentPattern") addPattern(p.left);
    else if (p.type === "RestElement") addPattern(p.argument);
  };
  fn.params.forEach(addPattern);
  (function walk(n) {
    if (!n || typeof n.type !== "string") return;
    if (n.type === "VariableDeclarator") addPattern(n.id);
    if (n.type === "FunctionDeclaration" && n.id) names.add(n.id.name);
    if (n.type === "CatchClause" && n.param) addPattern(n.param);
    for (const k of Object.keys(n)) {
      if (k === "type" || k === "loc") continue;
      const v = n[k];
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v.type === "string") walk(v);
    }
  })(fn.body);
  return names;
}

function analyze() {
  const functions = new Map();   // 名前 -> { node, file, locals }
  const lexicals = new Map();    // トップレベルのlet/const/class名 -> ファイル番号
  const roots = [];              // 起動時に実行されるトップレベルの文 { node, file }
  order.forEach((rel, file) => {
    const ast = parseFile(rel);
    ast.body.forEach((n) => {
      if (n.type === "FunctionDeclaration") {
        functions.set(n.id.name, { node: n, file, locals: localNames(n) });
        return;
      }
      if (n.type === "VariableDeclaration" && n.kind !== "var") {
        n.declarations.forEach((d) => { if (d.id.type === "Identifier") lexicals.set(d.id.name, file); });
      }
      if (n.type === "ClassDeclaration") lexicals.set(n.id.name, file);
      roots.push({ node: n, file, rel });
    });
  });

  const problems = [];
  roots.forEach(({ node, file, rel }) => {
    const refs = new Set();
    const calls = new Set();
    collect(node, refs, calls, new Set());
    const where = `${rel}:${node.loc.start.line}`;
    const check = (name, via) => {
      const f = functions.get(name);
      if (f && f.file > file) problems.push(`${where} が、後ろのファイル ${order[f.file]} の関数 ${name}() を起動時に使う${via}`);
      const l = lexicals.get(name);
      if (l !== undefined && l > file) problems.push(`${where} が、後ろのファイル ${order[l]} の ${name} を起動時に使う${via}`);
    };
    refs.forEach((name) => check(name, ""));
    // 起動時に呼ぶ関数が、さらに内側で使うものも辿る。
    const seen = new Set();
    const queue = [...calls].map((n) => [n, n]);
    while (queue.length) {
      const [name, trail] = queue.pop();
      const f = functions.get(name);
      if (!f || seen.has(name)) continue;
      seen.add(name);
      const r2 = new Set();
      const c2 = new Set();
      collect(f.node.body, r2, c2, f.locals);
      r2.forEach((n) => { if (n !== name) check(n, `（${trail} から呼ばれる）`); });
      c2.forEach((n) => queue.push([n, `${trail}→${n}`]));
    }
  });
  return [...new Set(problems)];
}

test("index.htmlが読み込むjs/*.jsは、実在し、js/にある全ファイルと一致する", () => {
  assert.ok(order.length > 1, "index.htmlに js/*.js の<script>が見つからない");
  order.forEach((rel) => assert.ok(fs.existsSync(path.join(PUBLIC, rel)), `${rel} が存在しない`));
  const onDisk = fs.readdirSync(path.join(PUBLIC, "js")).filter((f) => f.endsWith(".js")).map((f) => `js/${f}`).sort();
  assert.deepEqual([...order].sort(), onDisk, "js/ にあるのに<script>で読み込まれていない（または逆の）ファイルがある");
});

test("ファイル名の番号順に読み込まれ、起動時の初期化（99-init.js）が最後", () => {
  assert.deepEqual(order, [...order].sort(), "<script>の並びがファイル名の番号順になっていない");
  assert.equal(path.basename(order[order.length - 1]), "99-init.js");
});

test("各ファイルが単独で構文エラーなく読める", () => {
  order.forEach((rel) => assert.doesNotThrow(() => parseFile(rel), rel));
});

test("起動時に実行される文が、後ろのファイルの関数・let/constに触れない", () => {
  const problems = analyze();
  assert.deepEqual(problems, [], "読み込み順の問題:\n" + problems.join("\n"));
});

test("（自己検査）検出器が空振りしていない：後ろの関数の起動時呼び出しは検出し、コールバック等は誤検出しない", () => {
  const countForwardRefs = (files) => {
    const functions = new Map();
    const asts = files.map((src) => acorn.parse(src, { ecmaVersion: 2022, sourceType: "script" }));
    asts.forEach((ast, file) => ast.body.forEach((n) => { if (n.type === "FunctionDeclaration") functions.set(n.id.name, file); }));
    let bad = 0;
    asts.forEach((ast, file) => ast.body.forEach((n) => {
      if (n.type === "FunctionDeclaration") return;
      const refs = new Set();
      collect(n, refs, new Set(), new Set());
      refs.forEach((r) => { if (functions.has(r) && functions.get(r) > file) bad++; });
    }));
    return bad;
  };
  assert.equal(countForwardRefs(["init();", "function init() {}"]), 1);
  assert.equal(countForwardRefs(["function init() {}", "init();"]), 0);
  assert.equal(countForwardRefs(["btn.onclick = () => later();", "function later() {}"]), 0);   // コールバック本体は起動時に動かない
  assert.equal(countForwardRefs(["x.later = 1;", "function later() {}"]), 0);                    // プロパティ名は参照ではない
});
