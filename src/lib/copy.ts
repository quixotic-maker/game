/**
 * 复制文本到剪贴板,带降级方案
 * 优先使用 navigator.clipboard(需要 HTTPS 或 localhost)
 * 失败时降级到 document.execCommand('copy')(老旧浏览器 / HTTP)
 */
export async function copyText(text: string): Promise<boolean> {
  // 优先现代 API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      // fallthrough
    }
  }
  // 降级方案
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch (e) {
    return false;
  }
}

export function formatSceneForCopy(label: 'A' | 'B', scene: string): string {
  return `【谁是卧底 · 场景 ${label}】\n${scene}`;
}
