import { useEffect } from 'react';

/**
 * 给官方预览卡片补一个「全屏」按钮。
 *
 * Rspress 2 / @rspress/plugin-preview 2 没有内置全屏能力，
 * 这里在演示卡片的操作栏上追加一个按钮，用 Fullscreen API 把卡片本身放大。
 * 不支持 Fullscreen API 的环境退化成铺满视口的 fixed 层（Esc 退出）。
 * 官方插件以后若有全屏能力，删掉这个组件与 styles.css 里的两条规则即可。
 */
const BUTTON_CLASS = 'rp-preview-fullscreen-btn';
const FALLBACK_CLASS = 'rp-preview--fallback-fullscreen';

const ICON = `<svg width="1em" height="1em" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="4" stroke-linecap="square">
  <path d="M16 6H6v10M32 6h10v10M16 42H6V32M32 42h10V32" />
</svg>`;

function toggleFullscreen(card: HTMLElement) {
  // 已是原生全屏：退出
  if (document.fullscreenElement === card) {
    void document.exitFullscreen();
    return;
  }
  // 已是降级全屏：退出
  if (card.classList.contains(FALLBACK_CLASS)) {
    card.classList.remove(FALLBACK_CLASS);
    return;
  }
  if (typeof card.requestFullscreen === 'function') {
    void card.requestFullscreen().catch(() => card.classList.add(FALLBACK_CLASS));
    return;
  }
  card.classList.add(FALLBACK_CLASS);
}

function decorateCard(card: HTMLElement) {
  const operations = card.querySelector('.rp-preview-operations--web');
  if (!operations || operations.querySelector(`.${BUTTON_CLASS}`)) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.className = `rp-preview-operations__button ${BUTTON_CLASS}`;
  button.title = '全屏预览';
  button.setAttribute('aria-label', '全屏预览');
  button.innerHTML = ICON;
  button.addEventListener('click', () => toggleFullscreen(card));
  operations.appendChild(button);
}

export function PreviewFullscreen() {
  useEffect(() => {
    let scheduled = false;

    const scan = () => {
      scheduled = false;
      document
        .querySelectorAll<HTMLElement>('.rp-preview--internal__card')
        .forEach((card) => decorateCard(card));
    };

    const scheduleScan = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(scan);
    };

    // 演示卡片是客户端渲染出来的：首次挂载后扫一次，
    // 后续路由切换 / 重新渲染由观察器补
    scheduleScan();
    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });

    // 降级全屏用 Esc 退出，与原生全屏保持一致
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      document
        .querySelectorAll<HTMLElement>(`.${FALLBACK_CLASS}`)
        .forEach((card) => card.classList.remove(FALLBACK_CLASS));
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      observer.disconnect();
      document.removeEventListener('keydown', onKeyDown);
      document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((button) => button.remove());
    };
  }, []);

  return null;
}
