const axios = require('axios');

// 環境変数からAPIキーを取得
const API_KEY = process.env.HUGGINGFACE_API_KEY;

// 言語検出モデル
const LANGUAGE_DETECTION_MODEL = 'papluca/xlm-roberta-base-language-detection';

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
    // リクエストボディからテキストを取得
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'テキストが提供されていません' });
    }

    console.log('言語検出APIリクエスト:', { text }); // デバッグログ追加

    // APIキーチェック
    if (!API_KEY) {
      console.error('APIキーが設定されていません');
      return res.status(500).json({ 
        error: 'APIキーが設定されていません',
        details: 'サーバー管理者にAPIキーの設定を依頼してください' 
      });
    }

    try {
      // Hugging Face APIを呼び出して言語を検出する
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${LANGUAGE_DETECTION_MODEL}`,
        {
          inputs: text
        },
        {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('APIレスポンス:', response.data); // デバッグログ追加

      // レスポンスを整形してクライアントに返す
      let detectedLanguage = 'en'; // デフォルト言語
      
      if (response.data && response.data.length > 0) {
        // 最も確率の高い言語を選択
        const sortedLangs = [...response.data[0]].sort((a, b) => b.score - a.score);
        if (sortedLangs.length > 0) {
          detectedLanguage = sortedLangs[0].label;
        }
      }

      return res.status(200).json({ 
        detectedLanguage: detectedLanguage,
        success: true
      });
    } catch (apiError) {
      console.error('Hugging Face API呼び出しエラー:', apiError.message);
      if (apiError.response) {
        console.error('APIレスポンス:', apiError.response.data);
      }
      
      // APIエラーでも続行するために、デフォルト言語を返す
      return res.status(200).json({ 
        detectedLanguage: 'en',
        success: false,
        apiError: apiError.message
      });
    }
  } catch (error) {
    console.error('言語検出エラー:', error.message);
    return res.status(500).json({
      error: '言語検出中にエラーが発生しました',
      details: error.message
    });
  }
}; 