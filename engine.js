'use strict';
// =================== 공정한 난수 (crypto) ===================
const R = {
  u() { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; },
  int(a, b) { return a + Math.floor(this.u() * (b - a + 1)); },
  d20() { return this.int(1, 20); },
  pick(a) { return a[Math.floor(this.u() * a.length)]; },
  chance(p) { return this.u() < p; },
  norm(m, s) { let u = 0, v = 0; while (!u) u = this.u(); while (!v) v = this.u(); return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
  shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(this.u() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; },
  wpick(items, wf) { const ws = items.map(wf); const t = ws.reduce((a, b) => a + b, 0); let x = this.u() * t; for (let i = 0; i < items.length; i++) { x -= ws[i]; if (x <= 0) return items[i]; } return items[items.length - 1]; },
  sround(x) { const f = Math.floor(x); return f + (this.u() < x - f ? 1 : 0); }
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const r1 = v => Math.round(v * 10) / 10;
const r2 = v => Math.round(v * 100) / 100;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
function fdate(iso) { const d = new Date(iso + 'T00:00:00'); return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}(${DOW[d.getDay()]})`; }
function sn(k, pos) { return k === 'lane' && pos === 'JUNGLE' ? '동선' : SN[k]; }
function grade(v) { return v >= 440 ? 'S+' : v >= 425 ? 'S' : v >= 410 ? 'A+' : v >= 390 ? 'A' : v >= 370 ? 'B+' : v >= 350 ? 'B' : v >= 325 ? 'C+' : 'C'; }
function josa(w, a, b) { const c = w.charCodeAt(w.length - 1); if (c < 0xAC00 || c > 0xD7A3) return w + a; return w + (((c - 0xAC00) % 28) ? a : b); }
// 받침 있으면 a, 없으면 b  예) josa('아지르','으로','로')

let S = null;

// =================== 선수/팀 생성 ===================
const usedNicks = new Set();
function genNick() {
  for (let i = 0; i < 200; i++) {
    const n = R.chance(0.55) ? R.pick(NICK_A) + R.pick(NICK_B) + (R.chance(0.2) ? R.pick(NICK_B) : '') : R.pick(NICK_W);
    if (!usedNicks.has(n.toLowerCase())) { usedNicks.add(n.toLowerCase()); return n; }
  }
  const n = R.pick(NICK_W) + R.int(1, 99); usedNicks.add(n.toLowerCase()); return n;
}
function genName(region) {
  const N = NAMES[region];
  if (region === 'KR') return R.pick(N.sur) + R.pick(N.giv) + R.pick(N.giv);
  if (region === 'CN') return R.pick(N.sur) + R.pick(N.giv) + (R.chance(0.5) ? R.pick(N.giv) : '');
  return R.pick(N.first) + ' ' + R.pick(N.last);
}
function mkStats(ovr, prof) {
  const st = {};
  SK.forEach(k => st[k] = ovr + (prof[k] || 0) + R.int(-3, 3));
  const d = Math.round(ovr - avg(SK.map(k => st[k])));
  SK.forEach(k => st[k] = Math.max(1, st[k] + d));
  return st;
}
function newPlayer(o) {
  const id = 'p' + (S.uid++);
  const p = Object.assign({
    id, isUser: false, bn: {}, traits: [], cond: 5, condStat: null, condCarry: 0, evt: 0, form: 0, fame: 0, sal: 0.2, ce: S.season,
    teamId: null, retired: false, sp: 0, spPrev: 0, career: { g: 0, w: 0, pom: 0, starts: 0, titles: [] }, sig: null, impress: 0
  }, o);
  if (!p.sig) p.sig = R.pick(CHAMPS[p.pos]);
  if (!p.pers) p.pers = [R.int(40, 95), R.int(35, 95), R.int(25, 95), R.int(15, 80)];
  usedNicks.add(p.nick.toLowerCase());
  S.players[id] = p; return p;
}
function genPlayer(region, pos, age, ovr, opts = {}) {
  const prof = {}; SK.forEach(k => prof[k] = R.int(-12, 12));
  let pot = opts.pot;
  if (pot == null) pot = age >= 23 ? ovr + R.int(0, 12) : Math.max(ovr + R.int(5, 25), Math.round(clamp(R.norm(395, 22), 300, 450)));
  return newPlayer({ nick: genNick(), name: genName(region), age, pos, st: mkStats(ovr, prof), pot, region, gen: true,
    fame: Math.max(0, Math.round((ovr - 360) * 35 + R.int(0, 400))), sal: r1(Math.max(0.2, (ovr - 360) * 0.08)), ce: S.season + R.int(0, 1) });
}
function genCoach(region, tier, role) {
  const base = tier === 1 ? 430 : 415;
  const id = 'c' + (S.uid++);
  const c = { id, nick: genNick(), name: genName(region), role, dev: base + R.int(-15, 25), str: base + R.int(-15, 25), tac: base + R.int(-15, 25), mor: base + R.int(-15, 25), pers: [R.int(50, 95), R.int(45, 95), R.int(20, 95), R.int(20, 80)], gen: true };
  S.coaches[id] = c; return c;
}
function addCoach(arr, role) {
  const id = 'c' + (S.uid++);
  const c = { id, nick: arr[0], name: arr[1], role, dev: arr[2], str: arr[3], tac: arr[4], mor: arr[5], pers: arr[6] };
  S.coaches[id] = c; return c;
}
function newTeam(o) { const t = Object.assign({ roster: [], st: {}, coaches: [], streak: 0, child: null, parent: null }, o); S.teams[t.id] = t; return t; }

function buildWorld() {
  S = { ver: 1, uid: 1, season: 2027, date: '2026-12-01', players: {}, teams: {}, coaches: {}, leagues: {}, entries: [], ei: 0, flow: null,
    news: [], user: null, meta: {}, ps: {}, patch: Object.assign({}, PATCH_START), objects: { grub: '공허 유충', herald: '협곡의 전령', drake: '드래곤', baron: '내셔 남작', elder: '장로 드래곤' },
    routine: { rank: 40, vod: 25, scrim: 10, mental: 5, stream: 0, rest: 20, autoRest: true },
    intl: {}, interviews: [], hist: [], luck: 0, summaryQueue: [], firstSeason: true, fa: [] };
  usedNicks.clear();
  // 1군
  REAL_TEAMS.forEach(d => {
    const t = newTeam({ id: d.id, name: d.name, full: d.full, region: d.region, tier: 1, color: d.color });
    (d.coaches || []).forEach((c, i) => t.coaches.push(addCoach(c, i ? '코치' : '감독').id));
    if (!t.coaches.length) { t.coaches.push(genCoach(d.region, 1, '감독').id); t.coaches.push(genCoach(d.region, 1, '코치').id); }
    if (d.players) {
      d.players.forEach(a => {
        const p = newPlayer({ nick: a[0], name: a[1], age: a[2], pos: a[3], st: mkStats(a[4], a[5]), pot: a[6], pers: a[7], fame: a[8], sal: a[9], traits: a[10].slice(), region: d.region, ce: S.season + R.int(0, 1) });
        joinTeam(p, t);
      });
    } else {
      POS.forEach(pos => joinTeam(genPlayer(d.region, pos, R.int(19, 27), d.gen + R.int(-8, 8)), t));
    }
  });
  // 2군
  ACADEMIES.forEach(a => {
    const par = S.teams[a[2]];
    const t = newTeam({ id: a[0], name: a[1], full: a[1], region: par.region, tier: 2, color: par.color, parent: par.id });
    par.child = t.id;
    if (a[4]) a[4].forEach((c, i) => t.coaches.push(addCoach(c, i ? '코치' : '감독').id));
    while (t.coaches.length < 2) t.coaches.push(genCoach(par.region, 2, t.coaches.length ? '코치' : '감독').id);
    POS.forEach(pos => joinTeam(genPlayer(par.region, pos, R.int(17, 21), a[3] + R.int(-8, 8)), t));
    // 유망주 1명
    const age = R.int(15, 17);
    joinTeam(genProspect(par.region, R.pick(POS), age), t);
  });
  // 리그
  LEAGUE_DEF.forEach(L => {
    const teams = Object.values(S.teams).filter(t => t.region === L.region && t.tier === L.tier).map(t => t.id);
    S.leagues[L.id] = { id: L.id, name: L.name, region: L.region, tier: L.tier, stages: L.stages, teams, tab: {}, rr: {}, po: null, final: [], champs: {} };
  });
  Object.values(S.teams).forEach(t => t.league = Object.values(S.leagues).find(l => l.teams.includes(t.id)).id);
  rollMeta(true);
  Object.values(S.teams).forEach(setStarters);
}
function genProspect(region, pos, age) {
  let pot = Math.round(clamp(R.norm(392, 22), 300, 450));
  pot -= (age === 16 ? 10 : age === 17 ? 20 : 0);
  const ovr = 240 + (age - 15) * 35 + R.int(-15, 15);
  const p = genPlayer(region, pos, age, ovr, { pot });
  p.fame = R.int(0, 60); p.sal = 0.2; p.ce = S.season; p.prospect = true;
  return p;
}
function joinTeam(p, t) {
  if (p.teamId && S.teams[p.teamId]) { const o = S.teams[p.teamId]; o.roster = o.roster.filter(x => x !== p.id); POS.forEach(k => { if (o.st[k] === p.id) delete o.st[k]; }); }
  p.teamId = t.id; if (!t.roster.includes(p.id)) t.roster.push(p.id);
}

// =================== 스탯 계산 ===================
function traitBonus(p, k) { return (p.traits || []).reduce((a, tk) => a + ((TRAITS[tk] && TRAITS[tk].eff[k]) || 0), 0); }
function eff(p) { const o = {}; SK.forEach(k => o[k] = p.st[k] + (p.bn[k] || 0) + traitBonus(p, k)); return o; }
function ovrOf(s) { return Math.round(avg(SK.map(k => s[k]))); }
function ovr(p) { return ovrOf(eff(p)); }
function pureOvr(p) { return r1(avg(SK.map(k => p.st[k]))); }
function teamDev(t) { return avg(t.coaches.map(c => S.coaches[c].dev)); }
function potEff(p) { const t = S.teams[p.teamId]; return p.pot + (t ? Math.round(teamDev(t) / 10) : 0); }
function matchStats(p) {
  const s = eff(p); const d = p.cond - 5;
  if (d !== 0 && p.condStat) s[p.condStat] = Math.round(s[p.condStat] * (1 + 0.04 * d));
  return s;
}
function speech(p) { return Math.min(40, Math.round(p.pers[3] * 0.4)) + Math.min(60, p.age * 2); }
function evalP(p, noise = true) { return ovr(p) + p.form * 3 + (p.isUser ? clamp(p.impress, -10, 10) : 0) + (noise ? R.int(-4, 4) : 0); }
function eligible(p, t) { return !p.retired && (t.tier === 2 || p.age >= 17); }

function setStarters(t) {
  POS.forEach(pos => {
    const c = t.roster.map(id => S.players[id]).filter(p => p.pos === pos && eligible(p, t));
    if (!c.length) return;
    c.sort((a, b) => evalP(b, false) - evalP(a, false));
    t.st[pos] = c[0].id;
  });
}
function lineup(t) { return POS.map(pos => S.players[t.st[pos]]).filter(Boolean); }
function teamOvr(t) { return Math.round(avg(lineup(t).map(ovr))); }
function teamShort(t) { return t.name; }

// =================== 메타·오브젝트 ===================
function rollMeta(first) {
  POS.forEach(pos => {
    if (first) S.ps[pos] = Object.assign({}, CHAMP_PS[pos]);
    else Object.keys(S.ps[pos]).forEach(c => { S.ps[pos][c] = r2(clamp(S.ps[pos][c] * 0.6 + CHAMP_PS[pos][c] * 0.2 + 50 * 0.2 + R.norm(0, 1.6), 40, 60)); });
    refreshOP(pos);
  });
  if (!first) { S.patch = { major: S.season - 2000, minor: 1 }; }
  if (!first && (S.season - 2027) % 3 === 0) {
    const nw = R.pick(OBJ_POOL.filter(o => !Object.values(S.objects).includes(o)));
    const slot = R.pick(['grub', 'herald']);
    const old = S.objects[slot]; S.objects[slot] = nw;
    addNews('patch', `대규모 협곡 개편: '${old}' 삭제, '${nw}' 등장`, `${S.season} 시즌부터 협곡 중립 오브젝트가 바뀝니다. 라이엇은 "${nw}"가 운영 구도를 크게 바꿀 것이라고 밝혔습니다.`);
  }
}
function refreshOP(pos) { S.meta[pos] = Object.keys(S.ps[pos]).sort((a, b) => S.ps[pos][b] - S.ps[pos][a]).slice(0, 4); }
function psOf(pos, c) { return (S.ps[pos] && S.ps[pos][c]) || 50; }
function patchStr() { return `${S.patch.major}.${S.patch.minor}`; }

// =================== 뉴스 ===================
function addNews(type, title, body, extra) {
  S.news.unshift(Object.assign({ date: S.date, type, title, body }, extra || {}));
  if (S.news.length > 400) S.news.length = 400;
}

// =================== 일정 ===================
function addDays(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function buildSeason() {
  const Y = S.season, E = [];
  const P = (date, kind, o) => E.push(Object.assign({ date, kind }, o || {}));
  P(`${Y - 1}-12-01`, 'stove', { label: '스토브리그 개막', first: true });
  P(`${Y - 1}-12-15`, 'stove', { label: '스토브리그' });
  P(`${Y}-01-05`, 'stove', { label: '프리시즌 스크림' });
  for (let r = 0; r < 9; r++) P(addDays(`${Y}-01-14`, r * 7), 'league', { stage: 'cup', round: r });
  P(`${Y}-03-18`, 'lfinal', { stage: 'cup', label: '컵 결승' });
  for (let r = 0; r < 9; r++) P(addDays(`${Y}-04-01`, r * 7), 'league', { stage: 'r12', round: r });
  P(`${Y}-06-24`, 'msi', { round: 0, label: 'MSI 8강' }); P(`${Y}-07-01`, 'msi', { round: 1, label: 'MSI 4강' }); P(`${Y}-07-08`, 'msi', { round: 2, label: 'MSI 결승' });
  for (let r = 0; r < 9; r++) P(addDays(`${Y}-07-22`, r * 7), 'league', { stage: 'r35', round: r });
  P(`${Y}-09-23`, 'playoffs', { round: 0, label: '플레이오프 4강' }); P(`${Y}-09-30`, 'playoffs', { round: 1, label: '플레이오프 결승' });
  ['10-15', '10-17', '10-19', '10-22', '10-24'].forEach((d, i) => P(`${Y}-${d}`, 'worlds', { round: i, label: `월즈 스위스 스테이지 ${i + 1}라운드` }));
  P(`${Y}-10-30`, 'worlds', { round: 5, label: '월즈 8강' }); P(`${Y}-11-06`, 'worlds', { round: 6, label: '월즈 4강' }); P(`${Y}-11-14`, 'worlds', { round: 7, label: '월즈 결승' });
  P(`${Y}-11-20`, 'end', { label: '시즌 종료' });
  S.entries = E; S.ei = 0;
  Object.values(S.leagues).forEach(lg => {
    lg.tab = { cup: {}, r12: {}, r35: {} }; lg.po = null; lg.final = [];
    ['cup', 'r12', 'r35'].forEach(st => { lg.rr[st] = roundRobin(R.shuffle(lg.teams)); lg.teams.forEach(t => lg.tab[st][t] = { w: 0, l: 0, sw: 0, sl: 0 }); });
  });
  S.intl = {};
}
function roundRobin(ids) {
  const a = ids.slice(); if (a.length % 2) a.push(null);
  const n = a.length, rounds = [];
  for (let r = 0; r < n - 1; r++) {
    const pr = [];
    for (let i = 0; i < n / 2; i++) { const x = a[i], y = a[n - 1 - i]; if (x && y) pr.push(r % 2 ? [y, x] : [x, y]); }
    rounds.push(pr); a.splice(1, 0, a.pop());
  }
  return rounds;
}
function stageName(lg, st) { return lg.stages[st]; }
function standings(lg, stages) {
  const rows = lg.teams.map(t => { const o = { t, w: 0, l: 0, sw: 0, sl: 0 }; stages.forEach(st => { const x = lg.tab[st][t]; o.w += x.w; o.l += x.l; o.sw += x.sw; o.sl += x.sl; }); return o; });
  rows.sort((a, b) => (b.w - a.w) || ((b.sw - b.sl) - (a.sw - a.sl)) || (teamOvr(S.teams[b.t]) - teamOvr(S.teams[a.t])));
  return rows;
}

// 이번 일정의 대진
function fixturesFor(e) {
  const F = [];
  if (e.kind === 'league') {
    Object.values(S.leagues).forEach(lg => {
      const rd = lg.rr[e.stage][e.round]; if (!rd) return;
      rd.forEach(([a, b]) => F.push({ a, b, bo: 3, comp: `${lg.name} ${stageName(lg, e.stage)} ${e.round + 1}주차`, lg: lg.id, kind: 'league', stage: e.stage }));
    });
  } else if (e.kind === 'lfinal') {
    Object.values(S.leagues).forEach(lg => { const s = standings(lg, ['cup']); F.push({ a: s[0].t, b: s[1].t, bo: 5, comp: `${lg.name} ${stageName(lg, 'cup')} 결승`, lg: lg.id, kind: 'lfinal' }); });
  } else if (e.kind === 'playoffs') {
    Object.values(S.leagues).forEach(lg => {
      if (e.round === 0) {
        const s = standings(lg, ['r12', 'r35']).map(x => x.t);
        lg.po = { seeds: s.slice(0, 4), sfW: [], sfL: [] };
        F.push({ a: s[0], b: s[3], bo: 5, comp: `${lg.name} 플레이오프 4강`, lg: lg.id, kind: 'po' });
        F.push({ a: s[1], b: s[2], bo: 5, comp: `${lg.name} 플레이오프 4강`, lg: lg.id, kind: 'po' });
      } else {
        F.push({ a: lg.po.sfW[0], b: lg.po.sfW[1], bo: 5, comp: `${lg.name} 결승`, lg: lg.id, kind: 'pof' });
      }
    });
  } else if (e.kind === 'msi') {
    const I = S.intl.msi || (S.intl.msi = msiSetup());
    const cur = I.rounds[e.round]; cur.forEach(([a, b]) => F.push({ a, b, bo: 5, comp: e.label, kind: 'msi', intl: true }));
  } else if (e.kind === 'worlds') {
    const W = S.intl.worlds || (S.intl.worlds = worldsSetup());
    if (e.round < 5) {
      const act = W.teams.filter(t => W.rec[t].w < 3 && W.rec[t].l < 3);
      const groups = {};
      act.forEach(t => { const k = W.rec[t].w + '-' + W.rec[t].l; (groups[k] = groups[k] || []).push(t); });
      Object.values(groups).forEach(g => {
        const sh = R.shuffle(g);
        for (let i = 0; i + 1 < sh.length; i += 2) {
          const a = sh[i], b = sh[i + 1], decisive = W.rec[a].w === 2 || W.rec[a].l === 2;
          F.push({ a, b, bo: decisive ? 3 : 1, comp: `${e.label} (${W.rec[a].w}-${W.rec[a].l})`, kind: 'swiss', intl: true });
        }
      });
    } else {
      W.ko[e.round].forEach(([a, b]) => F.push({ a, b, bo: 5, comp: e.label, kind: 'wko', intl: true }));
    }
  }
  return F;
}
function msiSetup() {
  const q = r => standings(S.leagues[r], ['r12']).map(x => x.t);
  const K = q('LCK'), C = q('LPL'), E = q('LEC'), N = q('LCS'), A = q('LCP');
  const teams = [K[0], C[0], E[0], K[1], C[1], E[1], N[0], A[0]];
  return { teams, rounds: [[[K[0], N[0]], [C[1], E[0]], [C[0], A[0]], [K[1], E[1]]], [], []] };
}
function worldsSetup() {
  const f = id => S.leagues[id].final;
  const teams = [...f('LCK').slice(0, 4), ...f('LPL').slice(0, 4), ...f('LEC').slice(0, 3), ...f('LCS').slice(0, 2), ...f('LCP').slice(0, 2), ...f('CBLOL').slice(0, 1)];
  const rec = {}; teams.forEach(t => rec[t] = { w: 0, l: 0 });
  return { teams, rec, ko: {}, adv: [] };
}

// =================== 경기 엔진 ===================
function scale20(v) { return clamp(Math.round((v - 300) / 10), 1, 20); }
function streakB(t) { return t.streak >= 6 ? 3 : t.streak >= 4 ? 2 : t.streak >= 2 ? 1 : 0; }
function gradeOf(nA) { const m = Math.abs(nA - 5); if (m === 0) return '균형'; return m >= 2 ? '강' : m >= 1 ? '중' : '약'; }
function gval(nA) { const m = Math.abs(nA - 5); const v = m >= 2 ? 3 : m >= 1 ? 2 : m > 0 ? 1 : 0; return nA > 5 ? v : -v; }
function ratio(a, b) { const n = Math.round((a / (a + b)) * 20) / 2; return [n, 10 - n]; }
function staffTac(t) { const cs = t.coaches.map(c => S.coaches[c]); return { str: avg(cs.map(c => c.str)), tac: avg(cs.map(c => c.tac)), mor: avg(cs.map(c => c.mor)) }; }
function bonusPts(diff) { if (diff <= 0) return 0; return clamp(Math.floor(diff / 2.5), 1, 3); }

function draft(A, B, LA, LB, used, blueA) {
  const banned = new Set(), picks = {};
  const pool = pos => CHAMPS[pos].filter(c => !used.has(c) && !banned.has(c) && !Object.values(picks).includes(c));
  const bans = { A: [], B: [] };
  for (let i = 0; i < 5; i++) {
    ['A', 'B'].forEach(side => {
      const opp = side === 'A' ? LB : LA; const tp = R.pick(opp);
      const cand = pool(tp.pos); const meta = cand.filter(c => S.meta[tp.pos].includes(c) || c === tp.sig);
      const c = meta.length && R.chance(0.7) ? R.pick(meta) : R.wpick(cand, x => Math.exp((psOf(tp.pos, x) - 50) / 2)); banned.add(c); bans[side].push(c);
    });
  }
  const order = blueA ? [LA, LB] : [LB, LA];
  for (let i = 0; i < 5; i++) order.forEach(L => {
    const p = L[i]; const cand = pool(p.pos);
    const c = R.wpick(cand, x => Math.exp((psOf(p.pos, x) - 50) / 2.2) * (x === p.sig ? 2.5 : 1)); picks[p.id] = c;
  });
  return { bans, picks };
}

function playGame(A, B, ctx) {
  const LA = lineup(A), LB = lineup(B);
  const sA = {}, sB = {}; LA.forEach(p => sA[p.id] = matchStats(p)); LB.forEach(p => sB[p.id] = matchStats(p));
  const g = { A: A.id, B: B.id, la: LA.map(p => p.id), lb: LB.map(p => p.id), stats: Object.assign({}, sA, sB), calc: {}, perf: {} };
  LA.concat(LB).forEach(p => g.perf[p.id] = R.int(0, 2));
  g.blueA = ctx.blueA;
  // 경기전 미팅: 전술
  const tA = staffTac(A), tB = staffTac(B);
  const baseA = (tA.str + tA.tac + tA.mor) / 150, baseB = (tB.str + tB.tac + tB.mor) / 150;
  let dA = R.d20(), dB = R.d20();
  g.calc.tac = { tA, tB, baseA, baseB, dA, dB, totA: baseA + dA, totB: baseB + dB };
  g.tacWin = g.calc.tac.totA === g.calc.tac.totB ? null : (g.calc.tac.totA > g.calc.tac.totB ? 'A' : 'B');
  const visA = LA.reduce((a, p) => a + sA[p.id].vis, 0), visB = LB.reduce((a, p) => a + sB[p.id].vis, 0);
  const menA = LA.reduce((a, p) => a + sA[p.id].men, 0), menB = LB.reduce((a, p) => a + sB[p.id].men, 0);
  const vd = visA / 50 - visB / 50, md = menA / 50 - menB / 50;
  g.calc.vis = { visA, visB, diff: vd, bA: bonusPts(vd), bB: bonusPts(-vd) };
  g.calc.men = { menA, menB, diff: md, bA: bonusPts(md), bB: bonusPts(-md) };
  const stA = streakB(A), stB = streakB(B);
  g.calc.streak = { A: stA, B: stB };
  // 밴픽
  g.draft = draft(A, B, LA, LB, ctx.used, ctx.blueA);
  Object.values(g.draft.picks).forEach(c => ctx.used.add(c));
  // 초반 라인전
  g.lanes = [];
  POS.forEach((pos, i) => {
    const a = LA[i], b = LB[i]; const xa = sA[a.id], xb = sB[b.id];
    const ca = scale20((xa.lane + xa.phys) / 2), cb = scale20((xb.lane + xb.phys) / 2);
    const da = R.d20(), db = R.d20();
    const psA = psOf(pos, g.draft.picks[a.id]), psB = psOf(pos, g.draft.picks[b.id]);
    const mu = clamp(Math.round((psA - psB) / 2), -3, 3);
    const ta = Math.max(1, ca + da + stA + (g.tacWin === 'A' ? 2 : 0) + g.calc.vis.bA + (a.evt || 0) + Math.max(0, mu));
    const tb = Math.max(1, cb + db + stB + (g.tacWin === 'B' ? 2 : 0) + g.calc.vis.bB + (b.evt || 0) + Math.max(0, -mu));
    const [nA, nB] = ratio(ta, tb);
    const L = { pos, a: a.id, b: b.id, ca, cb, da, db, ta, tb, nA, nB, grade: gradeOf(nA), win: nA > 5 ? 'A' : nA < 5 ? 'B' : null, v: gval(nA), psA, psB, muA: Math.max(0, mu), muB: Math.max(0, -mu),
      rawA: (xa.lane + xa.phys) / 2, rawB: (xb.lane + xb.phys) / 2, evA: a.evt || 0, evB: b.evt || 0 };
    g.lanes.push(L);
    g.perf[a.id] += L.v * 1.5; g.perf[b.id] -= L.v * 1.5;
  });
  // 중반 소규모 교전
  const n = R.int(1, 3); g.skirm = [];
  for (let k = 0; k < n; k++) {
    let na = R.int(2, 4), nb = clamp(na + R.int(-1, 1), 1, 5);
    const pa = R.shuffle(LA).slice(0, na), pb = R.shuffle(LB).slice(0, nb);
    const ca = scale20(avg(pa.map(p => (sA[p.id].phys + sA[p.id].skirm) / 2))), cb = scale20(avg(pb.map(p => (sB[p.id].phys + sB[p.id].skirm) / 2)));
    const lvA = clamp(pa.reduce((s, p) => s + g.lanes[POS.indexOf(p.pos)].v, 0), -3, 3);
    const lvB = clamp(pb.reduce((s, p) => s - g.lanes[POS.indexOf(p.pos)].v, 0), -3, 3);
    const evA = r1(avg(pa.map(p => p.evt || 0))), evB = r1(avg(pb.map(p => p.evt || 0)));
    const numA = (na - nb) * 2, numB = (nb - na) * 2;
    const da = R.d20(), db = R.d20();
    const ta = Math.max(1, ca + da + stA + evA + lvA + g.calc.vis.bA + Math.max(0, numA));
    const tb = Math.max(1, cb + db + stB + evB + lvB + g.calc.vis.bB + Math.max(0, numB));
    const [rA, rB] = ratio(ta, tb);
    const sk = { pa: pa.map(p => p.id), pb: pb.map(p => p.id), na, nb, ca, cb, da, db, lvA, lvB, evA, evB, numA: Math.max(0, numA), numB: Math.max(0, numB), ta, tb, nA: rA, nB: rB, grade: gradeOf(rA), win: rA > 5 ? 'A' : rA < 5 ? 'B' : null,
      loc: R.pick(['첫 번째 드래곤 둥지 앞', `${S.objects.grub} 둥지`, `${S.objects.herald} 둥지 앞`, '미드 강가', '상대 블루 정글', '바텀 1차 포탑 앞', '두 번째 드래곤 지역', '탑 강가 부쉬', '아군 레드 정글']) };
    g.skirm.push(sk);
    pa.forEach(p => g.perf[p.id] += sk.win === 'A' ? 2 : sk.win === 'B' ? -1 : 0);
    pb.forEach(p => g.perf[p.id] += sk.win === 'B' ? 2 : sk.win === 'A' ? -1 : 0);
  }
  const mA = r1(avg(g.skirm.map(s => s.nA))); const mB = r1(10 - mA);
  g.mid = { nA: mA, nB: mB, grade: gradeOf(Math.round(mA * 2) / 2), v: gval(Math.round(mA * 2) / 2) };
  if (mA >= 8 || mA <= 2) { g.endMid = true; g.winner = mA >= 8 ? 'A' : 'B'; }
  // 후반 한타
  if (!g.endMid) {
    const ca = scale20(avg(LA.map(p => (sA[p.id].phys + sA[p.id].tf) / 2))), cb = scale20(avg(LB.map(p => (sB[p.id].phys + sB[p.id].tf) / 2)));
    const evA = r1(avg(LA.map(p => p.evt || 0))), evB = r1(avg(LB.map(p => p.evt || 0)));
    let da = R.d20(), db = R.d20(); const rer = [];
    const base = (c, st, mb, ev, mv) => c + st + mb + ev + mv;
    const cpA = avg(LA.map(p => psOf(p.pos, g.draft.picks[p.id]))), cpB = avg(LB.map(p => psOf(p.pos, g.draft.picks[p.id])));
    const comp = clamp(Math.round((cpA - cpB) / 1.5), -2, 2);
    let ta = base(ca, stA, g.calc.men.bA, evA, g.mid.v) + da + Math.max(0, comp), tb = base(cb, stB, g.calc.men.bB, evB, -g.mid.v) + db + Math.max(0, -comp);
    while (ta === tb) { const xa = R.d20(), xb = R.d20(); rer.push([xa, xb]); ta += xa; tb += xb; }
    const [nA, nB] = ratio(Math.max(1, ta), Math.max(1, tb));
    g.late = { ca, cb, da, db, evA, evB, ta, tb, nA, nB, rer, compA: Math.max(0, comp), compB: Math.max(0, -comp), cpA: r1(cpA), cpB: r1(cpB), obj: R.pick([S.objects.baron, S.objects.elder, '드래곤 영혼', S.objects.baron]) };
    g.winner = ta > tb ? 'A' : 'B';
    const W = g.winner === 'A' ? LA : LB, Lz = g.winner === 'A' ? LB : LA;
    W.forEach(p => g.perf[p.id] += 2); Lz.forEach(p => g.perf[p.id] -= 1);
  }
  // 킬 스코어
  const marg = g.endMid ? 3 : clamp(Math.abs(g.late.nA - 5), 0.5, 4);
  const wk = R.int(10, 16) + Math.round(marg * 2), lk = Math.max(1, R.int(2, 11) - Math.round(marg));
  g.kills = g.winner === 'A' ? [wk, lk] : [lk, wk];
  g.time = g.endMid ? R.int(23, 28) : R.int(29, 41);
  distKda(g);
  return g;
}
function distKda(g) {
  g.kda = {};
  const dist = (ids, kills, deaths) => {
    const L = ids.map(id => S.players[id]);
    const w = L.map(p => Math.max(0.3, (p.pos === 'SUP' ? 0.3 : p.pos === 'JUNGLE' ? 0.9 : 1.2) + g.perf[p.id] * 0.15));
    const tw = w.reduce((a, b) => a + b, 0);
    const K = L.map((p, i) => Math.round(kills * w[i] / tw));
    const dw = L.map(p => Math.max(0.3, 1 - g.perf[p.id] * 0.1)); const td = dw.reduce((a, b) => a + b, 0);
    L.forEach((p, i) => g.kda[p.id] = [K[i], Math.round(deaths * dw[i] / td), Math.round(kills * (p.pos === 'SUP' ? 0.75 : 0.5) + R.int(-2, 2))].map(x => Math.max(0, x)));
  };
  dist(g.la, g.kills[0], g.kills[1]); dist(g.lb, g.kills[1], g.kills[0]);
}

function playSeries(aId, bId, bo, fx) {
  const A = S.teams[aId], B = S.teams[bId];
  const need = Math.ceil(bo / 2); let wa = 0, wb = 0; const games = []; const used = new Set();
  let blueA = R.chance(0.5);
  const preOvrA = teamOvr(A), preOvrB = teamOvr(B);
  while (wa < need && wb < need) {
    const g = playGame(A, B, { used, blueA });
    games.push(g); if (g.winner === 'A') wa++; else wb++;
    g.score = [wa, wb];
    blueA = g.winner === 'B'; // 패배팀이 블루 선택
  }
  const winner = wa > wb ? A : B, loser = winner === A ? B : A;
  // POM
  const wl = winner === A ? 'la' : 'lb';
  const tot = {}; games.forEach(g => (winner === A ? g.la : g.lb).forEach(id => tot[id] = (tot[id] || 0) + g.perf[id] + R.u()));
  const pom = Object.keys(tot).sort((x, y) => tot[y] - tot[x])[0];
  const res = { a: aId, b: bId, bo, wa, wb, games, winner: winner.id, loser: loser.id, pom, comp: fx.comp, fx, preOvrA, preOvrB };
  applySeries(res);
  return res;
}
function applySeries(res) {
  const W = S.teams[res.winner], L = S.teams[res.loser];
  W.streak = W.streak >= 0 ? W.streak + 1 : 1; L.streak = L.streak <= 0 ? L.streak - 1 : -1;
  const fx = res.fx;
  if (fx.kind === 'league') {
    const tab = S.leagues[fx.lg].tab[fx.stage];
    tab[res.winner].w++; tab[res.loser].l++;
    const sw = res.winner === res.a ? res.wa : res.wb, sl = res.winner === res.a ? res.wb : res.wa;
    tab[res.winner].sw += sw; tab[res.winner].sl += sl; tab[res.loser].sw += sl; tab[res.loser].sl += sw;
  }
  // 선수 기록
  const seen = new Set();
  res.games.forEach(g => g.la.concat(g.lb).forEach(id => {
    const p = S.players[id]; p.career.g++;
    const win = (g.winner === 'A' && g.la.includes(id)) || (g.winner === 'B' && g.lb.includes(id));
    if (win) p.career.w++;
    p.sp += 10 + (win ? 15 : 0);
    seen.add(id);
  }));
  seen.forEach(id => {
    const p = S.players[id]; const won = S.players[id].teamId === res.winner;
    p.career.starts++;
    p.form = clamp(r1(p.form * 0.7 + (won ? 0.6 : -0.6) + (id === res.pom ? 0.8 : 0)), -3, 3);
    p.evt = 0;
  });
  const pp = S.players[res.pom]; pp.career.pom++; pp.sp += 40; pp.fame = Math.min(10000, pp.fame + 60);
}

// =================== 훈련(행동턴) ===================
const ACT = {
  rank: { name: '솔로랭크 훈련', w: { lane: 3, phys: 3, skirm: 2, tf: 0.5, vis: 0.3, men: 0.2 }, tire: 0.35, hard: true },
  vod: { name: 'VOD 복기', w: { lane: 1.5, phys: 0, skirm: 0.5, tf: 2, vis: 3, men: 1 }, imp: 0.3 },
  scrim: { name: '스크림 집중', w: { lane: 0.5, phys: 1, skirm: 2.5, tf: 3, vis: 1, men: 0.5 }, mul: 1.05, tire: 0.5, imp: 0.5, hard: true },
  mental: { name: '멘탈 코칭', w: { lane: 0, phys: 0, skirm: 0, tf: 0.5, vis: 1, men: 3.5 }, mul: 0.8, cond: 1 },
  stream: { name: '개인 방송', w: { lane: 1.5, phys: 1, skirm: 1, tf: 0, vis: 0, men: 0.5 }, mul: 0.5, tire: 0.3, fame: [60, 200] },
  watch: { name: '팀 경기 관람 및 분석', w: { lane: 0.5, phys: 0, skirm: 1, tf: 2.5, vis: 2, men: 1.5 }, mul: 0.8, imp: 0.6 },
  study: { name: '타 리그 경기 분석', w: { lane: 1, phys: 0, skirm: 1, tf: 2, vis: 2, men: 1 }, mul: 0.7, imp: 0.3 },
  rest: { name: '휴식' }
};
function condMul(c) { return r2(0.55 + c * 0.09); }
function ageRate(a) { return a <= 18 ? 2.6 : a <= 22 ? 1.5 : a <= 25 ? 0.6 : 0.4; }
function ageW(a, k) {
  const body = k === 'phys' || k === 'skirm' || k === 'tf', exp = k === 'vis' || k === 'men';
  if (a <= 18) return body ? 1.6 : 1;
  if (a <= 22) return body ? 1.2 : 1;
  if (a <= 25) return exp ? 1.3 : 1;
  if (a <= 28) return body ? 0 : exp ? 1.6 : 1;
  return body ? 0 : exp ? 0.8 : 0.6;
}
function train(p, key, timing) {
  const out = { lines: [], key };
  const A = ACT[key];
  if (key === 'rest') {
    const g = R.int(2, 3);
    if (timing === 'pre') { const o = p.cond; p.cond = clamp(p.cond + g, 1, 10); out.lines.push(`컨디션 ${o} + ${p.cond - o} = ${p.cond}`); }
    else { p.condCarry += g; out.lines.push(`다음 일정 컨디션 보정 +${g}`); }
    if (R.chance(0.3)) { const o = p.st.men; p.st.men++; out.lines.push(`멘탈 ${o} + 1 = ${p.st.men}`); }
    return out;
  }
  const gap = potEff(p) - pureOvr(p);
  const gf = gap <= 0 ? 0 : clamp(gap / 150, 0.08, 1);
  const cm = condMul(p.cond);
  out.lines.push(`컨디션 ${p.cond} → 훈련 효율 ${Math.round(cm * 100)}%`);
  let total = ageRate(p.age) * gf * (A.mul || 1) * cm * (0.6 + R.u() * 0.8);
  if (p.traits.includes('wonderKid')) total *= 1.1;
  const pts = R.sround(total);
  const ch = {};
  for (let i = 0; i < pts; i++) { const k = R.wpick(SK, k => A.w[k] * ageW(p.age, k)); if (A.w[k] * ageW(p.age, k) > 0) ch[k] = (ch[k] || 0) + 1; }
  Object.keys(ch).forEach(k => { const o = p.st[k]; p.st[k] += ch[k]; out.lines.push(`${sn(k, p.pos)} ${o} + ${ch[k]} = ${p.st[k]}`); });
  if (!pts) out.lines.push(gap <= 0 ? '순수 훈련으로 올릴 수 있는 한계(잠재력)에 도달했습니다' : '이번엔 눈에 띄는 성장이 없었습니다');
  const condDelta = (d, why) => {
    if (timing === 'pre') { const o = p.cond; p.cond = clamp(p.cond + d, 1, 10); out.lines.push(`${why}: 컨디션 ${o} ${d >= 0 ? '+' : '-'} ${Math.abs(d)} = ${p.cond}`); }
    else { p.condCarry += d; out.lines.push(`${why}: 다음 일정 컨디션 ${d >= 0 ? '+' : ''}${d}`); }
  };
  const tire = (A.tire || 0) * (p.cond <= 3 ? 1.6 : 1);
  if (tire && R.chance(Math.min(0.9, tire))) condDelta(-1, '피로 누적');
  if (A.hard && p.cond <= 2 && R.chance(0.2)) { condDelta(-2, '무리한 훈련으로 손목 통증'); addNews('event', `${p.nick}, 무리한 훈련 후 손목 통증`, '컨디션이 바닥인 상태에서 강도 높은 훈련을 이어가다 탈이 났습니다.', { user: true }); }
  if (A.cond) condDelta(A.cond, '마음이 한결 가벼워짐');
  if (A.imp) { p.impress = r1(p.impress + A.imp); out.lines.push(`감코진 평가 +${A.imp}`); }
  if (A.fame) { const f = R.int(A.fame[0], A.fame[1]) + Math.round(p.fame * 0.01); p.fame += f; out.lines.push(`인지도 +${f}`); }
  if (key === 'rank') { p.fame += R.int(0, 6); }
  return out;
}

// =================== 연간 성장(NPC) ===================
function seasonGrowth(p, frac) {
  if (p.retired) return;
  const a = p.age, gap = potEff(p) - pureOvr(p), gf = gap <= 0 ? 0 : clamp(gap / 150, 0.08, 1);
  const rate = a <= 18 ? 35 : a <= 22 ? 15 : a <= 25 ? 6 : 0;
  if (!p.isUser) {
    const pts = R.sround(rate * gf * 6 * frac * (0.6 + R.u() * 0.8));
    for (let i = 0; i < pts; i++) { const k = R.wpick(SK, k => ageW(a, k) + 0.01); p.st[k]++; }
    if (a >= 26) { ['vis', 'men'].forEach(k => p.st[k] += R.sround(R.int(0, 4) * frac)); }
  }
  // 노화
  const slow = p.traits.includes('agelessKing') ? 0.5 : 1;
  const ch = [];
  if (a >= 26 && a <= 28 && p.career.starts < 5 && frac >= 0.5) {
    ['phys', 'skirm', 'tf'].forEach(k => { const d = R.sround(R.int(0, 2) * slow); if (d) { const o = p.st[k]; p.st[k] -= d; ch.push(`${sn(k, p.pos)} ${o} - ${d} = ${p.st[k]}`); } });
  }
  if (a >= 29) {
    ['phys', 'skirm', 'tf'].forEach(k => { if (R.chance(0.6 * frac)) { const d = R.sround(R.int(1, 4) * slow); if (d) { const o = p.st[k]; p.st[k] -= d; ch.push(`${sn(k, p.pos)} ${o} - ${d} = ${p.st[k]}`); } } });
    if (p.isUser && R.chance(0.4 * frac)) { const k = R.pick(['vis', 'men']); const o = p.st[k]; p.st[k] += 1; ch.push(`${sn(k, p.pos)} ${o} + 1 = ${p.st[k]}`); }
  }
  return ch;
}

// =================== 랜덤 이벤트 ===================
function grant(p, k, v, why, lines) { const o = (p.bn[k] || 0); p.bn[k] = o + v; const e = eff(p)[k]; lines.push(`${sn(k, p.pos)} ${e - v} ${v >= 0 ? '+' : '-'} ${Math.abs(v)} = ${e} (${why})`); }
function addCustomTeam(o) {
  const lg = S.leagues[o.league]; const lvl = Math.round(avg(lg.teams.map(t => teamOvr(S.teams[t]))));
  const t = newTeam({ id: 'MY', name: o.name, full: o.name, region: lg.region, tier: 2, color: o.color, custom: true });
  t.coaches.push(genCoach(lg.region, 2, '감독').id, genCoach(lg.region, 2, '코치').id);
  POS.forEach(pos => joinTeam(genPlayer(lg.region, pos, R.int(17, 21), lvl + R.int(-8, 4)), t));
  lg.teams.push(t.id); t.league = lg.id; setStarters(t); return t;
}
function orgPros(u) { const t = S.teams[u.teamId]; const ids = t.tier === 2 && t.parent ? S.teams[t.parent].roster : t.roster; return ids.map(i => S.players[i]).filter(p => !p.isUser && !p.retired); }
const USER_EVENTS = [
  { w: 3, good: true, run(u, L) {
    const pros = orgPros(u); const pro = pros.find(p => p.pos === u.pos) || R.pick(pros); if (!pro) return null;
    const k = R.pick(['lane', 'skirm', 'phys']); grant(u, k, 2, '듀오 경험', L);
    return { t: `${pro.nick} 선수와 솔랭 듀오`, b: `밤늦은 연습실, ${pro.nick}(${pro.name}) 선수가 먼저 듀오를 제안했습니다. 다섯 판 내내 한마디도 안 하다가 마지막 판이 끝나고 "${R.pick(['라인 관리 진짜 좋아졌다', '그 타이밍 점멸은 무조건 맞아', '너 이대로만 하면 금방 올라와'])}"라는 말 한마디를 남겼습니다.` };
  } },
  { w: 2, good: true, cond: u => ovr(u) > 300, run(u, L) { u.fame += 120; grant(u, 'phys', 1, '챌린저 1위', L); L.push(`인지도 +120`);
    return { t: '솔로랭크 한국 서버 1위 달성', b: `새벽 4시, 랭킹 페이지 맨 위에 ${u.nick}의 이름이 올라갔습니다. 커뮤니티에 "이 닉네임 누구냐"는 글이 하나둘 올라오기 시작합니다.` }; } },
  { w: 2, good: false, run(u, L) { u.condCarry -= 2; L.push('다음 일정 컨디션 -2');
    return { t: '감기 몸살', b: '환절기 감기가 숙소를 한 바퀴 돌았습니다. 목이 잠기고 머리가 무겁습니다.' }; } },
  { w: 2, good: true, run(u, L) { const f = R.int(80, 250); u.fame += f; L.push(`인지도 +${f}`);
    return { t: '하이라이트 클립 화제', b: `솔랭 방송 중 나온 ${R.pick(['1대3 역전 장면', '벽 너머 점멸 플래시', '바론 스틸', '0.1초 차 회피'])}이 쇼츠로 퍼지며 조회수 30만을 넘겼습니다.` }; } },
  { w: 2, good: false, run(u, L) {
    const m = eff(u).men;
    if (m > 380) { grant(u, 'men', 1, '악플을 넘김', L); return { t: '악성 댓글', b: '"2군 벤치가 뭘 안다고" 같은 댓글이 달렸지만, 대수롭지 않게 넘겼습니다. 오히려 오기가 생깁니다.' }; }
    u.condCarry -= 1; L.push('다음 일정 컨디션 -1'); return { t: '악성 댓글', b: '방송 클립에 날 선 댓글이 쏟아졌습니다. 잠들기 전까지 댓글창을 몇 번이고 새로고침했습니다.' };
  } },
  { w: 3, good: true, run(u, L) {
    const s = eff(u); const k = SK.slice().sort((a, b) => s[a] - s[b])[0]; grant(u, k, 3, '코치 1:1 피드백', L);
    const c = S.coaches[S.teams[u.teamId].coaches[R.int(0, 1)] || S.teams[u.teamId].coaches[0]];
    return { t: `${c.nick} ${c.role}의 1:1 피드백`, b: `${c.nick} ${c.role}이 VOD를 함께 돌려보며 ${sn(k, u.pos)} 쪽 습관을 하나씩 짚어줬습니다. "이것만 고치면 한 단계 올라간다."` };
  } },
  { w: 2, good: true, run(u, L) { u.condCarry += 2; L.push('다음 일정 컨디션 +2');
    return { t: '가족 면회', b: '주말에 가족이 숙소 근처로 찾아왔습니다. 오랜만에 집밥 같은 저녁을 먹고 기운을 차렸습니다.' }; } },
  { w: 1, good: false, run(u, L) { u.condCarry -= 3; L.push('다음 일정 컨디션 -3');
    return { t: '손목 통증', b: '훈련량이 늘면서 손목이 시큰거립니다. 팀 닥터는 며칠간 무리하지 말라고 했습니다.' }; } },
  { w: 2, good: true, cond: u => S.teams[u.teamId].tier === 2, run(u, L) { grant(u, 'tf', 2, '1군 스크림', L); u.impress = r1(u.impress + 1.5); L.push('감코진 평가 +1.5');
    return { t: '1군 스크림 땜빵 출전', b: `1군 선수 한 명이 몸살로 빠지면서 ${u.nick}이(가) 스크림 3세트에 들어갔습니다. 낯선 속도에 정신없었지만, 마지막 세트 한타에서는 제 몫을 해냈습니다.` }; } },
  { w: 2, good: true, cond: u => orgPros(u).some(p => p.age >= 26), run(u, L) {
    const v = R.pick(orgPros(u).filter(p => p.age >= 26)); const amt = v.age >= 29 ? 3 : 2; grant(u, 'men', amt, '베테랑 멘토링', L);
    return { t: `${v.nick}의 조언`, b: `${v.nick}(${v.age}세) 선수가 식당에서 옆자리에 앉았습니다. "지는 날이 더 많을 거야. 그날 뭘 하는지가 중요해." 짧은 대화였지만 오래 남았습니다.` };
  } },
  { w: 1, good: false, cond: u => u.age <= 18, run(u, L) { u.condCarry -= 1; grant(u, 'men', 1, '학업 병행', L); L.push('다음 일정 컨디션 -1');
    return { t: '기말고사 기간', b: '학교 시험과 훈련을 같이 챙기느라 잠이 부족합니다. 그래도 둘 다 놓지 않으려고 버팁니다.' }; } },
  { w: 1, good: true, run(u, L) { u.fame += 150; L.push('인지도 +150');
    return { t: '스트리머의 극찬', b: `유명 스트리머가 솔랭에서 ${u.nick}을(를) 만나고 방송에서 "이 친구 1군 언제 올라와요?"라며 극찬했습니다.` }; } },
  { w: 1, good: true, cond: u => u.fame > 500, run(u, L) { u.condCarry += 1; u.evt = (u.evt || 0) + 1; L.push('다음 일정 컨디션 +1, 다음 경기 이벤트 가점 +1');
    return { t: '팬레터 도착', b: '사무국으로 손편지 몇 통이 도착했습니다. "항상 응원해요"라는 말이 이렇게 힘이 될 줄 몰랐습니다.' }; } }
];
function userEvents() {
  const u = S.user, out = [];
  const pBase = 0.42 + S.luck;
  if (!R.chance(pBase)) return out;
  const good = R.chance(clamp(0.55 + S.luck + Math.min(0.15, u.sal / 60), 0, 0.9));
  const pool = USER_EVENTS.filter(e => e.good === good && (!e.cond || e.cond(u)));
  const ev = R.wpick(pool, e => e.w); const L = [];
  const r = ev.run(u, L); if (!r) return out;
  out.push({ t: r.t, b: r.b, lines: L, good });
  addNews('event', r.t, r.b, { lines: L, user: true });
  S.luck = Math.max(0, r2(S.luck * 0.85));
  return out;
}
function worldEvents(results) {
  // 업셋·연승 뉴스
  results.forEach(r => {
    const W = S.teams[r.winner], L = S.teams[r.loser];
    const wo = r.winner === r.a ? r.preOvrA : r.preOvrB, lo = r.winner === r.a ? r.preOvrB : r.preOvrA;
    if (W.tier === 1 && lo - wo >= 12) addNews('news', `[업셋] ${W.name}, ${L.name} 잡았다`, `${r.comp}에서 ${W.name}이(가) 전력 열세를 뒤집고 ${L.name}을(를) ${Math.max(r.wa, r.wb)}:${Math.min(r.wa, r.wb)}로 꺾었습니다. POM은 ${S.players[r.pom].nick}.`);
    if (W.tier === 1 && W.streak >= 5 && W.streak % 1 === 0 && R.chance(0.5)) addNews('news', `${W.name} ${W.streak}연승 질주`, `${W.name}의 기세가 무섭습니다. 최근 ${W.streak}경기를 모두 잡아냈습니다.`);
    if (W.tier === 1 && L.streak <= -4 && R.chance(0.4)) addNews('community', `${L.name} ${-L.streak}연패… 팬들 "변화가 필요하다"`, `커뮤니티에서는 로스터 변경과 서브 기용을 요구하는 목소리가 커지고 있습니다.`);
  });
  // SNS 설전
  if (R.chance(0.12)) {
    const cand = Object.values(S.players).filter(p => !p.retired && p.pers[2] < 35 && p.pers[3] > 70 && S.teams[p.teamId] && S.teams[p.teamId].tier === 1);
    if (cand.length) { const p = R.pick(cand); addNews('sns', `${p.nick}, SNS에 도발성 게시물`, `${p.nick}(${S.teams[p.teamId].name})이(가) 경기 후 "${R.pick(['라인전은 원래 이렇게 하는 거임', '다음 상대 누구? 상관없음', '오늘도 쉬웠다'])}"라는 글을 올렸습니다. 상대 팬들의 반응이 뜨겁습니다.`); p.fame += 50; }
  }
  // 부상
  if (R.chance(0.08)) {
    const cand = Object.values(S.players).filter(p => !p.retired && !p.isUser && p.fame > 3000);
    if (cand.length) { const p = R.pick(cand); p.condCarry -= 3; addNews('news', `${p.nick} 컨디션 난조`, `${S.teams[p.teamId].name} 측은 ${p.nick}이(가) ${R.pick(['손목 통증', '허리 통증', '장염', '몸살'])}으로 훈련량을 줄였다고 밝혔습니다.`); }
  }
  // 패치
  if (R.chance(0.1)) {
    const pos = R.pick(POS); const old = S.meta[pos].slice();
    const up = R.pick(Object.keys(S.ps[pos]).filter(c => !old.includes(c))), down = R.pick(old);
    S.ps[pos][up] = r2(S.ps[pos][up] + R.int(3, 6)); S.ps[pos][down] = r2(S.ps[pos][down] - R.int(3, 5)); refreshOP(pos);
    S.patch.minor++;
    addNews('patch', `${patchStr()} 패치: ${PK[pos]} 메타 변화`, `${up} 상향, ${down} 하향. 현재 ${PK[pos]} OP 챔피언: ${S.meta[pos].join(', ')}.`);
  }
}

// =================== 스토브리그(연간 처리) ===================
function stoveYearly() {
  const notes = [];
  const all = Object.values(S.players).filter(p => !p.retired);
  // 1. 나이 + 성장/노화
  all.forEach(p => { p.age++; const ch = seasonGrowth(p, 0.6); if (p.isUser && ch && ch.length) notes.push({ t: '나이에 따른 변화', lines: ch }); });
  // 2. 은퇴
  let retired = 0;
  all.filter(p => !p.isUser).forEach(p => {
    const t = S.teams[p.teamId];
    let pr = p.age >= 32 ? 0.45 : p.age >= 29 ? 0.22 : p.age >= 26 ? 0.07 : 0.015;
    pr += clamp((p.spPrev - p.sp) / 4000, 0, 0.2);
    const starter = t && Object.values(t.st).includes(p.id);
    if (p.age >= 19 && p.age <= 26 && starter && t.tier === 1) pr *= 0.2;
    if (p.age >= 19 && p.career.starts === 0) pr = Math.max(pr, 0.55);
    if (!p.teamId) pr += 0.35;
    if (p.traits.includes('agelessKing')) pr *= 0.4;
    if (R.chance(pr)) {
      p.retired = true; retired++;
      if (t) { t.roster = t.roster.filter(x => x !== p.id); POS.forEach(k => { if (t.st[k] === p.id) delete t.st[k]; }); }
      if (p.fame > 2500) addNews('news', `${p.nick} 은퇴 선언`, `${p.nick}(${p.name}, ${p.age}세)이(가) 선수 생활을 마무리합니다. 통산 ${p.career.g}경기 ${p.career.w}승, POM ${p.career.pom}회.`);
    }
  });
  // 3. 계약 만료 → FA
  S.fa = S.fa.filter(id => S.players[id] && !S.players[id].retired);
  Object.values(S.players).filter(p => !p.retired && !p.isUser && p.ce < S.season && p.teamId).forEach(p => {
    const t = S.teams[p.teamId]; const starter = Object.values(t.st).includes(p.id);
    if (R.chance(starter ? (t.tier === 1 ? 0.88 : 0.75) : p.age <= 18 ? 0.7 : 0.4)) { p.ce = S.season + R.int(0, 1); p.sal = r1(Math.max(p.sal, p.sal * (1 + R.u() * 0.3))); }
    else { t.roster = t.roster.filter(x => x !== p.id); POS.forEach(k => { if (t.st[k] === p.id) delete t.st[k]; }); p.teamId = null; S.fa.push(p.id); }
  });
  // 4. 신규 유망주
  const nNew = Math.max(8, Math.round(retired * 1.5));
  const acad = Object.values(S.teams).filter(t => t.tier === 2);
  for (let i = 0; i < nNew; i++) { const t = R.wpick(acad, t => 1 / Math.max(1, t.roster.length - 4)); const p = genProspect(t.region, R.pick(POS), R.int(15, 17)); joinTeam(p, t); }
  acad.forEach(t => {
    while (t.roster.length > 8) {
      const cut = t.roster.map(id => S.players[id]).filter(p => !p.isUser && !Object.values(t.st).includes(p.id)).sort((a, b) => (evalP(a, false) + (a.age <= 16 ? 30 : 0)) - (evalP(b, false) + (b.age <= 16 ? 30 : 0)))[0];
      if (!cut) break; t.roster = t.roster.filter(x => x !== cut.id); cut.teamId = null; S.fa.push(cut.id);
    }
  });
  Object.keys(S.players).forEach(id => { const p = S.players[id]; if (p.retired && !p.isUser && p.fame < 2500) delete S.players[id]; });
  if (nNew) addNews('news', `신인 ${nNew}명, 각 팀 2군 합류`, '스토브리그를 맞아 각 팀이 15~17세 유망주를 영입했습니다. 내년 이 중 누가 살아남을지 지켜볼 일입니다.');
  // 5. FA 영입(1군 우선) 및 빈자리 채우기
  const teams = Object.values(S.teams).sort((a, b) => a.tier - b.tier);
  teams.forEach(t => POS.forEach(pos => {
    const cur = S.players[t.st[pos]] && !S.players[t.st[pos]].retired ? S.players[t.st[pos]] : null;
    const fas = S.fa.map(id => S.players[id]).filter(p => p.pos === pos && eligible(p, t)).sort((a, b) => ovr(b) - ovr(a));
    const has = t.roster.map(id => S.players[id]).filter(p => p.pos === pos && eligible(p, t));
    const fitOk = fas.length && (t.tier === 2 || ovr(fas[0]) >= teamOvr(t) - 25);
    if (fitOk && (!has.length || (cur && ovr(fas[0]) > ovr(cur) + 6 && t.tier === 1))) {
      const f = fas[0]; const from = f.lastTeam ? S.teams[f.lastTeam] : null;
      joinTeam(f, t); f.ce = S.season + R.int(0, 1); S.fa = S.fa.filter(x => x !== f.id);
      if (t.tier === 1 && f.fame > 1500) addNews('news', `[오피셜] ${f.nick}, ${t.name} 합류`, `FA ${f.nick}(${f.age}세, ${PK[f.pos]})이(가) ${t.name}과(와) 계약했습니다.`);
    }
    if (!t.roster.map(id => S.players[id]).some(p => p.pos === pos && eligible(p, t))) {
      const g = t.tier === 1 ? genPlayer(t.region, pos, R.int(18, 23), teamOvr(t) - 8) : genPlayer(t.region, pos, R.int(17, 20), 365 + R.int(-8, 8)); joinTeam(g, t);
    }
  }));
  S.fa.forEach(id => S.players[id].lastTeam = null);
  // 6. 팀 내 1·2군 이동
  Object.values(S.teams).filter(t => t.tier === 1 && t.child).forEach(orgReview);
  Object.values(S.teams).forEach(setStarters);
  // 7. 기록 리셋
  Object.values(S.players).forEach(p => { p.spPrev = p.sp; p.sp = 0; });
  // 8. 메타
  rollMeta(false);
  addNews('patch', `${S.season} 시즌 메타 프리뷰`, POS.map(p => `${PK[p]}: ${S.meta[p].join(', ')}`).join(' / '));
  return notes;
}
function orgReview(t1) {
  const t2 = S.teams[t1.child]; const moves = [];
  POS.forEach(pos => {
    const s1 = S.players[t1.st[pos]];
    const c2 = t2.roster.map(id => S.players[id]).filter(p => p.pos === pos && p.age >= 17 && !p.retired).sort((a, b) => evalP(b) - evalP(a))[0];
    if (!s1 || !c2) return;
    if (evalP(c2) > evalP(s1) + 4) {
      joinTeam(c2, t1); joinTeam(s1, t2); t1.st[pos] = c2.id;
      moves.push([c2, s1]);
      if (!c2.isUser && !s1.isUser && (c2.fame > 1500 || s1.fame > 3000)) addNews('news', `${t1.name}, ${PK[pos]} 교체`, `${t1.name}이(가) 2군 ${c2.nick}을(를) 1군으로 올리고 ${s1.nick}을(를) 2군으로 내렸습니다.`);
    }
  });
  setStarters(t1); setStarters(t2);
  return moves;
}
