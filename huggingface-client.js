// Hugging Face Translation API クライアント

// APIキー（Vercelの環境変数または開発用の一時的な設定）
let HF_API_KEY = ''; // ここにHugging Face APIキーを設定

// kuroshiroのインスタンス
let kuroshiroInstance = null;
let kuroshiroInitialized = false;
let kuroshiroInitializing = false;

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

// kuroshiroの初期化
async function initKuroshiro() {
  if (kuroshiroInitialized) {
    return kuroshiroInstance;
  }

  if (kuroshiroInitializing) {
    // 別の初期化が進行中の場合は待機
    while (kuroshiroInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return kuroshiroInstance;
  }

  try {
    kuroshiroInitializing = true;

    // kuroshiroが利用可能か確認
    if (typeof Kuroshiro === 'undefined') {
      console.error('Kuroshiroライブラリが見つかりません。');
      kuroshiroInitializing = false;
      return null;
    }

    // kuroshiroインスタンスの作成と初期化
    kuroshiroInstance = new Kuroshiro();
    await kuroshiroInstance.init(new KuromojiAnalyzer());
    
    kuroshiroInitialized = true;
    console.log('Kuroshiroの初期化が完了しました。');
  } catch (error) {
    console.error('Kuroshiroの初期化エラー:', error);
    kuroshiroInstance = null;
  } finally {
    kuroshiroInitializing = false;
  }

  return kuroshiroInstance;
}

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

// テキストをローマ字に変換（多言語対応）
async function textToRomaji(text, sourceLanguage) {
  // 言語に応じたローマ字化の処理
  // 実際の実装ではより複雑な処理が必要になる場合があります
  
  try {
    // HFモデルでローマ字化を試みる
    const romajiPrompt = `Transliterate the following text to romaji: "${text}"`;
    
    const response = await fetch(
      `https://api-inference.huggingface.co/models/facebook/m2m100_418M`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          inputs: romajiPrompt,
          parameters: {
            source_lang: sourceLanguage,
            target_lang: "en"
          }
        })
      }
    );
    
    const result = await response.json();
    
    if (result.error) {
      // 失敗した場合、単純に元のテキストを返す
      return text;
    }
    
    // 結果から英語/ローマ字部分を抽出
    return result[0].generated_text;
  } catch (error) {
    console.error('ローマ字変換エラー:', error);
    return text; // エラー時は元のテキストを返す
  }
}

// カタカナに変換する関数
async function convertToKatakana(text, sourceLanguage) {
  try {
    // 日本語の場合は変換不要
    if (sourceLanguage === 'ja' || sourceLanguage === 'japanese') {
      return 'すでに日本語です。カタカナ変換は不要です。';
    }
    
    // 1. 翻訳結果を取得（後で使用）
    const translation = await translateText(text, sourceLanguage);
    
    // 2. kuroshiroを初期化
    const kuroshiro = await initKuroshiro();
    
    if (kuroshiro) {
      // kuroshiroが利用可能な場合
      try {
        // 翻訳された日本語をカタカナに変換
        const katakana = await kuroshiro.convert(translation, {
          to: 'katakana',
          mode: 'normal'
        });
        
        // 発音に関する追加情報
        // 原文をローマ字に変換してみる
        const romaji = await textToRomaji(text, sourceLanguage);
        
        if (romaji && romaji !== text) {
          // ローマ字変換できた場合、それもカタカナに変換
          const romajiKatakana = await kuroshiro.convert(romaji, {
            to: 'katakana',
            mode: 'spaced'
          });
          
          // 結合して返す（翻訳のカタカナ + ローマ字のカタカナ）
          return `${katakana}\n\n発音の目安: ${romajiKatakana}`;
        }
        
        return katakana;
      } catch (kuroshiroError) {
        console.error('Kuroshiro変換エラー:', kuroshiroError);
        // kuroshiroでエラーが発生した場合、代替手段を使用
      }
    }
    
    // kuroshiroが利用できない、またはエラーの場合は代替手段を使用
    
    // 3. Hugging Faceを使用した代替手段
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
      // エラーの場合、翻訳結果をそのまま返す
      return `「${text}」 → ${translation}（カタカナ変換は現在利用できません）`;
    }
    
    // 結果からカタカナを抽出
    const katakana = result[0].generated_text;
    const katakanaOnly = katakana.match(/[ァ-ヶー]+/g);
    
    if (katakanaOnly && katakanaOnly.length > 0) {
      return katakanaOnly.join(' ');
    } else {
      return `「${text}」のカタカナ表記: ${katakana}`;
    }
  } catch (error) {
    console.error('カタカナ変換エラー:', error);
    return `「${text}」のカタカナ表記の取得に失敗しました: ${error.message}`;
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