'use strict';
// ============ 기본 데이터 (2026 월즈 시점 로스터 기준) ============
const POS = ['TOP', 'JUNGLE', 'MID', 'AD', 'SUP'];
const PK = { TOP: '탑', JUNGLE: '정글', MID: '미드', AD: '원딜', SUP: '서포터' };
const SK = ['lane', 'phys', 'skirm', 'tf', 'vis', 'men'];
const SN = { lane: '라인전', phys: '피지컬', skirm: '소규모 교전', tf: '한타', vis: '시야', men: '멘탈' };

// 챔피언 PS 스코어: lol.ps 라인별 챔피언 티어, 26.22 패치, 한국 에메랄드+, 2026-11-06 05:51 KST 기준
// (대회 단골 챔피언 몇 개는 목록 밖이라 추정치로 보충: 표시 *)
const PATCH_START = { major: 26, minor: 22 };
const CHAMP_PS = {
  TOP: { '갱플랭크': 56.27, '말파이트': 55.65, '제이스': 54.53, '이렐리아': 54.19, '다리우스': 53.90, '요네': 53.35, '피오라': 52.51, '아칼리': 52.50, '잭스': 52.44, '하이머딩거': 52.41, '신지드': 52.15, '워윅': 52.14, '티모': 51.94, '판테온': 51.77, '사이온': 51.68, '레넥톤': 51.65, '세트': 51.49, '카밀': 51.43, '케넨': 51.32, '리산드라': 50.86, '자헨': 50.73, '아트록스': 50.64, '문도 박사': 50.52, '케일': 50.39, '리븐': 50.37, '올라프': 50.25, '트린다미어': 50.11, '모데카이저': 50.09, '암베사': 49.35, '나르': 49.08, '오른': 48.84, '크산테': 48.51, '럼블': 47.76, '그웬': 45.07 },
  JUNGLE: { '니달리': 55.07, '나피리': 54.33, '리 신': 54.21, '사일러스': 54.01, '자이라': 53.40, '릴리아': 53.13, '탈리야': 52.75, '헤카림': 52.55, '엘리스': 52.27, '오공': 52.19, '킨드레드': 51.84, '자르반 4세': 51.68, '바이': 51.30, '자크': 51.28, '마스터 이': 51.19, '렉사이': 51.13, '신 짜오': 50.85, '케인': 50.85, '그레이브즈': 50.77, '초가스': 50.74, '이블린': 50.62, '키아나': 50.26, '샤코': 50.02, '탈론': 49.85, '카서스': 49.80, '누누와 윌럼프': 49.71, '에코': 49.67, '브라이어': 49.56, '세주아니': 49.0, '마오카이': 48.8, '스카너': 48.5 },
  MID: { '트위스티드 페이트': 55.93, '르블랑': 55.40, '카타리나': 54.59, '제드': 54.47, '아칼리': 54.41, '조이': 54.19, '사일러스': 54.05, '리산드라': 53.29, '아리': 52.94, '에코': 52.75, '요네': 52.62, '다이애나': 52.53, '키아나': 52.41, '벡스': 52.36, '탈리야': 52.25, '오로라': 52.20, '흐웨이': 52.10, '신드라': 51.87, '아우렐리온 솔': 51.87, '피즈': 51.73, '오리아나': 51.68, '로크': 51.56, '탈론': 51.51, '빅토르': 51.47, '애니': 51.31, '애니비아': 51.21, '블라디미르': 51.21, '말자하': 51.09, '갈리오': 49.8, '아지르': 49.5, '멜': 49.2, '코르키': 49.0 },
  AD: { '자야': 55.33, '진': 54.00, '징크스': 53.09, '카이사': 52.32, '드레이븐': 51.90, '유나라': 51.82, '스웨인': 50.76, '제리': 50.72, '아펠리오스': 50.65, '미스 포츈': 50.55, '야스오': 50.44, '시비르': 49.82, '사미라': 49.82, '코그모': 49.62, '루시안': 49.54, '스몰더': 49.07, '트위치': 49.02, '칼리스타': 48.74, '제라스': 48.67, '트리스타나': 48.66, '코르키': 48.64, '케이틀린': 48.42, '바루스': 48.39, '애쉬': 47.61, '이즈리얼': 47.30, '직스': 46.96 },
  SUP: { '쓰레쉬': 56.18, '블리츠크랭크': 55.16, '룰루': 54.89, '알리스타': 54.05, '레오나': 54.05, '브라움': 53.24, '파이크': 53.06, '렐': 52.48, '라칸': 52.45, '바드': 51.59, '질리언': 51.58, '뽀삐': 51.49, '벨코즈': 51.37, '노틸러스': 51.34, '럭스': 51.24, '자이라': 51.23, '세나': 50.97, '카르마': 50.93, '아무무': 50.74, '유미': 50.63, '세라핀': 50.51, '마오카이': 50.49, '엘리스': 50.20, '소나': 49.99, '니코': 49.97, '판테온': 49.81, '스웨인': 49.59, '갈리오': 49.49 }
};
const CHAMPS = Object.fromEntries(Object.entries(CHAMP_PS).map(([k, v]) => [k, Object.keys(v)]));

// 지역: KR CN EU NA AP BR
// 코치: [닉, 이름, 육성, 전략, 용병술, 사기진작, [승부욕,야망,겸손함,스타성]]
// 선수: [닉, 이름, 나이, 포지션, OVR, 스탯 치우침, 잠재력, [승부욕,야망,겸손함,스타성], 인지도, 연봉(억), 특성키[]]
const REAL_TEAMS = [
  // ---------------- LCK ----------------
  { id: 'GEN', name: '젠지', full: 'Gen.G', region: 'KR', color: '#A8894D',
    coaches: [['KIM', '김정수', 440, 475, 470, 450, [98, 95, 20, 85]], ['Mata', '조세형', 420, 460, 455, 430, [95, 90, 40, 90]]],
    players: [
      ['Kiin', '김기인', 27, 'TOP', 450, { tf: 6, men: 10, vis: -12, phys: -4 }, 456, [65, 40, 98, 30], 5600, 12, ['steady']],
      ['Canyon', '김건부', 25, 'JUNGLE', 458, { lane: 15, phys: 10, vis: -8, men: -10 }, 468, [88, 70, 95, 55], 7000, 20, ['architect']],
      ['Chovy', '정지훈', 25, 'MID', 467, { lane: 24, phys: 20, vis: -22, men: -20 }, 480, [92, 85, 80, 78], 7900, 25, ['laneMonster', 'mvp26']],
      ['Ruler', '박재혁', 28, 'AD', 456, { tf: 22, men: 12, vis: -26 }, 462, [95, 90, 75, 82], 7400, 22, ['closer']],
      ['Duro', '주민규', 24, 'SUP', 440, { vis: 18, tf: 8, lane: -10, phys: -10 }, 452, [70, 65, 85, 45], 4300, 6, []]
    ] },
  { id: 'HLE', name: '한화생명e스포츠', full: 'Hanwha Life Esports', region: 'KR', color: '#F37321',
    coaches: [['DanDy', '최인규', 435, 465, 460, 445, [92, 88, 65, 75]], ['Mowgli', '이재하', 415, 450, 440, 425, [80, 85, 80, 50]]],
    players: [
      ['Zeus', '최우제', 22, 'TOP', 455, { phys: 15, lane: 10, vis: -20, men: -8 }, 476, [75, 70, 85, 82], 6700, 20, ['topCarry']],
      ['Kanavi', '서진혁', 26, 'JUNGLE', 452, { lane: 18, skirm: 12, vis: -12, men: -15 }, 458, [95, 92, 65, 80], 6800, 18, ['aggroJungle']],
      ['Zeka', '김건우', 24, 'MID', 452, { phys: 16, skirm: 10, vis: -25, lane: -6 }, 462, [94, 92, 50, 72], 5900, 15, []],
      ['Gumayusi', '이민형', 24, 'AD', 455, { men: 28, tf: 10, vis: -28 }, 464, [98, 98, 15, 95], 7000, 18, ['ironWill']],
      ['Delight', '유환중', 24, 'SUP', 450, { tf: 18, skirm: 8, lane: -22 }, 460, [70, 65, 95, 35], 4600, 10, []]
    ] },
  { id: 'T1', name: 'T1', full: 'T1', region: 'KR', color: '#E2012D',
    coaches: [['kkOma', '김정균', 480, 460, 450, 495, [90, 85, 90, 98]], ['Tom', '임재현', 420, 485, 480, 430, [85, 80, 75, 65]]],
    players: [
      ['Doran', '최현준', 26, 'TOP', 438, { tf: 8, phys: 6, vis: -18, men: -8 }, 445, [65, 60, 90, 50], 5300, 10, []],
      ['Oner', '문현준', 24, 'JUNGLE', 452, { phys: 14, skirm: 10, lane: -8, vis: -16 }, 462, [90, 80, 75, 72], 6100, 15, ['worldsChamp']],
      ['Faker', '이상혁', 30, 'MID', 462, { men: 40, tf: 24, vis: 18, lane: -30, phys: -34 }, 470, [100, 95, 100, 100], 9400, 50, ['unkillable', 'worldsChamp', 'agelessKing']],
      ['Peyz', '김수환', 21, 'AD', 452, { phys: 20, lane: 12, vis: -25, men: -10 }, 476, [88, 90, 70, 78], 5600, 12, []],
      ['Keria', '류민석', 24, 'SUP', 460, { vis: 22, phys: 14, lane: 10, men: -30 }, 468, [96, 90, 30, 90], 6900, 18, ['supPhysical', 'worldsChamp']]
    ] },
  { id: 'DK', name: 'Dplus KIA', full: 'Dplus KIA', region: 'KR', color: '#20C5B8',
    coaches: [['Zefa', '이재민', 445, 485, 475, 430, [82, 75, 95, 60]], ['Bubbling', '박준형', 430, 440, 435, 415, [78, 70, 88, 45]]],
    players: [
      ['Siwoo', '전시우', 19, 'TOP', 426, { phys: 18, lane: 6, vis: -25 }, 456, [92, 95, 30, 75], 2900, 3, []],
      ['Lucid', '최용혁', 22, 'JUNGLE', 440, { phys: 16, skirm: 8, men: -12, vis: -10 }, 458, [75, 85, 80, 55], 4400, 6, []],
      ['ShowMaker', '허수', 26, 'MID', 446, { tf: 8, skirm: 6 }, 452, [90, 85, 60, 98], 7300, 15, ['worldsChamp']],
      ['Smash', '신금재', 19, 'AD', 438, { phys: 18, lane: 8, vis: -22, men: -6 }, 466, [95, 98, 20, 82], 3900, 4, []],
      ['Career', 'Career', 21, 'SUP', 425, { skirm: 8, vis: 10, lane: -8, phys: -6 }, 448, [80, 75, 80, 40], 2600, 3, []]
    ] },
  { id: 'KT', name: 'KT 롤스터', full: 'KT Rolster', region: 'KR', color: '#D7141A',
    coaches: [['Hirai', '강동훈', 470, 440, 445, 485, [88, 80, 60, 70]], ['Supreme', '최승민', 425, 435, 440, 420, [75, 70, 85, 40]]],
    players: [
      ['PerfecT', '이승민', 21, 'TOP', 425, { phys: 16, lane: -4, vis: -12 }, 452, [70, 88, 75, 45], 3700, 4, []],
      ['Cuzz', '문우찬', 27, 'JUNGLE', 430, { vis: 14, lane: 8, phys: -10 }, 435, [82, 70, 88, 52], 5400, 8, []],
      ['Bdd', '곽보성', 27, 'MID', 444, { lane: 6, tf: 8, vis: -10 }, 448, [82, 70, 95, 58], 6300, 12, []],
      ['Aiming', '김하람', 26, 'AD', 440, { phys: 12, lane: 8, vis: -22 }, 446, [88, 82, 40, 72], 5300, 9, []],
      ['Ghost', '장용준', 30, 'SUP', 420, { men: 18, vis: 12, phys: -18 }, 425, [75, 60, 85, 55], 4500, 4, []]
    ] },
  { id: 'NS', name: '농심 레드포스', full: 'Nongshim RedForce', region: 'KR', color: '#DE2027',
    coaches: [['Irean', '허영철', 440, 430, 425, 435, [78, 75, 80, 45]], ['Chelly', '박승진', 420, 415, 410, 425, [75, 70, 85, 35]]],
    players: [
      ['Kingen', '황성훈', 26, 'TOP', 428, { tf: 12, lane: -6 }, 432, [80, 75, 82, 65], 4900, 6, []],
      ['Sponge', 'Sponge', 21, 'JUNGLE', 410, { phys: 10, vis: -8 }, 440, [75, 80, 75, 35], 1800, 2, []],
      ['Scout', '이예찬', 28, 'MID', 438, { tf: 6, men: 6 }, 442, [92, 88, 75, 85], 6700, 10, ['worldsChamp']],
      ['Taeyoon', '김태윤', 24, 'AD', 412, {}, 425, [65, 55, 80, 32], 2700, 2, []],
      ['Lehends', '손시우', 27, 'SUP', 435, { vis: 20, skirm: 10, lane: -14, phys: -12 }, 440, [60, 50, 85, 90], 5000, 6, []]
    ] },
  { id: 'BFX', name: 'BNK 피어엑스', full: 'BNK FearX', region: 'KR', color: '#F5B700',
    coaches: [['Ryu', '유상욱', 425, 440, 435, 420, [85, 80, 85, 70]], ['Acorn', '최천주', 415, 450, 445, 410, [80, 75, 88, 60]]],
    players: [
      ['Clear', '송현민', 23, 'TOP', 410, { phys: 10 }, 430, [65, 55, 82, 30], 2500, 2, []],
      ['Raptor', 'Raptor', 21, 'JUNGLE', 415, { phys: 10, skirm: 8, vis: -10 }, 445, [80, 80, 70, 40], 2300, 2, []],
      ['VicLa', 'VicLa', 22, 'MID', 422, { phys: 12, lane: 8, vis: -14 }, 448, [80, 80, 65, 50], 3200, 3, []],
      ['Diable', 'Diable', 21, 'AD', 418, { phys: 12, vis: -10 }, 450, [85, 85, 65, 45], 2600, 2, []],
      ['Kellin', '김형규', 26, 'SUP', 420, { vis: 14, men: 12, phys: -12 }, 425, [50, 40, 98, 25], 3600, 3, []]
    ] },
  { id: 'BRO', name: '한진 브리온', full: 'HANJIN BRION', region: 'KR', color: '#1E7B4D',
    coaches: [['Edgar', '최우범', 485, 430, 420, 460, [90, 60, 80, 60]], ['Drinker', '이승후', 410, 405, 415, 400, [70, 65, 90, 30]]],
    players: [
      ['Casting', 'Casting', 21, 'TOP', 405, { phys: 10 }, 440, [70, 75, 80, 28], 1600, 1, []],
      ['GIDEON', '김민성', 23, 'JUNGLE', 400, {}, 420, [55, 45, 85, 20], 2300, 1.5, []],
      ['Fisher', '이정태', 21, 'MID', 405, { phys: 8 }, 440, [75, 85, 75, 40], 2000, 1.5, []],
      ['Teddy', '박진성', 28, 'AD', 418, { tf: 12, men: 10, phys: -10 }, 422, [80, 60, 90, 70], 5200, 4, []],
      ['Namgung', 'Namgung', 21, 'SUP', 400, { vis: 8 }, 430, [60, 60, 85, 25], 1200, 1, []]
    ] },
  { id: 'DNS', name: 'DN 수퍼스', full: 'DN SOOPers', region: 'KR', color: '#3C5BD9',
    coaches: [['cvMax', '김대호', 495, 450, 430, 410, [100, 95, 5, 95]], ['FanTaSy', '정명훈', 435, 420, 415, 445, [85, 75, 80, 65]]],
    players: [
      ['DuDu', '이동주', 24, 'TOP', 418, { phys: 6 }, 428, [75, 60, 80, 42], 3800, 3, []],
      ['Pyosik', '홍창현', 26, 'JUNGLE', 425, { skirm: 12, vis: -8 }, 430, [98, 85, 30, 92], 5800, 5, ['worldsChamp']],
      ['Clozer', '이주현', 23, 'MID', 425, { phys: 18, lane: 6, vis: -18, men: -10 }, 445, [85, 82, 45, 75], 5000, 4, []],
      ['deokdam', 'deokdam', 26, 'AD', 415, { tf: 6 }, 420, [70, 60, 80, 40], 3000, 2.5, []],
      ['Peter', '정윤수', 23, 'SUP', 405, { vis: 10 }, 425, [60, 45, 90, 25], 2200, 1.5, []]
    ] },
  { id: 'DRX', name: '키움 DRX', full: 'KIWOOM DRX', region: 'KR', color: '#5A8BD6', gen: 400, coaches: null, players: null },

  // ---------------- LPL ----------------
  { id: 'AL', name: "Anyone's Legend", full: "Anyone's Legend", region: 'CN', color: '#C9A227', coaches: null,
    players: [
      ['Breathe', 'Breathe', 24, 'TOP', 440, { phys: 8 }, 448, [85, 82, 70, 60], 4600, 8, []],
      ['Tarzan', '이승용', 27, 'JUNGLE', 448, { lane: 14, vis: 10, men: -6 }, 452, [85, 80, 85, 65], 5600, 12, []],
      ['Shanks', 'Shanks', 24, 'MID', 446, { phys: 10, lane: 6 }, 455, [85, 85, 70, 60], 4500, 9, []],
      ['hope', 'hope', 25, 'AD', 447, { tf: 10, lane: 6 }, 452, [88, 82, 72, 62], 4700, 9, []],
      ['Kael', '김진홍', 25, 'SUP', 440, { vis: 12, skirm: 6 }, 446, [80, 75, 85, 50], 3900, 6, []]
    ] },
  { id: 'BLG', name: 'Bilibili Gaming', full: 'Bilibili Gaming', region: 'CN', color: '#00A1D6',
    coaches: [['Bigwei', 'Bigwei', 440, 470, 460, 450, [90, 95, 40, 75]], ['Xinyi', 'Xinyi', 420, 445, 450, 420, [85, 80, 65, 60]]],
    players: [
      ['Bin', '천쩌빈', 22, 'TOP', 461, { phys: 20, skirm: 18, vis: -30, men: -8 }, 472, [100, 95, 10, 95], 7400, 20, ['soloKiller']],
      ['XUN', '펑리쉰', 23, 'JUNGLE', 444, { skirm: 14, phys: 8, vis: -14 }, 452, [88, 85, 40, 65], 5600, 9, []],
      ['Knight', '줘딩', 25, 'MID', 460, { lane: 18, phys: 12, vis: -18 }, 466, [90, 85, 60, 82], 7100, 18, []],
      ['Viper', '박도현', 24, 'AD', 460, { lane: 14, phys: 12, tf: 10, vis: -26 }, 466, [95, 90, 88, 78], 6800, 18, ['worldsChamp']],
      ['ON', '뤄원쥔', 22, 'SUP', 446, { phys: 14, lane: 10, men: -16 }, 458, [85, 80, 35, 75], 5300, 8, []]
    ] },
  { id: 'TES', name: 'Top Esports', full: 'Top Esports', region: 'CN', color: '#FF6A13',
    coaches: [['Maokai', 'Maokai', 435, 465, 460, 455, [88, 85, 70, 65]], ['Despaer', 'Despaer', 420, 450, 440, 430, [80, 75, 80, 45]]],
    players: [
      ['369', '바이자하오', 24, 'TOP', 444, { tf: 14, men: 6, vis: -12 }, 450, [88, 85, 80, 72], 6000, 12, []],
      ['Tian', '가오톈량', 25, 'JUNGLE', 440, { lane: 14, vis: 8, men: -18 }, 445, [95, 90, 45, 85], 6400, 12, ['worldsChamp']],
      ['Creme', '린젠', 21, 'MID', 438, { phys: 16, lane: 4, vis: -16 }, 458, [82, 80, 75, 55], 4400, 7, []],
      ['JackeyLove', '위원보', 24, 'AD', 450, { phys: 12, skirm: 8, vis: -24 }, 455, [98, 95, 20, 98], 7700, 18, ['worldsChamp']],
      ['Zhuo', '왕줘', 24, 'SUP', 425, { vis: 10 }, 435, [65, 60, 88, 30], 2600, 3, []]
    ] },
  { id: 'IG', name: 'Invictus Gaming', full: 'Invictus Gaming', region: 'CN', color: '#B8B8B8', coaches: null,
    players: [
      ['TheShy', '강승록', 26, 'TOP', 448, { phys: 20, lane: 15, vis: -30, men: -10 }, 452, [95, 85, 60, 95], 8100, 18, ['soloKiller', 'worldsChamp']],
      ['Wei', '옌양웨이', 23, 'JUNGLE', 440, { vis: 10, skirm: 6 }, 448, [82, 80, 78, 55], 4600, 8, []],
      ['Rookie', '송의진', 28, 'MID', 448, { men: 12, tf: 6, phys: -8 }, 452, [95, 85, 98, 95], 7800, 15, ['worldsChamp', 'veteranMid']],
      ['JiaQi', 'JiaQi', 21, 'AD', 440, { phys: 14, vis: -16 }, 458, [85, 85, 70, 55], 3800, 6, []],
      ['meiko', '톈예', 27, 'SUP', 450, { vis: 25, men: 18, phys: -20, lane: -6 }, 454, [90, 88, 85, 82], 7200, 14, ['commander', 'worldsChamp']]
    ] },
  { id: 'JDG', name: 'JD Gaming', full: 'JD Gaming', region: 'CN', color: '#C8102E', gen: 425 },
  { id: 'WBG', name: 'Weibo Gaming', full: 'Weibo Gaming', region: 'CN', color: '#E6162D', gen: 420 },
  { id: 'LNG', name: 'LNG Esports', full: 'LNG Esports', region: 'CN', color: '#2D5BE3', gen: 418 },
  { id: 'EDG', name: 'EDward Gaming', full: 'EDward Gaming', region: 'CN', color: '#3B3B3B', gen: 410,
    coaches: [['Clearlove', '밍카이', 450, 460, 455, 480, [95, 90, 40, 98]], ['Poppy', '펑옌치', 435, 440, 435, 425, [82, 78, 85, 55]]] },

  // ---------------- LEC ----------------
  { id: 'G2', name: 'G2 Esports', full: 'G2 Esports', region: 'EU', color: '#F4F4F4',
    coaches: [['Dylan Falco', '딜런 팔코', 440, 490, 480, 460, [90, 95, 65, 85]], ['Duffman', '크리스토퍼 토퍼', 420, 470, 450, 430, [80, 75, 80, 45]]],
    players: [
      ['BrokenBlade', '세르겐 첼리크', 26, 'TOP', 438, { tf: 10, vis: -14 }, 442, [85, 80, 65, 85], 5300, 8, []],
      ['SkewMond', 'SkewMond', 21, 'JUNGLE', 435, { phys: 12, skirm: 10, vis: -14 }, 456, [88, 85, 60, 60], 3600, 5, []],
      ['Caps', '라스무스 빈터', 26, 'MID', 455, { tf: 12, skirm: 8, vis: -6 }, 460, [95, 90, 85, 98], 7500, 18, ['kingOfEurope']],
      ['Hans Sama', '스테벤 리브', 26, 'AD', 436, { lane: 12, vis: -16 }, 440, [82, 75, 80, 75], 6100, 8, []],
      ['Labrov', '람브로스 파푸차키스', 24, 'SUP', 430, { vis: 12 }, 438, [65, 55, 95, 38], 2400, 3, []]
    ] },
  { id: 'KOI', name: 'Movistar KOI', full: 'Movistar KOI', region: 'EU', color: '#00A9E0',
    coaches: [['Melzhet', '토마스 캄펠로스', 470, 455, 450, 460, [95, 90, 30, 75]], ['Zeph', '킬리안 로랑', 440, 435, 425, 430, [80, 85, 70, 55]]],
    players: [
      ['Myrwn', 'Myrwn', 22, 'TOP', 418, { phys: 8 }, 438, [85, 80, 60, 55], 2500, 2, []],
      ['Elyoya', 'Elyoya', 26, 'JUNGLE', 440, { skirm: 14, vis: -8 }, 444, [99, 95, 15, 82], 5000, 6, []],
      ['jojopyun', '조셉 준 편', 23, 'MID', 432, { phys: 12, lane: 8, vis: -18 }, 448, [96, 92, 10, 88], 4600, 6, []],
      ['Supa', 'Supa', 24, 'AD', 428, { phys: 8, vis: -12 }, 436, [92, 88, 20, 68], 3500, 4, []],
      ['Alvaro', 'Alvaro', 22, 'SUP', 428, { skirm: 8 }, 442, [80, 75, 70, 50], 2700, 3, []]
    ] },
  { id: 'KC', name: 'Karmine Corp', full: 'Karmine Corp', region: 'EU', color: '#1C8CE3',
    coaches: [['YamatoCannon', '야코프 멥디', 440, 435, 430, 495, [95, 90, 15, 100]], ['Reha', '파티흐 샤힌', 425, 430, 420, 415, [75, 70, 80, 45]]],
    players: [
      ['Canna', '김창동', 26, 'TOP', 425, { phys: 8, vis: -10 }, 430, [85, 80, 75, 60], 4700, 5, ['worldsChamp']],
      ['Yike', '마르틴 순델린', 24, 'JUNGLE', 438, { phys: 10, skirm: 8, vis: -12 }, 445, [88, 90, 40, 60], 4300, 5, []],
      ['Kyeahoo', '강예후', 21, 'MID', 432, { phys: 12, lane: 8, vis: -14 }, 455, [85, 85, 70, 55], 3000, 3, []],
      ['Caliste', '칼리스트 앙리엔베르', 19, 'AD', 440, { phys: 18, lane: 10, vis: -22, men: -6 }, 470, [95, 100, 15, 90], 4600, 5, []],
      ['Busio', 'Busio', 22, 'SUP', 425, { vis: 10 }, 440, [78, 75, 75, 50], 2600, 3, []]
    ] },
  { id: 'FNC', name: 'Fnatic', full: 'Fnatic', region: 'EU', color: '#FF5900', gen: 418,
    coaches: [['Nightshare', '토마시 크네지네크', 445, 450, 440, 470, [85, 80, 70, 60]], ['Pad', 'Pad', 430, 440, 435, 420, [75, 70, 85, 40]]] },
  { id: 'TH', name: 'Team Heretics', full: 'Team Heretics', region: 'EU', color: '#C7A86C', gen: 410,
    coaches: [['Peter Dun', '피터 던', 485, 460, 440, 430, [82, 75, 85, 65]], ['Machuki', '빅토르 마추카', 420, 440, 435, 450, [85, 80, 70, 60]]] },
  { id: 'VIT', name: 'Team Vitality', full: 'Team Vitality', region: 'EU', color: '#F5E100', gen: 408 },
  { id: 'BDS', name: 'Team BDS', full: 'Team BDS', region: 'EU', color: '#E6007E', gen: 405,
    coaches: [['Striker', '야니스 켈라', 450, 465, 460, 440, [92, 85, 45, 70]], ['GotoOne', 'GotoOne', 430, 440, 430, 425, [78, 75, 80, 50]]] },
  { id: 'GX', name: 'GIANTX', full: 'GIANTX', region: 'EU', color: '#8A5CF6', gen: 402 },

  // ---------------- LCS ----------------
  { id: 'TL', name: 'Team Liquid', full: 'Team Liquid Alienware', region: 'NA', color: '#0A2240',
    coaches: [['Spawn', '제이크 티베리', 465, 450, 460, 480, [88, 85, 70, 75]], ['Reignover', '김의진', 450, 440, 435, 420, [85, 80, 85, 70]]],
    players: [
      ['Morgan', '박기태', 24, 'TOP', 415, { men: 12, vis: -8 }, 425, [75, 50, 100, 50], 4000, 4, []],
      ['Josedeodo', 'Josedeodo', 26, 'JUNGLE', 420, { skirm: 8 }, 426, [80, 75, 70, 55], 3300, 4, []],
      ['Quid', '임현승', 23, 'MID', 425, { phys: 12, lane: 8, vis: -12 }, 440, [80, 80, 80, 45], 3200, 4, []],
      ['Yeon', 'Yeon', 23, 'AD', 425, { phys: 10, tf: 6 }, 438, [82, 80, 78, 48], 3000, 4, []],
      ['CoreJJ', '조용인', 32, 'SUP', 428, { vis: 25, men: 18, phys: -20, lane: -8 }, 430, [90, 85, 80, 82], 7100, 8, ['commander', 'worldsChamp']]
    ] },
  { id: 'LYON', name: 'LYON', full: 'LYON', region: 'NA', color: '#E9B200', coaches: null,
    players: [
      ['Dhokla', 'Dhokla', 26, 'TOP', 410, { tf: 6 }, 415, [75, 70, 80, 50], 2600, 3, []],
      ['Inspired', '카츠페르 스워마', 25, 'JUNGLE', 436, { phys: 10, lane: 10, vis: -10 }, 440, [99, 95, 5, 80], 4700, 6, []],
      ['Saint', 'Saint', 25, 'MID', 420, { phys: 8 }, 426, [80, 78, 75, 50], 2800, 3, []],
      ['Berserker', '김민철', 24, 'AD', 436, { phys: 14, lane: 10, vis: -18 }, 444, [90, 88, 70, 70], 4500, 6, []],
      ['Isles', 'Isles', 26, 'SUP', 414, { vis: 10 }, 418, [70, 65, 85, 40], 2400, 2, []]
    ] },
  { id: 'C9', name: 'Cloud9', full: 'Cloud9 KIA', region: 'NA', color: '#00AEEF',
    coaches: [['Reapered', '복한규', 450, 485, 470, 465, [98, 92, 20, 95]], ['Veigarv2', '마리우스 아우네', 415, 490, 440, 400, [90, 85, 15, 50]]],
    players: [
      ['Thanatos', '박승규', 22, 'TOP', 415, { phys: 12, vis: -10 }, 440, [82, 85, 75, 50], 2600, 3, []],
      ['Blaber', '로버트 황', 27, 'JUNGLE', 428, { skirm: 16, vis: -14 }, 432, [95, 88, 40, 85], 5800, 6, []],
      ['Loki', 'Loki', 21, 'MID', 412, { phys: 10 }, 440, [80, 82, 70, 45], 1800, 2, []],
      ['Tactical', 'Tactical', 25, 'AD', 420, { lane: 10 }, 426, [82, 78, 70, 55], 3600, 4, []],
      ['Vulcan', 'Vulcan', 28, 'SUP', 418, { vis: 12, skirm: 6 }, 420, [80, 75, 75, 60], 4200, 4, []]
    ] },
  { id: 'FLY', name: 'FlyQuest', full: 'FlyQuest', region: 'NA', color: '#1D8348', gen: 405,
    coaches: [['Nukeduck', '에를렌 보테비크 홀름', 430, 475, 450, 440, [85, 88, 60, 65]], ['Arrow', '노동현', 425, 430, 420, 445, [80, 75, 90, 55]]] },
  { id: 'SR', name: 'Shopify Rebellion', full: 'Shopify Rebellion', region: 'NA', color: '#95BF47', gen: 395 },
  { id: 'DIG', name: 'Dignitas', full: 'Dignitas', region: 'NA', color: '#FDB515', gen: 390 },

  // ---------------- LCP ----------------
  { id: 'TSW', name: 'Team Secret Whales', full: 'Team Secret Whales', region: 'AP', color: '#9AA4AF', coaches: null,
    players: [
      ['Pun', 'Pun', 22, 'TOP', 410, { phys: 8 }, 430, [80, 80, 75, 45], 2000, 1.5, []],
      ['Hizto', 'Hizto', 24, 'JUNGLE', 412, { skirm: 8 }, 425, [82, 78, 70, 50], 2200, 1.5, []],
      ['Dire', 'Dire', 23, 'MID', 410, {}, 425, [78, 75, 75, 45], 1900, 1.5, []],
      ['Eddie', 'Eddie', 24, 'AD', 412, { phys: 6 }, 425, [80, 78, 72, 48], 2000, 1.5, []],
      ['Bie', 'Bie', 22, 'SUP', 405, { vis: 8 }, 425, [70, 70, 80, 40], 1600, 1, []]
    ] },
  { id: 'CFO', name: 'CTBC Flying Oyster', full: 'CTBC Flying Oyster', region: 'AP', color: '#0F8F6E', coaches: null,
    players: [
      ['Rest', 'Rest', 21, 'TOP', 410, { phys: 10 }, 435, [80, 85, 70, 45], 1900, 1.5, []],
      ['Shad0w', 'Shad0w', 24, 'JUNGLE', 420, { skirm: 10 }, 428, [85, 80, 70, 60], 2600, 2, []],
      ['Pout', 'Pout', 23, 'MID', 410, {}, 425, [78, 75, 75, 45], 1800, 1.5, []],
      ['Doggo', 'Doggo', 24, 'AD', 425, { phys: 12, lane: 8, vis: -12 }, 432, [88, 85, 60, 65], 3300, 3, []],
      ['Kino', 'Kino', 24, 'SUP', 410, { vis: 10 }, 420, [72, 70, 80, 40], 1700, 1.5, []]
    ] },
  { id: 'MVK', name: 'MVK Esports', full: 'MVK Esports', region: 'AP', color: '#D6336C', coaches: null,
    players: [
      ['Kratos', 'Kratos', 23, 'TOP', 395, {}, 410, [75, 70, 75, 40], 1400, 1, []],
      ['Gury', 'Gury', 22, 'JUNGLE', 395, { skirm: 6 }, 412, [78, 72, 72, 40], 1300, 1, []],
      ['Chika', 'Chika', 22, 'MID', 395, { phys: 6 }, 415, [80, 75, 70, 45], 1500, 1, []],
      ['Harky', 'Harky', 23, 'AD', 398, { phys: 6 }, 412, [78, 75, 72, 42], 1400, 1, []],
      ['SiuLoong', 'SiuLoong', 22, 'SUP', 392, { vis: 6 }, 410, [70, 68, 80, 35], 1100, 0.8, []]
    ] },
  { id: 'PSG', name: 'PSG Talon', full: 'PSG Talon', region: 'AP', color: '#004170', gen: 398,
    coaches: [['CorGi', '청핀룬', 440, 465, 450, 445, [85, 80, 75, 60]], ['Maru', '저우보쥔', 420, 430, 425, 410, [75, 70, 85, 35]]] },
  { id: 'GAM', name: 'GAM Esports', full: 'GAM Esports', region: 'AP', color: '#F7B500', gen: 395,
    coaches: [['Archie', '쩐민녓', 445, 440, 455, 470, [95, 90, 40, 88]], ['Hype', '당타인허우', 410, 420, 430, 425, [80, 75, 70, 50]]] },
  { id: 'SHG', name: 'Fukuoka SoftBank HAWKS', full: 'Fukuoka SoftBank HAWKS gaming', region: 'AP', color: '#F6AB00', gen: 388,
    coaches: [['VicaL', '김선묵', 435, 445, 440, 450, [82, 75, 85, 55]], ['Tussle', '이문용', 420, 415, 425, 440, [88, 80, 65, 60]]] },

  // ---------------- CBLOL ----------------
  { id: 'LOS', name: 'LØS', full: 'LØS', region: 'BR', color: '#7B2CBF', coaches: null,
    players: [
      ['ZEST', 'ZEST', 23, 'TOP', 400, { phys: 6 }, 415, [80, 75, 72, 45], 1500, 1, []],
      ['Curse', 'Curse', 23, 'JUNGLE', 398, {}, 412, [78, 72, 75, 42], 1400, 1, []],
      ['Feisty', 'Feisty', 22, 'MID', 395, { phys: 6 }, 415, [80, 78, 70, 45], 1300, 1, []],
      ['Duduhh', 'Duduhh', 24, 'AD', 402, { phys: 6 }, 412, [82, 75, 70, 50], 1700, 1, []],
      ['Ackerman', 'Ackerman', 23, 'SUP', 395, { vis: 6 }, 410, [70, 65, 80, 38], 1200, 0.8, []]
    ] },
  { id: 'FUR', name: 'FURIA', full: 'FURIA', region: 'BR', color: '#E5E5E5', coaches: null,
    players: [
      ['Guigo', 'Guigo', 24, 'TOP', 395, {}, 408, [80, 72, 72, 45], 1500, 1, []],
      ['Tatu', 'Tatu', 23, 'JUNGLE', 395, { skirm: 6 }, 410, [82, 75, 70, 45], 1400, 1, []],
      ['Tutsz', 'Tutsz', 23, 'MID', 398, { phys: 6 }, 412, [80, 76, 72, 48], 1500, 1, []],
      ['Ayu', 'Ayu', 24, 'AD', 400, { phys: 6 }, 410, [82, 78, 70, 50], 1600, 1, []],
      ['Jojo', 'Jojo', 23, 'SUP', 392, { vis: 6 }, 406, [70, 65, 80, 35], 1100, 0.8, []]
    ] },
  { id: 'LOUD', name: 'LOUD', full: 'LOUD', region: 'BR', color: '#00E676', gen: 390,
    coaches: [['Stardust', '손석희', 440, 455, 445, 450, [85, 80, 75, 60]], ['BeellzY', 'BeellzY', 410, 430, 425, 420, [75, 70, 85, 40]]] },
  { id: 'PNG', name: 'paiN Gaming', full: 'paiN Gaming', region: 'BR', color: '#D50000', gen: 388 },
  { id: 'RED', name: 'RED Canids', full: 'RED Canids', region: 'BR', color: '#B71C1C', gen: 382 },
  { id: 'FLX', name: 'Fluxo W7M', full: 'Fluxo W7M', region: 'BR', color: '#6D28D9', gen: 380 }
];

// 2군: [id, 이름, 모팀, 평균 OVR, 감독 코치(없으면 생성)]
const ACADEMIES = [
  ['T1A', 'T1 이스포츠 아카데미', 'T1', 378, [['GBM', '이창석', 460, 420, 415, 475, [95, 90, 25, 85]], ['Roach', '김지환', 440, 435, 420, 410, [75, 60, 95, 55]]]],
  ['GENA', '젠지 글로벌 아카데미', 'GEN', 378, [['Bingo', '최재영', 455, 425, 420, 440, [70, 75, 85, 35]]]],
  ['HLEC', '한화생명e스포츠 챌린저스', 'HLE', 376, null],
  ['DKC', 'Dplus KIA 챌린저스', 'DK', 376, [['Hachani', '하승찬', 450, 440, 425, 415, [82, 80, 65, 45]]]],
  ['KTC', 'KT 롤스터 챌린저스', 'KT', 372, null],
  ['NSC', '농심 레드포스 챌린저스', 'NS', 372, null],
  ['BFXY', 'BNK 피어엑스 유스', 'BFX', 370, null],
  ['BROC', '한진 브리온 챌린저스', 'BRO', 370, null],
  ['DNSC', 'DN 수퍼스 챌린저스', 'DNS', 370, null],
  ['DRXC', '키움 DRX 챌린저스', 'DRX', 368, null],
  ['ALY', 'AL 유스', 'AL', 372, null],
  ['BLGJ', 'BLG.J', 'BLG', 374, null],
  ['TESC', 'TES 챌린저', 'TES', 372, null],
  ['IGY', 'IG.Young', 'IG', 370, [['Xiasu', '궈하오톈', 435, 425, 420, 410, [80, 92, 30, 45]]]],
  ['JDGI', 'JDG 인텔', 'JDG', 372, null],
  ['WBGY', 'WBG 유스', 'WBG', 368, null],
  ['LNGA', 'LNG 아카데미', 'LNG', 366, null],
  ['EDGY', 'EDG 유스', 'EDG', 368, [['Mike', '마이펑', 445, 415, 410, 425, [88, 85, 50, 40]]]],
  ['KCB', 'Karmine Corp Blue', 'KC', 368, [['Wadi', '와디', 460, 435, 430, 480, [92, 95, 10, 82]]]],
  ['BDSA', 'Team BDS 아카데미', 'BDS', 362, [['Garih', '마우로', 445, 440, 425, 435, [80, 85, 75, 50]]]],
  ['G2N', 'G2 NORD', 'G2', 362, null],
  ['KOIF', 'KOI 피닉스', 'KOI', 360, null],
  ['FNCT', 'Fnatic TQ', 'FNC', 360, null],
  ['THA', 'Heretics 아카데미', 'TH', 356, null],
  ['VITB', 'Vitality.Bee', 'VIT', 356, null],
  ['GXA', 'GIANTX 프라이드', 'GX', 354, null],
  ['TLA', 'Team Liquid 아카데미', 'TL', 358, [['Armao', '조나단 라발', 455, 445, 435, 440, [85, 80, 80, 55]]]],
  ['FLYC', 'FlyQuest 챌린저스', 'FLY', 354, [['Phantiks', '리치', 440, 435, 420, 425, [80, 85, 60, 45]]]],
  ['C9A', 'Cloud9 아카데미', 'C9', 354, null],
  ['LYONA', 'LYON 아카데미', 'LYON', 350, null],
  ['SRA', 'Shopify Rebellion 아카데미', 'SR', 348, null],
  ['DIGA', 'Dignitas 아카데미', 'DIG', 346, null]
];

const LEAGUE_DEF = [
  { id: 'LCK', name: 'LCK', region: 'KR', tier: 1, stages: { cup: 'LCK 컵', r12: '정규시즌 1·2라운드', r35: '정규시즌 3~5라운드' } },
  { id: 'LPL', name: 'LPL', region: 'CN', tier: 1, stages: { cup: '스플릿 1', r12: '스플릿 2', r35: '스플릿 3' } },
  { id: 'LEC', name: 'LEC', region: 'EU', tier: 1, stages: { cup: '윈터', r12: '스프링', r35: '서머' } },
  { id: 'LCS', name: 'LCS', region: 'NA', tier: 1, stages: { cup: '락인', r12: '스플릿 2', r35: '스플릿 3' } },
  { id: 'LCP', name: 'LCP', region: 'AP', tier: 1, stages: { cup: '스플릿 1', r12: '스플릿 2', r35: '스플릿 3' } },
  { id: 'CBLOL', name: 'CBLOL', region: 'BR', tier: 1, stages: { cup: '스플릿 1', r12: '스플릿 2', r35: '스플릿 3' } },
  { id: 'LCKCL', name: 'LCK CL', region: 'KR', tier: 2, stages: { cup: '킥오프', r12: '1·2라운드', r35: '3~5라운드' } },
  { id: 'LDL', name: 'LDL', region: 'CN', tier: 2, stages: { cup: 'LDL 스프링', r12: 'LDL 스플릿 2', r35: 'LDL 서머' } },
  { id: 'ERL', name: 'EMEA 마스터즈', region: 'EU', tier: 2, stages: { cup: '윈터', r12: '스프링', r35: '서머' } },
  { id: 'NACL', name: 'NACL', region: 'NA', tier: 2, stages: { cup: '킥오프', r12: '스플릿 2', r35: '스플릿 3' } }
];

// 특성: 스탯 보너스(상한 초과 가능) 또는 특수 효과
const TRAITS = {
  steady: { name: '꾸준함의 정석', desc: '흔들림 없는 경기력', eff: { men: 6 } },
  architect: { name: '동선 설계자', desc: '정글 동선으로 판을 짠다', eff: { lane: 8 } },
  laneMonster: { name: '라인전 괴물', desc: '라인전에서 지지 않는다', eff: { lane: 8, phys: 3 } },
  mvp26: { name: '2026 LCK MVP', desc: '시즌 최고의 선수', eff: { men: 4, skirm: 3 } },
  closer: { name: '한타 해결사', desc: '마지막 한타는 그의 것', eff: { tf: 8 } },
  topCarry: { name: '탑 캐리', desc: '탑에서 게임을 끝낸다', eff: { skirm: 6 } },
  aggroJungle: { name: '공격형 정글', desc: '쉴 틈 없는 압박', eff: { skirm: 6 } },
  ironWill: { name: '강철 멘탈', desc: '여론에 흔들리지 않는다', eff: { men: 8 } },
  worldsChamp: { name: '월즈 챔피언', desc: '세계 정상에 서 본 경험', eff: { men: 4, tf: 3 } },
  unkillable: { name: '불사대마왕', desc: '전설은 지지 않는다', eff: { men: 12, tf: 5 } },
  agelessKing: { name: '세월을 거스르는 자', desc: '노화 하락 속도 절반', eff: {}, special: 'slowAging' },
  supPhysical: { name: '서포터 피지컬', desc: '원딜 같은 손', eff: { phys: 6 } },
  soloKiller: { name: '솔킬 머신', desc: '1대1이면 이긴다', eff: { phys: 4, skirm: 4 } },
  veteranMid: { name: '베테랑 미드', desc: '경험으로 버틴다', eff: { men: 6 } },
  commander: { name: '오더의 중심', desc: '판을 읽고 지휘한다', eff: { vis: 6, tf: 3 } },
  kingOfEurope: { name: '유럽의 왕', desc: 'LEC의 상징', eff: { tf: 5, men: 3 } },
  // 플레이어가 얻을 수 있는 특성
  firstPom: { name: '첫 POM의 기억', desc: '처음 주목받던 그날', eff: { men: 3 } },
  ace: { name: '팀의 에이스', desc: 'POM 5회', eff: { skirm: 4, phys: 2 } },
  leagueChamp: { name: '리그 우승 경험', desc: '정상에 오른 경험', eff: { men: 5 } },
  msiChamp: { name: 'MSI 챔피언', desc: '국제전 우승', eff: { tf: 4, men: 3 } },
  worldsChampU: { name: '월즈 챔피언', desc: '세계 정상', eff: { tf: 5, men: 5 } },
  wonderKid: { name: '최연소 데뷔', desc: '17세에 1군 데뷔', eff: { phys: 4 }, special: 'fastGrowth' },
  fanFav: { name: '팬들의 사랑', desc: '인지도 5000 돌파', eff: { men: 3 } }
};

const NAMES = {
  KR: { sur: ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍', '전', '고', '문', '양'],
    giv: ['민', '준', '서', '현', '우', '지', '훈', '성', '진', '재', '영', '호', '석', '수', '태', '윤', '도', '하', '건', '혁', '찬', '원', '규', '빈', '율', '결'] },
  CN: { sur: ['왕', '리', '장', '류', '천', '양', '황', '자오', '우', '저우', '쉬', '쑨', '마', '주', '후', '궈', '허', '린', '가오', '뤄'],
    giv: ['하오', '위', '쩌', '밍', '쥔', '톈', '레이', '펑', '항', '신', '보', '양', '청', '이', '카이', '루', '천', '원'] },
  EU: { first: ['루카스', '마테오', '엘리아스', '노아', '토마스', '알렉스', '다니엘', '마르크', '필립', '요나스', '에밀', '막심', '위고', '니코', '라파엘', '아드리안', '얀', '세바스티안'],
    last: ['뮐러', '마르탱', '가르시아', '로시', '노박', '얀센', '코발스키', '베르나르', '로페스', '슈미트', '안데르센', '페트로프', '실바', '디아스', '모로', '하르트만'] },
  NA: { first: ['라이언', '타일러', '케빈', '브랜든', '조던', '저스틴', '이선', '네이선', '오스틴', '카일', '데릭', '앤드루'],
    last: ['존슨', '스미스', '브라운', '리', '김', '응우옌', '첸', '윌리엄스', '데이비스', '패튼', '박', '왕'] },
  AP: { first: ['응우옌', '쩐', '레', '팜', '호앙', '부', '린', '천', '스즈키', '다나카'], last: ['반 안', '민 꽝', '득 훙', '탄 롱', '꾸옥 바오', '즈위안', '보한', '하야토', '렌'] },
  BR: { first: ['가브리엘', '루카스', '마테우스', '펠리피', '하파엘', '브루누', '치아구', '구스타부', '조앙', '헤난'],
    last: ['산투스', '올리베이라', '소자', '코스타', '페헤이라', '아우메이다', '호드리게스', '리마', '카르발류'] }
};
const NICK_A = ['Ra', 'Ze', 'Ko', 'Vi', 'Lu', 'Ny', 'Ar', 'Ka', 'Mi', 'Xo', 'Te', 'Ro', 'Fa', 'Ji', 'Ho', 'Su', 'Da', 'Re', 'No', 'Ki', 'Ve', 'Sy', 'On', 'Ex', 'Pa', 'Bo', 'Gu', 'Ha', 'Yu', 'Sa'];
const NICK_B = ['n', 'x', 'ro', 'ka', 'th', 'ix', 'ly', 'on', 'is', 'ar', 'do', 'ze', 'um', 'ce', 'ne', 'to', 'ra', 'va', 'ki', 'ru'];
const NICK_W = ['Frost', 'Hush', 'Vigil', 'Ember', 'Rook', 'Nova', 'Quill', 'Echo', 'Pyre', 'Sable', 'Drift', 'Halo', 'Talon', 'Wisp', 'Rune', 'Cinder', 'Gale', 'Onyx', 'Lumen', 'Brisk', 'Moss', 'Fable', 'Kestrel', 'Tidal', 'Vex', 'Juno', 'Orbit', 'Sprout', 'Mellow', 'Static'];

const CASTERS = [
  { name: '전용준', style: 'shout' },
  { name: '성승헌', style: 'shout' },
  { name: '정회윤', style: 'calm' }
];
const ANALYSTS = [
  { name: '클템 이현우', style: 'deep' },
  { name: '강퀴 강승현', style: 'hype' },
  { name: '고수진', style: 'calm' },
  { name: '김동준', style: 'deep' },
  { name: '포니 단', style: 'hype' }
];
const INTERVIEWERS = ['윤수빈 아나운서', '이은빈 아나운서'];

// 2026 시즌 협곡: 아타칸·무력행사 삭제, 포지션 퀘스트 도입 (26.22 기준)
const OBJ_POOL = ['심연의 감시자', '태초의 거북', '공허 군주', '시간의 파수꾼', '폭풍 정령', '차원 균열'];
