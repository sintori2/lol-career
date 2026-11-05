'use strict';
// =================== 중계 문장 ===================
const P_ = id => S.players[id];
const nk = id => `<b>${esc(P_(id).nick)}</b>`;
function line(who, text, side) { return `<div class="dl ${side || ''}"><span class="who">${esc(who)}</span><p>${text}</p></div>`; }
function crew() {
  const c = R.pick(CASTERS); const a = R.shuffle(ANALYSTS).slice(0, 2);
  return { c, a1: a[0], a2: a[1] };
}
function say(person, base) {
  const s = person.style;
  if (s === 'shout') return base.replace(/[.]$/, '') + R.pick(['!', '!!', '! 이게 됩니다!', '! 대단합니다!']);
  if (s === 'deep') return base + R.pick([' 이 부분이 핵심이거든요.', ' 디테일이 다릅니다.', ' 저는 이 차이가 크다고 봐요.', '']);
  if (s === 'hype') return base + R.pick([' 와, 이거 진짜 재밌는데요?', ' 이거 미쳤습니다.', ' 저 이런 거 너무 좋아요.', '']);
  return base;
}
function champ(g, id) { return g.draft.picks[id]; }
function tn(id) { return esc(S.teams[id].name); }

// ---------- 프리뷰 ----------
function previewCommentary(res, ctx) {
  const A = S.teams[res.a], B = S.teams[res.b]; const k = ctx.crew;
  const LA = lineup(A), LB = lineup(B);
  const star = L => L.slice().sort((x, y) => ovr(y) - ovr(x))[0];
  const sa = star(LA), sb = star(LB);
  const fav = ctx.fan[0] >= ctx.fan[1] ? A : B;
  const out = [];
  out.push(line(k.c.name, `${say(k.c, `${res.comp}, ${tn(A.id)}와 ${tn(B.id)}의 경기가 곧 시작됩니다.`)} 오늘 이 경기, 어떻게 보세요?`));
  out.push(line(k.a1.name, say(k.a1, `팬분들 예상은 ${esc(fav.name)} 쪽으로 조금 기울어 있죠. 그런데 저는 ${esc(sa.nick)} 선수와 ${esc(sb.nick)} 선수, 이 두 선수 컨디션이 오늘 승부를 가를 거라고 봅니다.`)));
  if (A.streak >= 2 || B.streak >= 2) { const s = A.streak >= B.streak ? A : B; out.push(line(k.a2.name, say(k.a2, `${esc(s.name)}이(가) 지금 ${s.streak}연승 중이에요. 연승 팀 특유의 자신감, 무시 못 합니다.`))); }
  else if (A.streak <= -2 || B.streak <= -2) { const s = A.streak <= B.streak ? A : B; out.push(line(k.a2.name, say(k.a2, `${esc(s.name)}은(는) ${-s.streak}연패예요. 오늘은 분위기 반전이 꼭 필요한 경기입니다.`))); }
  else out.push(line(k.a2.name, say(k.a2, `최근 흐름은 두 팀 다 비슷해요. 결국 밴픽에서 누가 먼저 주도권을 잡느냐가 관건이겠죠.`)));
  const u = S.user;
  if ([...LA, ...LB].includes(u)) out.push(line(k.c.name, say(k.c, `그리고 오늘 주목할 이름, ${esc(u.nick)}! ${u.age}세 선수가 ${esc(S.teams[u.teamId].name)}의 ${PK[u.pos]}로 나섭니다.`)));
  out.push(line(k.a1.name, `${R.pick(['라인전에서 한쪽이 무너지면 생각보다 빨리 끝날 수도 있어요.', '운영 싸움으로 가면 경험 많은 쪽이 유리합니다.', '오늘 정글 동선 싸움이 정말 중요할 것 같아요.'])}`));
  return out.join('');
}

// ---------- 경기전 미팅 ----------
function meetingTalk(t, g, side) {
  const cs = t.coaches.map(c => S.coaches[c]); const hc = cs[0];
  const L = lineup(t); const best = L.slice().sort((a, b) => ovr(b) - ovr(a))[0];
  const weak = (side === 'A' ? g.lanes.map(l => l.a) : g.lanes.map(l => l.b));
  const plan = R.pick([
    `초반엔 무리하지 말고 ${PK[best.pos]} 쪽으로 자원 몰아준다. ${esc(best.nick)}, 네가 판 키워야 돼.`,
    `상대 정글 첫 동선 바텀 시작 확률 높다. 와드 하나 일찍 박고, 첫 ${S.objects.grub} 우리가 먹자.`,
    `밴픽에서 상대 시그니처 다 자른다. 그 다음은 우리 하던 대로.`,
    `한타 구도 가면 우리가 이긴다. 중반까지만 버티자.`,
    `초반부터 강하게 간다. 2레벨 타이밍 탑 쪽 다이브 준비.`
  ]);
  const ans = R.pick(L.filter(p => p.id !== best.id));
  const reply = R.pick(['네, 알겠습니다.', '콜 확실하게 할게요.', '시야 먼저 잡고 들어갈게요.', '자신 있습니다.']);
  let x = `<div class="meet"><div class="mh" style="--tc:${t.color}">${esc(t.name)} 미팅</div>`;
  x += line(`${hc.nick} ${hc.role}`, plan) + line(ans.nick, reply);
  if (L.includes(S.user)) x += line(S.user.nick, R.pick(['(고개를 끄덕이며 손을 푼다)', '"제 라인은 제가 책임질게요."', '(긴장한 얼굴로 화면을 바라본다)']));
  return x + '</div>';
}

// ---------- 밴픽 해설 ----------
function draftCommentary(res, g, k) {
  const A = S.teams[res.a], B = S.teams[res.b];
  const op = Object.entries(g.draft.picks).filter(([id, c]) => S.meta[P_(id).pos].includes(c));
  const sig = Object.entries(g.draft.picks).filter(([id, c]) => P_(id).sig === c);
  const out = [];
  out.push(line(k.c.name, say(k.c, `밴픽이 끝났습니다. ${tn(g.blueA ? A.id : B.id)} 블루 진영, ${tn(g.blueA ? B.id : A.id)} 레드 진영입니다.`)));
  if (op.length) { const [id, c] = R.pick(op); out.push(line(k.a1.name, say(k.a1, `${esc(P_(id).nick)} 선수가 ${josa(c, '을', '를')} 가져갔어요. 이번 패치 최고 티어 챔피언이죠.`))); }
  if (sig.length) { const [id, c] = R.pick(sig); out.push(line(k.a2.name, say(k.a2, `${esc(c)}! ${esc(P_(id).nick)} 선수 시그니처가 풀렸습니다. 이걸 왜 안 잘랐을까요?`))); }
  out.push(line(k.a1.name, R.pick(['조합만 보면 한쪽은 초반, 한쪽은 후반이에요. 20분 전에 승부가 갈릴 수도 있습니다.', '두 팀 다 한타 조합이에요. 오브젝트 앞 시야 싸움이 관건입니다.', '피어리스 드래프트라 이전 세트 챔피언을 못 쓰다 보니, 선수들 챔프 폭이 시험대에 올랐어요.'])));
  return out.join('');
}

// ---------- 초반 라인전 사건 ----------
function earlyItems(res, g) {
  const lanes = g.lanes.filter(l => l.win).sort((a, b) => Math.abs(b.nA - 5) - Math.abs(a.nA - 5));
  const cnt = clamp(R.int(1, 3), 1, Math.max(1, lanes.length));
  const out = [];
  for (let i = 0; i < Math.min(cnt, lanes.length); i++) {
    const l = lanes[i]; const w = l.win === 'A' ? l.a : l.b, lo = l.win === 'A' ? l.b : l.a;
    const W = P_(w), Lp = P_(lo), wc = champ(g, w), lc = champ(g, lo);
    const strong = l.grade === '강';
    const T = {
      TOP: [
        `${nk(w)}의 ${esc(wc)}이(가) 3레벨 타이밍에 과감하게 앞점멸로 들어갑니다. ${nk(lo)}의 ${esc(lc)}은(는) 미니언에 막혀 빠지지 못하고, 스킬 연계가 그대로 꽂힙니다. ${strong ? '솔로킬! 상대 정글이 뒤늦게 탑으로 향했지만 이미 포탑 방패 두 장이 떨어진 뒤였습니다.' : '킬까지는 아니지만 체력 차이가 벌어지면서 라인 주도권이 완전히 넘어갑니다.'}`,
        `탑에서 ${nk(w)}이(가) 웨이브를 쌓아 밀어 넣은 뒤 정글과 함께 다이브를 시도합니다. ${nk(lo)}이(가) 포탑 아래에서 버텨보지만 ${strong ? '결국 쓰러지고, 두 명 모두 살아서 빠져나갑니다.' : '점멸을 빼며 겨우 살아남습니다. 대신 CS 손해가 꽤 큽니다.'}`
      ],
      JUNGLE: [
        `경기 시작 직후 ${nk(w)}의 ${esc(wc)}이(가) 상대 레드 정글로 인베이드합니다. ${nk(lo)}의 첫 버프를 빼앗고, ${strong ? `이어진 ${S.objects.grub} 싸움까지 3마리 모두 챙깁니다. 초반 동선 싸움은 완벽한 한쪽의 승리입니다.` : `${S.objects.grub} 둥지 시야도 먼저 잡아둡니다.`}`,
        `${nk(w)}이(가) 상대 정글의 위치를 정확히 읽었습니다. ${nk(lo)}이(가) 바텀을 노리는 동안 반대편 탑을 찔러 ${strong ? '퍼스트 블러드를 만들어냅니다.' : '점멸을 빼게 만듭니다.'} 동선 한 번에 양쪽 라인 분위기가 달라집니다.`
      ],
      MID: [
        `미드 ${nk(w)}의 ${esc(wc)}, 6레벨을 먼저 찍자마자 궁극기를 꺼냅니다. ${nk(lo)}의 ${esc(lc)}은(는) 반응하지 못하고 ${strong ? '그대로 쓰러집니다. 미드 솔로킬!' : '체력 절반을 잃고 귀환합니다.'}`,
        `${nk(w)}이(가) 라인을 빠르게 밀고 바텀으로 로밍합니다. ${nk(lo)}의 와드 확인이 한 박자 늦었고, ${strong ? '바텀에서 2킬이 터집니다.' : '바텀 듀오의 점멸 두 개가 빠집니다.'}`
      ],
      AD: [
        `바텀 2대2, ${nk(w)}의 ${esc(wc)}이(가) 평타 사거리를 끝까지 활용하며 딜 교환에서 이깁니다. ${nk(lo)}이(가) 무리하게 반격하다 ${strong ? '서포터와 함께 쓰러집니다. 더블킬!' : '포션을 다 쓰고 귀환합니다.'}`,
        `${nk(w)}이(가) 2레벨을 먼저 찍고 바로 진입합니다. ${nk(lo)}의 ${esc(lc)}은(는) 점멸로 빠져나갔지만 ${strong ? '그 뒤로 CS 차이가 20개 넘게 벌어집니다.' : '바텀 주도권이 넘어갑니다.'}`
      ],
      SUP: [
        `${nk(w)}의 ${esc(wc)}, 부쉬에서 기다리다 완벽한 이니시를 겁니다. ${nk(lo)}이(가) 원딜을 지키려 했지만 ${strong ? '바텀 듀오가 한꺼번에 무너집니다.' : '점멸이 빠지면서 바텀 라인이 밀립니다.'}`,
        `${nk(w)}이(가) 강가 시야를 선점하고 상대 정글 동선을 미리 끊습니다. ${nk(lo)}이(가) 와드를 지우러 들어오는 순간, ${strong ? '미드와 정글이 함께 덮쳐 킬로 연결합니다.' : '역으로 시야 싸움에서 밀려납니다.'}`
      ]
    };
    const txt = R.pick(T[l.pos]);
    out.push({ lane: l, html: `<p${W.isUser || Lp.isUser ? ' class="me"' : ''}>${txt}</p>`, text: txt, strong, w, lo });
  }
  return out;
}
function earlyEvents(res, g) {
  const it = earlyItems(res, g);
  return it.length ? it.map(x => x.html).join('') : `<p>양 팀 모두 조심스럽게 CS를 챙기며 큰 사고 없이 라인전을 마칩니다. ${S.objects.grub}은(는) 3:3으로 나눠 가졌습니다.</p>`;
}
function earlyCommentary(res, g, k) {
  const sum = g.lanes.reduce((s, l) => s + l.v, 0);
  const lead = sum > 0 ? res.a : sum < 0 ? res.b : null;
  const big = g.lanes.slice().sort((a, b) => Math.abs(b.nA - 5) - Math.abs(a.nA - 5))[0];
  const bw = big.win ? (big.win === 'A' ? big.a : big.b) : null;
  const out = [];
  out.push(line(k.c.name, say(k.c, lead ? `라인전 단계, ${tn(lead)} 쪽이 확실히 앞서갑니다.` : '라인전은 팽팽하게 끝났습니다.')));
  if (bw) out.push(line(k.a1.name, say(k.a1, `${esc(P_(bw).nick)} 선수 ${PK[big.pos]} 라인전, 오늘 정말 좋습니다. 이 차이가 중반 오브젝트 싸움까지 이어질 수 있어요.`)));
  out.push(line(k.a2.name, R.pick([`골드 차이는 아직 크지 않아요. ${S.objects.herald}와(과) 첫 드래곤이 다음 분수령입니다.`, '지고 있는 팀도 아직 할 게 많아요. 시야만 다시 잡으면 됩니다.', '이 정도 격차면 앞선 팀이 템포를 올리고 싶어할 거예요.'])));
  return out.join('');
}

// ---------- 중반 교전 ----------
function skirmText(g, s, res) {
  const a = s.pa.map(id => P_(id)), b = s.pb.map(id => P_(id));
  const names = arr => arr.map(p => `${esc(p.nick)}(${esc(champ(g, p.id))})`).join(', ');
  const win = s.win === 'A' ? a : s.win === 'B' ? b : null;
  const hero = win ? R.pick(win) : null;
  const strong = s.grade === '강', mid = s.grade === '중';
  let t = `${esc(s.loc)}에서 ${tn(res.a)} ${s.na}명(${names(a)})과 ${tn(res.b)} ${s.nb}명(${names(b)})이 맞붙습니다. `;
  if (!win) t += '스킬을 주고받았지만 양쪽 모두 한 명씩 잃고 물러납니다. 오브젝트는 누구의 것도 되지 않았습니다.';
  else {
    const hc = esc(champ(g, hero.id));
    t += R.pick([
      `${nk(hero.id)}의 ${hc}이(가) 측면으로 돌아 들어가며 진형을 무너뜨립니다. `,
      `먼저 들어온 쪽은 상대였지만, ${nk(hero.id)}의 ${hc}이(가) 스킬을 받아내고 역으로 물어뜯습니다. `,
      `시야를 먼저 잡은 쪽이 웃습니다. ${nk(hero.id)}이(가) 어둠 속에서 튀어나와 핵심 딜러를 끊어냅니다. `
    ]);
    t += strong ? `교전 결과 ${win.length}명 모두 살아남고 상대는 전멸. 오브젝트까지 깔끔하게 챙깁니다.` : mid ? '킬 스코어 2:0, 오브젝트도 가져갑니다.' : '아슬아슬하게 1:0으로 이기고 오브젝트 압박을 겁니다.';
    hero._h = true;
  }
  const me = s.pa.concat(s.pb).includes(S.user.id);
  return `<p${me ? ' class="me"' : ''}>${t}</p>`;
}
function midCommentary(res, g, k) {
  const lead = g.mid.nA > 5 ? res.a : g.mid.nA < 5 ? res.b : null;
  const out = [];
  if (g.endMid) {
    out.push(line(k.c.name, say(k.c, `끝났습니다! ${tn(g.winner === 'A' ? res.a : res.b)}, 중반 교전에서 완전히 승부를 갈라버립니다.`)));
    out.push(line(k.a1.name, say(k.a1, '이 정도 격차면 한타를 열 필요도 없었죠. 상대가 시야를 하나도 못 잡았어요.')));
  } else {
    out.push(line(k.c.name, say(k.c, lead ? `중반 교전, ${tn(lead)} 쪽이 오브젝트를 더 챙겼습니다.` : '중반 교전도 서로 주고받았습니다.')));
    out.push(line(k.a2.name, say(k.a2, `${S.objects.drake} 영혼과 ${S.objects.baron}, 이제 후반 한타 한 번에 모든 게 걸렸어요.`)));
    out.push(line(k.a1.name, R.pick(['뒤처진 팀은 이제 한 번의 완벽한 이니시가 필요합니다.', '멘탈 싸움이에요. 조급한 쪽이 먼저 실수합니다.', '앞선 팀도 방심하면 안 돼요. 한타 한 번이면 뒤집히는 구간입니다.'])));
  }
  return out.join('');
}

// ---------- 후반 한타 ----------
function lateText(res, g) {
  const A = lineup(S.teams[res.a]), B = lineup(S.teams[res.b]);
  const W = g.winner === 'A' ? g.la : g.lb, L = g.winner === 'A' ? g.lb : g.la;
  const m = Math.abs(g.late.nA - 5);
  const ini = R.pick(W.map(P_).filter(p => p.pos !== 'AD')) || P_(W[0]);
  const carry = W.map(P_).slice().sort((x, y) => g.perf[y.id] - g.perf[x.id])[0];
  const fall = R.pick(L.map(P_));
  const obj = g.late.obj;
  let t = `${g.time - 3}분, ${esc(obj)} 앞. 양 팀 다섯 명이 모두 모였습니다. `;
  if (m >= 2) t += `${nk(ini.id)}의 ${esc(champ(g, ini.id))}이(가) 완벽한 각으로 이니시를 겁니다. 상대는 진형을 갖추기도 전에 무너지고, ${nk(carry.id)}의 ${esc(champ(g, carry.id))}이(가) 쏟아지는 딜로 쓸어 담습니다. 일방적인 에이스. 그대로 ${esc(obj)}을(를) 챙기고 본진으로 밀고 들어갑니다.`;
  else if (m >= 1) t += `먼저 스킬을 맞춘 건 ${nk(fall.id)} 쪽이었지만, ${nk(ini.id)}이(가) 앞에서 버텨주는 사이 ${nk(carry.id)}이(가) 뒤에서 딜을 넣습니다. 3대1 교환, ${esc(obj)}까지 가져가며 승부를 굳힙니다.`;
  else t += `서로 한 명씩 쓰러지며 숨 막히는 난전이 이어집니다. 체력 바가 바닥난 상태에서 ${nk(carry.id)}의 ${esc(champ(g, carry.id))}이(가) 마지막 스킬을 맞추며 ${nk(fall.id)}을(를) 끊어냅니다. 남은 건 단 두 명. 그 두 명이 그대로 넥서스를 칩니다.`;
  const me = W.includes(S.user.id) || L.includes(S.user.id);
  return `<p${me ? ' class="me"' : ''}>${t}</p>`;
}
function lateCommentary(res, g, k) {
  const wt = g.winner === 'A' ? res.a : res.b;
  return line(k.c.name, say(k.c, `${tn(wt)}, ${esc(g.late.obj)} 한타를 이기면서 경기를 끝냅니다.`)) +
    line(k.a1.name, say(k.a1, R.pick(['마지막 이니시 각이 정말 좋았어요.', '멘탈 싸움에서 한쪽이 확실히 버텼습니다.', '한타 집중력의 차이였다고 봅니다.'])));
}
function reviewCommentary(res, g, gi, k, final) {
  const wt = g.winner === 'A' ? res.a : res.b; const lt = wt === res.a ? res.b : res.a;
  const W = g.winner === 'A' ? g.la : g.lb;
  const best = W.slice().sort((x, y) => g.perf[y] - g.perf[x])[0];
  const out = [];
  out.push(line(k.c.name, say(k.c, `${gi + 1}세트는 ${tn(wt)}의 승리! 세트 스코어 ${tn(res.a)} ${g.score[0]} : ${g.score[1]} ${tn(res.b)}.`)));
  out.push(line(k.a1.name, say(k.a1, `오늘 이 세트 수훈은 ${esc(P_(best).nick)} 선수예요. ${esc(champ(g, best))}로 ${g.kda[best].join('/')}, 필요한 순간마다 그 자리에 있었습니다.`)));
  out.push(line(k.a2.name, R.pick([`${tn(lt)}은(는) 밴픽부터 다시 생각해봐야 할 것 같아요.`, `${tn(lt)}도 중반까진 잘 따라갔는데 마지막 집중력이 아쉬웠습니다.`, `두 팀 다 보여줄 건 다 보여줬어요. 좋은 경기였습니다.`])));
  if (final) {
    const W2 = S.teams[res.winner];
    out.push(`<div class="sum">`);
    out.push(line(k.c.name, say(k.c, `최종 스코어 ${Math.max(res.wa, res.wb)} 대 ${Math.min(res.wa, res.wb)}! ${esc(W2.name)}이(가) 이 시리즈를 가져갑니다.`)));
    const tot = res.games.length;
    out.push(line(k.a1.name, say(k.a1, tot === 1 ? '단판이라 실수 하나가 컸어요. 이긴 팀이 그 실수를 놓치지 않았습니다.' : res.wa && res.wb ? `한 세트씩 주고받는 흐름이었는데, 결국 ${esc(W2.name)}이(가) 중요한 세트에서 더 침착했습니다.` : `${esc(W2.name)}의 완승이에요. 세트마다 다른 방식으로 이겼다는 게 더 무섭습니다.`)));
    out.push(line(k.a2.name, R.pick(['오늘 결과로 순위 싸움이 더 재밌어졌네요.', '진 팀도 다음 경기가 금방이에요. 빨리 털고 일어나야죠.', '이 기세면 다음 경기도 쉽지 않을 겁니다.'])));
    out.push(`</div>`);
  }
  return out.join('');
}

// =================== 인터뷰 ===================
function pomScene(res) {
  const id = res.pom; let best = null;
  res.games.forEach((g, gi) => {
    const pp = g.perf[id]; if (pp == null) return;
    if (!best || pp > best.v) {
      const lane = g.lanes.find(l => l.a === id || l.b === id);
      const sk = g.skirm.find(s => s.pa.concat(s.pb).includes(id) && ((s.win === 'A' && s.pa.includes(id)) || (s.win === 'B' && s.pb.includes(id))));
      best = { v: pp, gi, champ: g.draft.picks[id], kind: sk ? 'skirm' : lane && lane.grade === '강' ? 'lane' : 'late', loc: sk ? sk.loc : null };
    }
  });
  return best;
}
function interviewQuestions(res) {
  const p = P_(res.pom), t = S.teams[p.teamId], sc = pomScene(res);
  const q1 = sc.kind === 'lane' ? `${sc.gi + 1}세트 ${sc.champ}로 라인전부터 상대를 강하게 압박했는데요. 그 장면, 어떤 생각으로 플레이하셨나요?`
    : sc.kind === 'skirm' ? `${sc.gi + 1}세트 ${sc.loc} 교전에서 ${sc.champ}로 흐름을 완전히 가져왔습니다. 그때 상황을 설명해 주신다면요?`
    : `${sc.gi + 1}세트 마지막 한타, ${sc.champ}로 결정적인 역할을 했습니다. 한타 들어가기 직전에 팀에서 어떤 얘기가 오갔나요?`;
  let q2;
  if (p.isUser && p.career.starts <= 3) q2 = `아직 데뷔 초반인데 벌써 POM입니다. 지금 이 자리에 선 소감과, 앞으로 어떤 선수로 기억되고 싶은지 말씀해 주세요.`;
  else if (t.streak >= 3) q2 = `팀이 ${t.streak}연승을 달리고 있습니다. 요즘 팀 분위기는 어떤가요? 다음 상대에게 한마디 해주신다면요?`;
  else if (res.fx.intl) q2 = `국제 무대에서 거둔 승리입니다. 다음 경기를 앞둔 각오와 응원해주신 팬분들께 한마디 부탁드립니다.`;
  else q2 = `오늘 경기에서 스스로 가장 아쉬웠던 점은 무엇이고, 다음 경기까지 어떤 부분을 보완하고 싶으신가요?`;
  return [q1, q2];
}
function npcAnswer(p, q, i, res) {
  const [comp, amb, hum, star] = p.pers; const sp = speech(p);
  const parts = [];
  if (sp < 45) parts.push(R.pick(['어… 그냥', '음, 그게', '아 네, 그']));
  if (i === 0) {
    if (hum >= 75) parts.push(R.pick(['팀원들이 시야를 잘 잡아줘서 제가 편하게 들어갈 수 있었어요.', '사실 콜은 정글이 해줬고 저는 따라간 것뿐이에요.', '연습 때 많이 맞춰본 구도라 자신 있게 했습니다.']));
    else if (hum < 35) parts.push(R.pick(['솔직히 상대가 저를 너무 쉽게 본 것 같아요.', '라인전은 제가 이길 줄 알았어요. 예상대로였습니다.', '그 각은 저 말고는 아무도 못 봤을 거예요.']));
    else parts.push(R.pick(['상대 스킬이 빠진 걸 보고 바로 들어갔어요.', '조금 위험했는데 결과가 좋아서 다행입니다.', '그 타이밍밖에 없다고 생각했습니다.']));
  } else {
    if (comp >= 90) parts.push(R.pick(['다음 경기도 무조건 이기겠습니다.', '우승 말고는 생각 안 하고 있습니다.', '여기서 만족하면 안 된다고 생각해요.']));
    if (star >= 80) parts.push(R.pick(['보신 분들 재밌으셨죠? 다음엔 더 화끈하게 보여드릴게요.', '응원 소리 다 들렸어요. 오늘 그 힘으로 이겼습니다.']));
    if (hum >= 80) parts.push(R.pick(['아직 부족한 부분이 많아서 더 연습하겠습니다.', '팬분들 항상 감사드립니다.']));
    if (hum < 35 && amb >= 85) parts.push(R.pick(['다음 상대요? 누구든 상관없습니다.', '저희가 지금 리그에서 제일 잘한다고 생각해요.']));
    if (parts.length <= (sp < 45 ? 1 : 0)) parts.push('다음 경기도 준비 잘 하겠습니다.');
  }
  if (sp < 45) parts.push(R.pick(['네…', '그런 것 같아요.', '네 감사합니다.']));
  return parts.join(' ');
}
const CLICHE = ['열심히', '감사', '최선', '다음 경기도', '응원', '팀원들', '준비 잘'];
const ARROGANT = ['쉬웠', '상대도 안', '발랐', '못하', '별거 없', '압살', '껌', '개못', '내가 제일', '제가 제일'];
function scoreInterview(answers, res) {
  const txt = answers.join(' ');
  const words = txt.split(/[\s,.!?~…]+/).filter(Boolean);
  const len = txt.replace(/\s/g, '').length;
  const uniq = new Set(words).size / Math.max(1, words.length);
  const lines = [];
  let sc = 40; lines.push('기본 40');
  const lb = Math.min(25, Math.round(len / 6)); sc += lb; lines.push(`분량 +${lb}`);
  const ub = Math.round(uniq * 15); sc += ub; lines.push(`어휘 다양성 +${ub}`);
  const p = S.user, t = S.teams[p.teamId], opp = S.teams[res.loser];
  const mates = lineup(t).filter(x => !x.isUser).map(x => x.nick.toLowerCase());
  let ref = 0;
  if (mates.some(m => txt.toLowerCase().includes(m)) || /팀원|형들|동료|정글|서폿|미드|탑|원딜/.test(txt)) ref += 4;
  if (txt.includes(opp.name) || /상대/.test(txt)) ref += 3;
  if (/팬|응원/.test(txt)) ref += 3;
  const sc0 = pomScene(res); if (sc0 && txt.includes(sc0.champ)) ref += 3;
  ref = Math.min(10, ref); if (ref) { sc += ref; lines.push(`구체적 언급(팀원·상대·팬·장면) +${ref}`); }
  const cl = CLICHE.filter(c => txt.includes(c)).length;
  if (cl >= 2 && len < 80) { sc -= 5; lines.push('너무 정석적인 인터뷰 -5'); }
  const ws = new Set(words);
  const similar = S.interviews.some(prev => { const pw = new Set(prev.split(/[\s,.!?~…]+/).filter(Boolean)); const inter = [...ws].filter(w => pw.has(w)).length; return inter / Math.max(1, Math.min(ws.size, pw.size)) >= 0.5; });
  if (similar) { sc -= 5; lines.push('기존 인터뷰와 비슷함 -5'); }
  const incoh = len < 12 || /(.)\1{4,}/.test(txt) || (words.length <= 2 && len > 25);
  if (incoh) { sc -= 10; lines.push('어휘력 부족·두서없음 -10'); }
  sc = clamp(Math.round(sc), 1, 100);
  const arrogant = ARROGANT.some(a => txt.includes(a));
  const humble = /부족|배우|덕분|감사|더 노력/.test(txt);
  return { sc, lines, arrogant, humble };
}
const HANDLES = ['ㅇㅇ(118.235)', 'ㅇㅇ(211.36)', '롤갤러', '중립기어박음', '탑신병자', '칼바람장인', '새벽솔랭', '페이커보러감', '협곡산책', '밴픽분석가', 'ㅇㅇ(175.223)', '골드4탈출', '닉네임없음'];
function community(posts) { return `<div class="comm">${posts.map(p => `<div class="cp"><span class="h">${esc(R.pick(HANDLES))}</span>${esc(p)}</div>`).join('')}</div>`; }
function interviewReaction(p, r, isUser) {
  const t = S.teams[p.teamId];
  let title, body, posts;
  if (r.arrogant) {
    title = `${p.nick}, 경기 후 인터뷰에서 자신감 폭발… 반응 엇갈려`;
    body = `${t.name} ${p.nick}이(가) POM 인터뷰에서 거침없는 발언을 했습니다. 일부 팬들은 "이런 캐릭터가 필요하다"며 반겼지만, 상대 팬들은 불쾌하다는 반응입니다.`;
    posts = ['ㅋㅋㅋㅋ 패기 미쳤네', '저러다 지면 어쩌려고', '이런 맛에 롤 보지', '상대팬 긁혔다 ㅋㅋ', '인성 논란 각인데'];
  } else if (r.sc >= 75) {
    title = `"${p.nick}, 말도 플레이도 준비된 선수"`;
    body = `${t.name} ${p.nick}이(가) 차분하고 구체적인 인터뷰로 눈길을 끌었습니다. 장면 하나하나를 설명하는 모습에서 성숙함이 보였다는 평가입니다.`;
    posts = ['인터뷰 진짜 잘하네', '나이에 비해 엄청 성숙하다', '이 선수 오래 갈 듯', '말하는 거 들으니까 게임 이해도가 보임'];
  } else if (r.sc >= 50) {
    title = `${p.nick} "다음 경기도 자신 있다"`;
    body = `${t.name} ${p.nick}이(가) POM으로 선정되었습니다. 경기 후 인터뷰에서 소감과 각오를 밝혔습니다.`;
    posts = ['무난무난', '잘했다 ㅊㅊ', '다음 경기도 이렇게만', '인터뷰는 평범한데 플레이는 좋았음'];
  } else {
    title = `${p.nick}, POM 인터뷰서 진땀`;
    body = `${t.name} ${p.nick}이(가) POM 인터뷰에서 다소 긴장한 모습을 보였습니다.`;
    posts = ['긴장한 거 귀엽네 ㅋㅋ', '인터뷰는 연습 좀 해야 할 듯', '말은 좀 그래도 플레이는 확실', '뭔 말인지 하나도 모르겠다 ㅋㅋ'];
  }
  if (r.humble && !r.arrogant) posts.push('겸손하네 좋다');
  return { title, body, posts: R.shuffle(posts).slice(0, 4) };
}
