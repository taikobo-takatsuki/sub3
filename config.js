// Google Translate APIの設定
const CONFIG = {
    // 環境変数またはlocalStorageから取得（実際のAPIキーはここに直接書かない）
    API_KEY: '',
    TRANSLATE_API_URL: 'https://translation.googleapis.com/language/translate/v2',
    DETECT_API_URL: 'https://translation.googleapis.com/language/translate/v2/detect',
};

// ローカル開発時のみ使用する関数（本番環境では使用しない）
function setupDevEnvironment() {
    // 開発時に安全にキーを設定するための関数
    // 実際の利用時はこの関数を使わず、適切な環境変数管理を行ってください
    const savedApiKey = localStorage.getItem('translator_api_key');
    
    if (!savedApiKey) {
        const apiKey = prompt('Google Translate APIキーを入力してください（ローカルに保存されます）:');
        if (apiKey) {
            localStorage.setItem('translator_api_key', apiKey);
            CONFIG.API_KEY = apiKey;
        }
    } else {
        CONFIG.API_KEY = savedApiKey;
    }
}

// 本番環境では環境変数から取得する例
// CONFIG.API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

// 開発環境でのみAPIキーの設定を行う
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    setupDevEnvironment();
} 