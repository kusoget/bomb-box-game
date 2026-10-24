import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.boxbom.game',
    appName: 'BOXBOM',
    // Next.js の静的書き出し先。`npm run build:ios` がここを生成する
    webDir: 'out',
    ios: {
        // ノッチ/ホームインジケータ領域は CSS 側（safe-area-inset）で扱う
        contentInset: 'never',
        backgroundColor: '#2a1a3e',
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 1200,
            backgroundColor: '#2a1a3e',
            showSpinner: false,
            launchAutoHide: true,
        },
        StatusBar: {
            // 濃い背景なので白文字
            style: 'DARK',
            backgroundColor: '#2a1a3e',
        },
        Keyboard: {
            resize: 'native',
        },
    },
};

export default config;
