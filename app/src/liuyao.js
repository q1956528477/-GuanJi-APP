import { YIJING_HEXAGRAMS } from './yijing-data.js';

// ========== 基础常量 ==========
const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const BRANCH_ELEMENTS = {子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
const GENERATES = {木:'火',火:'土',土:'金',金:'水',水:'木'};
const CONTROLS = {木:'土',土:'水',水:'火',火:'金',金:'木'};

const TRIGRAMS = {
  qian:{bits:'111',symbol:'☰',nature:'天'},
  dui:{bits:'110',symbol:'☱',nature:'泽'},
  li:{bits:'101',symbol:'☲',nature:'火'},
  zhen:{bits:'100',symbol:'☳',nature:'雷'},
  xun:{bits:'011',symbol:'☴',nature:'风'},
  kan:{bits:'010',symbol:'☵',nature:'水'},
  gen:{bits:'001',symbol:'☶',nature:'山'},
  kun:{bits:'000',symbol:'☷',nature:'地'},
};
const NUMBER_TO_TRIGRAM = ['qian','dui','li','zhen','xun','kan','gen','kun']; // 先天数 1-8

const NA_JIA = {
  qian:{stemInner:'甲',inner:['子','寅','辰'],stemOuter:'壬',outer:['午','申','戌']},
  kun:{stemInner:'乙',inner:['未','巳','卯'],stemOuter:'癸',outer:['丑','亥','酉']},
  zhen:{stemInner:'庚',inner:['子','寅','辰'],stemOuter:'庚',outer:['午','申','戌']},
  xun:{stemInner:'辛',inner:['丑','亥','酉'],stemOuter:'辛',outer:['未','巳','卯']},
  kan:{stemInner:'戊',inner:['寅','辰','午'],stemOuter:'戊',outer:['申','戌','子']},
  li:{stemInner:'己',inner:['卯','丑','亥'],stemOuter:'己',outer:['酉','未','巳']},
  gen:{stemInner:'丙',inner:['辰','午','申'],stemOuter:'丙',outer:['戌','子','寅']},
  dui:{stemInner:'丁',inner:['巳','卯','丑'],stemOuter:'丁',outer:['亥','酉','未']},
};

const SIX_GODS = ['青龙','朱雀','勾陈','螣蛇','白虎','玄武'];
const SIX_GODS_START = {甲:0,乙:0,丙:1,丁:1,戊:2,己:3,庚:4,辛:4,壬:5,癸:5};
const SIX_RELATIONS = ['父母','兄弟','子孙','妻财','官鬼'];
const PURE_BITS = {
  乾宫:'111111',兑宫:'110110',离宫:'101101',震宫:'100100',
  巽宫:'011011',坎宫:'010010',艮宫:'001001',坤宫:'000000',
};

// 六冲、六合（地支）
const CLASHES = {子:'午',午:'子',丑:'未',未:'丑',寅:'申',申:'寅',卯:'酉',酉:'卯',辰:'戌',戌:'辰',巳:'亥',亥:'巳'};
const COMBINATIONS = {子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午'};
const TOMBS = {金:'丑',木:'未',水:'辰',土:'辰',火:'戌'};

// ========== 数据索引 ==========
const HEX_BY_BITS = {};
const HEX_LIST = YIJING_HEXAGRAMS.map(h => {
  HEX_BY_BITS[h.bits] = h;
  return {id:h.id, name:h.name, image:h.image};
});

// ========== 历法换算（自实现）==========
function daysFromAnchor(y, m, d) {
  return Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(2000, 0, 7)) / 86400000);
}
function dayGanZhiIndex(y, m, d) {
  const diff = daysFromAnchor(y, m, d);
  return ((diff % 60) + 60) % 60; // 0 = 甲子（2000-01-07）
}
function yearGanZhiIndex(year) {
  return ((year - 4) % 60 + 60) % 60; // 0 = 甲子年
}
function hourBranchIndex(hour) {
  // 23-1 子, 1-3 丑, ... 21-23 亥
  const h = (hour + 1) % 24;
  return Math.floor(h / 2);
}

// 节气（仅取十二“节”，用于确定月建）
const JIE = [
  {month:1, term:0, branch:'丑'},
  {month:2, term:2, branch:'寅'},
  {month:3, term:4, branch:'卯'},
  {month:4, term:6, branch:'辰'},
  {month:5, term:8, branch:'巳'},
  {month:6, term:10, branch:'午'},
  {month:7, term:12, branch:'未'},
  {month:8, term:14, branch:'申'},
  {month:9, term:16, branch:'酉'},
  {month:10, term:18, branch:'戌'},
  {month:11, term:20, branch:'亥'},
  {month:12, term:22, branch:'子'},
];
const S_TERM_INFO = [0,21208,42467,63836,85337,107014,128867,150921,173149,195551,218072,240693,263343,285989,308563,331033,353350,375494,397447,419210,440795,462224,483532,504758];
function termDay(year, n) {
  const off = new Date((31556925974.7 * (year - 1900) + S_TERM_INFO[n] * 60000) + Date.UTC(1900, 0, 6, 2, 5));
  return off.getUTCDate();
}
function monthBranchIndex(date) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  let current = '子'; // 尚未到当年小寒前，属于上年大雪后的子月
  for (const j of JIE) {
    const day = termDay(y, j.term);
    if (m > j.month || (m === j.month && d >= day)) current = j.branch;
  }
  return BRANCHES.indexOf(current);
}
function monthStemIndex(yearStemIdx, monthBranchIdx) {
  return (((yearStemIdx % 5) * 2 + 2 + (monthBranchIdx - 2)) % 10 + 10) % 10;
}
function hourStemIndex(dayStemIdx, hourBranchIdx) {
  return (((dayStemIdx % 5) * 2 + hourBranchIdx) % 10 + 10) % 10;
}
function xunKong(ganZhi) {
  const s = STEMS.indexOf(ganZhi[0]);
  const b = BRANCHES.indexOf(ganZhi[1]);
  const e1 = ((b - s + 10) % 12 + 12) % 12;
  const e2 = (e1 + 1) % 12;
  return BRANCHES[e1] + BRANCHES[e2];
}

function buildAstrology(date) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  const hour = date.getHours(), minute = date.getMinutes();
  const yearIdx = yearGanZhiIndex(y);
  const yearStem = STEMS[yearIdx % 10], yearBranch = BRANCHES[yearIdx % 12];
  const monthBranchIdx = monthBranchIndex(date);
  const monthStem = STEMS[monthStemIndex(yearIdx % 10, monthBranchIdx)];
  const monthBranch = BRANCHES[monthBranchIdx];
  const dayIdx = dayGanZhiIndex(y, m, d);
  const dayStem = STEMS[dayIdx % 10], dayBranch = BRANCHES[dayIdx % 12];
  const hourBranchIdx = hourBranchIndex(hour);
  const hourStem = STEMS[hourStemIndex(dayIdx % 10, hourBranchIdx)];
  const hourBranch = BRANCHES[hourBranchIdx];
  const dayGZ = dayStem + dayBranch;
  const pad = n => String(n).padStart(2, '0');
  return {
    solarDate: y + '年' + m + '月' + d + '日 ' + pad(hour) + ':' + pad(minute),
    yearGZ: yearStem + yearBranch,
    monthGZ: monthStem + monthBranch,
    dayGZ: dayGZ,
    hourGZ: hourStem + hourBranch,
    dayXunKong: xunKong(dayGZ),
    monthJian: monthBranch,
    dayStem: dayStem,
    dayBranch: dayBranch,
    hourBranch: hourBranch,
  };
}

// ========== 起卦 ==========
function mod8(n) { const r = n % 8; return r === 0 ? 8 : r; }
function mod6(n) { const r = n % 6; return r === 0 ? 6 : r; }
function bitOf(yang) { return yang ? '1' : '0'; }
function buildLinesFromTrigramNumbers(upperNum, lowerNum, movingNum) {
  const upper = TRIGRAMS[NUMBER_TO_TRIGRAM[upperNum - 1]].bits;
  const lower = TRIGRAMS[NUMBER_TO_TRIGRAM[lowerNum - 1]].bits;
  const bits = (lower + upper).split('').map(b => b === '1');
  const lines = bits.map((yang, i) => {
    const isMoving = (i + 1) === movingNum;
    if (yang) return isMoving ? 'old_yang' : 'young_yang';
    return isMoving ? 'old_yin' : 'young_yin';
  });
  return lines;
}
function castByTime(date) {
  const yearBranchIdx = BRANCHES.indexOf(buildAstrology(date).yearGZ[1]) + 1;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hourIdx = hourBranchIndex(date.getHours()) + 1;
  const upper = mod8(yearBranchIdx + month + day);
  const lower = mod8(yearBranchIdx + month + day + hourIdx);
  const moving = mod6(yearBranchIdx + month + day + hourIdx);
  return buildLinesFromTrigramNumbers(upper, lower, moving);
}
function castByNumbers(numbers) {
  const a = Number(numbers[0]) || 0, b = Number(numbers[1]) || 0, c = Number(numbers[2]) || 0;
  const upper = mod8(a), lower = mod8(b), moving = mod6(c);
  return buildLinesFromTrigramNumbers(upper, lower, moving);
}
function castByName(bits) {
  return bits.split('').map(b => b === '1' ? 'young_yang' : 'young_yin');
}
function castByCoin() {
  const lines = [];
  for (let i = 0; i < 6; i++) {
    const toss = () => (Math.random() < 0.5 ? 2 : 3);
    const sum = toss() + toss() + toss();
    if (sum === 6) lines.push('old_yin');
    else if (sum === 9) lines.push('old_yang');
    else if (sum === 7) lines.push('young_yang');
    else lines.push('young_yin');
  }
  return lines;
}
function isMoving(t) { return t === 'old_yang' || t === 'old_yin'; }
function bit(t) { return (t === 'young_yang' || t === 'old_yang') ? '1' : '0'; }
function transform(lines) {
  return lines.map(t => {
    if (t === 'old_yin') return 'young_yang';
    if (t === 'old_yang') return 'young_yin';
    return t;
  });
}

// ========== 装卦 ==========
function relation(palaceElem, lineElem) {
  if (palaceElem === lineElem) return '兄弟';
  if (GENERATES[palaceElem] === lineElem) return '子孙';
  if (GENERATES[lineElem] === palaceElem) return '父母';
  if (CONTROLS[palaceElem] === lineElem) return '妻财';
  if (CONTROLS[lineElem] === palaceElem) return '官鬼';
  return '';
}
function trigramName(bits3) {
  for (const k in TRIGRAMS) if (TRIGRAMS[k].bits === bits3) return k;
  return 'qian';
}
function naJiaLines(bits, palaceElement, dayStem) {
  const lower = trigramName(bits.slice(0, 3));
  const upper = trigramName(bits.slice(3, 6));
  const lr = NA_JIA[lower], ur = NA_JIA[upper];
  const lines = [];
  for (let i = 0; i < 3; i++) {
    const branch = lr.inner[i];
    lines.push({stem: lr.stemInner, branch, element: BRANCH_ELEMENTS[branch], liuQin: relation(palaceElement, BRANCH_ELEMENTS[branch]), sixGod: '', shiYing: ''});
  }
  for (let i = 0; i < 3; i++) {
    const branch = ur.outer[i];
    lines.push({stem: ur.stemOuter, branch, element: BRANCH_ELEMENTS[branch], liuQin: relation(palaceElement, BRANCH_ELEMENTS[branch]), sixGod: '', shiYing: ''});
  }
  const start = SIX_GODS_START[dayStem] || 0;
  for (let i = 0; i < 6; i++) lines[i].sixGod = SIX_GODS[(start + i) % 6];
  return lines;
}
function attachShiYing(lines, shi) {
  const shiIdx = shi - 1;
  const yingIdx = (shiIdx + 3) % 6;
  lines.forEach((l, i) => { l.shiYing = i === shiIdx ? '世' : (i === yingIdx ? '应' : ''); });
}
function attachFuShen(lines, palaceElement, palaceName) {
  const present = new Set(lines.map(l => l.liuQin));
  const missing = SIX_RELATIONS.filter(r => !present.has(r));
  if (!missing.length) return;
  const pureBits = PURE_BITS[palaceName];
  if (!pureBits) return;
  const pure = naJiaLines(pureBits, palaceElement, '');
  missing.forEach(rel => {
    const idx = pure.findIndex(l => l.liuQin === rel);
    if (idx >= 0 && lines[idx]) {
      lines[idx].fuShen = {stem: pure[idx].stem, branch: pure[idx].branch, element: pure[idx].element, liuQin: pure[idx].liuQin};
    }
  });
}

// ========== 用神推断 ==========
function inferYongShen(question) {
  if (!question) return null;
  const q = String(question);
  const rules = [
    [/财|钱|生意|投资|买卖|收益|收入|经营|店铺|卖/, '妻财'],
    [/官|工作|事业|升职|求职|考试|面试|上司|领导|职位/, '官鬼'],
    [/父|母|长辈|房产|房屋|房子|文书|合同|证件|学业|学校/, '父母'],
    [/子|女|孩|宠物|疾病|医药|健康|怀孕|胎|学生|徒弟/, '子孙'],
    [/兄弟|姐妹|朋友|合伙|合作|竞争|同事|对手|同伴/, '兄弟'],
    [/婚姻|感情|恋爱|对象|男朋友|老公|丈夫/, '官鬼'],
    [/婚姻|感情|恋爱|对象|女朋友|老婆|妻子/, '妻财'],
  ];
  for (const [re, rel] of rules) if (re.test(q)) return rel;
  return null;
}

// ========== 状态分析 ==========
function monthStatus(lineBranch, lineElement, monthBranch) {
  if (CLASHES[monthBranch] === lineBranch) return '月破';
  if (COMBINATIONS[monthBranch] === lineBranch) return '合旺';
  const mEl = BRANCH_ELEMENTS[monthBranch];
  if (!mEl) return '';
  if (mEl === lineElement) return '旺';
  if (GENERATES[mEl] === lineElement) return '相';
  if (GENERATES[lineElement] === mEl) return '休';
  if (CONTROLS[lineElement] === mEl) return '囚';
  if (CONTROLS[mEl] === lineElement) return '死';
  return '';
}
function dayStatus(lineBranch, lineElement, dayBranch, dayXunKong, isMoving, monthBranch) {
  const tags = [];
  const mEl = BRANCH_ELEMENTS[monthBranch];
  const isWangXiang = mEl === lineElement || GENERATES[mEl] === lineElement;
  if (CLASHES[dayBranch] === lineBranch) {
    if (isMoving) tags.push('日冲');
    else if (isWangXiang) tags.push('暗动');
    else tags.push('日破');
  }
  if (COMBINATIONS[dayBranch] === lineBranch) tags.push(isMoving ? '绊住' : '合起');
  if (TOMBS[lineElement] === dayBranch) tags.push('入墓');
  if (dayXunKong.includes(lineBranch)) tags.push('空');
  return tags;
}
function transformStatus(origElement, origBranch, newElement, newBranch, dayBranch, dayXunKong, monthBranch) {
  const tags = [];
  if (GENERATES[newElement] === origElement) tags.push('回头生');
  if (CONTROLS[newElement] === origElement) tags.push('回头克');
  const HUA_JIN = {申:'酉',亥:'子',寅:'卯',巳:'午',丑:'辰',辰:'未',未:'戌',戌:'丑'};
  const HUA_TUI = {酉:'申',子:'亥',卯:'寅',午:'巳',辰:'丑',未:'辰',戌:'未',丑:'戌'};
  if (HUA_JIN[origBranch] === newBranch) tags.push('化进');
  if (HUA_TUI[origBranch] === newBranch) tags.push('化退');
  if (TOMBS[origElement] === newBranch) tags.push('化墓');
  if (dayXunKong.includes(newBranch)) tags.push('化空');
  if (CLASHES[dayBranch] === newBranch || CLASHES[monthBranch] === newBranch) tags.push('化破');
  return tags;
}
function checkGlobal(benLines, zhiLines, movingIdx, monthBranch, dayBranch) {
  const alerts = [];
  const pairs = [[0,3],[1,4],[2,5]];
  const isClash = (a,b) => CLASHES[a] === b;
  const isHe = (a,b) => COMBINATIONS[a] === b;
  const benBranches = benLines.map(l => l.branch);
  const zhiBranches = zhiLines ? zhiLines.map(l => l.branch) : benBranches;
  const mainChong = pairs.every(p => isClash(benBranches[p[0]], benBranches[p[1]]));
  const mainHe = pairs.every(p => isHe(benBranches[p[0]], benBranches[p[1]]));
  if (mainChong) alerts.push('主卦六冲，事多散乱、变动。');
  if (mainHe) alerts.push('主卦六合，事态稳定或纠缠。');
  if (movingIdx.length) {
    const transChong = pairs.every(p => isClash(zhiBranches[p[0]], zhiBranches[p[1]]));
    const transHe = pairs.every(p => isHe(zhiBranches[p[0]], zhiBranches[p[1]]));
    if (mainChong && transChong) alerts.push('六冲变六冲，事情易散难成。');
    if (mainHe && transHe) alerts.push('六合变六合，久缠难断。');
    if (mainChong && transHe) alerts.push('冲中逢合，先散后成。');
    if (mainHe && transChong) alerts.push('合处逢冲，先成后散。');
  }
  // 反吟/伏吟
  if (movingIdx.length && zhiLines) {
    let allClash = true, allSame = true;
    for (let i = 0; i < 6; i++) {
      if (!isClash(benBranches[i], zhiBranches[i])) allClash = false;
      if (benBranches[i] !== zhiBranches[i]) allSame = false;
    }
    if (allClash) alerts.push('卦之反吟，反复无常。');
    if (allSame) alerts.push('卦之伏吟，进退两难。');
  }
  return alerts;
}

// ========== 主入口 ==========
export function cast(opts) {
  opts = opts || {};
  const date = opts.date ? new Date(opts.date) : new Date();
  let lines;
  let methodNote = '';
  if (opts.method === 'time') { lines = castByTime(date); methodNote = '时间起卦（年支+公历月日+时支）'; }
  else if (opts.method === 'number') { lines = castByNumbers(opts.numbers || []); methodNote = '数字起卦'; }
  else if (opts.method === 'name') { const meta = HEX_BY_BITS[opts.bits] || YIJING_HEXAGRAMS[0]; lines = castByName(meta.bits); methodNote = '卦名起卦（静卦）'; }
  else if (opts.method === 'manual') { lines = (opts.lines || []).slice(0, 6); while (lines.length < 6) lines.push('young_yang'); methodNote = '手动指定'; }
  else { lines = (opts.method==='coin' && opts.lines && opts.lines.length===6) ? opts.lines.slice(0,6) : castByCoin(); methodNote = opts.method==='random' ? '自动起卦' : '铜钱摇卦'; }

  const astrology = buildAstrology(date);
  const movingIdx = [];
  lines.forEach((t, i) => { if (isMoving(t)) movingIdx.push(i); });
  const zhiLines = transform(lines);

  const benBits = lines.map(bit).join('');
  const zhiBits = zhiLines.map(bit).join('');
  const benMeta = HEX_BY_BITS[benBits] || YIJING_HEXAGRAMS[0];
  const zhiMeta = HEX_BY_BITS[zhiBits] || YIJING_HEXAGRAMS[0];

  const benNaJia = naJiaLines(benBits, benMeta.element, astrology.dayStem);
  attachShiYing(benNaJia, benMeta.shi);
  attachFuShen(benNaJia, benMeta.element, benMeta.palace);

  const zhiNaJia = naJiaLines(zhiBits, benMeta.element, astrology.dayStem);
  attachShiYing(zhiNaJia, zhiMeta.shi);

  // 用神与状态
  const yongShen = inferYongShen(opts.question);
  let yongLines = [];
  if (yongShen) {
    benNaJia.forEach((l, i) => { if (l.liuQin === yongShen) yongLines.push(i); });
    if (!yongLines.length) {
      benNaJia.forEach((l, i) => { if (l.fuShen && l.fuShen.liuQin === yongShen) yongLines.push(i); });
    }
  }

  const yongDetail = yongLines.map(i => {
    const l = benNaJia[i];
    const moving = movingIdx.includes(i);
    const status = {
      month: monthStatus(l.branch, l.element, astrology.monthJian),
      day: dayStatus(l.branch, l.element, astrology.dayBranch, astrology.dayXunKong, moving, astrology.monthJian),
      transform: moving ? transformStatus(l.element, l.branch, zhiNaJia[i].element, zhiNaJia[i].branch, astrology.dayBranch, astrology.dayXunKong, astrology.monthJian) : [],
    };
    return {index: i, liuQin: l.liuQin, branch: l.branch, element: l.element, sixGod: l.sixGod, status};
  });

  const movingDetail = movingIdx.map(i => {
    const l = benNaJia[i];
    const yongEl = yongLines.length ? benNaJia[yongLines[0]].element : null;
    let rel = '';
    if (yongEl) {
      if (l.element === yongEl) rel = '比和';
      else if (GENERATES[l.element] === yongEl) rel = '生用神';
      else if (GENERATES[yongEl] === l.element) rel = '受用神生';
      else if (CONTROLS[l.element] === yongEl) rel = '克用神';
      else if (CONTROLS[yongEl] === l.element) rel = '受用神克';
    }
    return {index: i, liuQin: l.liuQin, branch: l.branch, element: l.element, relation: rel};
  });

  const alerts = checkGlobal(benNaJia, zhiNaJia, movingIdx, astrology.monthJian, astrology.dayBranch);

  return {
    method: methodNote,
    astrology,
    question: opts.question || '',
    ben: {meta: benMeta, naJia: benNaJia, moving: movingIdx},
    zhi: movingIdx.length ? {meta: zhiMeta, naJia: zhiNaJia} : null,
    hasMoving: movingIdx.length > 0,
    analysis: {
      yongShen,
      yongDetail,
      movingDetail,
      alerts,
    },
  };
}

export function tossCoin() {
  const toss = () => (Math.random() < 0.5 ? 2 : 3);
  const values = [toss(), toss(), toss()];
  const sum = values[0] + values[1] + values[2];
  let type, name;
  if (sum === 6) { type = 'old_yin'; name = '老阴'; }
  else if (sum === 9) { type = 'old_yang'; name = '老阳'; }
  else if (sum === 7) { type = 'young_yang'; name = '少阳'; }
  else { type = 'young_yin'; name = '少阴'; }
  const heads = values.filter(v => v === 3).length;
  return { values, sum, type, name, heads, tails: 3 - heads };
}

export const HEXAGRAMS = HEX_LIST;
export const METHODS = [
  {id:'coin', name:'在线摇卦'},
  {id:'time', name:'时间起卦'},
  {id:'number', name:'数字起卦'},
  {id:'name', name:'卦名起卦'},
  {id:'manual', name:'手动指定'},
  {id:'random', name:'自动起卦'},
];
