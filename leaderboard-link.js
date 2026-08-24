/* Shows a link to the public leaderboard on the win screen, pre-filled with
 * this run's time and death count. Purely additive - the game engine has no
 * idea this exists, so it stays untouched and its test suite stays valid. */
(() => {
  'use strict';

  const LEADERBOARD_URL = 'https://claude.ai/code/artifact/ea98dca6-43e5-4ae4-87fe-262a337fa8d2';

  const link = document.getElementById('lb-link');
  if (!link) return;

  let shownFor = null; // the game object we last wired a link for, so a
                        // level replay doesn't rebuild the href every frame

  function tick() {
    const BB = window.BurgerBoss;
    if (BB && BB.game.state === 'win') {
      if (shownFor !== BB.game) {
        const ms = Math.round(BB.game.time * 1000);
        const deaths = BB.game.deaths;
        link.href = LEADERBOARD_URL + '?t=' + ms + '&d=' + deaths;
        link.hidden = false;
        shownFor = BB.game;
      }
    } else if (!link.hidden) {
      link.hidden = true;
      shownFor = null;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
