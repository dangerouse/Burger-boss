/* Fullscreen toggle and on-screen touch controls. Purely additive - drives
 * the game the same way a keyboard would (real KeyboardEvents dispatched on
 * window), so game.js needs no changes and its test suite stays valid. */
(() => {
  'use strict';

  /* ------------------------------------------------------------ fullscreen */
  const stage = document.getElementById('stage');
  const fsBtn = document.getElementById('fullscreen-btn');

  function fullscreenEl() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function enterFullscreen() {
    const req = stage.requestFullscreen || stage.webkitRequestFullscreen;
    if (!req) return;
    const result = req.call(stage);
    // requestFullscreen can reject (denied by permissions policy, blocked in
    // an embedded frame, etc.) - nothing to recover, just avoid an unhandled
    // rejection when it does.
    if (result && result.catch) {
      result.then(() => {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(() => {});
        }
      }).catch(() => {});
    }
  }

  function exitFullscreen() {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) exit.call(document);
  }

  if (fsBtn && (stage.requestFullscreen || stage.webkitRequestFullscreen)) {
    fsBtn.addEventListener('click', () => {
      if (fullscreenEl()) exitFullscreen();
      else enterFullscreen();
    });
    const syncLabel = () => {
      const active = !!fullscreenEl();
      fsBtn.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
      fsBtn.title = active ? 'Exit fullscreen' : 'Enter fullscreen';
    };
    document.addEventListener('fullscreenchange', syncLabel);
    document.addEventListener('webkitfullscreenchange', syncLabel);
  } else if (fsBtn) {
    fsBtn.hidden = true; // Fullscreen API unsupported here (older iOS Safari)
  }

  /* --------------------------------------------------------- touch buttons
   * Each button dispatches the same KeyboardEvents a keyboard would, on
   * window, which is exactly what game.js's own keydown/keyup listeners
   * already read. A per-button touch counter avoids releasing early if a
   * second finger lands on the same button before the first lifts. */
  document.querySelectorAll('.tc-btn').forEach(btn => {
    const code = btn.dataset.code;
    let touches = 0;

    const press = () => {
      if (touches++ === 0) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
      }
    };
    const release = () => {
      touches = Math.max(0, touches - 1);
      if (touches === 0) {
        window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }));
      }
    };

    btn.addEventListener('touchstart', e => { e.preventDefault(); press(); }, { passive: false });
    btn.addEventListener('touchend', e => { e.preventDefault(); release(); }, { passive: false });
    btn.addEventListener('touchcancel', e => { e.preventDefault(); release(); }, { passive: false });
  });
})();
