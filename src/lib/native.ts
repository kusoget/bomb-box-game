// Capacitor ネイティブ連携のヘルパー。
// Web（ブラウザ / 静的ホスティング）では全て no-op になるよう isNativePlatform で必ずガードする。
// プラグインは動的 import して Web バンドルに影響させない。

import { Capacitor } from '@capacitor/core';

export function isNative(): boolean {
    try {
        return Capacitor.isNativePlatform();
    } catch {
        return false;
    }
}

/** アプリ起動時に一度だけ呼ぶ（ステータスバー・スプラッシュ等の初期化） */
export async function initNative(): Promise<void> {
    if (!isNative()) return;

    try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        // 濃い背景 + 白文字
        await StatusBar.setStyle({ style: Style.Dark });
        if (Capacitor.getPlatform() === 'android') {
            await StatusBar.setBackgroundColor({ color: '#2a1a3e' });
        }
    } catch {
        // プラグイン未搭載環境は無視
    }

    try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        // Web フォント等が整うまで少し見せてから隠す
        await SplashScreen.hide();
    } catch {
        // noop
    }
}

type ImpactWeight = 'light' | 'medium' | 'heavy';

/** 触覚フィードバック（衝撃）。Web では何もしない */
export async function hapticImpact(weight: ImpactWeight = 'light'): Promise<void> {
    if (!isNative()) return;
    try {
        const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
        const style =
            weight === 'heavy' ? ImpactStyle.Heavy :
                weight === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light;
        await Haptics.impact({ style });
    } catch {
        // noop
    }
}

/** 通知系の触覚（成功/警告/エラー）。爆発=error, セーフ=success 等に使う */
export async function hapticNotify(type: 'success' | 'warning' | 'error' = 'success'): Promise<void> {
    if (!isNative()) return;
    try {
        const { Haptics, NotificationType } = await import('@capacitor/haptics');
        const map = {
            success: NotificationType.Success,
            warning: NotificationType.Warning,
            error: NotificationType.Error,
        } as const;
        await Haptics.notification({ type: map[type] });
    } catch {
        // noop
    }
}
