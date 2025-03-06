# 多言語カタカナ変換アプリ

このアプリケーションは、ユーザーが外国語を入力すると、日本語に翻訳し、さらに発音をカタカナで表示するウェブアプリケーションです。

## 機能

- 入力テキストの言語を自動検出
- 検出した言語から日本語へ翻訳
- 外国語の発音をカタカナで表示（特定の言語のみ）

## 使い方（ローカル開発）

1. リポジトリをクローンする
2. Google Cloud Translation APIのAPIキーを取得する
3. ブラウザでindex.htmlを開く
4. 最初の使用時にAPIキーの入力を求められる（ローカルストレージに保存されます）
5. 外国語のテキストを入力欄に入力し、「翻訳＆カタカナ変換」ボタンをクリックする

## Vercelへのデプロイ方法

このアプリケーションはVercelにデプロイできるように設定されています。以下の手順でデプロイしてください：

1. Vercelアカウントを作成する（まだ持っていない場合）
2. Vercel CLIをインストールする
   ```
   npm install -g vercel
   ```
3. 依存関係をインストールする
   ```
   npm install
   ```
4. Vercelにログインする
   ```
   vercel login
   ```
5. プロジェクトをデプロイする
   ```
   vercel
   ```
6. 環境変数を設定する
   - Vercelダッシュボードにアクセスし、プロジェクト設定の「Environment Variables」セクションで以下を設定：
   - `GOOGLE_TRANSLATE_API_KEY` に Google Cloud Translation APIのキーを設定

## APIキーの安全な管理

このアプリケーションでは、Google Translate APIを使用しています。APIキーの管理には以下の方法があります。

### ローカル開発時

- 初回利用時にプロンプトが表示され、APIキーを入力するとブラウザのローカルストレージに保存されます。
- これはローカル開発環境（localhost）でのみ機能します。

### 本番環境（Vercel）

- Vercelの環境変数でAPIキーを安全に管理します。
- クライアント側のコードからAPIキーは見えません。
- サーバーレス関数がAPIキーを使用して、Google APIと通信します。

## カタカナ変換について

現在の実装では、カタカナ変換機能は基本的なものとなっています。より高品質なカタカナ変換を実現するには、以下のライブラリの使用を検討してください：

- [kuroshiro.js](https://github.com/hexenq/kuroshiro) - 日本語文字変換ライブラリ
- [WanaKana.js](https://github.com/WaniKani/WanaKana) - 日本語入力支援ライブラリ

## 技術スタック

- HTML/CSS/JavaScript (フロントエンド)
- Node.js/Vercel Serverless Functions (バックエンド)
- Google Cloud Translation API

## ライセンス

MITライセンス 