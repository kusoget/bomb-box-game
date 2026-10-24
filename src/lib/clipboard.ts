/**
 * クリップボードにコピーする。Clipboard API が使えない／拒否される環境
 * （http や一部の WebView）では、選択して execCommand('copy') する昔ながらの方法に落とす。
 */
export async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(input);
        return ok;
    }
}
