// basePath 対応の静的アセットパス解決
// next.config.ts の basePath と同じ値を NEXT_PUBLIC_BASE_PATH に持たせると、
// next/image でもクライアント側で正しく解決できる。
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export function asset(path: string): string {
    if (!path.startsWith('/')) path = '/' + path;
    return `${BASE_PATH}${path}`;
}
