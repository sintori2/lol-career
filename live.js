'use strict';
// =================== 실시간 경기 화면 (픽셀 맵) ===================
const SEC_PER_MIN = 2.5; // 1배속 기준, 게임 1분 = 2.5초
const camps = [[22, 54], [30, 64], [42, 76], [56, 82]];
const LOC = [
  [/드래곤|영혼|장로/, [67, 67]], [/유충|전령|남작|바론/, [33, 33]], [/미드 강가/, [50, 50]], [/블루 정글/, [60, 38]],
  [/바텀/, [74, 90]], [/탑 강가/, [24, 28]], [/레드 정글/, [40, 64]]
];
function locXY(name) { for (const [re, xy] of LOC) if (re.test(name)) return xy; return [50, 50]; }
function lanePt(lane, s) {
  s = clamp(s, 0.04, 0.96);
  if (lane === 'MID') return [10 + 80 * s, 90 - 80 * s];
  if (lane === 'TOP') return s < 0.5 ? [10, 90 - 160 * s] : [10 + 160 * (s - 0.5), 10];
  return s < 0.5 ? [10 + 160 * s, 90] : [90, 90 - 160 * (s - 0.5)];
}
const strip = h => String(h).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
function dlLines(html) { // 해설 HTML → [{who,text}]
  const out = []; const re = /<span class="who">([^<]*)<\/span><p>([\s\S]*?)<\/p>/g; let m;
  while ((m = re.exec(html))) out.push({ who: strip(m[1]), text: strip(m[2]) });
  return out;
}

function buildLive(res, g, k) {
  const T = g.time, blue = g.blueA ? 'A' : 'B';
  const baseOf = side => side === blue ? [6, 94] : [94, 6];
  const ids = g.la.concat(g.lb);
  const sideOf = id => g.la.includes(id) ? 'A' : 'B';
  const units = {}; ids.forEach(id => { const p = S.players[id]; units[id] = { id, side: sideOf(id), pos: p.pos, champ: g.draft.picks[id], kf: [], deaths: [], k: 0, d: 0, a: 0 }; });
  const ev = [];
  const laneKey = pos => pos === 'TOP' ? 'TOP' : pos === 'MID' ? 'MID' : 'BOT';
  const advBlue = pos => { const l = g.lanes.find(x => x.pos === pos); return (blue === 'A' ? 1 : -1) * (l.nA - 5); };
  const midAdvBlue = (blue === 'A' ? 1 : -1) * (g.mid.nA - 5);
  const defPos = (u, t) => { // 기본 위치
    const isBlue = u.side === blue;
    if (u.pos === 'JUNGLE') { const c = camps[Math.floor(t * 1.1 + (isBlue ? 0 : 2)) % camps.length]; return isBlue ? c : [100 - c[0], 100 - c[1]]; }
    const adv = t < 14 ? advBlue(u.pos === 'SUP' ? 'AD' : u.pos) : midAdvBlue + advBlue(u.pos === 'SUP' ? 'AD' : u.pos) * 0.5;
    const m = 0.5 + adv * 0.045 + Math.sin(t * 2.1 + (u.pos.length)) * 0.018;
    const s = isBlue ? m - 0.03 : m + 0.03;
    const [x, y] = lanePt(laneKey(u.pos), s);
    return u.pos === 'SUP' ? [x + (isBlue ? -2 : 2), y + (isBlue ? -2 : 2)] : [x, y];
  };
  // 기본 경로
  Object.values(units).forEach(u => {
    const b = baseOf(u.side); u.kf.push([0, b[0], b[1]]);
    for (let t = 1.2; t <= T + 0.01; t += 0.6) { const [x, y] = defPos(u, t); u.kf.push([r2(t), x, y]); }
  });
  const cut = (u, t0, t1) => { u.kf = u.kf.filter(f => f[0] < t0 || f[0] > t1); };
  const put = (u, t, xy) => u.kf.push([r2(t), xy[0], xy[1]]);
  const resp = t => t < 14 ? 0.7 : t < 25 ? 1.1 : 1.6;
  const kills = { A: 0, B: 0 };
  const kill = (victim, killers, t, at) => {
    const v = units[victim]; if (isDead(victim, t)) return; const ks = killers.filter(id => !isDead(id, t)); if (!ks.length) return;
    const killer = R.wpick(ks, id => units[id].pos === 'SUP' ? 0.4 : 1.2);
    units[killer].k++; v.d++; ks.filter(id => id !== killer).forEach(id => units[id].a++);
    kills[units[killer].side]++;
    const r = resp(t); v.deaths.push([t, t + r, at]);
    cut(v, t + 0.01, t + r + 0.9); const b = baseOf(v.side); put(v, t + 0.02, b); put(v, t + r, b);
    return killer;
  };
  const isDead = (id, t) => units[id].deaths.some(([a, b]) => t >= a && t < b);
  const gather = (list, t, xy, spread) => list.forEach((id, i) => {
    const u = units[id]; if (isDead(id, t - 0.5)) return;
    const off = [(i % 3 - 1) * spread, (Math.floor(i / 3) - 0.5) * spread];
    const side = u.side === blue ? -1 : 1;
    cut(u, t - 0.9, t + 0.4); put(u, t - 0.85, defPos(u, t - 0.85)); put(u, t - 0.15, [xy[0] + off[0] + side * 2.5, xy[1] + off[1] - side * 2.5]); put(u, t + 0.35, [xy[0] + off[0] + side * 1.2, xy[1] + off[1] - side * 1.2]);
  });
  const say = (t, who, text, kind) => ev.push({ t: r2(t), who, text, kind: kind || 'call' });
  // 초반
  say(0.3, k.c.name, `${S.teams[res.a].name}과(와) ${S.teams[res.b].name}, ${g.blueA ? S.teams[res.a].name : S.teams[res.b].name} 블루 진영으로 ${res.games.indexOf(g) + 1}세트 시작합니다.`, 'cast');
  const its = earlyItems(res, g);
  const times = its.map((_, i) => 3 + (i + 1) * (9 / (its.length + 1)) + R.u() * 0.8).sort((a, b) => a - b);
  its.forEach((it, i) => {
    const t = times[i], l = it.lane; const w = it.w, lo = it.lo;
    let at; const part = [w, lo];
    if (l.pos === 'JUNGLE') { const tgt = R.pick(['TOP', 'MID', 'AD']); const wl = Object.values(units).find(u => u.side === units[w].side && u.pos === tgt); const ll = Object.values(units).find(u => u.side === units[lo].side && u.pos === tgt); at = defPos(wl, t); part.push(wl.id, ll.id); }
    else { at = defPos(units[w], t); if (R.chance(0.45)) { const jg = Object.values(units).find(u => u.side === units[w].side && u.pos === 'JUNGLE'); part.push(jg.id); } if (l.pos === 'AD' || l.pos === 'SUP') { const pa = Object.values(units).filter(u => u.pos === (l.pos === 'AD' ? 'SUP' : 'AD')); pa.forEach(u => part.push(u.id)); } }
    gather([...new Set(part)], t, at, 2);
    ev.push({ t: r2(t), kind: 'play', text: strip(it.text), html: it.html, flash: at, me: it.html.includes('class="me"') });
    if (it.strong) { const victims = part.filter(id => units[id].side !== units[w].side); const vk = l.pos === 'AD' && R.chance(0.5) ? victims : [victims[0]]; vk.forEach(v => kill(v, part.filter(id => units[id].side === units[w].side), t + 0.1, at)); }
  });
  // 오브젝트 연출
  const botAdv = advBlue('AD'), topAdv = advBlue('TOP');
  say(6.2, k.c.name, `첫 ${S.objects.drake}, ${(botAdv >= 0 ? (blue === 'A' ? S.teams[res.a] : S.teams[res.b]) : (blue === 'A' ? S.teams[res.b] : S.teams[res.a])).name}이(가) 가져갑니다.`, 'obj');
  say(7.5, k.c.name, `${S.objects.grub}, ${(topAdv >= 0 ? (blue === 'A' ? S.teams[res.a] : S.teams[res.b]) : (blue === 'A' ? S.teams[res.b] : S.teams[res.a])).name} 쪽으로 넘어갑니다.`, 'obj');
  dlLines(earlyCommentary(res, g, k)).forEach((d, i) => say(13.2 + i * 0.5, d.who, d.text));
  // 중반 교전
  const midEnd = g.endMid ? T - 1 : T - 6;
  g.skirm.forEach((s, i) => {
    const t = 15 + (i + 1) * ((midEnd - 15) / (g.skirm.length + 1));
    const at = locXY(s.loc); gather(s.pa.concat(s.pb), t, at, 2.5);
    ev.push({ t: r2(t), kind: 'play', html: skirmText(g, s, res), text: strip(skirmText(g, s, res)), flash: at, me: s.pa.concat(s.pb).includes(S.user.id) });
    const W = s.win === 'A' ? s.pa : s.win === 'B' ? s.pb : null, L = s.win === 'A' ? s.pb : s.win === 'B' ? s.pa : null;
    if (!W) { kill(R.pick(s.pa), s.pb, t + 0.15, at); kill(R.pick(s.pb), s.pa, t + 0.2, at); }
    else { const n = s.grade === '강' ? L.length : s.grade === '중' ? Math.min(2, L.length) : 1; R.shuffle(L).slice(0, n).forEach((v, j) => kill(v, W, t + 0.1 + j * 0.08, at)); if (s.grade === '약' && R.chance(0.4)) kill(R.pick(W), L, t + 0.3, at); }
  });
  say(14.5, k.c.name, `${S.objects.herald} 등장. 이제 중반 운영 싸움입니다.`, 'obj');
  dlLines(midCommentary(res, g, k)).forEach((d, i) => say((g.endMid ? T - 0.9 : midEnd + 0.8) + i * 0.5, d.who, d.text));
  // 후반
  const winSide = g.winner, loseSide = winSide === 'A' ? 'B' : 'A';
  const Wids = winSide === 'A' ? g.la : g.lb, Lids = winSide === 'A' ? g.lb : g.la;
  let pushFrom;
  if (!g.endMid) {
    const tl = T - 3, at = locXY(g.late.obj);
    gather(ids, tl, at, 3);
    ev.push({ t: r2(tl), kind: 'play', html: lateText(res, g), text: strip(lateText(res, g)), flash: at, big: true });
    const m = Math.abs(g.late.nA - 5); const nl = m >= 2 ? 5 : m >= 1 ? 4 : 3, nw = m >= 2 ? R.int(0, 1) : m >= 1 ? R.int(1, 2) : 2;
    R.shuffle(Lids).slice(0, nl).forEach((v, j) => kill(v, Wids, tl + 0.1 + j * 0.07, at));
    R.shuffle(Wids).slice(0, nw).forEach((v, j) => kill(v, Lids, tl + 0.15 + j * 0.1, at));
    pushFrom = tl + 0.6;
  } else pushFrom = T - 0.8;
  // 승리팀 진격
  const enemyBase = baseOf(loseSide);
  Wids.forEach((id, i) => { const u = units[id]; cut(u, pushFrom, T + 1); const st = defPos(u, pushFrom); put(u, pushFrom, st); put(u, T - 0.2, [enemyBase[0] + (i - 2) * 2 * (enemyBase[0] > 50 ? -1 : 1), enemyBase[1] + (i - 2) * 1.5 * (enemyBase[1] > 50 ? -1 : 1)]); });
  // 킬 수 보정(최소)
  let pick = 0;
  while (kills.A + kills.B < 6 && pick < 8) { pick++; const t = 4 + R.u() * (T - 8); const side = R.chance(0.6) ? winSide : loseSide; const vs = (side === 'A' ? g.lb : g.la).filter(id => !isDead(id, t)); const ks = (side === 'A' ? g.la : g.lb); if (!vs.length) continue; const v = R.pick(vs); const at = defPos(units[v], t); kill(v, [R.pick(ks)], t, at); ev.push({ t: r2(t), kind: 'pick', text: `${S.players[v].nick}의 ${g.draft.picks[v]}, 홀로 있다가 끊깁니다.`, flash: at }); }
  ev.push({ t: r2(T), kind: 'end', text: `${S.teams[winSide === 'A' ? res.a : res.b].name}, 넥서스 파괴! ${res.games.indexOf(g) + 1}세트 승리.`, who: k.c.name, big: true });
  if (!g.endMid) dlLines(lateCommentary(res, g, k)).forEach((d, i) => say(T - 1.2 + i * 0.4, d.who, d.text));
  Object.values(units).forEach(u => u.kf.sort((a, b) => a[0] - b[0]));
  ev.sort((a, b) => a.t - b.t);
  // 실제 킬·KDA를 타임라인에 맞춤
  g.kills = [kills.A, kills.B];
  g.kda = {}; Object.values(units).forEach(u => g.kda[u.id] = [u.k, u.d, u.a]);
  return { T, blue, units, ev, kills };
}

// ---------- 그리기 ----------
const PX = 4.8; // 맵 1단위 = 4.8px (480px 캔버스)
let mapCache = null;
function drawMap() {
  if (mapCache) return mapCache;
  const c = document.createElement('canvas'); c.width = c.height = 480; const x = c.getContext('2d');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tile = 4;
  for (let i = 0; i < 480; i += tile) for (let j = 0; j < 480; j += tile) { x.fillStyle = rnd() < 0.5 ? '#2c5a35' : rnd() < 0.5 ? '#2f6139' : '#285231'; x.fillRect(i, j, tile, tile); }
  // 정글 벽 (대칭)
  x.fillStyle = '#1d3d24';
  for (let n = 0; n < 34; n++) { const a = 15 + rnd() * 70, b = 15 + rnd() * 70; const w = 4 + rnd() * 7, h = 3 + rnd() * 6; [[a, b], [100 - a, 100 - b]].forEach(([p, q]) => { if (Math.abs(p - (100 - q)) < 8) return; x.fillRect(Math.round(p * PX / tile) * tile, Math.round(q * PX / tile) * tile, Math.round(w * PX / tile) * tile, Math.round(h * PX / tile) * tile); }); }
  // 강
  x.fillStyle = '#2b5e86';
  for (let s = 0; s <= 1; s += 0.01) { const px = 18 + 64 * s, py = 18 + 64 * s; x.fillRect(Math.round((px - 4) * PX / tile) * tile, Math.round((py - 4) * PX / tile) * tile, 8 * PX, 8 * PX * 0.6); }
  x.fillStyle = '#3a76a8'; [[33, 33], [67, 67]].forEach(([p, q]) => { x.fillRect((p - 5) * PX, (q - 5) * PX, 10 * PX, 10 * PX); });
  // 라인
  x.fillStyle = '#8b7a52';
  ['TOP', 'MID', 'BOT'].forEach(l => { for (let s = 0; s <= 1; s += 0.004) { const [p, q] = lanePt(l, s); x.fillRect(Math.round((p - 2.6) * PX / tile) * tile, Math.round((q - 2.6) * PX / tile) * tile, 5.2 * PX, 5.2 * PX); } });
  // 본진
  x.fillStyle = '#25406c'; x.fillRect(0, 380, 100, 100); x.fillStyle = '#6b2430'; x.fillRect(380, 0, 100, 100);
  x.fillStyle = '#3e6db5'; x.fillRect(16, 444, 20, 20); x.fillStyle = '#b5404f'; x.fillRect(444, 16, 20, 20);
  mapCache = c; return c;
}
const ROLE_COL = { TOP: '#d4573b', JUNGLE: '#4caf50', MID: '#a66bd6', AD: '#f2b134', SUP: '#5ab3e6' };
const SPRITE = ['..hhhh..', '.hhhhhh.', '.dssssd.', '..ssss..', '.bbbbbb.', 'wbbbbbbw', '.bbbbbb.', '..bb.bb.', '..d...d.'];
const SPRITE2 = ['..hhhh..', '.hhhhhh.', '.dssssd.', '..ssss..', '.bbbbbb.', 'wbbbbbbw', '.bbbbbb.', '..b..b..', '.d....d.'];
function drawUnit(x, u, px, py, frame, me, teamCol, dead) {
  const sp = frame ? SPRITE : SPRITE2, sc = 2;
  const ox = Math.round(px - 8), oy = Math.round(py - 14);
  if (me) { x.fillStyle = '#f0d48a'; x.fillRect(ox - 2, oy + 18, 20, 3); }
  for (let r = 0; r < sp.length; r++) for (let c = 0; c < 8; c++) {
    const ch = sp[r][c]; if (ch === '.') continue;
    x.fillStyle = dead ? '#555' : ch === 'h' ? ROLE_COL[u.pos] : ch === 's' ? '#f1c9a0' : ch === 'b' ? teamCol : ch === 'w' ? '#e8e8e8' : '#1a1a1a';
    x.fillRect(ox + c * sc, oy + r * sc, sc, sc);
  }
  x.font = 'bold 10px Pretendard, sans-serif'; x.textAlign = 'center';
  const label = u.champ.length > 4 ? u.champ.slice(0, 4) : u.champ;
  x.fillStyle = 'rgba(0,0,0,.6)'; const w = x.measureText(label).width + 4; x.fillRect(px - w / 2, oy - 12, w, 11);
  x.fillStyle = me ? '#f0d48a' : '#fff'; x.fillText(label, px, oy - 3);
}
function posAt(u, t) {
  const kf = u.kf; if (t <= kf[0][0]) return [kf[0][1], kf[0][2]];
  for (let i = 1; i < kf.length; i++) if (kf[i][0] >= t) { const a = kf[i - 1], b = kf[i]; const f = (t - a[0]) / Math.max(0.0001, b[0] - a[0]); return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
  const l = kf[kf.length - 1]; return [l[1], l[2]];
}

// ---------- 화면 제어 ----------
const LV = { raf: null, t: 0, speed: 1, last: 0, live: null, idx: 0, onEnd: null, paused: false };
function liveHtml(res, gi) {
  const A = S.teams[res.a], B = S.teams[res.b], g = res.games[gi];
  const bl = g.blueA ? A : B, rd = g.blueA ? B : A;
  return `<div class="live">
    <div class="lv-top"><b class="tb" style="--tc:${bl.color}">${esc(bl.name)}</b><span class="lk num" id="lv-kb">0</span><span class="clock num" id="lv-clock">00:00</span><span class="lk num" id="lv-kr">0</span><b class="tr" style="--tc:${rd.color}">${esc(rd.name)}</b></div>
    <div class="gbar"><i id="lv-gold"></i></div>
    <div class="lv-body">
      <div class="lv-map"><canvas id="lv-cv" width="480" height="480" aria-label="경기 진행 미니맵"></canvas></div>
      <div class="lv-feed" id="lv-feed" aria-live="polite"></div>
    </div>
    <div class="lv-ctrl">
      <button class="btn sm" data-sp="0">일시정지</button><button class="btn sm" data-sp="1">1배속</button><button class="btn sm" data-sp="2">2배속</button><button class="btn sm" data-sp="4">4배속</button>
      <button class="btn sm ghost" id="lv-tts">${UIS.tts ? '해설 음성 끄기' : '해설 음성 켜기'}</button>
      <button class="btn sm ghost" id="lv-skip">결과로 건너뛰기</button>
    </div>
    <div class="lv-players" id="lv-pl"></div>
  </div>`;
}
function startLive(live, res, gi, onEnd) {
  stopLive();
  LV.live = live; LV.t = 0; LV.idx = 0; LV.onEnd = onEnd; LV.last = performance.now(); LV.speed = UIS.speed || 1; LV.res = res; LV.gi = gi;
  const cv = document.getElementById('lv-cv'); const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  document.querySelectorAll('[data-sp]').forEach(b => { b.onclick = () => { LV.speed = +b.dataset.sp; if (LV.speed) UIS.speed = LV.speed; saveUIS(); markSp(); }; });
  const markSp = () => document.querySelectorAll('[data-sp]').forEach(b => b.classList.toggle('on', +b.dataset.sp === LV.speed));
  markSp();
  document.getElementById('lv-tts').onclick = e => {
    UIS.tts = !UIS.tts; saveUIS(); e.target.textContent = UIS.tts ? '해설 음성 끄기' : '해설 음성 켜기';
    if (!UIS.tts) { speechSynthesis.cancel(); return; }
    pickVoice();
    if (!koVoice) { UIS.tts = false; saveUIS(); e.target.textContent = '해설 음성 켜기'; toast('이 브라우저에서 한국어 음성을 찾지 못했습니다. 크롬이나 엣지로 열어 주세요.'); return; }
    speak('해설 음성을 켰습니다.', CASTERS[0].name);
  };
  document.getElementById('lv-skip').onclick = () => { LV.t = live.T + 0.01; };
  const g = res.games[gi]; const colA = S.teams[res.a].color, colB = S.teams[res.b].color;
  const teamCol = side => side === 'A' ? colA : colB;
  const blueIsA = live.blue === 'A';
  const tick = now => {
    const dt = Math.min(0.25, (now - LV.last) / 1000); LV.last = now;
    LV.t += dt * LV.speed / SEC_PER_MIN;
    const t = Math.min(LV.t, live.T);
    // 피드
    while (LV.idx < live.ev.length && live.ev[LV.idx].t <= t) { pushFeed(live.ev[LV.idx]); LV.idx++; }
    // 그리기
    x.drawImage(drawMap(), 0, 0);
    // 포탑 (승리팀이 진격하면 파괴)
    const pushT = live.T - 2.5;
    ['TOP', 'MID', 'BOT'].forEach(l => [0.14, 0.27, 0.4].forEach((s, i) => [['blue', s], ['red', 1 - s]].forEach(([sd, ss]) => {
      const owner = sd === 'blue' ? live.blue : (live.blue === 'A' ? 'B' : 'A');
      if (owner !== g.winner && t > pushT + (2 - i) * 0.6) return;
      const [px, py] = lanePt(l, ss); x.fillStyle = '#111'; x.fillRect(px * PX - 5, py * PX - 7, 10, 12); x.fillStyle = sd === 'blue' ? '#5d8fe6' : '#e06a72'; x.fillRect(px * PX - 4, py * PX - 6, 8, 10); x.fillStyle = '#dfe7f2'; x.fillRect(px * PX - 2, py * PX - 4, 4, 3);
    })));
    // 미니언 웨이브
    ['TOP', 'MID', 'BOT'].forEach((l, li) => {
      const lp = l === 'BOT' ? 'AD' : l; const ln = g.lanes.find(z => z.pos === lp); const adv = (blueIsA ? 1 : -1) * (ln.nA - 5);
      const m = clamp(0.5 + adv * 0.045, 0.2, 0.8); const ph = ((t * 0.9 + li * 0.3) % 1);
      if (t < 1) return;
      for (let k2 = 0; k2 < 3; k2++) {
        const sb = 0.06 + (m - 0.06) * Math.min(1, ph + k2 * 0.04), sr = 0.94 - (0.94 - m) * Math.min(1, ph + k2 * 0.04);
        const [bx, by] = lanePt(l, sb); x.fillStyle = '#7fb0ff'; x.fillRect(bx * PX - 2 + k2 * 3, by * PX - 2, 3, 3);
        const [rx, ry] = lanePt(l, sr); x.fillStyle = '#ff8f8f'; x.fillRect(rx * PX - 2 - k2 * 3, ry * PX - 2, 3, 3);
      }
    });
    live.ev.forEach(e => { if (e.flash && t >= e.t - 0.1 && t <= e.t + 0.5) { x.fillStyle = (Math.floor(t * 20) % 2) ? '#fff6c0' : '#ff8a3d'; const r = e.big ? 10 : 6; for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + t * 6; x.fillRect(e.flash[0] * PX + Math.cos(a) * r * 2, e.flash[1] * PX + Math.sin(a) * r * 2, 4, 4); } } });
    let kA = 0, kB = 0; const kd = {};
    Object.values(live.units).forEach(u => kd[u.id] = [0, 0, 0]);
    Object.values(live.units).forEach(u => u.deaths.forEach(([a, b, at]) => { if (t >= a) { kd[u.id][1]++; if (u.side === 'A') kB++; else kA++; } if (t >= a && t < a + 1.2) { x.fillStyle = '#ddd'; x.fillRect(at[0] * PX - 3, at[1] * PX - 3, 6, 6); x.fillStyle = '#222'; x.fillRect(at[0] * PX - 2, at[1] * PX - 1, 1, 1); x.fillRect(at[0] * PX + 1, at[1] * PX - 1, 1, 1); } }));
    const frame = Math.floor(performance.now() / 220) % 2;
    Object.values(live.units).forEach(u => { const dead = u.deaths.some(([a, b]) => t >= a && t < b); const [px, py] = posAt(u, t); x.fillStyle = u.side === live.blue ? '#3E7CF2' : '#E2484F'; x.fillRect(px * PX - 7, py * PX + 5, 14, 3); drawUnit(x, u, px * PX, py * PX, frame, u.id === S.user.id, teamCol(u.side), dead); });
    document.getElementById('lv-clock').textContent = `${String(Math.floor(t)).padStart(2, '0')}:${String(Math.floor((t % 1) * 60)).padStart(2, '0')}`;
    const kBlue = blueIsA ? kA : kB, kRed = blueIsA ? kB : kA;
    document.getElementById('lv-kb').textContent = kBlue; document.getElementById('lv-kr').textContent = kRed;
    const laneG = g.lanes.reduce((s, l) => s + l.v, 0) * (blueIsA ? 1 : -1) * 220 * Math.min(t, 14) / 14;
    const gold = laneG + (kBlue - kRed) * 320 + (t > 15 ? (blueIsA ? 1 : -1) * (g.mid.nA - 5) * 500 * Math.min(1, (t - 15) / 10) : 0);
    const gb = document.getElementById('lv-gold'); const pct = clamp(50 + gold / 300, 5, 95); gb.style.width = pct + '%'; gb.title = `골드 차이 ${gold >= 0 ? '+' : ''}${(gold / 1000).toFixed(1)}k`; gb.dataset.v = `${gold >= 0 ? '블루 +' : '레드 +'}${Math.abs(gold / 1000).toFixed(1)}k`;
    if (Math.floor(t * 4) !== LV.plTick) { LV.plTick = Math.floor(t * 4); renderPl(live, res, g, t); }
    if (LV.t >= live.T) { while (LV.idx < live.ev.length) { pushFeed(live.ev[LV.idx]); LV.idx++; } LV.raf = null; const cb = LV.onEnd; LV.onEnd = null; setTimeout(() => cb && cb(), 900); return; }
    LV.raf = setTimeout(() => tick(performance.now()), 33);
  };
  LV.raf = setTimeout(() => tick(performance.now()), 33);
}
function renderPl(live, res, g, t) {
  const el = document.getElementById('lv-pl'); if (!el) return;
  const stat = id => { const u = live.units[id]; let k = 0, d = 0; Object.values(live.units).forEach(v => v.deaths.forEach(([a]) => { if (a <= t) { if (v.id === id) d++; } })); return d; };
  const side = (ids, t2) => `<div class="pls" style="--tc:${t2.color}">${ids.map(id => { const p = S.players[id], u = live.units[id]; const dead = u.deaths.some(([a, b]) => t >= a && t < b); return `<div class="pl ${p.isUser ? 'me' : ''} ${dead ? 'dead' : ''}"><i style="background:${ROLE_COL[p.pos]}"></i><span>${esc(p.nick)}</span><b>${esc(u.champ)}</b></div>`; }).join('')}</div>`;
  const blueIds = live.blue === 'A' ? g.la : g.lb, redIds = live.blue === 'A' ? g.lb : g.la;
  const bt = S.teams[live.blue === 'A' ? res.a : res.b], rt = S.teams[live.blue === 'A' ? res.b : res.a];
  el.innerHTML = side(blueIds, bt) + side(redIds, rt);
}
function pushFeed(e) {
  const f = document.getElementById('lv-feed'); if (!f) return;
  const tm = `${String(Math.floor(e.t)).padStart(2, '0')}:${String(Math.floor((e.t % 1) * 60)).padStart(2, '0')}`;
  const d = document.createElement('div'); d.className = `fe ${e.kind} ${e.me ? 'me' : ''} ${e.big ? 'big' : ''}`;
  d.innerHTML = `<time>${tm}</time>${e.who ? `<b>${esc(e.who)}</b>` : ''}<p>${e.html ? e.html.replace(/<\/?p[^>]*>/g, '') : esc(e.text)}</p>`;
  f.appendChild(d); f.scrollTop = f.scrollHeight;
  if (UIS.tts) speak(e.who ? `${e.text}` : e.text, e.who);
}
function stopLive() { if (LV.raf) clearTimeout(LV.raf); LV.raf = null; LV.onEnd = null; try { speechSynthesis.cancel(); } catch (e) { } }

// ---------- TTS (브라우저 내장 음성, 무료) ----------
let koVoice = null;
function pickVoice() { try { const vs = speechSynthesis.getVoices(); koVoice = vs.find(v => /ko/i.test(v.lang) && /Google/.test(v.name)) || vs.find(v => /ko/i.test(v.lang)) || null; } catch (e) { } }
try { speechSynthesis.onvoiceschanged = pickVoice; pickVoice(); } catch (e) { }
function speak(text, who) {
  try {
    if (!koVoice) pickVoice(); if (!koVoice) return;
    if (speechSynthesis.pending) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[🎲🏆]/g, ''));
    u.voice = koVoice; u.lang = 'ko-KR';
    const caster = who && CASTERS.some(c => c.name === who);
    u.rate = clamp((caster ? 1.25 : 1.1) * (LV.speed >= 2 ? 1.25 : 1), 0.8, 2); u.pitch = caster ? 1.15 : who ? 0.9 : 1;
    speechSynthesis.speak(u);
  } catch (e) { }
}

// ---------- 밴픽 화면 ----------
function draftHtml(res, gi) {
  const A = S.teams[res.a], B = S.teams[res.b], g = res.games[gi];
  const bl = g.blueA ? 'A' : 'B';
  const BT = bl === 'A' ? A : B, RT = bl === 'A' ? B : A, bIds = bl === 'A' ? g.la : g.lb, rIds = bl === 'A' ? g.lb : g.la;
  const bBans = bl === 'A' ? g.draft.bans.A : g.draft.bans.B, rBans = bl === 'A' ? g.draft.bans.B : g.draft.bans.A;
  const row = (id, side, i) => { const p = S.players[id]; return `<div class="dp ${p.isUser ? 'me' : ''}" data-dp="${side}${i}"><span class="role" style="background:${ROLE_COL[p.pos]}">${p.pos === 'JUNGLE' ? 'JG' : p.pos}</span><div><small>${esc(PK[p.pos])}</small><b>${esc(p.nick)}</b></div><em class="ch" data-ch="${esc(g.draft.picks[id])}"></em></div>`; };
  const ban = (c, side, i) => `<div class="bn" data-bn="${side}${i}"><span class="tile" style="--h:${hue(c)}">${esc(c.slice(0, 2))}</span><small>${esc(c)}</small></div>`;
  return `<div class="draftui">
    <div class="dcol" style="--tc:${BT.color}"><h4>${esc(BT.name)} <small>블루</small></h4>${bIds.map((id, i) => row(id, 'b', i)).join('')}</div>
    <div class="dmid">
      <div class="bans-row"><p>블루 금지 챔피언</p><div>${bBans.map((c, i) => ban(c, 'b', i)).join('')}</div></div>
      <div class="dtitle" id="d-title">${gi + 1}세트 밴픽 · 하드 피어리스 <small>${patchStr()} 패치</small></div>
      <div class="dbar"><i id="d-bar"></i></div>
      <div class="bans-row"><div>${rBans.map((c, i) => ban(c, 'r', i)).join('')}</div><p>레드 금지 챔피언</p></div>
    </div>
    <div class="dcol r" style="--tc:${RT.color}"><h4>${esc(RT.name)} <small>레드</small></h4>${rIds.map((id, i) => row(id, 'r', i)).join('')}</div>
  </div>`;
}
function hue(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
function runDraft(res, gi, onDone) {
  const g = res.games[gi];
  const order = ['bnb0', 'bnr0', 'bnb1', 'bnr1', 'bnb2', 'bnr2', 'dpb0', 'dpr0', 'dpr1', 'dpb1', 'dpb2', 'dpr2', 'bnr3', 'bnb3', 'bnr4', 'bnb4', 'dpr3', 'dpb3', 'dpb4', 'dpr4'];
  const bIds = g.blueA ? g.la : g.lb, rIds = g.blueA ? g.lb : g.la;
  // 픽 순서: 역할 순서를 섞어 실제 밴픽처럼
  const bOrd = R.shuffle([0, 1, 2, 3, 4]), rOrd = R.shuffle([0, 1, 2, 3, 4]);
  let i = 0, bp = 0, rp = 0;
  const stepMs = () => 700 / Math.max(1, UIS.speed || 1);
  const step = () => {
    if (!document.querySelector('.draftui')) return;
    if (i >= order.length) { const t = document.getElementById('d-title'); if (t) t.innerHTML = `금지·선택 최종 확인 완료 <small>곧 경기가 시작됩니다</small>`; setTimeout(onDone, 1400 / Math.max(1, UIS.speed || 1)); return; }
    const o = order[i++];
    if (o.startsWith('bn')) { const el = document.querySelector(`[data-bn="${o.slice(2)}"]`); if (el) el.classList.add('on'); }
    else { const side = o[2]; const idx = side === 'b' ? bOrd[bp++] : rOrd[rp++]; const el = document.querySelector(`[data-dp="${side}${idx}"]`); if (el) { el.classList.add('on'); const ch = el.querySelector('.ch'); const c = ch.dataset.ch; const p = S.players[(side === 'b' ? bIds : rIds)[idx]]; ch.innerHTML = `<span class="tile" style="--h:${hue(c)}">${esc(c.slice(0, 2))}</span><span>${esc(c)}<small>PS ${psOf(p.pos, c).toFixed(1)}${S.meta[p.pos].includes(c) ? ' · OP' : ''}</small></span>`; } }
    const bar = document.getElementById('d-bar'); if (bar) bar.style.width = (i / order.length * 100) + '%';
    LV.dTimer = setTimeout(step, stepMs());
  };
  LV.dTimer = setTimeout(step, 400);
}
