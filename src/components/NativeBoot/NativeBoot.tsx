'use client';

import { useEffect } from 'react';
import { initNative } from '@/lib/native';

/**
 * アプリ起動時にネイティブ初期化を一度だけ走らせる。
 * Web では initNative が即 return するので実害なし。描画は何もしない。
 */
export default function NativeBoot() {
    useEffect(() => {
        void initNative();
    }, []);
    return null;
}
