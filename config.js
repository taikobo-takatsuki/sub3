// Google Translate APIの設定
const CONFIG = {
    // 開発用に直接キーを設定（本番環境にはプッシュしないでください）
    API_KEY: 'AIzaSyClCm3So3tx9ovUKfHGq7_gyL6-WRsQccY',
    // 本番環境では自分のサーバーレス関数のエンドポイントを使用
    TRANSLATE_API_URL: '/api/translate',
    DETECT_API_URL: '/api/detect',
};

// ローカル開発時のプロンプト表示機能を一時的に無効化
/*
function setupDevEnvironment() {
    // この関数の内容をコメントアウト
}

// 開発環境でのみAPIキーの設定を行う
if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    setupDevEnvironment();
}
*/ 