document.addEventListener('DOMContentLoaded', () => {
    const inputText = document.getElementById('input-text');
    const translateBtn = document.getElementById('translate-btn');
    const translationResult = document.getElementById('translation-result');
    const katakanaResult = document.getElementById('katakana-result');

    // 翻訳ボタンのイベントリスナー
    translateBtn.addEventListener('click', async () => {
        const text = inputText.value.trim();
        if (!text) return;

        try {
            // 処理中表示
            translationResult.textContent = '翻訳中...';
            katakanaResult.textContent = '変換中...';

            // 言語の検出
            const detectedLanguage = await detectLanguage(text);
            
            // 日本語への翻訳
            const translation = await translateText(text, detectedLanguage);
            
            // 結果の表示
            translationResult.textContent = translation;
            
            // カタカナ変換（日本語以外の言語の場合）
            if (detectedLanguage !== 'ja') {
                const katakana = await convertToKatakana(text, detectedLanguage);
                katakanaResult.textContent = katakana;
            } else {
                // 日本語の場合はカタカナ変換をスキップ
                katakanaResult.textContent = 'すでに日本語です。カタカナ変換は不要です。';
            }
        } catch (error) {
            console.error('エラーが発生しました:', error);
            translationResult.textContent = 'エラーが発生しました: ' + error.message;
            katakanaResult.textContent = '';
        }
    });

    // 言語を検出する関数
    async function detectLanguage(text) {
        if (!CONFIG.API_KEY) {
            throw new Error('APIキーが設定されていません');
        }

        const response = await fetch(`${CONFIG.DETECT_API_URL}?key=${CONFIG.API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: text
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message || '言語検出に失敗しました');
        }

        return data.data.detections[0][0].language;
    }

    // テキストを翻訳する関数
    async function translateText(text, sourceLanguage) {
        if (!CONFIG.API_KEY) {
            throw new Error('APIキーが設定されていません');
        }

        // すでに日本語の場合は翻訳をスキップ
        if (sourceLanguage === 'ja') {
            return text;
        }

        const response = await fetch(`${CONFIG.TRANSLATE_API_URL}?key=${CONFIG.API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: text,
                source: sourceLanguage,
                target: 'ja',
                format: 'text'
            })
        });

        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message || '翻訳に失敗しました');
        }

        return data.data.translations[0].translatedText;
    }

    // カタカナに変換する関数
    async function convertToKatakana(text, sourceLanguage) {
        // 方法1: Google Translate APIを使って発音のニュアンスを取得
        try {
            // ソース言語から日本語にカタカナで翻字するロジック
            // 実際には、言語によって処理を変える必要がある場合も
            
            // 英語の場合の例：日本語への音声的翻訳（カタカナ化）
            if (['en', 'fr', 'de', 'es', 'it', 'pt', 'ru'].includes(sourceLanguage)) {
                // 多言語からカタカナへの変換ロジック
                return await getKatakanaTransliteration(text, sourceLanguage);
            } else {
                // その他の言語の場合：シンプルな方法
                const translation = await translateText(text, sourceLanguage);
                return `${translation}（カタカナ変換はこの言語ではサポートされていません）`;
            }
        } catch (error) {
            console.error('カタカナ変換エラー:', error);
            return '変換エラー: ' + error.message;
        }
    }

    // カタカナ翻字を取得する関数（実際のAPIや独自ロジックを使用）
    async function getKatakanaTransliteration(text, sourceLanguage) {
        // 例: 独自のカタカナ変換API/ライブラリを使用する場合
        // ここでは簡易的なカタカナ変換を行う
        
        // 実際のプロジェクトでは以下のいずれかの方法を検討することをお勧めします：
        // 1. 専用のライブラリを使用（kuroshiro.jsなど）
        // 2. 翻字APIサービスを使用（Google Cloud Text-to-Speech APIなど）
        // 3. 自作の翻字ルールを適用
        
        // 簡易的な英語→カタカナ変換の例（実際にはより複雑な処理が必要）
        if (sourceLanguage === 'en') {
            // 非常に簡易的な英語→カタカナ変換（例示目的のみ）
            return simpleEnglishToKatakana(text);
        }
        
        // 他の言語の場合：未サポートと表示
        return `カタカナ変換は${sourceLanguage}言語ではまだサポートされていません。`;
    }

    // 非常に簡易的な英語→カタカナ変換（例示目的）
    function simpleEnglishToKatakana(text) {
        // 注意: これは非常に簡易的な例です。実際の使用には全く不十分です。
        const rules = {
            'a': 'ア', 'i': 'イ', 'u': 'ウ', 'e': 'エ', 'o': 'オ',
            'ka': 'カ', 'ki': 'キ', 'ku': 'ク', 'ke': 'ケ', 'ko': 'コ',
            'sa': 'サ', 'si': 'シ', 'su': 'ス', 'se': 'セ', 'so': 'ソ',
            'ta': 'タ', 'ti': 'チ', 'tu': 'ツ', 'te': 'テ', 'to': 'ト',
            'na': 'ナ', 'ni': 'ニ', 'nu': 'ヌ', 'ne': 'ネ', 'no': 'ノ',
            'ha': 'ハ', 'hi': 'ヒ', 'hu': 'フ', 'he': 'ヘ', 'ho': 'ホ',
            'ma': 'マ', 'mi': 'ミ', 'mu': 'ム', 'me': 'メ', 'mo': 'モ',
            'ya': 'ヤ', 'yu': 'ユ', 'yo': 'ヨ',
            'ra': 'ラ', 'ri': 'リ', 'ru': 'ル', 're': 'レ', 'ro': 'ロ',
            'wa': 'ワ', 'wi': 'ウィ', 'wu': 'ウ', 'we': 'ウェ', 'wo': 'ヲ',
            'ga': 'ガ', 'gi': 'ギ', 'gu': 'グ', 'ge': 'ゲ', 'go': 'ゴ',
            'za': 'ザ', 'zi': 'ジ', 'zu': 'ズ', 'ze': 'ゼ', 'zo': 'ゾ',
            'da': 'ダ', 'di': 'ディ', 'du': 'ドゥ', 'de': 'デ', 'do': 'ド',
            'ba': 'バ', 'bi': 'ビ', 'bu': 'ブ', 'be': 'ベ', 'bo': 'ボ',
            'pa': 'パ', 'pi': 'ピ', 'pu': 'プ', 'pe': 'ペ', 'po': 'ポ',
            'ja': 'ジャ', 'ji': 'ジ', 'ju': 'ジュ', 'je': 'ジェ', 'jo': 'ジョ',
            'cha': 'チャ', 'chi': 'チ', 'chu': 'チュ', 'che': 'チェ', 'cho': 'チョ',
            'sha': 'シャ', 'shi': 'シ', 'shu': 'シュ', 'she': 'シェ', 'sho': 'ショ',
            'tha': 'サ', 'thi': 'シ', 'thu': 'ス', 'the': 'ザ', 'tho': 'ソ',
        };

        // 英語テキストをローマ字表記に分解する必要がありますが、
        // これは非常に複雑なタスクで、完全な実装はここでは不可能です。
        
        // 現実的には、日本語のカタカナ変換ライブラリを使用するべきです。
        // 例えば：
        // - kuroshiro.js (https://github.com/hexenq/kuroshiro)
        // - wanakana.js (https://github.com/WaniKani/WanaKana)
        
        // 代わりに、変換の難しさを説明するメッセージを返す
        return `「${text}」の発音をカタカナで表すには、専用のライブラリが必要です。\nこのアプリケーションに kuroshiro.js や wanakana.js などのライブラリを追加することをお勧めします。`;
    }
}); 