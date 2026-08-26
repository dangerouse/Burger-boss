/* Burger Boss public leaderboard, backed by the Nostr protocol instead of a
 * server. Anyone can read it (query public relays) and anyone can post to it
 * (sign an event with a locally-generated keypair, no account needed) - see
 * README.md for what that does and doesn't protect against.
 *
 * Requires vendor/nostr-tools.bundle.js to be loaded first (exposes
 * window.NostrTools). */
(() => {
  'use strict';

  const { generateSecretKey, getPublicKey, finalizeEvent, verifyEvent, SimplePool, utils } = window.NostrTools;
  const { bytesToHex, hexToBytes } = utils;

  const RELAYS = ['wss://relay.damus.io', 'wss://nos.lol', 'wss://relay.primal.net'];
  const TAG = 'burgerboss-leaderboard-v1';
  const KIND = 1;

  /* Mirrors game.js MAX_SPEED and the three level widths in levels.js. A
   * run's horizontal position can never exceed MAX_SPEED * time in that
   * engine, so width / MAX_SPEED is a hard physical floor on how fast a
   * level can be finished - not a guess. This is checked both before we
   * sign our own submission and when filtering everyone else's, since
   * nothing stops a relay from holding a hand-crafted fake event. */
  const LEVEL_WIDTHS = [2000, 2600, 3200];
  const MAX_SPEED = 310;
  const FLOOR_MS = Math.floor((LEVEL_WIDTHS[0] + LEVEL_WIDTHS[1] + LEVEL_WIDTHS[2]) / MAX_SPEED * 1000) - 150;
  const MAX_DEATHS = 2;         /* a 3rd death ends the run before it can be won */
  const MAX_NAME_LEN = 16;
  const MAX_BOARD = 20;
  const GAME_URL = 'https://github.com/harper-prog/Burger-boss';
  const SK_STORAGE_KEY = 'bb_nostr_sk';

  /* ---------------------------------------------------------- html safety */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function sanitizeName(raw) {
    const t = String(raw || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME_LEN);
    return t || 'ANONYMOUS BURGER';
  }

  function fmtTime(ms) {
    const totalSec = ms / 1000;
    const m = Math.floor(totalSec / 60);
    const s = totalSec - m * 60;
    return m + ':' + s.toFixed(2).padStart(5, '0');
  }

  /* ------------------------------------------------------------ validation */
  function validateEntry(ms, deaths) {
    return Number.isFinite(ms) && ms >= FLOOR_MS && ms <= 30 * 60 * 1000 &&
      Number.isInteger(deaths) && deaths >= 0 && deaths <= MAX_DEATHS;
  }

  function readParams() {
    const p = new URLSearchParams(location.search);
    if (!p.has('t') || !p.has('d')) return { present: false };
    const ms = parseInt(p.get('t'), 10);
    const deaths = parseInt(p.get('d'), 10);
    return { present: true, valid: validateEntry(ms, deaths), ms, deaths };
  }

  /* Pull a run out of a raw Nostr event. Anything malformed or outside the
   * physical floor is dropped here, before it ever reaches the board -
   * a relay holding garbage doesn't mean the page has to show it. */
  function entryFromEvent(evt) {
    const tag = name => (evt.tags.find(t => t[0] === name) || [])[1];
    const ms = parseInt(tag('ms'), 10);
    const deaths = parseInt(tag('deaths'), 10);
    if (!validateEntry(ms, deaths)) return null;
    return { name: sanitizeName(tag('name')), ms, deaths, pubkey: evt.pubkey, ts: evt.created_at * 1000, id: evt.id };
  }

  /* --------------------------------------------------------------- identity
   * A keypair generated on first visit and kept in this browser only - the
   * closest thing to an account this page has, and the only thing that
   * lets "my best run" replace "my previous run" instead of stacking up
   * duplicate rows for the same person. */
  function loadOrCreateIdentity() {
    let hex = localStorage.getItem(SK_STORAGE_KEY);
    let sk;
    if (hex) {
      try { sk = hexToBytes(hex); } catch (e) { sk = null; }
    }
    if (!sk || sk.length !== 32) {
      sk = generateSecretKey();
      localStorage.setItem(SK_STORAGE_KEY, bytesToHex(sk));
    }
    return { sk, pubkey: getPublicKey(sk) };
  }

  /* ------------------------------------------------------------------ pool */
  const pool = new SimplePool();

  /* pubkey -> best entry seen from them so far. One row per identity: a
   * player who improves their time just gets a better entry here, they
   * don't stack up duplicate rows. */
  const board = new Map();
  const seenEventIds = new Set();

  function considerEvent(evt) {
    if (seenEventIds.has(evt.id)) return false;
    seenEventIds.add(evt.id);
    if (!verifyEvent(evt)) return false;
    const entry = entryFromEvent(evt);
    if (!entry) return false;
    const prev = board.get(entry.pubkey);
    if (prev && prev.ms <= entry.ms) return false;
    board.set(entry.pubkey, entry);
    return true;
  }

  function topEntries() {
    return [...board.values()].sort((a, b) => a.ms - b.ms).slice(0, MAX_BOARD);
  }

  /* --------------------------------------------------------------- view */
  let boardEl, panelEl, statusEl;
  let identity = null;
  let submitting = false;

  function boardRowsHtml(entries) {
    if (!entries.length) {
      return '<tr class="lb-empty"><td colspan="4">No times on the board yet. Be the first to finish a run.</td></tr>';
    }
    return entries.map((e, i) => {
      const rank = i + 1;
      const cls = rank <= 3 ? 'lb-podium lb-rank-' + rank : '';
      return '<tr class="' + cls + '">' +
        '<td class="lb-rank">' + rank + '</td>' +
        '<td class="lb-name">' + escapeHtml(e.name) + '</td>' +
        '<td class="lb-time">' + fmtTime(e.ms) + '</td>' +
        '<td class="lb-deaths">' + e.deaths + '</td>' +
        '</tr>';
    }).join('');
  }

  function renderBoard() {
    boardEl.innerHTML =
      '<table class="lb-table">' +
      '<thead><tr><th>#</th><th>Runner</th><th>Time</th><th>Deaths</th></tr></thead>' +
      '<tbody>' + boardRowsHtml(topEntries()) + '</tbody>' +
      '</table>';
  }

  function setStatus(msg, tone) {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'lb-status' + (tone ? ' lb-status-' + tone : '');
  }

  function renderPanel() {
    const params = readParams();

    if (!params.present) {
      panelEl.innerHTML =
        '<p class="lb-note">This board only accepts times the game itself reports. Finish all three levels in ' +
        '<a href="' + GAME_URL + '" target="_blank" rel="noopener">Burger Boss</a> and use the "Submit to the leaderboard" ' +
        'link on the win screen - it lands here with your time already attached.</p>';
      return;
    }

    if (!params.valid) {
      panelEl.innerHTML =
        '<p class="lb-note lb-note-bad">That link is carrying a time this game cannot legitimately produce - ' +
        'the fastest possible clear is ' + fmtTime(FLOOR_MS) + ', and a winning run has at most ' + MAX_DEATHS + ' deaths. ' +
        'Nothing was submitted.</p>';
      return;
    }

    panelEl.innerHTML =
      '<form id="lb-form" class="lb-ticket">' +
      '<div class="lb-ticket-head">YOUR RUN</div>' +
      '<div class="lb-ticket-time">' + fmtTime(params.ms) + '</div>' +
      '<div class="lb-ticket-sub">' + params.deaths + ' death' + (params.deaths === 1 ? '' : 's') + '</div>' +
      '<label class="lb-label" for="lb-name">Name on the board (16 characters)</label>' +
      '<input id="lb-name" class="lb-input" maxlength="' + MAX_NAME_LEN + '" placeholder="ANONYMOUS BURGER" autocomplete="off">' +
      '<button type="submit" class="lb-submit" id="lb-submit-btn">Submit to the leaderboard</button>' +
      '<div class="lb-status" id="lb-status"></div>' +
      '</form>';

    statusEl = document.getElementById('lb-status');
    document.getElementById('lb-form').addEventListener('submit', ev => {
      ev.preventDefault();
      if (submitting) return;
      const name = sanitizeName(document.getElementById('lb-name').value);
      submitScore(name, params.ms, params.deaths);
    });
  }

  /* ------------------------------------------------------------- submit */
  function submitScore(name, ms, deaths) {
    submitting = true;
    const btn = document.getElementById('lb-submit-btn');
    if (btn) btn.disabled = true;
    setStatus('Signing and posting to ' + RELAYS.length + ' relays...', null);

    const evt = finalizeEvent({
      kind: KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['t', TAG], ['ms', String(ms)], ['deaths', String(deaths)], ['name', name]],
      content: name + ' cleared Burger Boss in ' + fmtTime(ms) + ' with ' + deaths + ' death' + (deaths === 1 ? '' : 's') + '.'
    }, identity.sk);

    if (considerEvent(evt)) renderBoard();

    const attempts = pool.publish(RELAYS, evt);
    Promise.allSettled(attempts).then(results => {
      submitting = false;
      if (btn) btn.disabled = false;
      const ok = results.filter(r => r.status === 'fulfilled').length;
      if (ok === 0) {
        setStatus('Could not reach any relay - your run is on this board only until one accepts it. Try again in a moment.', 'bad');
      } else if (ok < RELAYS.length) {
        setStatus('Posted to ' + ok + ' of ' + RELAYS.length + ' relays - on the public network.', 'ok');
      } else {
        setStatus('Posted to all ' + RELAYS.length + ' relays.', 'ok');
      }
    });
  }

  /* --------------------------------------------------------------- boot */
  function init() {
    const root = document.getElementById('root');
    root.innerHTML =
      '<header class="lb-header">' +
      '<h1 class="lb-title">Burger Boss</h1>' +
      '<p class="lb-kicker">Leaderboard - fastest full clears, all three levels</p>' +
      '<p class="lb-kicker lb-kicker-sub">Public, on <a href="https://nostr.com" target="_blank" rel="noopener">Nostr</a> - no account, no server we run</p>' +
      '</header>' +
      '<main class="lb-board-wrap"><div id="lb-board"></div></main>' +
      '<section id="lb-panel" class="lb-panel"></section>' +
      '<footer class="lb-footer"><a href="' + GAME_URL + '" target="_blank" rel="noopener">Play Burger Boss on GitHub &#8599;</a></footer>';

    boardEl = document.getElementById('lb-board');
    panelEl = document.getElementById('lb-panel');
    identity = loadOrCreateIdentity();

    renderBoard();
    renderPanel();

    pool.subscribeMany(RELAYS, [{ kinds: [KIND], '#t': [TAG], limit: 500 }], {
      onevent(evt) {
        if (considerEvent(evt)) renderBoard();
      }
    });
  }

  /* window.BB_LEADERBOARD_NO_AUTOINIT must be set before this script loads.
   * The real page never sets it; the local test harness does, so loading
   * this file for its pure functions never opens a live relay connection. */
  if (!window.BB_LEADERBOARD_NO_AUTOINIT) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }

  /* exposed for the local test harness only */
  window.__bbLeaderboard = {
    validateEntry, entryFromEvent, considerEvent, topEntries, sanitizeName, escapeHtml, fmtTime,
    FLOOR_MS, MAX_DEATHS, MAX_BOARD, board, init, loadOrCreateIdentity, RELAYS, TAG, KIND
  };
})();
