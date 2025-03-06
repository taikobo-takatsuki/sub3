const axios = require('axios');

// 環境変数からAPIキーを取得
const API_KEY = process.env.HUGGINGFACE_API_KEY;

// カタカナ変換用のモデル
const KATAKANA_MODEL = 'facebook/m2m100_418M';

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
    const { text, sourceLanguage } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'テキストが提供されていません' });
    }

    // カタカナ変換用のプロンプト
    const katakanaPrompt = `以下の文をカタカナ発音に変換してください: "${text}"`;

    // Hugging Face APIを呼び出す
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${KATAKANA_MODEL}`,
      {
        inputs: katakanaPrompt,
        parameters: {
          source_lang: sourceLanguage,
          target_lang: "ja"
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // レスポンスを整形してクライアントに返す
    let katakana = '';
    
    if (response.data && response.data.length > 0) {
      katakana = response.data[0].generated_text;
      
      // カタカナ部分を抽出
      const katakanaOnly = katakana.match(/[ァ-ヶー]+/g);
      if (katakanaOnly && katakanaOnly.length > 0) {
        katakana = katakanaOnly.join(' ');
      }
    }

    return res.status(200).json({ 
      katakana: katakana 
    });
  } catch (error) {
    console.error('カタカナ変換エラー:', error.response?.data || error.message);
    return res.status(500).json({
      error: 'カタカナ変換中にエラーが発生しました',
      details: error.response?.data || error.message
    });
  }
}; 