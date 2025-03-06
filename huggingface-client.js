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
    
    // デバッグ用にリクエスト情報をログ出力（APIキーは除く）
    console.log(`APIリクエスト: ${model}`, { ...data });
    
    const apiUrl = `https://api-inference.huggingface.co/models/${model}`;
    console.log('APIエンドポイント:', apiUrl);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      // レスポンスのステータスを確認
      console.log(`APIレスポンスステータス: ${response.status}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`モデル "${model}" が見つかりません。モデル名を確認してください。`);
        } else if (response.status === 401 || response.status === 403) {
          throw new Error(`認証エラー: APIキーが無効か、アクセス権限がありません。`);
        } else {
          const errorText = await response.text();
          console.error('APIエラーレスポンス:', errorText);
          throw new Error(`API呼び出しエラー: ${response.status} - ${errorText}`);
        }
      }
      
      const result = await response.json();
      console.log('APIレスポンス結果:', result);
      return result;
    } catch (fetchError) {
      // fetch自体のエラー（ネットワークエラーなど）
      console.error('Fetch実行エラー:', fetchError);
      if (fetchError.message.includes('Failed to fetch')) {
        throw new Error(`ネットワークエラー: APIサーバーに接続できません。CORSの問題の可能性があります。`);
      }
      throw fetchError;
    }
  } catch (error) {
    console.error(`API呼び出しエラー (${model}):`, error);
    // APIキーをリセットするオプションを追加
    if (error.message.includes('認証エラー')) {
      const resetKey = confirm('APIキーの認証に失敗しました。APIキーをリセットしますか？');
      if (resetKey) {
        HF_API_KEY = '';
        return callHuggingFaceAPI(model, data); // 再試行
      }
    }
    throw error;
  }
}

// 言語検出 API
async function detectLanguage(text) {
  try {
    console.log('言語検出中...');
    
    // より信頼性の高い言語検出モデルを使用
    // 注: xlm-roberta-base-language-detectionが存在しない場合は代替モデルを使用
    let model = 'facebook/mbart-large-50-many-to-many-mmt'; // より一般的なモデル
    
    try {
      console.log('言語検出のための前処理...');
      
      // 最初に翻訳モデルを使って言語を推測
      const result = await callHuggingFaceAPI(model, {
        inputs: text,
        parameters: {
          // 言語の自動検出を試みる
          src_lang: null,
          tgt_lang: "ja"
        }
      });
      
      // レスポンスから言語を推測
      console.log('言語検出のレスポンス:', result);
      
      // 英語テキストを仮定（デフォルト）
      return 'en';
    } catch (modelError) {
      console.error('言語検出モデルエラー:', modelError);
      
      // フォールバック方法 - シンプルな言語検出ロジック
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
      
      return 'en'; // 判断できない場合は英語と仮定
    }
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
    let model = TRANSLATION_MODELS[sourceLanguage] || TRANSLATION_MODELS.default;
    console.log(`選択された翻訳モデル: ${model}`);
    
    try {
      // 最初に選択したモデルで翻訳を試みる
      const result = await callHuggingFaceAPI(model, { inputs: text });
      
      // 結果の処理
      if (Array.isArray(result) && result.length > 0) {
        return result[0].translation_text;
      } else if (result && result.translation_text) {
        return result.translation_text;
      }
      
      // 結果がない場合はフォールバックモデルを試す
      throw new Error('翻訳結果が取得できませんでした');
    } catch (primaryModelError) {
      console.error('主要翻訳モデルエラー:', primaryModelError);
      
      // フォールバック: より一般的なモデルを試す
      try {
        console.log('フォールバック翻訳モデルを使用します: facebook/mbart-large-50-many-to-many-mmt');
        
        // mBARTモデルは多言語翻訳に対応している
        const fallbackResult = await callHuggingFaceAPI('facebook/mbart-large-50-many-to-many-mmt', {
          inputs: text,
          parameters: {
            src_lang: sourceLanguage === 'en' ? 'en_XX' : 
                      sourceLanguage === 'fr' ? 'fr_XX' :
                      sourceLanguage === 'de' ? 'de_DE' :
                      sourceLanguage === 'zh' ? 'zh_CN' :
                      sourceLanguage === 'ko' ? 'ko_KR' : 'en_XX',
            tgt_lang: 'ja_XX'
          }
        });
        
        if (fallbackResult && fallbackResult.generated_text) {
          return fallbackResult.generated_text;
        }
      } catch (fallbackError) {
        console.error('フォールバック翻訳モデルエラー:', fallbackError);
        
        // 最終フォールバック: Google翻訳ライクなAPIを試す (無料・非公式)
        try {
          console.log('最終フォールバック: 代替翻訳APIを使用します');
          
          const encodedText = encodeURIComponent(text);
          const sourceLang = sourceLanguage || 'auto';
          const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=ja&dt=t&q=${encodedText}`;
          
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            if (data && data[0] && data[0][0]) {
              return data[0][0][0];
            }
          }
        } catch (lastFallbackError) {
          console.error('最終フォールバック翻訳エラー:', lastFallbackError);
        }
      }
      
      // すべての翻訳方法が失敗した場合
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