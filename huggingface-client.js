// Hugging Face Translation API クライアント

// APIキー（Vercelの環境変数または開発用の一時的な設定）
const HF_API_KEY = ''; // ここにHugging Face APIキーを設定

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

// カタカナ変換用のモデル
const KATAKANA_MODEL = 'facebook/m2m100_418M'; // 多言語翻訳モデル（カタカナ変換用）

// 言語検出関数
async function detectLanguage(text) {
  try {
    // 言語検出モデル
    const model = "papluca/xlm-roberta-base-language-detection";
    
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${model}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: text })
      }
    );
    
    const result = await response.json();
    
    // エラーチェック
    if (result.error) {
      throw new Error(result.error);
    }
    
    // 最も確率の高い言語を返す
    const sortedLangs = result.sort((a, b) => b.score - a.score);
    return sortedLangs[0].label.toLowerCase(); // 'en', 'fr'などの形式で返す
  } catch (error) {
    console.error('言語検出エラー:', error);
    return 'en'; // デフォルトは英語
  }
}

// テキスト翻訳関数
async function translateText(text, sourceLanguage) {
  try {
    // 日本語の場合は翻訳不要
    if (sourceLanguage === 'ja' || sourceLanguage === 'japanese') {
      return text;
    }
    
    // 言語に対応するモデルを選択
    const modelName = TRANSLATION_MODELS[sourceLanguage] || TRANSLATION_MODELS.default;
    
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${modelName}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: text })
      }
    );
    
    const result = await response.json();
    
    // エラーチェック
    if (result.error) {
      throw new Error(result.error);
    }
    
    // 翻訳結果を返す
    return result[0].translation_text;
  } catch (error) {
    console.error('翻訳エラー:', error);
    throw error;
  }
}

// カタカナ変換関数
async function convertToKatakana(text, sourceLanguage) {
  try {
    // 日本語の場合は変換不要
    if (sourceLanguage === 'ja' || sourceLanguage === 'japanese') {
      return 'すでに日本語です。カタカナ変換は不要です。';
    }
    
    // 直接カタカナに変換するのは難しいため、簡易的な方法を使用
    // 1. 原文を保持して翻訳を取得
    const translation = await translateText(text, sourceLanguage);
    
    // 2. 専用のプロンプトでカタカナ表記を要求
    const katakanaPrompt = `以下の文をカタカナ発音に変換してください: "${text}"`;
    
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${KATAKANA_MODEL}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          inputs: katakanaPrompt,
          parameters: {
            source_lang: sourceLanguage,
            target_lang: "ja"
          }
        })
      }
    );
    
    const result = await response.json();
    
    // エラーチェック
    if (result.error) {
      // 代替手段: 翻訳結果に「カタカナ表記：」を追加
      return `「${text}」のカタカナ表記は対応していません。`;
    }
    
    // 結果からカタカナ部分を抽出
    const katakana = result[0].generated_text;
    return katakana.replace(/[^\u30A0-\u30FF]/g, ''); // カタカナ以外の文字を削除
  } catch (error) {
    console.error('カタカナ変換エラー:', error);
    return `「${text}」のカタカナ表記の取得に失敗しました。`;
  }
}

// APIキーの設定関数（開発環境用）
function setHuggingFaceApiKey(apiKey) {
  if (apiKey) {
    localStorage.setItem('huggingface_api_key', apiKey);
    HF_API_KEY = apiKey;
    return true;
  }
  return false;
}

// 初期化時にlocalStorageからAPIキーを取得
function initializeApiKey() {
  const savedApiKey = localStorage.getItem('huggingface_api_key');
  if (savedApiKey) {
    HF_API_KEY = savedApiKey;
  } else if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    const apiKey = prompt('Hugging Face APIキーを入力してください（ローカルに保存されます）:');
    setHuggingFaceApiKey(apiKey);
  }
}

// エクスポート
window.huggingFaceClient = {
  detectLanguage,
  translateText,
  convertToKatakana,
  setHuggingFaceApiKey
};

// 初期化
initializeApiKey(); 