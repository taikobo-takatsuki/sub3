// Hugging Face Translation API クライアント

// kuroshiroのインスタンス
let kuroshiroInstance = null;
let kuroshiroInitialized = false;
let kuroshiroInitializing = false;

// APIキー設定（一時的な実装）
let HF_API_KEY = '';

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

// ベースURLの取得（ローカル開発か本番環境かを自動判別）
const getBaseUrl = () => {
  const host = window.location.host;
  const protocol = window.location.protocol;
  
  // ローカル開発環境の場合
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return '';  // 相対パスを使用
  }
  
  // Vercel環境の場合
  return `${protocol}//${host}`;
};

// kuroshiroを初期化
async function initKuroshiro() {
  if (kuroshiroInitialized) return true;
  if (kuroshiroInitializing) return false;
  
  try {
    kuroshiroInitializing = true;
    
    // kuroshiroが存在するか確認
    if (typeof Kuroshiro === 'undefined' || typeof KuromojiAnalyzer === 'undefined') {
      console.warn('Kuroshiroライブラリが読み込まれていません');
      return false;
    }
    
    // kuroshiroのインスタンスを作成
    kuroshiroInstance = new Kuroshiro();
    
    // 辞書を初期化
    await kuroshiroInstance.init(new KuromojiAnalyzer());
    
    kuroshiroInitialized = true;
    return true;
  } catch (error) {
    console.error('Kuroshiroの初期化に失敗しました:', error);
    return false;
  } finally {
    kuroshiroInitializing = false;
  }
}

// 直接Hugging Face APIを呼び出す（簡易版）
async function callHuggingFaceAPI(model, data) {
  try {
    if (!HF_API_KEY) {
      // APIキーが設定されていない場合、入力を求める
      HF_API_KEY = prompt('Hugging Face APIキーを入力してください:');
      if (!HF_API_KEY) {
        throw new Error('APIキーが入力されていません');
      }
    }
    
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`API呼び出しエラー: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`API呼び出しエラー (${model}):`, error);
    throw error;
  }
}

// 言語検出 API
async function detectLanguage(text) {
  try {
    console.log('言語検出中...');
    
    const model = 'papluca/xlm-roberta-base-language-detection';
    const result = await callHuggingFaceAPI(model, { inputs: text });
    
    // レスポンスの処理
    if (Array.isArray(result) && result.length > 0) {
      // 最も確率の高い言語を選択
      const sortedLangs = [...result[0]].sort((a, b) => b.score - a.score);
      if (sortedLangs.length > 0) {
        return sortedLangs[0].label;
      }
    }
    
    return 'en'; // デフォルト言語
  } catch (error) {
    console.error('言語検出エラー:', error);
    return 'en'; // エラーの場合はデフォルト言語
  }
}

// テキスト翻訳 API
async function translateText(text, sourceLanguage) {
  try {
    console.log(`翻訳中... (${sourceLanguage || 'auto'} -> ja)`);
    
    // 日本語の場合は翻訳不要
    if (sourceLanguage === 'ja' || sourceLanguage === 'japanese') {
      return text;
    }
    
    // 言語に合わせた翻訳モデルを選択
    const model = TRANSLATION_MODELS[sourceLanguage] || TRANSLATION_MODELS.default;
    const result = await callHuggingFaceAPI(model, { inputs: text });
    
    // 結果の処理
    if (Array.isArray(result) && result.length > 0) {
      return result[0].translation_text;
    } else if (result && result.translation_text) {
      return result.translation_text;
    }
    
    return text; // 結果がない場合は元のテキスト
  } catch (error) {
    console.error('翻訳エラー:', error);
    return text; // エラーの場合は元のテキスト
  }
}

// テキストをローマ字に変換する関数
async function textToRomaji(text, sourceLanguage) {
  if (sourceLanguage === 'ja' || sourceLanguage === 'japanese') {
    // 日本語の場合は直接kuroshiroでローマ字変換（利用可能な場合）
    if (await initKuroshiro()) {
      try {
        return await kuroshiroInstance.convert(text, { to: 'romaji' });
      } catch (error) {
        console.error('kuroshiroでのローマ字変換エラー:', error);
      }
    }
  }
  
  try {
    // 簡易ローマ字変換（英語への翻訳で代用）
    // 言語に合わせた翻訳モデルを選択
    const model = 'Helsinki-NLP/opus-mt-mul-en'; // 多言語から英語への翻訳モデル
    const result = await callHuggingFaceAPI(model, { inputs: text });
    
    if (Array.isArray(result) && result.length > 0) {
      return result[0].translation_text;
    } else if (result && result.translation_text) {
      return result.translation_text;
    }
    
    return text;
  } catch (error) {
    console.error('ローマ字変換エラー:', error);
    return text; // エラーの場合は元のテキスト
  }
}

// カタカナ変換 API
async function convertToKatakana(text, sourceLanguage) {
  // 日本語の場合は変換不要
  if (sourceLanguage === 'ja' || sourceLanguage === 'japanese') {
    return 'すでに日本語です。カタカナ変換は不要です。';
  }
  
  try {
    console.log('カタカナ変換中...');
    
    // まず日本語に翻訳
    const translatedText = await translateText(text, sourceLanguage);
    
    // 翻訳結果が空の場合は元のテキストを返す
    if (!translatedText || translatedText.trim() === '') {
      return 'カタカナ変換できませんでした。';
    }
    
    // kuroshiroが利用可能な場合、それを使ってカタカナに変換
    if (await initKuroshiro()) {
      try {
        const katakana = await kuroshiroInstance.convert(translatedText, { 
          to: 'katakana',
          mode: 'normal'
        });
        
        // 原文のローマ字も取得して発音の目安として表示
        let romaji = '';
        try {
          romaji = await textToRomaji(text, sourceLanguage);
        } catch (e) {
          console.error('ローマ字変換エラー', e);
        }
        
        return katakana + (romaji ? `\n\n（発音の目安: ${romaji}）` : '');
      } catch (error) {
        console.error('kuroshiroでのカタカナ変換エラー:', error);
        // エラーの場合はフォールバック（次のステップに進む）
      }
    }
    
    // カタカナに変換（直接APIを呼び出し）
    try {
      const katakanaPrompt = `以下の文をカタカナ発音に変換してください: "${text}"`;
      const result = await callHuggingFaceAPI(KATAKANA_MODEL, { 
        inputs: katakanaPrompt,
        parameters: {
          source_lang: sourceLanguage,
          target_lang: "ja"
        }
      });
      
      if (Array.isArray(result) && result.length > 0) {
        const generated = result[0].generated_text;
        
        // カタカナ部分を抽出
        const katakanaOnly = generated.match(/[ァ-ヶー]+/g);
        if (katakanaOnly && katakanaOnly.length > 0) {
          return katakanaOnly.join(' ') + '\n\n（翻訳: ' + translatedText + '）';
        }
        
        return generated + '\n\n（翻訳: ' + translatedText + '）';
      }
      
      return '翻訳結果: ' + translatedText;
    } catch (error) {
      console.error('カタカナAPI変換エラー:', error);
      return '翻訳結果: ' + translatedText;
    }
  } catch (error) {
    console.error('カタカナ変換エラー:', error);
    return 'カタカナ変換中にエラーが発生しました: ' + error.message;
  }
}

// APIキーを設定する関数
function setHuggingFaceApiKey(apiKey) {
  if (apiKey) {
    HF_API_KEY = apiKey;
    return true;
  }
  return false;
}

// モジュールのエクスポート
window.huggingFaceClient = {
  detectLanguage,
  translateText,
  convertToKatakana,
  setHuggingFaceApiKey
};