// Node.jsプロキシサーバーの例
// このサーバーはクライアントからのリクエストを受け取り、Google Translation APIに転送します
// APIキーはサーバー側で安全に管理します

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const dotenv = require('dotenv');

// 環境変数の読み込み
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// APIキーを環境変数から取得
const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

// ミドルウェアの設定
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // フロントエンドのファイルを提供

// 言語検出のエンドポイント
app.post('/api/detect', async (req, res) => {
    try {
        const { text } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'テキストが提供されていません' });
        }
        
        const response = await axios.post(
            `https://translation.googleapis.com/language/translate/v2/detect?key=${API_KEY}`,
            { q: text }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('言語検出エラー:', error.response?.data || error.message);
        res.status(500).json({ 
            error: '言語検出中にエラーが発生しました',
            details: error.response?.data || error.message
        });
    }
});

// 翻訳のエンドポイント
app.post('/api/translate', async (req, res) => {
    try {
        const { text, source, target } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'テキストが提供されていません' });
        }
        
        const response = await axios.post(
            `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`,
            {
                q: text,
                source: source || '',
                target: target || 'ja',
                format: 'text'
            }
        );
        
        res.json(response.data);
    } catch (error) {
        console.error('翻訳エラー:', error.response?.data || error.message);
        res.status(500).json({ 
            error: '翻訳中にエラーが発生しました',
            details: error.response?.data || error.message
        });
    }
});

// サーバーの起動
app.listen(PORT, () => {
    console.log(`サーバーがポート${PORT}で起動しました`);
});

// 環境変数の例 (.envファイル)
/*
PORT=3000
GOOGLE_TRANSLATE_API_KEY=あなたのAPIキーをここに設定
*/

// package.jsonの依存関係の例
/*
{
  "name": "translation-proxy-server",
  "version": "1.0.0",
  "description": "Translation API Proxy Server",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "axios": "^0.24.0",
    "cors": "^2.8.5",
    "dotenv": "^10.0.0",
    "express": "^4.17.1"
  },
  "devDependencies": {
    "nodemon": "^2.0.15"
  }
}
*/ 