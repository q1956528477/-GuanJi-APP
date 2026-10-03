// 六爻引擎纯逻辑测试（不依赖 jsdom，可在 Node 直接运行）
const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('www/liuyao.bundle.js', 'utf8');
const ctx = {
  console, Math, Date, JSON, String, Number, Object, Array, Set, Map, Error, RegExp,
  isNaN, parseInt, parseFloat,
};
ctx.globalThis = ctx;
ctx.window = ctx;
vm.createContext(ctx);
vm.runInContext(code, ctx);

const results = [];
function check(name, cond) {
  results.push((cond ? '✅' : '❌') + ' ' + name);
  if (!cond) process.exitCode = 1;
}

const LiuYao = ctx.LiuYao;
check('六爻引擎已加载', !!(LiuYao && LiuYao.cast));
check('六十四卦数据完整', Array.isArray(LiuYao.HEXAGRAMS) && LiuYao.HEXAGRAMS.length === 64);
check('六十四卦 bits 完整且唯一', LiuYao.HEXAGRAMS.every(h => /^[01]{6}$/.test(h.bits)) &&
  new Set(LiuYao.HEXAGRAMS.map(h => h.bits)).size === 64);

let nameRoundTrips = 0;
for (const hex of LiuYao.HEXAGRAMS) {
  const cast = LiuYao.cast({method:'name', bits:hex.bits, date:'2000-01-07T12:00:00'});
  if (cast.ben.meta.bits === hex.bits && cast.ben.meta.image === hex.image && !cast.hasMoving && cast.zhi === null) {
    nameRoundTrips++;
  }
}
check('卦名起卦 64 卦映射且保持静卦', nameRoundTrips === 64);

const classical = LiuYao.CLASSICAL_HEXAGRAMS;
check('六十四卦古文数据完整', Array.isArray(classical) && classical.length === 64);
check('古文数据按通行卦序排列', classical.every((h, i) => h.id === i + 1));
check('古文数据均有卦辞', classical.every(h => typeof h.guaci === 'string' && h.guaci.length > 0));
check('普通卦均有六爻、乾坤含用九用六', classical.every(h => {
  const expected = h.id === 1 || h.id === 2 ? 7 : 6;
  return Array.isArray(h.lines) && h.lines.length === expected;
}));
check('乾卦保留用九', classical[0].lines[6].title === '用九' && classical[0].lines[6].text === '见群龙无首，吉。');
check('坤卦保留用六', classical[1].lines[6].title === '用六' && classical[1].lines[6].text === '利永贞。');
check('古文爻辞均含爻题与正文', classical.every(h => h.lines.every(line =>
  typeof line.title === 'string' && line.title && typeof line.text === 'string' && line.text
)));
check('64 卦均有彖传', classical.every(h => typeof h.tuan === 'string' && h.tuan.length > 0));
check('64 卦均有大象传', classical.every(h => typeof h.daxiang === 'string' && h.daxiang.length > 0));
check('每条爻辞均有对应小象传', classical.every(h => h.lines.every(line =>
  typeof line.xiaoxiang === 'string' && line.xiaoxiang.length > 0
)));
check('传文未混入其他段落标记', classical.every(h =>
  !h.tuan.includes('《象》') &&
  !h.daxiang.includes('《象》') &&
  h.lines.every(line => !line.xiaoxiang.includes('《象》曰：') && !line.xiaoxiang.includes('《文言》'))
));
check('古文数据不包含现代解读字段', classical.every(h =>
  !Object.prototype.hasOwnProperty.call(h, 'translation') &&
  !Object.prototype.hasOwnProperty.call(h, 'guaciTranslation') &&
  !Object.prototype.hasOwnProperty.call(h, 'shaoyong') &&
  !Object.prototype.hasOwnProperty.call(h, 'summary') &&
  h.lines.every(line =>
    !Object.prototype.hasOwnProperty.call(line, 'translation') &&
    !Object.prototype.hasOwnProperty.call(line, 'shaoyong')
  )
));
check('乾卦彖传与大象传对应正确',
  classical[0].tuan.includes('万物资始，乃统天') &&
  classical[0].daxiang === '天行健，君子以自强不息。');
check('乾卦初爻与用九小象传对应正确',
  classical[0].lines[0].xiaoxiang === '阳在下也。' &&
  classical[0].lines[6].xiaoxiang === '天德不可为首也。');
check('坤卦上六与用六小象传对应正确',
  classical[1].lines[5].xiaoxiang === '「龙战于野」，其道穷也。' &&
  classical[1].lines[6].xiaoxiang === '「用六永贞」，以大终也。');
check('古文来源信息完整', LiuYao.CLASSICAL_SOURCE.guaciAndLines.file === '周易六十四卦_卦辞爻辞.md' &&
  /^[a-f0-9]{64}$/.test(LiuYao.CLASSICAL_SOURCE.guaciAndLines.sha256));
check('传文来源信息完整', LiuYao.CLASSICAL_SOURCE.commentary.revision === '8284adbf9e3435d713180e24f05bf75f8b7d1d96' &&
  LiuYao.CLASSICAL_SOURCE.commentary.repository === 'https://github.com/kanripo/KR1a0001');
check('历史传文解析优先使用当前统一数据',
  LiuYao.resolveClassical({
    bits:'111111',
    image:'乾为天',
    classical:{guaci:'旧版卦辞', lines:[]},
  }).tuan.includes('万物资始，乃统天'));
check('历史记录缺少 bits 时可按卦名补全传文',
  LiuYao.resolveClassical({image:'坤为地'}).lines[6].xiaoxiang === '「用六永贞」，以大终也。');
check('无法识别的历史卦象返回空并交由页面兜底',
  LiuYao.resolveClassical({bits:'999999', image:'未知卦'}) === null);

const classicalMappingErrors = classical.filter(h => {
  const lines = h.bits.split('').map(bit => bit === '1' ? 'young_yang' : 'young_yin');
  const result = LiuYao.cast({
    method: 'manual',
    lines,
    date: '2000-01-07T12:00:00',
  });
  return result.ben.meta.bits !== h.bits ||
    result.ben.meta.image !== h.name ||
    !result.ben.meta.classical ||
    result.ben.meta.classical.guaci !== h.guaci ||
    result.ben.meta.classical.tuan !== h.tuan ||
    result.ben.meta.classical.daxiang !== h.daxiang ||
    result.ben.meta.classical.lines.some((line, index) => line.xiaoxiang !== h.lines[index].xiaoxiang);
});
check('64 卦 bits、卦名与古文数据映射一致', classicalMappingErrors.length === 0);

const qian = LiuYao.cast({
  method: 'manual',
  lines: ['young_yang','young_yang','young_yang','young_yang','young_yang','young_yang'],
  date: '2000-01-07T12:00:00',
  question: '财运',
});
check('乾为天卦名正确', qian.ben.meta.image === '乾为天');
check('乾卦宫位正确', qian.ben.meta.palace === '乾宫');
check('乾卦世爻在上爻', qian.ben.meta.shi === 6);
check('2000-01-07 为甲子日', qian.astrology.dayGZ === '甲子');
check('甲子日空亡为戌亥', qian.astrology.dayXunKong === '戌亥');
const qianQin = qian.ben.naJia.map(l => l.liuQin);
check('乾卦六亲正确', JSON.stringify(qianQin) === JSON.stringify(['子孙','妻财','父母','官鬼','兄弟','父母']));
check('乾卦世爻标记正确', qian.ben.naJia[5].shiYing === '世');
check('乾卦应爻标记正确', qian.ben.naJia[2].shiYing === '应');
check('乾卦使用指定古文来源', qian.ben.meta.classical.guaci === '元亨，利贞。');
check('乾卦古文爻辞顺序正确', qian.ben.meta.classical.lines.map(line => line.title).join(',') === '初九,九二,九三,九四,九五,上九,用九');

const moving = LiuYao.cast({
  method: 'manual',
  lines: ['old_yang','young_yang','young_yang','young_yang','young_yang','young_yang'],
  date: '2000-01-07T12:00:00',
});
check('识别到动爻', moving.hasMoving === true && moving.ben.moving.length === 1);
check('变卦为天风姤', moving.zhi && moving.zhi.meta.image === '天风姤');
check('变卦六亲仍按本卦宫计算', moving.zhi.naJia[0].liuQin === '父母');

const num = LiuYao.cast({method:'number', numbers:[1,2,3], date:'2026-09-10T10:00:00'});
check('数字起卦生成六爻', num.ben.naJia.length === 6);
check('数字起卦 0 映射为 8/6', LiuYao.cast({method:'number', numbers:[0,0,0], date:'2026-09-10T10:00:00'}).ben.meta.image === '坤为地');
const oneMoving = LiuYao.cast({method:'number', numbers:[1,1,3], date:'2026-09-10T10:00:00'});
check('第三个数字只控制一个动爻', oneMoving.ben.moving.length === 1 && oneMoving.ben.moving[0] === 2);

let invalidNumberRejected = 0;
for (const numbers of [[-1,2,3],[1.5,2,3],[Infinity,2,3],['',2,3],['x',2,3],[Number.MAX_SAFE_INTEGER + 1,2,3]]) {
  try {
    LiuYao.cast({method:'number', numbers, date:'2026-09-10T10:00:00'});
  } catch (e) {
    invalidNumberRejected++;
  }
}
check('非法数字输入全部被拒绝', invalidNumberRejected === 6);

const time = LiuYao.cast({method:'time', date:'2026-09-10T10:00:00'});
check('时间起卦生成六爻', time.ben.naJia.length === 6);
const lateZi = LiuYao.cast({method:'time', date:new Date(2026, 8, 10, 23, 0, 0)});
const earlyChou = LiuYao.cast({method:'time', date:new Date(2026, 8, 10, 1, 0, 0)});
check('时间起卦 23:00 和 01:00 时辰边界正确', lateZi.astrology.hourBranch === '子' && earlyChou.astrology.hourBranch === '丑');
check('时间起卦空日期使用当前时间', LiuYao.cast({method:'time'}).ben.naJia.length === 6);
try {
  LiuYao.cast({method:'time', date:'not-a-date'});
  check('时间起卦非法日期被拒绝', false);
} catch (e) {
  check('时间起卦非法日期被拒绝', e.message === '日期时间无效');
}

try {
  LiuYao.cast({method:'name', bits:'invalid', date:'2000-01-07T12:00:00'});
  check('非法卦名被拒绝', false);
} catch (e) {
  check('非法卦名被拒绝', e.message === '卦名数据无效');
}

let invalidManualRejected = 0;
for (const lines of [[], ['young_yang'], ['foo','young_yang','young_yang','young_yang','young_yang','young_yang']]) {
  try {
    LiuYao.cast({method:'manual', lines, date:'2000-01-07T12:00:00'});
  } catch (e) {
    invalidManualRejected++;
  }
}
check('manual 非法爻数组全部被拒绝', invalidManualRejected === 3);

// 单次铜钱摇卦
check('单次摇卦接口存在', typeof LiuYao.tossCoin === 'function');
const one = LiuYao.tossCoin();
check('单次摇卦返回三枚铜钱', Array.isArray(one.values) && one.values.length === 3);
check('单次摇卦卦型合法', ['old_yin','young_yang','young_yin','old_yang'].indexOf(one.type) >= 0);
check('单次摇卦点数正确', one.values[0] + one.values[1] + one.values[2] === one.sum);

// coin 起卦应使用传入的逐爻结果
const coinCast = LiuYao.cast({method:'coin', lines:['young_yang','young_yang','young_yang','young_yang','young_yang','young_yang'], date:'2000-01-07T12:00:00'});
check('coin 起卦使用传入六爻', coinCast.ben.meta.image === '乾为天' && coinCast.hasMoving === false);

const originalRandom = Math.random;
const sequence = [0.1,0.1,0.1, 0.1,0.1,0.9, 0.1,0.9,0.9, 0.9,0.9,0.9, 0.1,0.1,0.9, 0.1,0.9,0.9];
Math.random = () => sequence.shift();
const coinRandom = LiuYao.cast({method:'coin', date:'2000-01-07T12:00:00'});
const sequenceCopy = [0.1,0.1,0.1, 0.1,0.1,0.9, 0.1,0.9,0.9, 0.9,0.9,0.9, 0.1,0.1,0.9, 0.1,0.9,0.9];
Math.random = () => sequenceCopy.shift();
const randomRandom = LiuYao.cast({method:'random', date:'2000-01-07T12:00:00'});
Math.random = originalRandom;
check('coin 六爻顺序与 6/7/8/9 映射正确', coinRandom.ben.meta.image === '泽水困' && coinRandom.zhi.meta.image === '水泽节');
check('random 与 coin 使用同一铜钱算法', randomRandom.ben.meta.bits === coinRandom.ben.meta.bits && randomRandom.zhi.meta.bits === coinRandom.zhi.meta.bits);

// 古文数据可按 bits 查询
check('古文数据可按 bits 查询', LiuYao.getClassical('111111').guaci === '元亨，利贞。');

// 解读字段已随数据补齐
check('卦辞白话译文存在', typeof qian.ben.meta.guaciTranslation === 'string' && qian.ben.meta.guaciTranslation.length > 0);
check('爻辞白话译文存在', typeof qian.ben.meta.lines[0].translation === 'string' && qian.ben.meta.lines[0].translation.length > 0);

// ===== 解卦提示词纯文本（buildGuaTextPrompt）=====
check('解卦提示词函数存在', typeof LiuYao.buildGuaTextPrompt === 'function');

const promptMoving = LiuYao.cast({
  method:'manual',
  lines:['old_yang','young_yang','young_yang','young_yang','young_yang','young_yang'],
  date:'2026-09-16T10:00:00',
  question:'这次合作能不能成',
});
const movingText = LiuYao.buildGuaTextPrompt(promptMoving);
check('提示词包含本卦卦名', movingText.includes('本卦：乾为天'));
check('提示词包含变卦卦名', movingText.includes('变卦：天风姤'));
check('提示词包含动爻位置', movingText.includes('动爻：初爻'));
check('提示词包含所问事项', movingText.includes('所问事项：这次合作能不能成'));
check('提示词包含起卦方式', movingText.includes('起卦方式：' + promptMoving.method));
check('提示词包含起卦时间', movingText.includes('起卦时间：2026年9月16日 10:00'));
check('提示词本卦六爻自上而下完整',
  movingText.includes('本卦六爻（自上而下）：') &&
  movingText.indexOf('上爻：') < movingText.indexOf('初爻：') &&
  ['上爻','五爻','四爻','三爻','二爻','初爻'].every(p => movingText.includes('\n' + p + '：')));
check('提示词逐爻含阴阳、纳甲干支、六亲、世应、动爻',
  /上爻：阳爻 \S+ \S+/.test(movingText) &&
  movingText.includes('动') &&
  movingText.includes('世') && movingText.includes('应'));
check('提示词变卦六爻不含伏神', (() => {
  const part = movingText.split('变卦六爻（自上而下）：')[1];
  return !!part && !part.split('\n\n')[0].includes('伏神');
})());
check('提示词包含用神与提示节', movingText.includes('用神与提示：'));
check('提示词结尾为可直接触发的请求',
  movingText.trim().endsWith('请结合以上卦象与卦辞、爻辞，为我解读这一卦。'));
check('提示词为纯文本（无标签、无 markdown 装饰、无 emoji）',
  !/<[a-zA-Z\/][^>]*>/.test(movingText) &&
  !movingText.includes('**') && !movingText.includes('|') &&
  !/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u.test(movingText));

const promptStatic = LiuYao.cast({method:'name', bits:'111111', date:'2026-09-16T10:00:00'});
const staticText = LiuYao.buildGuaTextPrompt(promptStatic);
check('静卦提示词写明无变卦（静卦）', staticText.includes('变卦：无变卦（静卦）'));
check('静卦提示词写明无动爻', staticText.includes('动爻：无动爻'));
check('静卦提示词不含变卦六爻节', !staticText.includes('变卦六爻'));
check('静卦提示词对空事项写明未填写', staticText.includes('所问事项：未填写'));

// 字段缺失时宁可不写，也不能臆造
const sparseResult = {
  method: '手动指定',
  astrology: {solarDate:'2026年9月16日 10:00'},
  question: '',
  ben: {
    meta: {image:'测试卦', bits:'101010'},
    naJia: [{stem:'甲', branch:'子'}, {}, {stem:'丙', branch:'寅', liuQin:'妻财'}, {}, {}, {}],
    moving: [],
  },
  zhi: null,
  hasMoving: false,
  analysis: {},
};
const sparseText = LiuYao.buildGuaTextPrompt(sparseResult);
check('缺失字段不臆造（不写世应 / 伏神 / 用神节）',
  !sparseText.includes('世') && !sparseText.includes('伏神') && !sparseText.includes('用神与提示：'));
check('静卦与空数据同样给出结尾请求', sparseText.includes('请结合以上卦象与卦辞、爻辞，为我解读这一卦。'));

let invalidPromptRejected = 0;
try { LiuYao.buildGuaTextPrompt(null); } catch (e) { invalidPromptRejected++; }
try { LiuYao.buildGuaTextPrompt({}); } catch (e) { invalidPromptRejected++; }
check('非法卦象数据被拒绝', invalidPromptRejected === 2);

// ===== 卦名起卦 · 预设变卦（本卦 + 目标变卦 → 动爻自动推导） =====
const PRESET_DATE = '2000-01-07T12:00:00';

check('预设变卦：movingLinesFor 导出', typeof LiuYao.movingLinesFor === 'function');
check('预设变卦：validateVariant 导出', typeof LiuYao.validateVariant === 'function');
check('预设变卦：variantBitsOf 导出', typeof LiuYao.variantBitsOf === 'function');
check('预设变卦：presetVariantLines 导出', typeof LiuYao.presetVariantLines === 'function');

// ① 静卦零回归：不传 zhiBits 时，与改前逐字段一致
let staticRegression = 0;
for (const hex of LiuYao.HEXAGRAMS) {
  const r = LiuYao.cast({method:'name', bits:hex.bits, date:PRESET_DATE});
  if (r.ben.meta.bits === hex.bits && r.ben.meta.image === hex.image &&
      !r.hasMoving && r.zhi === null && r.ben.moving.length === 0 &&
      r.method === '卦名起卦（静卦）') staticRegression++;
}
check('预设变卦：不选变卦时 64 卦全部保持静卦（零回归）', staticRegression === 64);

// ② 动爻完全由差异推导
check('预设变卦：movingLinesFor 由差异推导动爻', JSON.stringify(LiuYao.movingLinesFor('111111', '110111')) === '[2]');
check('预设变卦：movingLinesFor 无差异返回空数组', LiuYao.movingLinesFor('111111', '111111').length === 0);
check('预设变卦：movingLinesFor 全差异返回六个动爻',
  JSON.stringify(LiuYao.movingLinesFor('111111', '000000')) === '[0,1,2,3,4,5]');

// ③ 任意本卦 → 任意变卦：64×64 全部可构造，变卦六爻与动爻位置逐组准确
// （术数依据：每爻独立四态，动爻只有老阴老阳，每爻变/不变自由，故 64×64 全部合法，含变卦=本卦）
let variantOk = 0, staticOk = 0, variantBad = [];
for (const ben of LiuYao.HEXAGRAMS) {
  for (const zhi of LiuYao.HEXAGRAMS) {
    const isStatic = ben.bits === zhi.bits;
    const r = LiuYao.cast({method:'name', bits:ben.bits, zhiBits:zhi.bits, date:PRESET_DATE});
    const expectMoving = LiuYao.movingLinesFor(ben.bits, zhi.bits);
    // 本卦每一爻：两卦相同处必为静爻（少阳/少阴），不同处必为动爻（老阳/老阴）
    const lineTypesOk = LiuYao.presetVariantLines(ben.bits, zhi.bits).every((lineType, i) => {
      const moving = lineType === 'old_yang' || lineType === 'old_yin';
      return (ben.bits[i] === zhi.bits[i]) ? !moving : moving;
    });
    const toLines = LiuYao.presetVariantLines(ben.bits, zhi.bits);
    const linesMatchBen = toLines.every((t, i) => (t === 'old_yang' || t === 'young_yang') === (ben.bits[i] === '1'));
    let ok;
    if (isStatic) {
      ok = r.ben.meta.bits === ben.bits && r.zhi === null && r.hasMoving === false &&
        r.ben.moving.length === 0 && lineTypesOk && linesMatchBen &&
        JSON.stringify(r) === JSON.stringify(LiuYao.cast({method:'name', bits:ben.bits, date:PRESET_DATE}));
      if (ok) staticOk++;
    } else {
      ok = r.ben.meta.bits === ben.bits && !!r.zhi && r.zhi.meta.bits === zhi.bits &&
        r.hasMoving === true && JSON.stringify(r.ben.moving) === JSON.stringify(expectMoving) &&
        lineTypesOk && linesMatchBen;
    }
    if (ok) variantOk++; else variantBad.push(ben.image + '→' + zhi.image);
  }
}
check('预设变卦：64×64 全组合可构造且动爻准确（任意本卦可变任意变卦）',
  variantOk === 64 * 64 && variantBad.length === 0);
check('预设变卦：64 组「变卦=本卦」全部等价于不传 zhiBits 的静卦', staticOk === 64);
if (variantBad.length) console.log('    失败组合：' + variantBad.slice(0, 8).join(' / '));

// ③b 反向断言：禁止任何形式的变卦子集 / 阴阳宫 / 动爻数量限制
check('预设变卦：候选变卦恰为全部 64 卦（不做任何子集过滤）',
  LiuYao.variantBitsOf('111111').length === 64 &&
  LiuYao.variantBitsOf('000000').length === 64);
check('预设变卦：候选含本卦自身（自身 = 静卦，合法）',
  LiuYao.variantBitsOf('111111').includes('111111'));
// 逐卦核对：每一卦的候选都必须覆盖全部 64 卦、且 validateVariant 对 64×64 全放行
let subsetFree = 0;
const allBits = LiuYao.HEXAGRAMS.map(h => h.bits);
for (const ben of allBits) {
  const cand = LiuYao.variantBitsOf(ben);
  const coversAll = allBits.every(b => cand.includes(b)) && cand.length === 64;
  const allAccepted = allBits.every(z => LiuYao.validateVariant(ben, z) === true);
  if (coversAll && allAccepted) subsetFree++;
}
check('预设变卦：64 卦的候选范围与校验全部无子集限制', subsetFree === 64);
// 跨阴阳宫组合必须可用（乾宫 → 巽/坎/艮/坤 各宫）
check('预设变卦：跨阴阳宫组合全部可用（乾为天→天风姤 / 坤为地→地雷复）',
  (() => {
    const a = LiuYao.cast({method:'name', bits:'111111', zhiBits:'011111', date:PRESET_DATE});
    const b = LiuYao.cast({method:'name', bits:'000000', zhiBits:'100000', date:PRESET_DATE});
    return a.zhi.meta.image === '天风姤' && b.zhi.meta.image === '地雷复';
  })());

// ③c 乾为天 → 坤为地：六爻全动（概率极低但完全合法）
const qian2kun = LiuYao.cast({method:'name', bits:'111111', zhiBits:'000000', date:PRESET_DATE});
check('预设变卦：乾为天→坤为地 六爻全动',
  qian2kun.ben.meta.image === '乾为天' && qian2kun.zhi.meta.image === '坤为地' &&
  qian2kun.ben.moving.length === 6 && qian2kun.hasMoving === true &&
  JSON.stringify(qian2kun.ben.moving) === '[0,1,2,3,4,5]');
check('预设变卦：六爻全动时本卦六爻全为老阳',
  LiuYao.presetVariantLines('111111', '000000').every(t => t === 'old_yang') &&
  LiuYao.presetVariantLines('000000', '111111').every(t => t === 'old_yin'));
check('预设变卦：六爻全动时变卦六亲仍按本卦宫推算',
  qian2kun.zhi.naJia.every(l => l.liuQin) &&
  qian2kun.zhi.naJia.every((l, i) => l.liuQin === (() => {
    // 用本卦宫五行为基准独立重算一次六亲，与引擎结果比对
    const GEN = {木:'火',火:'土',土:'金',金:'水',水:'木'};
    const CON = {木:'土',土:'水',水:'火',火:'金',金:'木'};
    const pe = qian2kun.ben.meta.element, le = l.element;
    if (pe === le) return '兄弟';
    if (GEN[pe] === le) return '子孙';
    if (GEN[le] === pe) return '父母';
    if (CON[pe] === le) return '妻财';
    if (CON[le] === pe) return '官鬼';
    return '?';
  })()));
check('预设变卦：变卦不增伏神（不增不改）', qian2kun.zhi.naJia.every(l => !l.fuShen));

// ④ 具体样例：乾为天 → 天泽履（三爻动）与 乾为天 → 天风姤（初爻动）
const toLv = LiuYao.cast({method:'name', bits:'111111', zhiBits:'110111', date:PRESET_DATE});
check('预设变卦：乾为天→天泽履 本卦变卦正确',
  toLv.ben.meta.image === '乾为天' && toLv.zhi.meta.image === '天泽履');
check('预设变卦：乾为天→天泽履 动爻为三爻',
  JSON.stringify(toLv.ben.moving) === '[2]' &&
  toLv.ben.naJia[3].sixGod !== undefined);
const toGou = LiuYao.cast({method:'name', bits:'111111', zhiBits:'011111', date:PRESET_DATE});
check('预设变卦：乾为天→天风姤 变卦为天风姤且动爻为初爻',
  toGou.zhi.meta.image === '天风姤' && JSON.stringify(toGou.ben.moving) === '[0]');

// ④b 变卦 = 本卦（静卦）：语义等于「不变」，且结果页不会出现变卦列
const sameAsBen = LiuYao.cast({method:'name', bits:'100010', zhiBits:'100010', date:PRESET_DATE});
check('预设变卦：变卦=本卦 被识别为静卦（无动爻、无变卦列）',
  sameAsBen.zhi === null && sameAsBen.hasMoving === false &&
  sameAsBen.ben.moving.length === 0);
check('预设变卦：变卦=本卦 的结果与不传 zhiBits 逐字段一致',
  JSON.stringify(sameAsBen) === JSON.stringify(LiuYao.cast({method:'name', bits:'100010', date:PRESET_DATE})));

// ⑤ 结果对象与铜钱起卦同构（结果页 / 古文区 / 提示词卡片无需改动即可工作）
const coinShape = LiuYao.cast({method:'coin', lines:['old_yang','young_yin','young_yin','young_yang','young_yin','young_yin'], date:PRESET_DATE});
const sameShape = (a, b) => JSON.stringify(Object.keys(a).sort()) === JSON.stringify(Object.keys(b).sort());
check('预设变卦：结果对象与铜钱起卦同构',
  sameShape(toLv, coinShape) && sameShape(toLv.ben, coinShape.ben) && sameShape(toLv.analysis, coinShape.analysis));
check('预设变卦：变卦六爻 bits 逐爻等于所选变卦',
  toLv.zhi.meta.bits === '110111' && toLv.zhi.naJia.length === 6);

// ⑥ 提示词：本卦名 / 变卦名 / 动爻位置均正确
const presetText = LiuYao.buildGuaTextPrompt(toLv);
check('预设变卦：提示词含本卦名', presetText.includes('本卦：乾为天'));
check('预设变卦：提示词含变卦名', presetText.includes('变卦：天泽履'));
check('预设变卦：提示词动爻位置正确', presetText.includes('动爻：三爻'));
check('预设变卦：提示词含变卦六爻节', presetText.includes('变卦六爻（自上而下）：'));

// ⑥b 提示词在「静卦 / 单动爻 / 六爻全动」三种情形下都与页面展示同源
const promptStaticName = LiuYao.buildGuaTextPrompt(LiuYao.cast({method:'name', bits:'111111', date:PRESET_DATE}));
check('预设变卦：静卦提示词写明无变卦、无动爻',
  promptStaticName.includes('变卦：无变卦（静卦）') && promptStaticName.includes('动爻：无动爻') &&
  !promptStaticName.includes('变卦六爻'));
const promptSame = LiuYao.buildGuaTextPrompt(sameAsBen);
check('预设变卦：变卦=本卦 的提示词与静卦口径一致（无变卦 / 无动爻）',
  promptSame.includes('变卦：无变卦（静卦）') && promptSame.includes('动爻：无动爻') &&
  !promptSame.includes('变卦六爻'));
const promptAllMoving = LiuYao.buildGuaTextPrompt(qian2kun);
check('预设变卦：六爻全动提示词列出全部六个动爻',
  promptAllMoving.includes('动爻：初爻、二爻、三爻、四爻、五爻、上爻') &&
  promptAllMoving.includes('本卦：乾为天') && promptAllMoving.includes('变卦：坤为地'));
check('预设变卦：六爻全动提示词本卦侧标六个动爻、变卦侧不标动爻',
  (promptAllMoving.match(/（动爻）/g) || []).length === 6);
check('预设变卦：提示词不臆造字段（全动情形无 undefined/null/NaN）',
  !/undefined|null|NaN/.test(promptAllMoving));

// ⑦ 非法输入必须拒绝，不得静默生成错卦。
// 注意：「变卦与本卦相同」不在此列 —— 那是合法的静卦（见 ④b），不是非法组合。
const badVariants = [
  ['111111', '11111', '变卦位数不足'],
  ['111111', '1111111', '变卦位数过多'],
  ['111111', 'abcdef', '变卦非阴阳爻'],
  ['111111', '2', '变卦非法字符'],
  ['invalid', '110111', '本卦非法'],
  ['', '110111', '本卦为空'],
];
let rejected = 0, leaked = [];
for (const [b, z, why] of badVariants) {
  try {
    LiuYao.cast({method:'name', bits:b, zhiBits:z, date:PRESET_DATE});
    leaked.push(why);
  } catch (e) { if (e && e.message) rejected++; else leaked.push(why + '(无消息)'); }
}
check('预设变卦：非法输入全部被拒绝且有明确错误', rejected === badVariants.length && leaked.length === 0);
if (leaked.length) console.log('    未拒绝：' + leaked.join(' / '));

let validateThrew = 0;
for (const [b, z] of badVariants) {
  try { LiuYao.validateVariant(b, z); } catch (e) { validateThrew++; }
}
check('预设变卦：validateVariant 对非法输入一律抛错', validateThrew === badVariants.length);
check('预设变卦：validateVariant 对本卦=变卦放行（静卦合法）',
  LiuYao.validateVariant('111111', '111111') === true);

// ⑦b 铜钱起卦显式传入六爻时也必须校验（此前 5 爻 / 非法类型会被静默接受）
const badCoin = [
  [['young_yang','young_yang','young_yang','young_yang','young_yang'], '铜钱起卦只有 5 爻'],
  [['young_yang','young_yang','young_yang','young_yang','young_yang','young_yang','young_yang'], '铜钱起卦有 7 爻'],
  [['young_yang','young_yang','young_yang','young_yang','young_yang','BOGUS'], '铜钱起卦含非法爻类型'],
  [['young_yang','young_yang','young_yang','young_yang','young_yang', 7], '铜钱起卦爻值为数字'],
];
let coinRejected = 0, coinLeaked = [];
for (const [lines, why] of badCoin) {
  try { LiuYao.cast({method:'coin', lines, date:PRESET_DATE}); coinLeaked.push(why); }
  catch (e) { if (e && e.message) coinRejected++; else coinLeaked.push(why + '(无消息)'); }
}
check('铜钱起卦：显式传入的非法六爻一律被拒绝', coinRejected === badCoin.length && coinLeaked.length === 0);
if (coinLeaked.length) console.log('    未拒绝：' + coinLeaked.join(' / '));
check('铜钱起卦：合法六爻仍正常接受', (() => {
  const r = LiuYao.cast({method:'coin', lines:['old_yang','young_yin','young_yang','young_yin','young_yang','old_yin'], date:PRESET_DATE});
  return r.ben.meta.bits === '101010' && r.ben.moving.length === 2;
})());
check('铜钱起卦：不传 lines 时仍走随机摇卦', (() => {
  const r = LiuYao.cast({method:'coin', date:PRESET_DATE});
  return !!r.ben && r.ben.naJia.length === 6;
})());

// ⑧ 六爻全动 / 五爻动 / 零动 / 仅初爻 / 仅上爻 边界全部走通
const boundaryCases = [
  ['全动', ['old_yang','old_yang','old_yang','old_yang','old_yang','old_yang'], 6],
  ['五爻动', ['old_yang','old_yang','old_yang','old_yang','old_yang','young_yang'], 5],
  ['零动爻', ['young_yang','young_yin','young_yang','young_yin','young_yang','young_yin'], 0],
  ['仅初爻动', ['old_yang','young_yang','young_yang','young_yang','young_yang','young_yang'], 1],
  ['仅上爻动', ['young_yang','young_yang','young_yang','young_yang','young_yang','old_yin'], 1],
  ['仅上爻动(老阳)', ['young_yang','young_yang','young_yang','young_yang','young_yang','old_yang'], 1],
  ['全动(老阴)', ['old_yin','old_yin','old_yin','old_yin','old_yin','old_yin'], 6],
];
let boundaryOk = 0, boundaryBad = [];
for (const [name, lines, expectCount] of boundaryCases) {
  const r = LiuYao.cast({method:'coin', lines, date:PRESET_DATE});
  const ok = r.ben.moving.length === expectCount &&
    (expectCount === 0 ? (r.zhi === null && r.hasMoving === false) : (!!r.zhi && r.hasMoving === true));
  if (ok) boundaryOk++; else boundaryBad.push(name + '(动爻' + r.ben.moving.length + '期望' + expectCount + ')');
}
check('预设变卦：动爻数量边界（全动/五动/零动/仅初/仅上）全部走通',
  boundaryOk === boundaryCases.length && boundaryBad.length === 0);
if (boundaryBad.length) console.log('    异常：' + boundaryBad.join(' / '));

// 每个爻位单独为动爻，变卦都应逐爻正确
let perLineOk = 0;
for (let k = 0; k < 6; k++) {
  const lines = ['young_yang','young_yang','young_yang','young_yang','young_yang','young_yang'];
  lines[k] = 'old_yang';
  const r = LiuYao.cast({method:'coin', lines, date:PRESET_DATE});
  if (r.ben.moving.length === 1 && r.ben.moving[0] === k && r.zhi.meta.bits[k] === '0') perLineOk++;
}
check('预设变卦：六个爻位分别单独为动爻时变卦逐爻正确', perLineOk === 6);

// ⑨ 候选变卦列表 = 全部 64 卦（含本卦自身）
const variantCandidates = LiuYao.variantBitsOf('111111');
check('预设变卦：候选变卦共 64 个且含本卦自身',
  variantCandidates.length === 64 && variantCandidates.includes('111111'));
check('预设变卦：候选变卦均为六位阴阳爻且唯一',
  variantCandidates.every(b => /^[01]{6}$/.test(b)) &&
  new Set(variantCandidates).size === 64);
check('预设变卦：候选含天风姤（初爻动）', variantCandidates.includes('011111'));

console.log('\n===== 六爻引擎测试结果 =====');
results.forEach(r => console.log(r));
console.log('===== 结束 =====');
