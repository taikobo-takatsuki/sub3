// シンプル翻訳 クライアント（APIキー不要）

// kuroshiroのインスタンス
let kuroshiroInstance = null;
let kuroshiroInitialized = false;
let kuroshiroInitializing = false;

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

// Google翻訳の非公式APIを使用した言語検出（APIキー不要）
async function detectLanguage(text) {
  try {
    console.log('言語検出中...');
    
    // シンプルな言語検出ロジック
    // 日本語の文字を含むかチェック
    const hasJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(text);
    if (hasJapanese) {
      return 'ja';
    }
    
    // 韓国語の文字を含むかチェック
    const hasKorean = /[\uac00-\ud7af\u1100-\u11ff]/.test(text);
    if (hasKorean) {
      return 'ko';
    }
    
    // 中国語の文字を含むかチェック
    const hasChinese = /[\u4e00-\u9fff]/.test(text);
    if (hasChinese) {
      return 'zh';
    }
    
    // その他の言語はテキストの特徴から推測
    const hasLatinChars = /[a-zA-Z]/.test(text);
    const hasFrenchChars = /[éèêëàâäôöùûüÿçÉÈÊËÀÂÄÔÖÙÛÜŸÇ]/.test(text);
    const hasGermanChars = /[äöüßÄÖÜ]/.test(text);
    
    if (hasFrenchChars) {
      return 'fr';
    } else if (hasGermanChars) {
      return 'de';
    } else if (hasLatinChars) {
      return 'en'; // デフォルトとして英語を返す
    }
    
    // APIから言語検出を試みる
    try {
      const encodedText = encodeURIComponent(text);
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ja&dt=t&q=${encodedText}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data && data[2]) {
          return data[2]; // 検出された言語コード
        }
      }
    } catch (apiError) {
      console.error('Google翻訳API言語検出エラー:', apiError);
    }
    
    return 'en'; // デフォルト
  } catch (error) {
    console.error('言語検出エラー:', error);
    return 'en'; // エラーの場合はデフォルト言語
  }
}

// Google翻訳の非公式APIを使用した翻訳（APIキー不要）
async function translateText(text, sourceLanguage) {
  try {
    console.log(`翻訳中... (${sourceLanguage || 'auto'} -> ja)`);
    
    // 日本語の場合は翻訳不要
    if (sourceLanguage === 'ja' || sourceLanguage === 'japanese') {
      return text;
    }
    
    // Google翻訳の非公式APIを使用
    try {
      const encodedText = encodeURIComponent(text);
      const sourceLang = sourceLanguage || 'auto';
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=ja&dt=t&q=${encodedText}`;
      
      console.log('翻訳API URL:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`翻訳APIエラー: ${response.status}`);
      }
      
      const data = await response.json();
      if (data && data[0]) {
        // 翻訳結果を連結
        let translatedText = '';
        for (const part of data[0]) {
          if (part[0]) {
            translatedText += part[0];
          }
        }
        return translatedText;
      }
      
      throw new Error('翻訳結果が取得できませんでした');
    } catch (googleError) {
      console.error('Google翻訳APIエラー:', googleError);
      return `[翻訳エラー] "${text}"`;
    }
  } catch (error) {
    console.error('翻訳エラー:', error);
    return `[翻訳エラー] "${text}"`;
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
  
  // 非日本語の場合はGoogle翻訳でローマ字化
  try {
    // 英語に翻訳することでローマ字化
    const encodedText = encodeURIComponent(text);
    const sourceLang = sourceLanguage || 'auto';
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=en&dt=t&q=${encodedText}`;
    
    const response = await fetch(url);
    if (response.ok) {
      const data = await response.json();
      if (data && data[0]) {
        let translatedText = '';
        for (const part of data[0]) {
          if (part[0]) {
            translatedText += part[0];
          }
        }
        return translatedText;
      }
    }
    
    return text;
  } catch (error) {
    console.error('ローマ字変換エラー:', error);
    return text;
  }
}

// カタカナ変換関数（APIキー不要）
async function convertToKatakana(text, sourceLanguage) {
  // 日本語の場合は変換不要
  if (sourceLanguage === 'ja' || sourceLanguage === 'japanese') {
    return 'すでに日本語です。カタカナ変換は不要です。';
  }
  
  try {
    console.log('カタカナ変換中...');
    
    // 1. まず日本語に翻訳
    const translatedText = await translateText(text, sourceLanguage);
    
    // 翻訳結果が空の場合は元のテキストを返す
    if (!translatedText || translatedText.trim() === '' || translatedText.includes('[翻訳エラー]')) {
      return 'カタカナ変換できませんでした。';
    }
    
    // 2. kuroshiroが利用可能な場合、それを使ってカタカナに変換
    if (await initKuroshiro()) {
      try {
        const katakana = await kuroshiroInstance.convert(translatedText, { 
          to: 'katakana',
          mode: 'normal'
        });
        
        // 3. 原文のローマ字も取得して発音の目安として表示
        let romaji = '';
        try {
          romaji = await textToRomaji(text, sourceLanguage);
        } catch (e) {
          console.error('ローマ字変換エラー', e);
        }
        
        return katakana + (romaji ? `\n\n（発音の目安: ${romaji}）` : '');
      } catch (error) {
        console.error('kuroshiroでのカタカナ変換エラー:', error);
      }
    }
    
    // 4. kuroshiroが使えない場合のフォールバック
    // シンプルな方法でカタカナ変換（翻訳結果を表示）
    return `翻訳結果: ${translatedText}`;
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