'use strict';
// =================== 저장·설정 ===================
const SAVE_KEY = 'lolcareer_sim_v1', UIS_KEY = 'lolcareer_ui_v1';
const UIS = Object.assign({ scale: 'auto', tts: false, speed: 1, autoNext: true }, (() => { try { return JSON.parse(localStorage.getItem(UIS_KEY)) || {}; } catch (e) { return {}; } })());
function saveUIS() { try { localStorage.setItem(UIS_KEY, JSON.stringify(UIS)); } catch (e) { } }
function save() { if (UI.batch) return; try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { toast('브라우저 저장 공간에 저장하지 못했습니다. "파일로 저장"을 써 주세요.'); } }
function loadSave() { try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function restore(obj) {
  S = obj; usedNicks.clear(); Object.values(S.players).forEach(p => usedNicks.add(p.nick.toLowerCase())); S.user = S.players[S.userId];
  if (!S.ps || !Object.keys(S.ps).length) { S.ps = {}; rollMeta(true); }
  if (!S.patch) S.patch = Object.assign({}, PATCH_START);
  if (!S.routine) S.routine = { rank: 40, vod: 25, scrim: 10, mental: 5, stream: 0, rest: 20, autoRest: true };
  delete S.objects.atk;
}
function exportSave() {
  const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `롤커리어_${S.user.nick}_${S.date}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function importSave(file) {
  const fr = new FileReader();
  fr.onload = () => { try { restore(JSON.parse(fr.result)); save(); UI.screen = 'game'; render(); toast('저장 파일을 불러왔습니다.'); } catch (e) { toast('파일을 읽지 못했습니다. 이 게임에서 저장한 .json 파일인지 확인해 주세요.'); } };
  fr.readAsText(file);
}
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3200); }
function applyScale() {
  const w = window.innerWidth;
  const s = UIS.scale === 'auto' ? (w < 760 ? 1 : clamp(r2(w / 1440), 0.85, 1.4)) : +UIS.scale;
  document.body.style.zoom = s;
}
window.addEventListener('resize', () => { if (UIS.scale === 'auto') applyScale(); });

const UI = { screen: 'title', tab: 'news', lgTab: null, plFilter: 'LCK', q: '', modal: null, create: null, batch: false };
const $ = s => document.querySelector(s);

// =================== 새 게임 ===================
function newGame(c) {
  buildWorld();
  const team = c.custom ? addCustomTeam(c.custom) : S.teams[c.team];
  const u = newPlayer({ nick: c.nick, name: c.name, age: 15, pos: c.pos, st: Object.assign({}, c.st), pot: 450, isUser: true, region: team.region, fame: 0, sal: 0.2, ce: 2027, pers: [50, 50, 50, 0], impress: 0 });
  joinTeam(u, team); S.userId = u.id; S.user = u; u.ovrLast = ovr(u);
  setStarters(team);
  const fx = (comp) => ({ comp, kind: 'pre' });
  const rollAll = () => Object.values(S.players).forEach(p => { p.cond = clamp(Math.round(R.norm(5.5, 1.8)), 1, 10); p.condStat = p.cond !== 5 ? R.pick(SK) : null; });
  rollAll();
  const q1 = playSeries('DK', 'BLG', 5, fx('2026 월즈 8강')); const q2 = playSeries('KC', 'T1', 5, fx('2026 월즈 8강'));
  rollAll(); const s1 = playSeries('GEN', 'IG', 5, fx('2026 월즈 4강')); const s2 = playSeries(q1.winner, q2.winner, 5, fx('2026 월즈 4강'));
  rollAll(); const f = playSeries(s1.winner, s2.winner, 5, fx('2026 월즈 결승'));
  const sc = r => `${S.teams[r.winner].name} ${Math.max(r.wa, r.wb)}:${Math.min(r.wa, r.wb)} ${S.teams[r.loser].name}`;
  addNews('news', `[시뮬레이션] 2026 월즈 우승: ${S.teams[f.winner].name}`, `실제 결과가 나오기 전 남은 경기를 이 시뮬레이터가 직접 굴렸습니다. 8강 ${sc(q1)}, ${sc(q2)} / 4강 ${sc(s1)}, ${sc(s2)} / 결승 ${sc(f)}. 결승 POM: ${S.players[f.pom].nick}.`);
  lineup(S.teams[f.winner]).forEach(p => { if (!p.traits.includes('worldsChamp') && p.traits.length < 5) p.traits.push('worldsChamp'); p.career.titles.push('2026 월즈 우승'); });
  Object.values(S.players).forEach(p => { p.sp = 0; p.spPrev = 0; p.form = 0; });
  addNews('patch', `${patchStr()} 패치 적용 중`, `아타칸과 무력행사가 빠진 2026 시즌 협곡입니다. 포지션별 OP: ` + POS.map(p => `${PK[p]} ${S.meta[p].slice(0, 3).join('·')}`).join(' / '));
  addNews('system', `${u.nick}, ${team.name} 입단`, `${team.name}이(가) 15세 유망주 ${u.name}(${u.nick}, ${PK[u.pos]})과(와) 1년 계약을 맺었습니다. 연봉 0.2억 원. 당분간은 2군 벤치에서 시작합니다.`);
  buildSeason();
  startEntry();
  UI.screen = 'game'; UI.lgTab = team.league; save(); render();
}

// =================== 진행 ===================
function rollConditions() {
  Object.values(S.players).forEach(p => {
    if (p.retired) return;
    let c = Math.round(R.norm(5.5, 1.8)) + (p.condCarry || 0);
    if (p.isUser && R.chance(Math.min(0.3, p.sal / 100))) c += 1;
    p.cond = clamp(c, 1, 10); p.condCarry = 0; p.condStat = p.cond !== 5 ? R.pick(SK) : null;
  });
}
function userTeam() { return S.user.teamId ? S.teams[S.user.teamId] : null; }
function startEntry() {
  const e = S.entries[S.ei]; S.date = e.date;
  const fl = { step: 'pre', logs: [], notes: [], report: null, uf: -1, joker: null };
  if (e.kind === 'stove' && e.first && !S.firstSeason) {
    fl.notes = stoveYearly();
    const u = S.user;
    if (u.ce < S.season || !u.teamId) { fl.step = 'contract'; fl.offers = buildOffers(); }
    u.ovrLast = ovr(u);
  }
  if (e.kind === 'msi' && e.round === 0) Object.values(S.players).forEach(p => seasonGrowth(p, 0.4));
  if (e.kind === 'league' && (e.round === 0 || e.round === 4)) {
    Object.values(S.teams).filter(t => t.tier === 1 && t.child).forEach(t => {
      orgReview(t).forEach(([up, down]) => {
        if (up.isUser) { addNews('system', `${up.nick}, 1군 콜업!`, `${t.name} 감코진이 ${up.nick}을(를) 1군 ${PK[up.pos]} 주전으로 올렸습니다. ${down.nick}은(는) 2군으로 내려갑니다.`); if (up.age === 17) giveTrait(up, 'wonderKid'); fl.notes.push({ t: '1군 콜업', lines: [`${t.name} 1군 주전 ${PK[up.pos]}`] }); }
        if (down.isUser) { addNews('system', `${down.nick}, 2군 강등`, `${t.name}이(가) ${up.nick}을(를) 1군으로 올리면서 ${down.nick}은(는) 2군으로 내려갑니다.`); fl.notes.push({ t: '2군 강등', lines: ['감코진 평가에서 밀렸습니다'] }); }
      });
    });
    Object.values(S.teams).forEach(setStarters);
    if (userTeam()) fl.report = coachReport();
  } else if (e.kind === 'league' && e.round % 3 === 0) Object.values(S.teams).forEach(setStarters);
  rollConditions();
  if (fl.step !== 'contract') prepFixtures(fl, e);
  S.flow = fl; save();
}
function prepFixtures(fl, e) {
  fl.fixtures = fixturesFor(e);
  const t = userTeam(); fl.uf = t ? fl.fixtures.findIndex(f => f.a === t.id || f.b === t.id) : -1;
  if (fl.uf >= 0 && t.st[S.user.pos] !== S.user.id && eligible(S.user, t) && t.streak <= -3 && R.chance(0.35)) {
    fl.joker = t.st[S.user.pos]; t.st[S.user.pos] = S.user.id;
    addNews('system', `${t.name}, ${S.user.nick} 깜짝 기용`, `${-t.streak}연패에 빠진 ${t.name}이(가) 분위기 반전을 위해 벤치의 ${S.user.nick}을(를) 선발로 내보냅니다.`);
    fl.notes.push({ t: '조커 기용!', lines: [`연패 탈출 카드로 ${S.user.nick}이(가) 선발 출전합니다`] });
  }
  fl.userStarts = fl.uf >= 0 && t.st[S.user.pos] === S.user.id;
}
function coachReport() {
  const u = S.user, t = userTeam(); const c = S.coaches[t.coaches[0]];
  const s = eff(u); const sorted = SK.slice().sort((a, b) => s[b] - s[a]);
  const inc = S.players[t.st[u.pos]];
  const starter = inc && inc.id === u.id;
  const gap = inc && !starter ? Math.round(evalP(inc, false) - evalP(u, false)) : 0;
  let verdict;
  if (starter) verdict = `지금은 ${u.nick}이(가) 우리 ${PK[u.pos]} 주전이다. 폼 유지가 관건.`;
  else if (!eligible(u, t)) verdict = `실력과 별개로 ${u.age}세라 아직 1군 규정 나이(17세)에 못 미친다.`;
  else verdict = gap > 30 ? `주전 ${inc.nick}과(와) 차이가 아직 크다. 조급해하지 말고 기본기부터.` : gap > 10 ? `${inc.nick}을(를) 따라잡는 중이다. 이 속도면 시즌 안에 기회가 올 수 있다.` : `${inc.nick}과(와) 거의 차이가 없다. 연습 때 보여주면 바로 쓴다.`;
  return { coach: `${c.nick} ${c.role}`, strong: sn(sorted[0], u.pos), weak: sn(sorted[5], u.pos), verdict };
}
function actionsFor(fl) {
  const e = S.entries[S.ei]; const hasMatch = fl.uf >= 0;
  if (fl.step === 'pre') return ['rank', 'vod', 'scrim', 'mental', 'stream', 'rest'];
  return hasMatch ? ['rank', 'watch', 'scrim', 'mental', 'rest'] : ['rank', 'study', 'scrim', 'mental', 'stream', 'rest'];
}
function actCore(key) {
  const fl = S.flow, u = S.user, timing = fl.step === 'pre' ? 'pre' : 'day';
  const r = train(u, key, timing);
  fl.logs.push({ when: timing === 'pre' ? (fl.uf >= 0 ? '경기 전' : '오전') : (fl.uf >= 0 ? '경기 당일' : '오후'), name: ACT[key].name, lines: r.lines });
  if (timing === 'pre') {
    if (fl.uf >= 0 && fl.userStarts) fl.step = 'ready';
    else if (S.entries[S.ei].kind === 'stove' || !userTeam()) finishCore();
    else fl.step = 'day';
  } else {
    if (fl.uf >= 0) { playUserSeries(); fl.step = 'result'; }
    else finishCore();
  }
}
function doAction(key) { actCore(key); save(); render(); }
function playUserSeries() {
  const fl = S.flow; const f = fl.fixtures[fl.uf];
  const res = playSeries(f.a, f.b, f.bo, f);
  fl.series = res; fl.vis = buildVisuals(res); fl.results = fl.results || {}; fl.results[fl.uf] = res;
  fl.mv = { stage: 'preview', gi: 0 };
  fl.interviewDone = !(res.pom === S.user.id);
  if (res.pom === S.user.id) { S.user.fame += 150; giveTrait(S.user, 'firstPom'); if (S.user.career.pom >= 5) giveTrait(S.user, 'ace'); }
}
function startMatch() { playUserSeries(); S.flow.step = 'match'; save(); render(); }

function finishCore() {
  const fl = S.flow, e = S.entries[S.ei];
  stopLive();
  fl.results = fl.results || {};
  (fl.fixtures || []).forEach((f, i) => { if (!fl.results[i]) fl.results[i] = playSeries(f.a, f.b, f.bo, f); });
  const res = (fl.fixtures || []).map((f, i) => fl.results[i]);
  afterFixtures(e, res);
  worldEvents(res);
  fl.events = userTeam() ? userEvents() : [];
  if (fl.joker) { const t = userTeam(); if (t) t.st[S.user.pos] = fl.joker; fl.joker = null; }
  if (S.user.fame >= 5000) giveTrait(S.user, 'fanFav');
  fl.digest = res.filter(r => S.teams[r.a].tier === 1 || r.a === S.user.teamId || r.b === S.user.teamId).map(r => ({ a: r.a, b: r.b, wa: r.wa, wb: r.wb, comp: r.comp, pom: r.pom, mine: r.a === S.user.teamId || r.b === S.user.teamId }));
  if (fl.series) fl.series = { a: fl.series.a, b: fl.series.b, wa: fl.series.wa, wb: fl.series.wb, comp: fl.series.comp, pom: fl.series.pom, brief: seriesBrief(fl.series) };
  fl.vis = null; fl.results = null; fl.step = 'post';
  if (e.kind === 'end') seasonSummary('시즌 결산');
  else if (e.kind === 'lfinal') seasonSummary(`${S.season} 컵 대회 종료`);
  else if (e.kind === 'msi' && e.round === 2) seasonSummary(`${S.season} MSI 종료`);
  else if (e.kind === 'playoffs' && e.round === 1) seasonSummary(`${S.season} 정규시즌·플레이오프 종료`);
  else if (e.kind === 'worlds' && e.round === 7) seasonSummary(`${S.season} 월즈 종료`);
}
function finishEntry() { finishCore(); save(); render(); }
function nextCore() { S.ei++; if (S.ei >= S.entries.length) { S.season++; S.firstSeason = false; buildSeason(); } startEntry(); }
function nextEntry() { nextCore(); render(); window.scrollTo({ top: 0 }); }

// ---------- 자동 진행 ----------
function pickRoutine(fl) {
  const allowed = actionsFor(fl); const u = S.user; const rt = S.routine;
  if (rt.autoRest && u.cond <= 3) return 'rest';
  const w = k => k === 'watch' || k === 'study' ? (rt.vod || 0) : (rt[k] || 0);
  const pool = allowed.filter(k => w(k) > 0);
  return pool.length ? R.wpick(pool, w) : 'rank';
}
function autoRun(mode) {
  UI.batch = true; const startMonth = S.date.slice(0, 7); const log = []; let guard = 0;
  const startOvr = ovr(S.user);
  try {
    while (guard++ < 400) {
      const fl = S.flow;
      if (UI.modal || fl.step === 'contract' || fl.step === 'ready' || fl.step === 'match') break;
      if (fl.step === 'pre' || fl.step === 'day') { actCore(pickRoutine(fl)); continue; }
      if (fl.step === 'result') { finishCore(); continue; }
      if (fl.step === 'post') {
        log.push({ date: S.date, label: entryLabel(S.entries[S.ei]), acts: fl.logs.map(l => l.name), gains: fl.logs.flatMap(l => l.lines.filter(x => / \+ \d+ = /.test(x) && !/컨디션|인지도|평가/.test(x))), ev: (fl.events || []).map(e => e.t), mine: fl.series ? `${S.teams[fl.series.a].name} ${fl.series.wa}:${fl.series.wb} ${S.teams[fl.series.b].name}` : null });
        if (mode === 'one') break;
        nextCore();
        if (mode === 'month' && S.date.slice(0, 7) !== startMonth) break;
        continue;
      }
      break;
    }
  } finally { UI.batch = false; }
  if (S.flow.step !== 'post' || mode !== 'one') S.flow.autoLog = { log, from: startOvr, to: ovr(S.user) };
  save(); render(); window.scrollTo({ top: 0 });
}

function giveTrait(p, k) { if (p.traits.includes(k) || p.traits.length >= 5) return; p.traits.push(k); addNews('system', `특성 획득: ${TRAITS[k].name}`, `${p.nick}이(가) 특성 '${TRAITS[k].name}'을(를) 얻었습니다. (${TRAITS[k].desc})`); }
function title(teamId, label, sp) {
  const t = S.teams[teamId];
  lineup(t).forEach(p => { p.career.titles.push(`${S.season} ${label}`); p.sp += sp; p.fame = Math.min(10000, p.fame + Math.round(sp / 5)); });
  if (lineup(t).includes(S.user)) {
    if (/우승/.test(label) && !/MSI|월즈/.test(label)) giveTrait(S.user, 'leagueChamp');
    if (/MSI 우승/.test(label)) giveTrait(S.user, 'msiChamp');
    if (/월즈 우승/.test(label)) giveTrait(S.user, 'worldsChampU');
  }
}
function afterFixtures(e, res) {
  if (e.kind === 'lfinal') res.forEach(r => { const lg = S.leagues[r.fx.lg]; title(r.winner, `${lg.name} ${stageName(lg, 'cup')} 우승`, 800); if (lg.tier === 1) addNews('news', `${S.teams[r.winner].name}, ${lg.name} ${stageName(lg, 'cup')} 우승`, `결승에서 ${S.teams[r.loser].name}을(를) ${Math.max(r.wa, r.wb)}:${Math.min(r.wa, r.wb)}로 꺾었습니다. POM ${S.players[r.pom].nick}.`); });
  if (e.kind === 'playoffs') {
    res.forEach(r => {
      const lg = S.leagues[r.fx.lg];
      if (e.round === 0) { lg.po.sfW.push(r.winner); lg.po.sfL.push(r.loser); }
      else {
        lg.final = [r.winner, r.loser, ...lg.po.sfL.sort((a, b) => lg.po.seeds.indexOf(a) - lg.po.seeds.indexOf(b))];
        title(r.winner, `${lg.name} 우승`, 1500); lineup(S.teams[r.loser]).forEach(p => p.sp += 500);
        if (lg.tier === 1) addNews('news', `🏆 ${S.teams[r.winner].name}, ${S.season} ${lg.name} 우승`, `결승에서 ${S.teams[r.loser].name}을(를) ${Math.max(r.wa, r.wb)}:${Math.min(r.wa, r.wb)}로 제압했습니다. 결승 POM ${S.players[r.pom].nick}.`);
      }
    });
  }
  if (e.kind === 'msi') {
    const I = S.intl.msi; const wins = res.map(r => r.winner);
    if (e.round < 2) { I.rounds[e.round + 1] = []; for (let i = 0; i < wins.length; i += 2) I.rounds[e.round + 1].push([wins[i], wins[i + 1]]); }
    else { const r = res[0]; title(r.winner, 'MSI 우승', 2500); lineup(S.teams[r.loser]).forEach(p => p.sp += 1200); I.champ = r.winner; addNews('news', `🏆 ${S.teams[r.winner].name}, ${S.season} MSI 우승`, `결승 상대는 ${S.teams[r.loser].name}. 스코어 ${Math.max(r.wa, r.wb)}:${Math.min(r.wa, r.wb)}.`); }
    if (e.round === 0) I.teams.forEach(t => lineup(S.teams[t]).forEach(p => p.sp += 300));
  }
  if (e.kind === 'worlds') {
    const W = S.intl.worlds;
    if (e.round === 0) W.teams.forEach(t => lineup(S.teams[t]).forEach(p => p.sp += 400));
    if (e.round < 5) {
      res.forEach(r => { W.rec[r.winner].w++; W.rec[r.loser].l++; });
      if (e.round === 4) {
        const adv = W.teams.filter(t => W.rec[t].w >= 3).sort((a, b) => W.rec[a].l - W.rec[b].l);
        W.adv = adv; W.ko[5] = [[adv[0], adv[7]], [adv[3], adv[4]], [adv[1], adv[6]], [adv[2], adv[5]]];
        addNews('news', `월즈 8강 확정`, adv.map(t => `${S.teams[t].name}(${W.rec[t].w}-${W.rec[t].l})`).join(', '));
      }
    } else if (e.round < 7) {
      const wins = res.map(r => r.winner); W.ko[e.round + 1] = []; for (let i = 0; i < wins.length; i += 2) W.ko[e.round + 1].push([wins[i], wins[i + 1]]);
      res.forEach(r => lineup(S.teams[r.loser]).forEach(p => p.sp += e.round === 5 ? 800 : 1200));
    } else { const r = res[0]; title(r.winner, '월즈 우승', 4000); lineup(S.teams[r.loser]).forEach(p => p.sp += 2000); W.champ = r.winner; addNews('news', `🏆 ${S.teams[r.winner].name}, ${S.season} 월드 챔피언십 우승`, `결승에서 ${S.teams[r.loser].name}을(를) ${Math.max(r.wa, r.wb)}:${Math.min(r.wa, r.wb)}로 꺾고 소환사의 컵을 들어 올렸습니다. 결승 POM ${S.players[r.pom].nick}.`); }
  }
  Object.values(S.players).forEach(p => { if (p.sp > 10000) p.sp = 10000; });
}
function seasonSummary(label) {
  const u = S.user;
  S.hist.push({ date: S.date, label, ovr: ovr(u), fame: u.fame, team: u.teamId ? S.teams[u.teamId].name : '무소속' });
  UI.modal = { type: 'summary', label };
}

// =================== 계약 ===================
function salaryFor(u, tier) { return r1(Math.max(0.2, 0.2 + Math.max(0, ovr(u) - 370) * (tier === 1 ? 0.06 : 0.02) + u.fame / 2500)); }
function buildOffers() {
  const u = S.user, cur = userTeam(), offers = [];
  const growth = ovr(u) - (u.ovrLast || ovr(u));
  if (cur) {
    const inc = S.players[cur.st[u.pos]];
    const ok = (u.age <= 18 && growth >= 15) || !inc || inc.id === u.id || evalP(u, false) >= evalP(inc, false) - 15 || R.chance(0.3);
    if (ok) offers.push({ team: cur.id, sal: salaryFor(u, cur.tier), years: R.int(1, 2), note: u.age <= 18 ? `지난 1년 OVR +${growth} 성장 평가` : '현 소속팀 재계약' });
  }
  const teams = R.shuffle(Object.values(S.teams).filter(t => t.id !== (cur && cur.id)));
  for (const t of teams) {
    if (offers.length >= 4) break;
    const inc = S.players[t.st[u.pos]]; if (!inc) continue;
    if (t.tier === 1 && u.age >= 17 && evalP(u, false) > evalP(inc, false) - 2) offers.push({ team: t.id, sal: salaryFor(u, 1), years: R.int(1, 2), note: '1군 주전 경쟁 제안' });
    else if (t.tier === 2 && evalP(u, false) > evalP(inc, false) - 4 && R.chance(0.5)) offers.push({ team: t.id, sal: salaryFor(u, 2), years: 1, note: '2군 주전 경쟁 제안' });
  }
  return offers;
}
function acceptOffer(i) {
  const fl = S.flow, u = S.user;
  if (i < 0) {
    if (u.teamId) { const t = userTeam(); t.roster = t.roster.filter(x => x !== u.id); POS.forEach(k => { if (t.st[k] === u.id) delete t.st[k]; }); }
    u.teamId = null; u.ce = S.season; addNews('system', `${u.nick}, 무소속으로 개인 연습`, '올 시즌은 소속 없이 솔로랭크로 실력을 증명하기로 했습니다.');
  } else {
    const o = fl.offers[i]; const t = S.teams[o.team]; const prev = userTeam();
    joinTeam(u, t); u.sal = o.sal; u.ce = S.season + o.years - 1; setStarters(t); if (prev && prev !== t) setStarters(prev);
    addNews('system', prev && prev.id === t.id ? `${u.nick}, ${t.name}과(와) 재계약` : `[오피셜] ${u.nick}, ${t.name} 이적`, `계약 기간 ${o.years}년, 연봉 ${o.sal}억 원.`);
    UI.lgTab = t.league;
  }
  fl.step = 'pre'; prepFixtures(fl, S.entries[S.ei]); save(); render();
}
function retireUser() {
  if (!confirm('정말 은퇴할까요? 커리어가 여기서 끝납니다.')) return;
  S.user.retired = true; addNews('system', `${S.user.nick} 은퇴`, `${S.user.age}세, 통산 ${S.user.career.g}경기 ${S.user.career.w}승. 선수 생활을 마무리합니다.`);
  UI.modal = { type: 'summary', label: '커리어 종료', end: true }; save(); render();
}

// =================== 경기 시각 자료 ===================
function statCells(p, real) {
  const b = eff(p);
  return SK.map(k => { const d = real[k] - b[k]; return `<td class="${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${b[k]}<small>(${real[k]})</small></td>`; }).join('') + `<td class="ov">${ovrOf(b)}<small>(${ovrOf(real)})</small></td>`;
}
function previewBox(res) {
  const g0 = res.games[0];
  const side = (tid, ids) => {
    const t = S.teams[tid]; const cs = t.coaches.map(c => S.coaches[c]);
    return `<div class="pv-team" style="--tc:${t.color}"><h4>${esc(t.name)}</h4><div class="staff">감독 ${esc(cs[0].nick)}${cs[1] ? ` / 코치 ${esc(cs[1].nick)}` : ''}</div>
    <table class="st"><thead><tr><th></th><th></th><th>라인전<br>(동선)</th><th>피지컬</th><th>소규모<br>교전</th><th>한타</th><th>시야</th><th>멘탈</th><th>OVR</th></tr></thead><tbody>
    ${ids.map(id => { const p = S.players[id]; return `<tr class="${p.isUser ? 'me' : ''}"><th>${p.pos}</th><td class="nm"><a class="pl-link" data-pid="${p.id}">${esc(p.nick)}</a>${p.cond !== 5 ? `<i class="cd ${p.cond > 5 ? 'up' : 'dn'}" title="컨디션 ${p.cond}">컨${p.cond}</i>` : ''}</td>${statCells(p, g0.stats[id])}</tr>`; }).join('')}
    </tbody></table></div>`;
  };
  const oa = avg(g0.la.map(id => ovr(S.players[id]))), ob = avg(g0.lb.map(id => ovr(S.players[id])));
  const pa = Math.round(100 / (1 + Math.exp(-(oa - ob) / 6)));
  res.fan = [pa, 100 - pa];
  return `<div class="box"><div class="bt">매치 프리뷰 <span>${esc(res.comp)} · Bo${res.bo} · ${patchStr()} 패치</span></div>${side(res.a, g0.la)}${side(res.b, g0.lb)}
  <div class="fan">팬 승부 예측 <b>${esc(S.teams[res.a].name)} ${pa}%</b> : <b>${esc(S.teams[res.b].name)} ${100 - pa}%</b> → ${esc(S.teams[pa >= 50 ? res.a : res.b].name)} 우세</div>
  <p class="hint">괄호 안은 컨디션이 반영된 실질 수치입니다.</p></div>`;
}
function bar(nA) { return `<div class="rbar"><i style="width:${nA * 10}%;background:var(--blue)"></i><i style="width:${100 - nA * 10}%;background:var(--red)"></i></div>`; }
function verdict(nA, A, B, suffix) { if (nA === 5) return '균형'; return `${esc((nA > 5 ? A : B).name)} ${gradeOf(nA)}${suffix || '우세'}`; }
function calcBoxes(res, g) {
  const A = S.teams[res.a], B = S.teams[res.b], c = g.calc;
  const tacLine = (t, x, base, d, tot) => `[${esc(t.name)} 감코진 (전략 ${r1(x.str)} + 용병술 ${r1(x.tac)} + 사기진작 ${r1(x.mor)}) / 150 = ${r2(base)}] + [d20 🎲${d}] = <b>${r2(tot)}</b>`;
  const meet = `<div class="calc"><div>${tacLine(A, c.tac.tA, c.tac.baseA, c.tac.dA, c.tac.totA)}<br>: ${tacLine(B, c.tac.tB, c.tac.baseB, c.tac.dB, c.tac.totB)}<br>→ <b class="gold">${g.tacWin ? esc((g.tacWin === 'A' ? A : B).name) + ' 전술 우세 (초반 라인전 +2)' : '전술 동률'}</b></div>
    <div>시야 [${esc(A.name)} ${c.vis.visA}/50 = ${r1(c.vis.visA / 50)}] : [${esc(B.name)} ${c.vis.visB}/50 = ${r1(c.vis.visB / 50)}] → <b class="gold">${c.vis.bA ? esc(A.name) + ' 시야 우세 +' + c.vis.bA : c.vis.bB ? esc(B.name) + ' 시야 우세 +' + c.vis.bB : '시야 동률'}</b></div>
    <div>멘탈 [${esc(A.name)} ${c.men.menA}/50 = ${r1(c.men.menA / 50)}] : [${esc(B.name)} ${c.men.menB}/50 = ${r1(c.men.menB / 50)}] → <b class="gold">${c.men.bA ? esc(A.name) + ' 멘탈 우세 +' + c.men.bA : c.men.bB ? esc(B.name) + ' 멘탈 우세 +' + c.men.bB : '멘탈 동률'}</b></div>
    <div>연승 가점 ${esc(A.name)} +${c.streak.A} / ${esc(B.name)} +${c.streak.B}</div></div>`;
  const lanes = g.lanes.map(l => { const pa = S.players[l.a], pb = S.players[l.b];
    return `<div class="lane"><div class="lt"><b>${l.pos}</b> : ${esc(pa.nick)} vs ${esc(pb.nick)}, <span class="num">${l.nA} : ${l.nB}</span> → ${verdict(l.nA, A, B)}</div>${bar(l.nA)}
    <div class="calc sm">${esc(pa.nick)} [(${sn('lane', l.pos)}+피지컬)/2 = ${r1(l.rawA)} → ${l.ca}] + d20 🎲${l.da} + 연승 ${c.streak.A} + 전술 ${g.tacWin === 'A' ? 2 : 0} + 시야 ${c.vis.bA} + 이벤트 ${l.evA} + 챔피언 상성·OP ${l.muA || 0} (${esc(g.draft.picks[l.a])} PS ${(l.psA || 50).toFixed(1)}) = <b>${l.ta}</b>
    <br>${esc(pb.nick)} [${r1(l.rawB)} → ${l.cb}] + d20 🎲${l.db} + 연승 ${c.streak.B} + 전술 ${g.tacWin === 'B' ? 2 : 0} + 시야 ${c.vis.bB} + 이벤트 ${l.evB} + 챔피언 상성·OP ${l.muB || 0} (${esc(g.draft.picks[l.b])} PS ${(l.psB || 50).toFixed(1)}) = <b>${l.tb}</b></div></div>`; }).join('');
  const sk = g.skirm.map((s, i) => `<div class="lane"><div class="lt"><b>교전 ${i + 1}</b> · ${s.na} vs ${s.nb} · ${esc(s.loc)} <span class="num">${s.nA} : ${s.nB}</span> → ${verdict(s.nA, A, B)}</div>${bar(s.nA)}
    <div class="calc sm">${esc(A.name)} [→ ${s.ca}] + d20 🎲${s.da} + 연승 ${c.streak.A} + 이벤트 ${s.evA} + 라인전 ${s.lvA} + 시야 ${c.vis.bA} + 수적 우위 ${s.numA} = <b>${s.ta}</b><br>${esc(B.name)} [→ ${s.cb}] + d20 🎲${s.db} + 연승 ${c.streak.B} + 이벤트 ${s.evB} + 라인전 ${s.lvB} + 시야 ${c.vis.bB} + 수적 우위 ${s.numB} = <b>${s.tb}</b></div></div>`).join('')
    + `<div class="final">${g.endMid ? `${g.mid.nA} : ${g.mid.nB} → ${esc((g.winner === 'A' ? A : B).name)} 승리 (중반 격차로 종료)` : `${g.mid.nA} : ${g.mid.nB} → ${verdict(Math.round(g.mid.nA * 2) / 2, A, B, ' 팀 체급 우세')}`}</div>`;
  const L = g.late;
  const late = L ? `<div class="lane"><div class="lt"><b>후반 한타</b> · ${esc(L.obj)} <span class="num">${L.nA} : ${L.nB}</span> → ${esc((g.winner === 'A' ? A : B).name)} 승리</div>${bar(L.nA)}
    <div class="calc sm">${esc(A.name)} [(피지컬+한타) → ${L.ca}] + d20 🎲${L.da} + 연승 ${c.streak.A} + 멘탈 ${c.men.bA} + 이벤트 ${L.evA} + 중반 ${g.mid.v} + 조합 OP ${L.compA || 0} (평균 PS ${L.cpA || '-'}) = <b>${L.ta - L.rer.reduce((s, x) => s + x[0], 0)}</b>
    <br>${esc(B.name)} [→ ${L.cb}] + d20 🎲${L.db} + 연승 ${c.streak.B} + 멘탈 ${c.men.bB} + 이벤트 ${L.evB} + 중반 ${-g.mid.v} + 조합 OP ${L.compB || 0} (평균 PS ${L.cpB || '-'}) = <b>${L.tb - L.rer.reduce((s, x) => s + x[1], 0)}</b>
    ${L.rer.length ? `<br>동점 → 재굴림 ${L.rer.map(x => `🎲${x[0]} : 🎲${x[1]}`).join(', ')} → 최종 ${L.ta} : ${L.tb}` : ''}</div></div>` : '';
  return `<details class="calcwrap"><summary>판정 데이터 보기 (계산식·주사위)</summary><h5>경기전 미팅</h5>${meet}<h5>초반 라인전</h5>${lanes}<h5>중반 교전</h5>${sk}${late ? '<h5>후반 한타</h5>' + late : ''}</details>`;
}
function buildVisuals(res) {
  const A = S.teams[res.a], B = S.teams[res.b];
  const k = crew();
  const v = { crew: k, games: [] };
  v.preview = previewBox(res);
  v.previewTalk = `<div class="crew">캐스터 ${k.c.name} · 해설 ${k.a1.name}, ${k.a2.name}</div>` + previewCommentary(res, { crew: k, fan: res.fan });
  res.games.forEach((g, gi) => {
    const live = buildLive(res, g, k); // 킬·KDA를 타임라인 기준으로 맞춤
    const last = gi === res.games.length - 1;
    const sb = ids => ids.map(id => { const p = S.players[id]; const kd = g.kda[id]; return `<tr class="${p.isUser ? 'me' : ''}"><th>${p.pos}</th><td><a class="pl-link" data-pid="${p.id}">${esc(p.nick)}</a></td><td>${esc(g.draft.picks[id])}</td><td class="num">${kd[0]}/${kd[1]}/${kd[2]}</td></tr>`; }).join('');
    v.games.push({
      meet: meetingTalk(A, g, 'A') + meetingTalk(B, g, 'B'),
      draftTalk: draftCommentary(res, g, k),
      live,
      review: `<div class="box result"><div class="bt">${gi + 1}세트 결과 <span>${g.time}분 · 킬 ${g.kills[0]} : ${g.kills[1]}</span></div>
        <div class="score"><b style="color:${A.color}">${esc(A.name)}</b><span class="num">${g.score[0]} : ${g.score[1]}</span><b style="color:${B.color}">${esc(B.name)}</b></div>
        <div class="draft2"><table class="sb">${sb(g.la)}</table><table class="sb">${sb(g.lb)}</table></div></div>` + reviewCommentary(res, g, gi, k, last) + calcBoxes(res, g)
    });
  });
  const p = S.players[res.pom]; const qs = interviewQuestions(res);
  if (p.isUser) v.pom = { user: true, qs };
  else {
    const iv = R.pick(INTERVIEWERS); const ans = qs.map((q, i) => npcAnswer(p, q, i, res));
    const rr = { sc: clamp(speech(p) + (p.pers[2] >= 75 ? 10 : 0), 20, 95), arrogant: p.pers[2] < 35, humble: p.pers[2] >= 75 };
    const re = interviewReaction(p, rr, false);
    v.pom = { user: false, html: `<div class="pom"><div class="pomh">POM <b>${esc(p.nick)}</b><span>${esc(S.teams[p.teamId].name)} · ${PK[p.pos]}</span></div>${qs.map((q, i) => line(iv, q) + line(p.nick, esc(ans[i]))).join('')}<div class="art"><h5>${esc(re.title)}</h5><p>${esc(re.body)}</p></div>${community(re.posts)}</div>` };
  }
  return v;
}
function seriesBrief(res) {
  return res.games.map((g, gi) => {
    const W = S.teams[g.winner === 'A' ? res.a : res.b];
    const big = g.endMid ? g.skirm[g.skirm.length - 1] : null;
    const key = g.endMid ? strip(skirmText(g, big, res)).split('. ')[0] : (g.late ? `${g.late.obj} 한타에서 승부` : '');
    return { gi, w: W.name, time: g.time, kills: g.kills, key };
  });
}
function submitInterview() {
  const fl = S.flow; const res = fl.series;
  const ans = [...document.querySelectorAll('.iv-a')].map(t => t.value.trim());
  if (ans.some(a => !a)) { toast('두 질문 모두 답을 적어 주세요.'); return; }
  const r = scoreInterview(ans, res); const u = S.user;
  S.interviews.push(ans.join(' ')); if (S.interviews.length > 30) S.interviews.shift();
  S.luck = r2(Math.min(0.25, S.luck + r.sc / 1000));
  u.impress = r1(u.impress + (r.sc - 50) / 25);
  const fg = Math.round(r.sc * 2 + (r.arrogant ? 120 : 0)); u.fame += fg;
  const re = interviewReaction(u, r, true);
  addNews('news', re.title, re.body, { user: true });
  const iv = R.pick(INTERVIEWERS);
  fl.vis.pom = { user: false, html: `<div class="pom"><div class="pomh">POM <b>${esc(u.nick)}</b><span>${esc(S.teams[u.teamId].name)} · ${PK[u.pos]}</span></div>
    ${fl.vis.pom.qs.map((q, i) => line(iv, q) + line(u.nick, esc(ans[i]), 'me')).join('')}
    <div class="calc">인터뷰 점수 <b class="gold">${r.sc}점</b> = ${r.lines.join(', ')}<br>효과: 긍정 이벤트 추가 확률 +${r1(r.sc / 10)}%p · 인지도 +${fg} · 감코진 평가 ${r.sc >= 50 ? '+' : ''}${r1((r.sc - 50) / 25)}</div>
    <div class="art"><h5>${esc(re.title)}</h5><p>${esc(re.body)}</p></div>${community(re.posts)}</div>` };
  fl.interviewDone = true; save(); render();
}

// ---------- 경기 뷰어 단계 ----------
function mvGo(stage, gi) { const fl = S.flow; clearTimeout(LV.dTimer); clearTimeout(LV.nTimer); stopLive(); fl.mv = { stage, gi: gi == null ? fl.mv.gi : gi }; save(); render(); window.scrollTo({ top: 0 }); }
function matchView() {
  const fl = S.flow, v = fl.vis, res = fl.series, mv = fl.mv; const gi = mv.gi;
  const head = `<div class="fx"><span>${esc(res.comp)} · Bo${res.bo}${fl.step === 'result' ? ' · 다시보기' : ''}</span><b style="color:${S.teams[res.a].color}">${esc(S.teams[res.a].name)}</b><i>${mv.stage === 'preview' ? 'vs' : `${countWins(res, gi, mv.stage)}`}</i><b style="color:${S.teams[res.b].color}">${esc(S.teams[res.b].name)}</b></div>`;
  if (mv.stage === 'preview') return head + `<section class="sec">${v.preview}${v.previewTalk}<div class="ctrl"><button class="btn gold" onclick="mvGo('draft',0)">1세트 밴픽 시작</button></div></section>`;
  const G = v.games[gi];
  if (mv.stage === 'draft') return head + `<section class="sec"><h3>${gi + 1}세트 · 선수단 경기전 미팅</h3>${G.meet}${draftHtml(res, gi)}<div id="d-talk" hidden>${G.draftTalk}</div><div class="ctrl"><button class="btn ghost" onclick="mvGo('live')">밴픽 건너뛰기</button></div></section>`;
  if (mv.stage === 'live') return head + `<section class="sec">${liveHtml(res, gi)}</section>`;
  if (mv.stage === 'review') {
    const last = gi === v.games.length - 1;
    return head + `<section class="sec"><h3>${gi + 1}세트 경기 결과 리뷰 및 해설</h3>${G.review}
      <div class="ctrl">${last ? `<button class="btn gold" onclick="mvGo('pom')">POM 선정 및 인터뷰</button>` : `<button class="btn gold" onclick="mvGo('draft',${gi + 1})">${gi + 2}세트로 <small id="auto-cd"></small></button>`}
      <label class="chk"><input type="checkbox" ${UIS.autoNext ? 'checked' : ''} onchange="UIS.autoNext=this.checked;saveUIS();if(!this.checked)clearTimeout(LV.nTimer)"> 다음 세트 자동 시작</label></div></section>`;
  }
  if (mv.stage === 'pom') {
    const P = v.pom; const replay = fl.step === 'result';
    return head + `<section class="sec"><h3>POM 선정 및 인터뷰</h3>${P.user ? interviewForm(P) : P.html}
      ${fl.interviewDone || replay ? `<div class="ctrl"><button class="btn gold" onclick="${replay ? 'S.flow.mv={stage:\'done\',gi:0};render()' : 'finishEntry()'}">${replay ? '다시보기 끝내기' : '경기 마치고 다음 진행'}</button></div>` : ''}</section>`;
  }
  return '';
}
function countWins(res, gi, stage) { const upto = stage === 'review' ? gi + 1 : gi; let a = 0, b = 0; res.games.slice(0, upto).forEach(g => g.winner === 'A' ? a++ : b++); return `${a} : ${b}`; }
function mountStage() {
  const fl = S.flow; if (!fl || !fl.mv || !fl.vis || !(fl.step === 'match' || fl.step === 'result')) return;
  const mv = fl.mv, res = fl.series;
  if (mv.stage === 'draft' && document.querySelector('.draftui')) runDraft(res, mv.gi, () => { const t = document.getElementById('d-talk'); if (t) t.hidden = false; LV.nTimer = setTimeout(() => { if (S.flow.mv.stage === 'draft') mvGo('live'); }, 2600 / Math.max(1, UIS.speed)); });
  if (mv.stage === 'live' && document.getElementById('lv-cv')) startLive(fl.vis.games[mv.gi].live, res, mv.gi, () => mvGo('review'));
  if (mv.stage === 'review' && UIS.autoNext && mv.gi < fl.vis.games.length - 1) {
    let n = 6; const cd = () => { const el = document.getElementById('auto-cd'); if (!el || S.flow.mv.stage !== 'review') return; el.textContent = `${n}초 후 자동`; if (n-- <= 0) mvGo('draft', mv.gi + 1); else LV.nTimer = setTimeout(cd, 1000); }; cd();
  }
}
function interviewForm(p) {
  const u = S.user;
  return `<div class="pom"><div class="pomh">POM <b>${esc(u.nick)}</b><span>당신이 오늘의 POM입니다</span></div>
    ${p.qs.map(q => `${line(INTERVIEWERS[0], q)}<textarea class="iv-a" rows="3" placeholder="답변을 직접 적어 주세요"></textarea>`).join('')}
    <p class="hint">구체적인 장면·팀원·상대를 언급하면 점수가 오릅니다. 너무 정석적이거나 지난번과 비슷하면 깎입니다.</p>
    <button class="btn gold" onclick="submitInterview()">인터뷰 마치기</button></div>`;
}

// =================== 렌더 ===================
function render() {
  if (UI.batch) return;
  const app = $('#app');
  if (UI.screen === 'game' && LV.raf && document.getElementById('lv-cv') && S.flow.mv && S.flow.mv.stage === 'live') { // 실시간 경기 중엔 옆 패널만 갱신
    const side = document.querySelector('.side'); if (side) side.innerHTML = sideHtml();
    const m = document.querySelector('.modal'); if (m) m.remove(); if (UI.modal) app.insertAdjacentHTML('beforeend', modalHtml());
    return;
  }
  clearTimeout(LV.dTimer); clearTimeout(LV.nTimer); stopLive();
  if (UI.screen === 'title') app.innerHTML = titleScreen();
  else if (UI.screen === 'create') app.innerHTML = createScreen();
  else app.innerHTML = gameScreen();
  if (UI.screen === 'create') bindCreate();
  if (UI.modal) app.insertAdjacentHTML('beforeend', modalHtml());
  if (UI.screen === 'game') mountStage();
  applyScale();
}
document.addEventListener('click', e => { const a = e.target.closest('[data-pid]'); if (a) { e.preventDefault(); UI.modal = { type: 'player', id: a.dataset.pid }; const m = document.querySelector('.modal'); if (m) m.remove(); $('#app').insertAdjacentHTML('beforeend', modalHtml()); } });
function closeModal() { UI.modal = null; const m = document.querySelector('.modal'); if (m) m.remove(); }
function titleScreen() {
  const has = !!loadSave();
  return `<main class="title"><div class="tcard">
    <div class="tdate">2026/12/01</div>
    <h1>프로게이머<br>커리어</h1>
    <p class="tsub">열다섯 살, 2군 벤치에서 시작합니다. 2026 월즈 로스터 · ${PATCH_START.major}.${PATCH_START.minor} 패치 기준 · 모든 주사위는 공개됩니다.</p>
    <div class="tbtn">${has ? `<button class="btn gold" onclick="continueGame()">이어하기</button>` : ''}
    <button class="btn" onclick="UI.screen='create';render()">새 커리어 시작</button>
    <label class="btn ghost">저장 파일 불러오기<input type="file" accept=".json" hidden onchange="importSave(this.files[0])"></label></div>
    ${installHtml()}
  </div></main>`;
}
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; if (UI.screen === 'title') render(); });
window.addEventListener('appinstalled', () => { installEvt = null; toast('앱으로 설치했습니다. 홈 화면에서 실행하세요.'); if (UI.screen === 'title') render(); });
function isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone; }
function installHtml() {
  if (isStandalone()) return '';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (installEvt) return `<div class="install"><button class="btn gold" onclick="installEvt.prompt();installEvt.userChoice.then(()=>{installEvt=null;render()})">앱으로 설치</button><span>설치하면 홈 화면에서 바로 열리고 인터넷 없이도 할 수 있습니다.</span></div>`;
  if (ios) return `<div class="install"><span>아이폰은 Safari 아래쪽 <b>공유</b> 버튼 → <b>홈 화면에 추가</b>를 누르면 앱으로 설치됩니다.</span></div>`;
  return `<div class="install"><span>앱으로 설치하려면 브라우저 메뉴(⋮)에서 <b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 누르세요.</span></div>`;
}
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => { }));
function continueGame() { const s = loadSave(); if (!s) return; restore(s); UI.screen = 'game'; UI.lgTab = userTeam() ? userTeam().league : 'LCKCL'; render(); }

// ---------- 선수 생성 ----------
function randomStats() {
  const w = SK.map(() => 0.4 + R.u() * 1.2); const tw = w.reduce((a, b) => a + b, 0);
  const st = {}; SK.forEach((k, i) => st[k] = clamp(Math.round(1500 * w[i] / tw), 1, 350));
  let diff = 1500 - SK.reduce((a, k) => a + st[k], 0);
  while (diff !== 0) { const k = R.pick(SK); const nv = clamp(st[k] + Math.sign(diff), 1, 350); if (nv !== st[k]) { st[k] = nv; diff -= Math.sign(diff); } }
  return st;
}
function createScreen() {
  const c = UI.create || (UI.create = { name: '', nick: '', pos: 'MID', st: { lane: 250, phys: 250, skirm: 250, tf: 250, vis: 250, men: 250 }, team: 'T1A', mode: 'pick', cname: '', ccolor: '#3EA6A0', cleague: 'LCKCL' });
  const tot = SK.reduce((a, k) => a + c.st[k], 0);
  const groups = { LCKCL: 'LCK CL (한국)', LDL: 'LDL (중국)', ERL: 'EMEA 마스터즈 (유럽)', NACL: 'NACL (북미)' };
  const tl = lg => ACADEMIES.filter(a => S0_league(a[2]) === lg).map(a => {
    const cs = a[4]; const dev = cs ? Math.round(avg(cs.map(x => x[2]))) : null;
    return `<button class="tm ${c.team === a[0] ? 'on' : ''}" data-team="${a[0]}"><b>${esc(a[1])}</b><span>${cs ? `감독 ${esc(cs[0][0])} · 육성 ${dev} → 잠재력 ${450 + Math.round(dev / 10)}` : '생성 감코진 · 잠재력 465 안팎'}</span></button>`; }).join('');
  return `<main class="create"><header class="ch"><button class="btn ghost sm" onclick="UI.screen='title';render()">처음으로</button><h2>선수 등록</h2><span class="cdate">2026/12/01 · 15세</span></header>
  <section class="cgrid">
    <div class="panel">
      <h3>프로필</h3>
      <label class="fld">선수 이름<input id="c-name" maxlength="12" value="${esc(c.name)}" placeholder="예) 김하늘"></label>
      <label class="fld">인게임 닉네임<input id="c-nick" maxlength="16" value="${esc(c.nick)}" placeholder="예) Haneul"></label>
      <div class="fld">포지션<div class="seg">${POS.map(p => `<button data-pos="${p}" class="${c.pos === p ? 'on' : ''}">${p}</button>`).join('')}</div></div>
      <h3>능력치 <span class="tot ${tot > 1500 ? 'bad' : ''}">${tot} / 1500</span><button class="btn sm" id="c-rand">랜덤 배분</button></h3>
      <p class="hint">각 1~350, 합계 1500 이하. 2군 주전은 OVR 370~390, 1군 주전은 420~460 정도입니다.</p>
      ${SK.map(k => `<div class="sl"><span>${k === 'lane' && c.pos === 'JUNGLE' ? '동선' : SN[k]}</span><input type="range" min="1" max="350" value="${c.st[k]}" data-k="${k}"><input type="number" min="1" max="350" value="${c.st[k]}" data-kn="${k}">
        <div class="stp"><button data-add="${k}" data-v="-10">-10</button><button data-add="${k}" data-v="10">+10</button><button data-add="${k}" data-v="100">+100</button><button data-add="${k}" data-v="max">MAX</button></div></div>`).join('')}
    </div>
    <div class="panel">
      <h3>시작 팀 (2군)</h3>
      <div class="seg two"><button data-mode="pick" class="${c.mode === 'pick' ? 'on' : ''}">기존 2군 팀</button><button data-mode="custom" class="${c.mode === 'custom' ? 'on' : ''}">내 팀 만들기</button></div>
      ${c.mode === 'pick' ? Object.keys(groups).map(lg => `<h4 class="lgh">${groups[lg]}</h4><div class="tms">${tl(lg)}</div>`).join('') : `
        <label class="fld">팀 이름<input id="c-cname" maxlength="18" value="${esc(c.cname)}" placeholder="예) 새벽 게이밍"></label>
        <label class="fld">팀 색<input id="c-ccolor" type="color" value="${c.ccolor}"></label>
        <div class="fld">참가 리그<div class="seg">${Object.keys(groups).map(lg => `<button data-cl="${lg}" class="${c.cleague === lg ? 'on' : ''}">${groups[lg].split(' (')[0]}</button>`).join('')}</div></div>
        <p class="hint">새 팀은 리그 평균 전력의 생성 선수 5명과 생성 감코진으로 시작합니다. 모기업 1군이 없어서 1군 진출은 다른 팀의 영입 제안으로만 가능합니다.</p>`}
    </div>
  </section>
  <footer class="cf"><span id="c-err" class="err"></span><button class="btn gold" id="c-go">입단하기</button></footer></main>`;
}
function S0_league(parentId) { const r = REAL_TEAMS.find(t => t.id === parentId).region; return { KR: 'LCKCL', CN: 'LDL', EU: 'ERL', NA: 'NACL' }[r]; }
function bindCreate() {
  const c = UI.create;
  const keep = () => { c.name = $('#c-name').value; c.nick = $('#c-nick').value; const cn = $('#c-cname'); if (cn) c.cname = cn.value; const cc = $('#c-ccolor'); if (cc) c.ccolor = cc.value; };
  const rer = () => { const y = window.scrollY; keep(); render(); window.scrollTo(0, y); };
  const sum = () => SK.reduce((a, k) => a + c.st[k], 0);
  document.querySelectorAll('[data-pos]').forEach(b => b.onclick = () => { c.pos = b.dataset.pos; rer(); });
  document.querySelectorAll('[data-team]').forEach(b => b.onclick = () => { c.team = b.dataset.team; rer(); });
  document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { c.mode = b.dataset.mode; rer(); });
  document.querySelectorAll('[data-cl]').forEach(b => b.onclick = () => { c.cleague = b.dataset.cl; rer(); });
  document.querySelectorAll('[data-add]').forEach(b => b.onclick = () => { const k = b.dataset.add; const left = 1500 - sum(); const v = b.dataset.v === 'max' ? Math.max(0, left) : +b.dataset.v; c.st[k] = clamp(c.st[k] + (v > 0 ? Math.min(v, Math.max(0, left)) : v), 1, 350); rer(); });
  $('#c-rand').onclick = () => { c.st = randomStats(); rer(); };
  document.querySelectorAll('[data-k]').forEach(i => i.oninput = () => { c.st[i.dataset.k] = +i.value; document.querySelector(`[data-kn="${i.dataset.k}"]`).value = i.value; updTot(); });
  document.querySelectorAll('[data-kn]').forEach(i => i.onchange = () => { c.st[i.dataset.kn] = clamp(Math.round(+i.value || 1), 1, 350); rer(); });
  const updTot = () => { const t = sum(); const el = document.querySelector('.tot'); el.textContent = `${t} / 1500`; el.classList.toggle('bad', t > 1500); };
  $('#c-go').onclick = () => {
    keep(); const tot = sum(); const err = $('#c-err');
    if (!c.name.trim()) return err.textContent = '선수 이름을 적어 주세요.';
    if (!/^[A-Za-z0-9가-힣_]{2,16}$/.test(c.nick.trim())) return err.textContent = '닉네임은 2~16자, 한글·영문·숫자·밑줄만 쓸 수 있어요.';
    if (REAL_TEAMS.some(t => (t.players || []).some(p => p[0].toLowerCase() === c.nick.trim().toLowerCase()))) return err.textContent = '이미 있는 프로 선수 닉네임입니다. 다른 닉네임을 써 주세요.';
    if (tot > 1500) return err.textContent = `능력치 합계가 ${tot}입니다. 1500 이하로 줄여 주세요.`;
    if (c.mode === 'custom' && c.cname.trim().length < 2) return err.textContent = '팀 이름을 2자 이상 적어 주세요.';
    newGame({ name: c.name.trim(), nick: c.nick.trim(), pos: c.pos, st: c.st, team: c.team, custom: c.mode === 'custom' ? { name: c.cname.trim(), color: c.ccolor, league: c.cleague } : null });
  };
}

// ---------- 게임 화면 ----------
function gameScreen() {
  const e = S.entries[S.ei]; const u = S.user;
  const fl = S.flow; const focus = fl.vis && fl.mv && (fl.step === 'match' || (fl.step === 'result' && fl.replay && fl.mv.stage !== 'done'));
  const mt = UI.mtab || 'stage';
  return `<div class="game ${focus ? 'focus' : ''} m-${mt}">
    <nav class="mnav" aria-label="화면 전환">${[['stage', '진행'], ['card', '내 선수'], ['side', '뉴스·순위']].map(([k, n]) => `<button class="${mt === k ? 'on' : ''}" onclick="UI.mtab='${k}';render();window.scrollTo({top:0})">${n}</button>`).join('')}</nav>
    <header class="bug"><div class="d">${fdate(S.date)}</div><div class="ph">${esc(entryLabel(e))}<small>${patchStr()} 패치</small></div>
      <div class="sv"><select aria-label="화면 크기" onchange="UIS.scale=this.value;saveUIS();applyScale()">${[['auto', '화면 크기 자동'], ['0.9', '90%'], ['1', '100%'], ['1.15', '115%'], ['1.3', '130%']].map(([v, n]) => `<option value="${v}" ${String(UIS.scale) === v ? 'selected' : ''}>${n}</option>`).join('')}</select>
      <button class="btn ghost sm" onclick="exportSave()">파일로 저장</button><button class="btn ghost sm" onclick="if(confirm('처음 화면으로 갈까요? 진행 상황은 자동 저장되어 있습니다.')){stopLive();UI.screen='title';render()}">처음 화면</button></div></header>
    <aside class="card">${playerCard(u)}</aside>
    <main class="stage">${stageHtml()}</main>
    <aside class="side">${sideHtml()}</aside>
  </div>`;
}
function entryLabel(e) {
  if (e.kind === 'league') { const t = userTeam(); const lg = t ? S.leagues[t.league] : S.leagues.LCK; return `${S.season} 시즌 · ${lg.name} ${stageName(lg, e.stage)} ${e.round + 1}주차`; }
  return `${S.season} 시즌 · ${e.label}`;
}
function playerCard(u) {
  const t = userTeam(); const s = eff(u);
  const status = !t ? '무소속' : t.st[u.pos] === u.id ? (t.tier === 1 ? '1군 주전' : '2군 주전') : (t.tier === 1 ? '1군 벤치' : '2군 벤치');
  return `<div class="pc">
    <div class="pc-top" style="--tc:${t ? t.color : '#888'}"><span class="pos">${u.pos}</span><div><h2>${esc(u.nick)}</h2><p>${esc(u.name)} · ${u.age}세</p></div><div class="ovr"><b class="num">${ovrOf(s)}</b><span>OVR</span></div></div>
    <div class="pc-team">${t ? esc(t.name) : '무소속'} <span class="tag">${status}</span></div>
    <div class="stats">${SK.map(k => { const bn = s[k] - u.st[k]; return `<div class="srow"><span>${sn(k, u.pos)}</span><div class="sbar"><i style="width:${clamp(u.st[k] / 5, 0, 100)}%"></i>${bn > 0 ? `<i class="bn" style="width:${clamp(bn / 5, 0, 100)}%"></i>` : ''}</div><b class="num">${s[k]}</b>${bn ? `<small>${bn > 0 ? '+' : ''}${bn}</small>` : ''}</div>`; }).join('')}</div>
    <dl class="meta">
      <dt>컨디션</dt><dd><span class="cbar">${Array.from({ length: 10 }, (_, i) => `<i class="${i < u.cond ? 'on' : ''} ${u.cond <= 3 ? 'low' : ''}"></i>`).join('')}</span> ${u.cond} <small>훈련 효율 ${Math.round(condMul(u.cond) * 100)}%${u.condStat && u.cond !== 5 ? ` · 경기 ${sn(u.condStat, u.pos)} ${u.cond > 5 ? '+' : ''}${(u.cond - 5) * 4}%` : ''}</small></dd>
      <dt>잠재력</dt><dd>${potEff(u)} <small>(450 + 감코진 육성 ${potEff(u) - 450}) · 순수 훈련 OVR ${pureOvr(u)}</small></dd>
      <dt>인지도</dt><dd>${u.fame.toLocaleString()} / 10,000</dd>
      <dt>연봉</dt><dd>${u.sal}억 원 · ${u.ce} 시즌까지</dd>
      <dt>통산</dt><dd>${u.career.g}경기 ${u.career.w}승 · POM ${u.career.pom}</dd>
    </dl>
    <div class="traits"><h5>특성 ${u.traits.length}/5</h5>${u.traits.length ? u.traits.map(k => `<span class="trait" title="${esc(TRAITS[k].desc)}">${esc(TRAITS[k].name)}</span>`).join('') : '<p class="hint">특별한 업적이나 서사로 얻습니다.</p>'}</div>
  </div>`;
}
const ACT_DESC = { rank: '라인전·피지컬·소규모 교전 성장, 피로', vod: '시야·한타·라인전 성장, 평가 +', scrim: '한타·소규모 교전 크게, 평가 +, 피로 큼', mental: '멘탈·시야 성장, 컨디션 +1', stream: '인지도 크게 +, 성장 적음, 피로', rest: '컨디션 회복', watch: '한타·시야·멘탈 성장, 평가 +', study: '다른 리그 경기로 한타·시야 공부' };
function actBtns(list) { return `<div class="acts">${list.map(k => `<button class="act" onclick="doAction('${k}')"><b>${ACT[k].name}</b><span>${ACT_DESC[k]}</span></button>`).join('')}</div>`; }
function routinePanel() {
  const rt = S.routine; const keys = ['rank', 'vod', 'scrim', 'mental', 'stream', 'rest'];
  return `<details class="routine"><summary>자동 진행 · 훈련 루틴 설정</summary>
    <p class="hint">자동 진행은 이 비율대로 행동을 고르고, 내가 선발로 나가는 경기·계약·시즌 결산에서 멈춥니다. VOD 비율은 경기 날엔 '팀 경기 관람'으로 바뀝니다.</p>
    <div class="rt">${keys.map(k => `<label>${ACT[k].name}<input type="number" min="0" max="100" value="${rt[k] || 0}" onchange="S.routine['${k}']=clamp(+this.value||0,0,100);save()"></label>`).join('')}</div>
    <label class="chk"><input type="checkbox" ${rt.autoRest ? 'checked' : ''} onchange="S.routine.autoRest=this.checked;save()"> 컨디션 3 이하면 자동으로 휴식</label></details>`;
}
function autoBar() {
  return `<div class="autobar"><span>자동 진행</span><button class="btn sm" onclick="autoRun('one')">이번 일정</button><button class="btn sm" onclick="autoRun('month')">한 달</button><button class="btn sm gold" onclick="autoRun('match')">다음 출전 경기까지</button></div>`;
}
function logsHtml(fl) { return fl.logs.map(l => `<div class="log"><b>${l.when} · ${esc(l.name)}</b>${l.lines.map(x => `<div class="num-line">${esc(x)}</div>`).join('')}</div>`).join(''); }
function autoLogHtml(al) {
  if (!al || !al.log.length) return '';
  return `<details class="autolog" open><summary>자동 진행 기록 · ${al.log.length}개 일정 · OVR ${al.from} → ${al.to}</summary>${al.log.map(l => `<div class="al"><b>${fdate(l.date)}</b> <span>${esc(l.label)}</span><div>${esc(l.acts.join(', '))}${l.gains.length ? ` <small>(${esc(l.gains.map(x => x.replace(/ (\d+) \+ (\d+) = (\d+)/, ' +$2')).join(', '))})</small>` : ''}</div>${l.mine ? `<div class="mine">우리 팀 ${esc(l.mine)}</div>` : ''}${l.ev.length ? `<div class="evl">${l.ev.map(esc).join(' · ')}</div>` : ''}</div>`).join('')}</details>`;
}
function stageHtml() {
  const fl = S.flow; const e = S.entries[S.ei]; const u = S.user; const t = userTeam();
  if (u.retired) return `<section class="sec"><h3>커리어가 끝났습니다</h3><p>새 커리어를 시작하려면 처음 화면에서 "새 커리어 시작"을 누르세요.</p></section>`;
  if ((fl.step === 'match' || (fl.step === 'result' && fl.mv && fl.mv.stage !== 'done' && fl.replay)) && fl.vis) return matchView();
  let h = autoLogHtml(fl.autoLog);
  if (fl.notes && fl.notes.length) h += fl.notes.map(n => `<div class="note"><b>${esc(n.t)}</b>${n.lines.map(x => `<div class="num-line">${esc(x)}</div>`).join('')}</div>`).join('');
  if (fl.report) h += `<div class="report"><h4>감코진 리포트 <span>${esc(fl.report.coach)}</span></h4><p>강점 <b>${fl.report.strong}</b> · 보완점 <b>${fl.report.weak}</b></p><p>"${esc(fl.report.verdict)}"</p></div>`;
  if (fl.step === 'contract') {
    return h + `<section class="sec"><h3>계약 협상</h3><p>${u.ce < S.season ? '계약이 끝났습니다.' : ''} 받은 제안 중 하나를 고르세요.</p>
      <div class="offers">${fl.offers.map((o, i) => { const tt = S.teams[o.team]; return `<button class="offer" onclick="acceptOffer(${i})" style="--tc:${tt.color}"><b>${esc(tt.name)}</b><span>${tt.tier === 1 ? '1군' : '2군'} · ${esc(S.leagues[tt.league].name)}</span><span>${o.years}년 · 연봉 ${o.sal}억 원</span><small>${esc(o.note)}</small></button>`; }).join('') || '<p>받은 제안이 없습니다.</p>'}
      <button class="offer ghost" onclick="acceptOffer(-1)"><b>무소속으로 1년 개인 연습</b><span>경기 없이 훈련만 하고 다음 스토브리그에 다시 도전</span></button>
      <button class="offer ghost" onclick="retireUser()"><b>은퇴</b><span>커리어를 끝냅니다</span></button></div></section>`;
  }
  const fx = fl.uf >= 0 ? fl.fixtures[fl.uf] : null;
  const fxHtml = fx ? `<div class="fx"><span>${esc(fx.comp)} · Bo${fx.bo}</span><b style="color:${S.teams[fx.a].color}">${esc(S.teams[fx.a].name)}</b><i>vs</i><b style="color:${S.teams[fx.b].color}">${esc(S.teams[fx.b].name)}</b><em>${fl.userStarts ? '선발 출전' : '벤치'}</em></div>`
    : `<div class="fx none">${e.kind === 'stove' ? '스토브리그 · 경기 없음' : t ? '이번 일정에 우리 팀 경기는 없습니다' : '무소속 · 경기 없음'}</div>`;
  h += fxHtml + logsHtml(fl);
  if (fl.step === 'pre') h += `<section class="sec"><h3>${fx ? '경기 전 행동' : '오전 행동'}</h3>${actBtns(actionsFor(fl))}${autoBar()}${routinePanel()}</section>`;
  else if (fl.step === 'day') h += `<section class="sec"><h3>${fx ? '경기 당일 행동' : '오후 행동'}</h3>${actBtns(actionsFor(fl))}${autoBar()}${routinePanel()}</section>`;
  else if (fl.step === 'ready') h += `<section class="sec ready"><p>오늘 선발 출전합니다. 밴픽부터 실시간으로 진행됩니다.</p><button class="btn gold big" onclick="startMatch()">경기장 입장</button></section>`;
  else if (fl.step === 'result') {
    const r = fl.series; const br = seriesBrief(r);
    h += `<section class="sec"><h3>우리 팀 경기 결과 <small>벤치에서 관전</small></h3><div class="score big"><b style="color:${S.teams[r.a].color}">${esc(S.teams[r.a].name)}</b><span class="num">${r.wa} : ${r.wb}</span><b style="color:${S.teams[r.b].color}">${esc(S.teams[r.b].name)}</b></div>
      <ul class="brief">${br.map(b => `<li><b>${b.gi + 1}세트</b> ${esc(b.w)} 승 <small>${b.time}분 · 킬 ${b.kills[0]}:${b.kills[1]}</small><span>${esc(b.key)}</span></li>`).join('')}</ul><p>POM <a class="pl-link" data-pid="${r.pom}">${esc(S.players[r.pom].nick)}</a></p>
      <div class="row"><button class="btn" onclick="S.flow.replay=true;S.flow.mv={stage:'preview',gi:0};render()">실시간으로 다시보기</button><button class="btn gold" onclick="finishEntry()">다음 진행</button></div></section>`;
  } else if (fl.step === 'post') {
    if (fl.series) { const r = fl.series; h += `<div class="score"><b style="color:${S.teams[r.a].color}">${esc(S.teams[r.a].name)}</b><span class="num">${r.wa} : ${r.wb}</span><b style="color:${S.teams[r.b].color}">${esc(S.teams[r.b].name)}</b></div>`; }
    if (fl.events && fl.events.length) h += fl.events.map(ev => `<div class="event ${ev.good ? 'good' : 'bad'}"><h4>${esc(ev.t)}</h4><p>${linkify(ev.b)}</p>${ev.lines.map(x => `<div class="num-line">${esc(x)}</div>`).join('')}</div>`).join('');
    if (fl.digest && fl.digest.length) {
      const by = {}; fl.digest.forEach(d => { const k = d.comp.replace(/ \(.*\)$/, ''); (by[k] = by[k] || []).push(d); });
      h += `<section class="sec"><h3>다른 경기 결과</h3>${Object.keys(by).slice(0, 8).map(k => `<div class="dg"><h5>${esc(k)}</h5>${by[k].map(d => `<div class="dr ${d.mine ? 'me' : ''}"><span class="${d.wa > d.wb ? 'w' : ''}">${esc(S.teams[d.a].name)}</span><b class="num">${d.wa}:${d.wb}</b><span class="${d.wb > d.wa ? 'w' : ''}">${esc(S.teams[d.b].name)}</span><small>POM <a class="pl-link" data-pid="${d.pom}">${esc(S.players[d.pom] ? S.players[d.pom].nick : '-')}</a></small></div>`).join('')}</div>`).join('')}</section>`;
    }
    h += `<div class="ctrl"><button class="btn gold big" onclick="nextEntry()">다음 일정으로</button><button class="btn" onclick="nextCore();autoRun('match')">다음 출전 경기까지 자동</button></div>`;
  }
  return h;
}

// ---------- 선수 링크 ----------
let nickRe = null, nickMap = null, nickN = 0;
function linkify(text) {
  const ps = Object.values(S.players).filter(p => p.nick.length >= 2);
  if (!nickRe || nickN !== ps.length) {
    nickMap = {}; ps.forEach(p => { const k = p.nick.toLowerCase(); if (!nickMap[k] || !p.retired) nickMap[k] = p.id; });
    const list = Object.keys(nickMap).sort((a, b) => b.length - a.length).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    nickRe = new RegExp(`(?<![A-Za-z0-9])(${list.join('|')})(?![A-Za-z0-9])`, 'gi'); nickN = ps.length;
  }
  return esc(text).replace(nickRe, m => `<a class="pl-link" data-pid="${nickMap[m.toLowerCase()]}">${m}</a>`);
}

// ---------- 사이드 탭 ----------
function sideHtml() {
  const tabs = [['news', '뉴스'], ['table', '순위'], ['team', '우리 팀'], ['players', '선수'], ['me', '내 기록']];
  return `<nav class="tabs">${tabs.map(([k, n]) => `<button class="${UI.tab === k ? 'on' : ''}" onclick="UI.tab='${k}';render()">${n}</button>`).join('')}</nav><div class="tabc">${({ news: newsTab, table: tableTab, team: teamTab, players: playersTab, me: meTab })[UI.tab]()}</div>`;
}
const NT = { news: '기사', community: '커뮤니티', sns: 'SNS', event: '이벤트', system: '공식', patch: '패치' };
function newsTab() { return S.news.slice(0, 60).map(n => `<article class="nw ${n.type} ${n.user ? 'me' : ''}"><div class="nh"><span>${NT[n.type] || n.type}</span><time>${fdate(n.date)}</time></div><h5>${linkify(n.title)}</h5><p>${linkify(n.body)}</p>${n.lines ? n.lines.map(x => `<div class="num-line">${esc(x)}</div>`).join('') : ''}</article>`).join(''); }
function tableTab() {
  const lg = S.leagues[UI.lgTab] || S.leagues.LCK; const e = S.entries[S.ei];
  const stage = e.kind === 'league' ? e.stage : e.kind === 'lfinal' ? 'cup' : S.ei < 13 ? 'cup' : S.ei < 25 ? 'r12' : 'r35';
  const stages = stage === 'cup' ? ['cup'] : stage === 'r12' ? ['r12'] : ['r12', 'r35'];
  const rows = standings(lg, stages);
  let h = `<select onchange="UI.lgTab=this.value;render()">${Object.values(S.leagues).map(l => `<option value="${l.id}" ${l.id === lg.id ? 'selected' : ''}>${l.name}</option>`).join('')}</select>
    <p class="hint">${stage === 'cup' ? stageName(lg, 'cup') : stage === 'r12' ? stageName(lg, 'r12') : '정규시즌 합산'}</p>
    <table class="tbl"><thead><tr><th>#</th><th>팀</th><th>승</th><th>패</th><th>득실</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${r.t === S.user.teamId ? 'me' : ''}"><td>${i + 1}</td><td><i class="dot" style="background:${S.teams[r.t].color}"></i>${esc(S.teams[r.t].name)}</td><td>${r.w}</td><td>${r.l}</td><td>${r.sw - r.sl >= 0 ? '+' : ''}${r.sw - r.sl}</td></tr>`).join('')}</tbody></table>`;
  const W = S.intl.worlds, M = S.intl.msi;
  if (M) h += `<h5 class="lgh">MSI</h5><p class="hint">${M.rounds.map((r, i) => r.length ? `${['8강', '4강', '결승'][i]}: ${r.map(([a, b]) => `${S.teams[a].name} vs ${S.teams[b].name}`).join(', ')}` : '').filter(Boolean).join(' / ')}${M.champ ? ` / 우승 ${S.teams[M.champ].name}` : ''}</p>`;
  if (W) h += `<h5 class="lgh">월즈 스위스 스테이지</h5><table class="tbl">${W.teams.slice().sort((a, b) => (W.rec[b].w - W.rec[b].l) - (W.rec[a].w - W.rec[a].l)).map(t => `<tr class="${t === S.user.teamId ? 'me' : ''}"><td><i class="dot" style="background:${S.teams[t].color}"></i>${esc(S.teams[t].name)}</td><td>${W.rec[t].w}-${W.rec[t].l}</td></tr>`).join('')}</table>${W.champ ? `<p>우승 <b class="gold">${esc(S.teams[W.champ].name)}</b></p>` : ''}`;
  h += `<h5 class="lgh">${patchStr()} 패치 OP 챔피언</h5><p class="hint">${POS.map(p => `${PK[p]}: ${S.meta[p].join(', ')}`).join('<br>')}</p><p class="hint">출처: lol.ps 26.22 패치 통계(PS 스코어)를 시작값으로 쓰고, 이후 패치는 게임 안에서 바뀝니다.</p>`;
  return h;
}
function rosterTable(t, showPot) {
  const ps = t.roster.map(id => S.players[id]).sort((a, b) => POS.indexOf(a.pos) - POS.indexOf(b.pos) || ovr(b) - ovr(a));
  return `<table class="tbl"><thead><tr><th></th><th>선수</th><th>나이</th><th>OVR</th><th>${showPot ? '등급' : ''}</th></tr></thead><tbody>${ps.map(p => `<tr class="${p.isUser ? 'me' : ''}"><td>${p.pos}${t.st[p.pos] === p.id ? '<i class="star">●</i>' : ''}</td><td><a class="pl-link" data-pid="${p.id}">${esc(p.nick)}</a></td><td>${p.age}</td><td>${ovr(p)}</td><td>${showPot ? (p.isUser ? '-' : grade(p.pot)) : ''}</td></tr>`).join('')}</tbody></table>`;
}
function teamTab() {
  const t = userTeam(); if (!t) return '<p>무소속입니다.</p>';
  const t1 = t.tier === 1 ? t : (t.parent ? S.teams[t.parent] : null), t2 = t.tier === 2 ? t : S.teams[t.child];
  const staff = x => x.coaches.map(c => S.coaches[c]).map(c => `<div class="coach"><b>${esc(c.nick)}</b> ${c.role} <small>육성 ${c.dev} · 전략 ${c.str} · 용병술 ${c.tac} · 사기진작 ${c.mor}</small></div>`).join('');
  const blk = (x, lbl) => `<h5 class="lgh">${esc(x.name)} (${lbl}) <small>연속 ${x.streak >= 0 ? x.streak + '승' : -x.streak + '패'}</small></h5>${staff(x)}${rosterTable(x, true)}`;
  return (t1 ? blk(t1, '1군') : '') + (t2 ? blk(t2, '2군') : '') + `<p class="hint">● 주전 · 등급은 스카우팅 리포트 기준 잠재력 등급(S+~C)입니다.</p>`;
}
function playersTab() {
  const lgs = Object.values(S.leagues);
  const lg = S.leagues[UI.plFilter] || S.leagues.LCK;
  const q = UI.q.trim().toLowerCase();
  const ps = q ? Object.values(S.players).filter(p => p.nick.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)).sort((a, b) => ovr(b) - ovr(a))
    : lg.teams.flatMap(t => S.teams[t].roster.map(id => S.players[id])).sort((a, b) => ovr(b) - ovr(a));
  return `<input class="srch" type="search" placeholder="선수 검색 (닉네임·이름)" value="${esc(UI.q)}" oninput="UI.q=this.value;clearTimeout(window._qt);window._qt=setTimeout(()=>{render();const i=document.querySelector('.srch');i.focus();i.setSelectionRange(i.value.length,i.value.length)},250)">
  ${q ? `<p class="hint">"${esc(UI.q)}" 검색 결과 ${ps.length}명</p>` : `<select onchange="UI.plFilter=this.value;render()">${lgs.map(l => `<option value="${l.id}" ${l.id === lg.id ? 'selected' : ''}>${l.name}</option>`).join('')}</select>`}
  <table class="tbl"><thead><tr><th>선수</th><th>팀</th><th></th><th>나이</th><th>OVR</th></tr></thead><tbody>${ps.slice(0, 80).map(p => `<tr class="${p.isUser ? 'me' : ''}"><td><a class="pl-link" data-pid="${p.id}">${esc(p.nick)}</a></td><td>${p.retired ? '은퇴' : p.teamId ? esc(S.teams[p.teamId].name) : 'FA'}</td><td>${p.pos}</td><td>${p.age}</td><td>${ovr(p)}</td></tr>`).join('')}</tbody></table><p class="hint">선수 이름을 누르면 상세 정보가 열립니다. 뉴스 속 선수 이름도 누를 수 있습니다.</p>`;
}
function meTab() {
  const u = S.user;
  return `<h5 class="lgh">커리어</h5><dl class="meta"><dt>통산</dt><dd>${u.career.g}세트 ${u.career.w}승 (${u.career.g ? Math.round(u.career.w / u.career.g * 100) : 0}%)</dd><dt>POM</dt><dd>${u.career.pom}회</dd><dt>시즌 성과</dt><dd>${u.sp} / 10,000</dd></dl>
  <h5 class="lgh">우승</h5>${u.career.titles.length ? u.career.titles.map(x => `<span class="trait">${esc(x)}</span>`).join('') : '<p class="hint">아직 없습니다.</p>'}
  <h5 class="lgh">성장 기록</h5><table class="tbl"><thead><tr><th>시점</th><th>소속</th><th>OVR</th><th>인지도</th></tr></thead><tbody>${S.hist.map(h => `<tr><td>${fdate(h.date)}<br><small>${esc(h.label)}</small></td><td>${esc(h.team)}</td><td>${h.ovr}</td><td>${h.fame}</td></tr>`).join('') || '<tr><td colspan="4">시즌 중간 결산 때 기록됩니다.</td></tr>'}</tbody></table>`;
}
function playerModal(p) {
  const t = p.teamId ? S.teams[p.teamId] : null; const s = eff(p);
  const news = S.news.filter(n => (n.title + n.body).toLowerCase().includes(p.nick.toLowerCase())).slice(0, 6);
  return `<div class="modal" role="dialog" onclick="if(event.target===this)closeModal()"><div class="mbox pm" style="--tc:${t ? t.color : '#888'}">
    <div class="pm-h"><span class="pos">${p.pos}</span><div><h2>${esc(p.nick)}</h2><p>${esc(p.name)} · ${p.age}세 · ${p.retired ? '은퇴' : t ? esc(t.name) + (t.st[p.pos] === p.id ? ' 주전' : ' 벤치') : 'FA'}</p></div><div class="ovr"><b class="num">${ovrOf(s)}</b><span>OVR</span></div></div>
    <div class="stats">${SK.map(k => `<div class="srow"><span>${sn(k, p.pos)}</span><div class="sbar"><i style="width:${clamp(s[k] / 5, 0, 100)}%"></i></div><b class="num">${s[k]}</b><small></small></div>`).join('')}</div>
    <dl class="meta"><dt>잠재력</dt><dd>${p.isUser ? potEff(p) : grade(p.pot) + ' 등급'}</dd><dt>인지도</dt><dd>${p.fame.toLocaleString()}</dd><dt>연봉</dt><dd>${p.sal}억 원 · ${p.ce} 시즌까지</dd><dt>통산</dt><dd>${p.career.g}세트 ${p.career.w}승 · POM ${p.career.pom}</dd><dt>주력</dt><dd>${esc(p.sig)}</dd></dl>
    ${p.traits.length ? `<div class="traits"><h5>특성</h5>${p.traits.map(k => `<span class="trait" title="${esc(TRAITS[k].desc)}">${esc(TRAITS[k].name)}</span>`).join('')}</div>` : ''}
    ${p.career.titles.length ? `<div class="traits"><h5>우승</h5>${p.career.titles.slice(-8).map(x => `<span class="trait">${esc(x)}</span>`).join('')}</div>` : ''}
    ${news.length ? `<h5 class="lgh">관련 뉴스</h5>${news.map(n => `<div class="mn"><b>${esc(n.title)}</b><p>${fdate(n.date)}</p></div>`).join('')}` : ''}
    <button class="btn gold" onclick="closeModal()">닫기</button></div></div>`;
}
function modalHtml() {
  const m = UI.modal; const u = S.user;
  if (m.type === 'player') { const p = S.players[m.id]; return p ? playerModal(p) : ''; }
  if (m.type === 'summary') {
    const big = S.news.filter(n => n.type === 'news' || n.type === 'system').slice(0, 8);
    return `<div class="modal" role="dialog"><div class="mbox"><h2>${esc(m.label)}</h2><p class="mdate">${fdate(S.date)}</p>
      <div class="msplit"><div>${playerCard(u)}</div><div><h4>최근 주요 소식</h4>${big.map(n => `<div class="mn"><b>${linkify(n.title)}</b><p>${linkify(n.body)}</p></div>`).join('')}</div></div>
      <button class="btn gold" onclick="UI.modal=null;render()">${m.end ? '닫기' : '계속하기'}</button></div></div>`;
  }
  return '';
}
document.addEventListener('DOMContentLoaded', () => render());
