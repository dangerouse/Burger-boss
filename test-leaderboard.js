/* Deterministic self test for the Nostr leaderboard logic. Signs and
 * verifies real events with the vendored nostr-tools library, but never
 * touches the network - it only exercises validation, aggregation, and
 * escaping. Open test-leaderboard.html in a browser to run it. */
(() => {
  const L = window.__bbLeaderboard;
  const NT = window.NostrTools;
  const out = [];
  let passed = 0, failed = 0;

  const ok = (name, cond, detail) => {
    (cond ? passed++ : failed++);
    out.push((cond ? '  PASS  ' : '  FAIL  ') + name + (detail ? '   [' + detail + ']' : ''));
  };
  const section = t => out.push('\n' + t);

  function signedEvent(sk, overrides) {
    const base = {
      kind: L.KIND,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['t', L.TAG], ['ms', '64821'], ['deaths', '1'], ['name', 'ANCHOVY']],
      content: 'test'
    };
    const evt = NT.finalizeEvent({ ...base, ...overrides }, sk);
    // simulate a real wire round-trip (strips the library's in-memory
    // "already verified" cache, exactly like receiving JSON from a relay)
    return JSON.parse(JSON.stringify(evt));
  }

  /* ---- 1. validation floor -------------------------------------------- */
  section('validation');
  ok('floor rejects an impossible time', !L.validateEntry(100, 0));
  ok('floor accepts a legitimate time', L.validateEntry(L.FLOOR_MS + 1, 0));
  ok('floor is derived from real level widths, not a round number', L.FLOOR_MS > 24000 && L.FLOOR_MS < 26000, L.FLOOR_MS);
  ok('rejects 3 deaths (a 3rd death ends the run before it can win)', !L.validateEntry(L.FLOOR_MS + 5000, 3));
  ok('accepts the max legitimate death count', L.validateEntry(L.FLOOR_MS + 5000, L.MAX_DEATHS));
  ok('rejects negative deaths', !L.validateEntry(L.FLOOR_MS + 5000, -1));
  ok('rejects a non-integer death count', !L.validateEntry(L.FLOOR_MS + 5000, 1.5));
  ok('rejects an absurdly long time', !L.validateEntry(999 * 60 * 1000, 0));

  section('name handling');
  ok('trims and collapses whitespace', L.sanitizeName('  a   b  ') === 'a b');
  ok('truncates to 16 characters', L.sanitizeName('a'.repeat(40)).length === 16);
  ok('empty name falls back', L.sanitizeName('   ') === 'ANONYMOUS BURGER');
  ok('escapes HTML in names', L.escapeHtml('<img src=x>') === '&lt;img src=x&gt;');

  /* ---- 2. event signing and tamper detection --------------------------- */
  section('event integrity (real nostr-tools signing)');
  const sk = NT.generateSecretKey();
  const pk = NT.getPublicKey(sk);
  const goodEvt = signedEvent(sk, {});
  ok('a freshly signed event verifies', NT.verifyEvent(goodEvt));
  ok('event pubkey matches the signer', goodEvt.pubkey === pk);

  // verifyEvent caches its result as a Symbol property on the object it was
  // given; spreading goodEvt after it has been verified would carry that
  // cache into the copy and short-circuit re-verification, so round-trip
  // through JSON first to get a clean object with no cached verdict.
  const tamperedMs = JSON.parse(JSON.stringify(goodEvt));
  tamperedMs.tags = tamperedMs.tags.map(t => t[0] === 'ms' ? ['ms', '1'] : t);
  ok('a tampered ms tag fails verification', !NT.verifyEvent(tamperedMs));

  const tamperedSig = JSON.parse(JSON.stringify(goodEvt));
  tamperedSig.sig = tamperedSig.sig.replace(/^./, tamperedSig.sig[0] === 'a' ? 'b' : 'a');
  ok('a corrupted signature fails verification', !NT.verifyEvent(tamperedSig));

  /* ---- 3. entryFromEvent + considerEvent aggregation -------------------- */
  section('reading events off the wire');
  L.board.clear();

  const e1 = signedEvent(sk, { tags: [['t', L.TAG], ['ms', '90000'], ['deaths', '2'], ['name', 'SLOWPOKE']] });
  ok('a valid event is accepted into the board', L.considerEvent(e1));
  ok('board now has one entry', L.board.size === 1, L.board.size);

  const e1Improved = signedEvent(sk, { tags: [['t', L.TAG], ['ms', '70000'], ['deaths', '1'], ['name', 'SLOWPOKE']] });
  ok('the same identity posting a BETTER time replaces their entry', L.considerEvent(e1Improved));
  ok('board still has exactly one entry for that identity', L.board.size === 1, L.board.size);
  ok('the stored entry is the improved time', L.board.get(pk).ms === 70000, L.board.get(pk).ms);

  const e1Worse = signedEvent(sk, { tags: [['t', L.TAG], ['ms', '95000'], ['deaths', '0'], ['name', 'SLOWPOKE']] });
  ok('the same identity posting a WORSE time is ignored', !L.considerEvent(e1Worse));
  ok('the better time is still what is stored', L.board.get(pk).ms === 70000);

  ok('a byte-identical duplicate event is ignored', !L.considerEvent(JSON.parse(JSON.stringify(e1Improved))));

  const fakeEvt = signedEvent(sk, { tags: [['t', L.TAG], ['ms', '100'], ['deaths', '0'], ['name', 'CHEATER']] });
  ok('an impossible time from a real signature is still rejected', !L.considerEvent(fakeEvt));

  const untaggedEvt = signedEvent(sk, { tags: [['t', 'some-other-app']] });
  const untaggedEntry = L.entryFromEvent(untaggedEvt);
  ok('an event with no ms/deaths tags parses to nothing usable', untaggedEntry === null);

  /* a second identity, several more entries, to exercise real sorting */
  section('top-N sorting');
  L.board.clear();
  const identities = [
    { name: 'ANCHOVY', ms: 64821, deaths: 0 },
    { name: 'GRILLMASTER', ms: 71230, deaths: 1 },
    { name: 'PICKLE RICK', ms: 79500, deaths: 2 },
    { name: 'HARPER', ms: 88110, deaths: 0 }
  ];
  identities.forEach(p => {
    const isk = NT.generateSecretKey();
    L.considerEvent(signedEvent(isk, {
      tags: [['t', L.TAG], ['ms', String(p.ms)], ['deaths', String(p.deaths)], ['name', p.name]]
    }));
  });
  const top = L.topEntries();
  ok('all four distinct identities appear', top.length === 4, top.length);
  ok('sorted ascending by time', top.every((e, i) => i === 0 || top[i - 1].ms <= e.ms),
    top.map(e => e.ms).join(','));
  ok('fastest is first', top[0].name === 'ANCHOVY');

  section('board size cap');
  L.board.clear();
  for (let i = 0; i < L.MAX_BOARD + 5; i++) {
    const isk = NT.generateSecretKey();
    L.considerEvent(signedEvent(isk, {
      tags: [['t', L.TAG], ['ms', String(L.FLOOR_MS + 1000 + i * 500)], ['deaths', '0'], ['name', 'RUNNER' + i]]
    }));
  }
  ok('board tracks every distinct identity internally', L.board.size === L.MAX_BOARD + 5, L.board.size);
  ok('but only the top ' + L.MAX_BOARD + ' are ever displayed', L.topEntries().length === L.MAX_BOARD);

  /* ---- report ----------------------------------------------------------- */
  document.getElementById('out').textContent = out.join('\n');
  const s = document.getElementById('summary');
  s.textContent = failed === 0 ? 'ALL ' + passed + ' CHECKS PASSED' : failed + ' FAILED, ' + passed + ' passed';
  s.className = failed === 0 ? 'pass' : 'fail';
  document.title = (failed === 0 ? 'PASS ' : 'FAIL ') + passed + '/' + (passed + failed);
})();
