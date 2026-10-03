"use strict";

// 【99-init.js】起動時の初期化（全ファイルの関数・変数の定義が揃ってから、元のapp.jsと同じ順で実行する）
// app.jsを機械的に分割したファイル（index.htmlの<script>の並び順どおりに読み込む）。
// 単一ファイルの時は関数宣言の巻き上げで「後ろの方で定義した関数」を先頭付近から呼べたが、
// ファイルを分けるとそれができないため、そういう起動時の呼び出しをここへ集めた。

// 起動時の初期化の呼び出しは、ここに集める。元の1ファイル（app.js）での実行順をそのまま保っている。
// ここに無いのは、変数の宣言のすぐ隣で自分の状態を読み込むもの（localStorageからの復元：
// markdownMode・lastPdfColor・メニュー表示設定・loadShowLabelDefaults・loadThemeDefault）。
// それらは直後のコードが結果を前提にするので、宣言と同じ場所に置いている。
// 同じ理由で、resetDoc()・updatePlaceholder()は10-sanitize-paste.jsに残している。画面下部の注記
// （updateFooterInfo）が、#docに段落がある状態で測った見出しの上部余白を表示するため、テーマの
// 初期適用（70-ui-panels.jsのloadThemeDefault）より前に#docを作っておく必要がある
// （後ろに回すと「上部余白1.1em」が「0em」と表示される）。
// 順序を変えると初期状態が変わりうる（例：checkAutoSaveOnLoadは復元ボタンの有効/無効を決める）。

// 初回読み込み時もrenumberAndLayout()を呼んでおく（呼ばないとlayoutSidenotes()が一度も走らず、
// 注釈0件時のグレーアウトの見本カードが最初の入力までサイドに出ない）。
renumberAndLayout();
updateFormatToolbarState();

// ブラウザ内の自動保存の有無を見て「続きから再開」ボタンの状態を決める。
checkAutoSaveOnLoad();

// 画面の各部の初期表示（色の名前、編集メニューの固定・表示、「↑」ボタン、Markdownモード）。
updateColorSwatchLabels();
applyMenuSticky();
applyEditMenuVisibility();
applyMarkdownMode();
updateBackToTopBtn();

// 「項番設定」パネルの入力欄に、現在の設定値を反映する。
refreshStyleSettingInputs();
refreshNumberingSettingInputs();

// Undo/Redo履歴の初回セット。最後に呼ぶのは、serializeProject()がcurrentTheme等、後ろの方でlet宣言される
// 変数も参照するため、それらの初期化が全て終わるのを待つ必要があるため（早いとTDZのReferenceErrorになる）。
initUndoHistory();
