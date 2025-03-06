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

            // Hugging Faceクライアントを使用
            // 言語の検出
            const detectedLanguage = await window.huggingFaceClient.detectLanguage(text);
            
            // 日本語への翻訳
            const translation = await window.huggingFaceClient.translateText(text, detectedLanguage);
            
            // 結果の表示
            translationResult.textContent = translation;
            
            // カタカナ変換（日本語以外の言語の場合）
            if (detectedLanguage !== 'ja' && detectedLanguage !== 'japanese') {
                const katakana = await window.huggingFaceClient.convertToKatakana(text, detectedLanguage);
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
}); 