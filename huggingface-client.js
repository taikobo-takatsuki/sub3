// Hugging Face Translation API クライアント

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

// 言語検出 API
async function detectLanguage(text) {
  try {
    console.log('言語検出中...');
    
    // サーバーレス関数を使用して言語検出APIを呼び出す
    const response = await fetch('/api/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.detectedLanguage;
  } catch (error) {
    console.error('言語検出エラー:', error);
    throw error;
  }
}

// テキスト翻訳 API
async function translateText(text, sourceLanguage) {
  try {
    console.log(`翻訳中... (${sourceLanguage || 'auto'} -> ja)`);
    
    // サーバーレス関数を使用して翻訳APIを呼び出す
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text, 
        sourceLanguage 
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data.translatedText || '';
  } catch (error) {
    console.error('翻訳エラー:', error);
    throw error;
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
    
    // kuroshiroが使えない場合はAPIを使用
  }
  
  try {
    // サーバーレス関数を使用してローマ字変換APIを呼び出す
    // 注: この機能のためのAPIエンドポイントをまだ作成していません
    // 代わりに翻訳APIを利用して英語に翻訳することで代用
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        text, 
        sourceLanguage,
        targetLanguage: 'en'  // ローマ字の代わりに英語に変換
      }),
    });
    
    if (!response.ok) {
      return text; // エラーの場合は元のテキストを返す
    }
    
    const data = await response.json();
    return data.translatedText || text;
  } catch (error) {
    console.error('ローマ字変換エラー:', error);
    return text; // エラーの場合は元のテキストを返す
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
    
    // サーバーレス関数を使ってカタカナ変換
    try {
      const response = await fetch('/api/katakana', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text, 
          sourceLanguage 
        }),
      });
      
      if (!response.ok) {
        return '翻訳結果: ' + translatedText;
      }
      
      const data = await response.json();
      
      if (data.error) {
        return '翻訳結果: ' + translatedText;
      }
      
      if (data.katakana) {
        return data.katakana + '\n\n（翻訳: ' + translatedText + '）';
      } else {
        return '翻訳結果: ' + translatedText;
      }
    } catch (error) {
      console.error('サーバーレス関数でのカタカナ変換エラー:', error);
      return '翻訳結果: ' + translatedText;
    }
  } catch (error) {
    console.error('カタカナ変換エラー:', error);
    return 'カタカナ変換中にエラーが発生しました: ' + error.message;
  }
}

// モジュールのエクスポート
window.huggingFaceClient = {
  detectLanguage,
  translateText,
  convertToKatakana
};