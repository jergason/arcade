export interface TouchState {
  left: boolean;
  right: boolean;
  jump: boolean;
  jumpJust: boolean;
  shoot: boolean;
}

export const touchState: TouchState = {
  left: false,
  right: false,
  jump: false,
  jumpJust: false,
  shoot: false,
};

export function setupTouch() {
  const bind = (id: string, key: keyof TouchState) => {
    const el = document.getElementById(id);
    if (!el) return;
    const on = (e: Event) => {
      e.preventDefault();
      touchState[key] = true;
      if (key === 'jump') touchState.jumpJust = true;
      el.classList.add('active');
    };
    const off = (e: Event) => {
      e.preventDefault();
      touchState[key] = false;
      el.classList.remove('active');
    };
    el.addEventListener('touchstart', on, { passive: false });
    el.addEventListener('touchend', off, { passive: false });
    el.addEventListener('touchcancel', off, { passive: false });
  };
  bind('btn-left', 'left');
  bind('btn-right', 'right');
  bind('btn-jump', 'jump');
  bind('btn-shoot', 'shoot');
}

export function initTouchIfNeeded() {
  if (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    /iPad|iPhone|iPod|Android/.test(navigator.userAgent)
  ) {
    setupTouch();
    const tc = document.getElementById('touch-controls');
    const ch = document.getElementById('controls-hint');
    if (tc) tc.style.display = 'block';
    if (ch) ch.style.display = 'none';
  }
}
