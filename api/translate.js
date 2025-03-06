const axios = require('axios');

// 環境変数からAPIキーを取得
const API_KEY = process.env.HUGGINGFACE_API_KEY;

// 翻訳モデルのマッピング（言語コード → モデル名）
const TRANSLATION_MODELS = {
  'en': 'Helsinki-NLP/opus-mt-en-jap',  // 英語 → 日本語
  'fr': 'Helsinki-NLP/opus-mt-fr-jap',  // フランス語 → 日本語
  'de': 'Helsinki-NLP/opus-mt-de-jap',  // ドイツ語 → 日本語
  'zh': 'Helsinki-NLP/opus-mt-zh-jap',  // 中国語 → 日本語
  'ko': 'Helsinki-NLP/opus-mt-ko-jap',  // 韓国語 → 日本語
  // 他の言語も必要に応じて追加
  'default': 'Helsinki-NLP/opus-mt-en-jap' // デフォルトは英語→日本語
};

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

    console.log('翻訳APIリクエスト:', { text, sourceLanguage }); // デバッグログ追加

    // APIキーチェック
    if (!API_KEY) {
      console.error('APIキーが設定されていません');
      return res.status(500).json({ 
        error: 'APIキーが設定されていません',
        details: 'サーバー管理者にAPIキーの設定を依頼してください' 
      });
    }

    try {
      // 言語に合わせた翻訳モデルを選択
      const model = TRANSLATION_MODELS[sourceLanguage] || TRANSLATION_MODELS.default;
      console.log('選択された翻訳モデル:', model);

      // Hugging Face APIを呼び出す
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${model}`,
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
      let translatedText = '';
      if (response.data && response.data.length > 0) {
        translatedText = response.data[0].translation_text;
      }

      return res.status(200).json({ 
        translatedText: translatedText,
        success: true 
      });
    } catch (apiError) {
      console.error('Hugging Face API呼び出しエラー:', apiError.message);
      if (apiError.response) {
        console.error('APIレスポンス:', apiError.response.data);
      }
      
      // APIエラーでもレスポンスを返す
      return res.status(200).json({ 
        translatedText: `[翻訳エラー: ${apiError.message}]`,
        success: false,
        apiError: apiError.message
      });
    }
  } catch (error) {
    console.error('翻訳エラー:', error.message);
    return res.status(500).json({
      error: '翻訳中にエラーが発生しました',
      details: error.message
    });
  }
}; 