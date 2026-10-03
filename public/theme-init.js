// テーマ・ダークモードの初期反映（<head>で同期的に実行してちらつきを防ぐ）。
// CSP（_headers）でインラインscriptを禁止しているため、index.htmlから外部ファイルとして読む。
try {
  var t = localStorage.getItem("sidenote-theme-v1");
  if (t) document.documentElement.dataset.theme = t;
  if (localStorage.getItem("sidenote-dark-mode-v1") === "1") document.documentElement.classList.add("dark-mode");
} catch (e) { /* noop */ }
