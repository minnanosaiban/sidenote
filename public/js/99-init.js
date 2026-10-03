"use strict";

// 【99-init.js】起動時の初期化（全ファイルの関数・変数の定義が揃ってから、元のapp.jsと同じ順で実行する）
// app.jsを機械的に分割したファイル（index.htmlの<script>の並び順どおりに読み込む）。
// 単一ファイルの時は関数宣言の巻き上げで「後ろの方で定義した関数」を先頭付近から呼べたが、
// ファイルを分けるとそれができないため、そういう起動時の呼び出しをここへ集めた。

// 初回読み込み時もrenumberAndLayout()を呼んでおく（呼ばないとlayoutSidenotes()が一度も走らず、
// 注釈0件時のグレーアウトの見本カードが最初の入力までサイドに出ない）。
renumberAndLayout();
updateFormatToolbarState();

applyMarkdownMode();

// Undo/Redo履歴の初回セット。最後に呼ぶのは、serializeProject()がcurrentTheme等、後ろの方でlet宣言される
// 変数も参照するため、それらの初期化が全て終わるのを待つ必要があるため（早いとTDZのReferenceErrorになる）。
initUndoHistory();
