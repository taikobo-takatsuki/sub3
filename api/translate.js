const axios = require('axios');

// 環境変数からAPIキーを取得
const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

module.exports = async (req, res) => {
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // OPTIONSリクエスト（プリフライトリクエスト）への対応
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POSTメソッド以外は許可しない
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // リクエストボディからパラメータを取得
    const { text, source, target = 'ja' } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'テキストが提供されていません' });
    }

    // Google Translation APIを呼び出す
    const response = await axios.post(
      `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`,
      {
        q: text,
        source: source || '',
        target: target,
        format: 'text'
      }
    );

    // レスポンスをクライアントに返す
    return res.status(200).json(response.data);
  } catch (error) {
    console.error('翻訳エラー:', error.response?.data || error.message);
    return res.status(500).json({
      error: '翻訳中にエラーが発生しました',
      details: error.response?.data || error.message
    });
  }
}; 