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
check('未核验大象传不伪造数据', classical.every(h => h.daxiang === null && h.daxiangSource === null));
check('古文来源信息完整', LiuYao.CLASSICAL_SOURCE.guaciAndLines.file === '周易六十四卦_卦辞爻辞.md' &&
  /^[a-f0-9]{64}$/.test(LiuYao.CLASSICAL_SOURCE.guaciAndLines.sha256));

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
    result.ben.meta.classical.guaci !== h.guaci;
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

console.log('\n===== 六爻引擎测试结果 =====');
results.forEach(r => console.log(r));
console.log('===== 结束 =====');
