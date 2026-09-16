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
const time = LiuYao.cast({method:'time', date:'2026-09-10T10:00:00'});
check('时间起卦生成六爻', time.ben.naJia.length === 6);

// 单次铜钱摇卦
check('单次摇卦接口存在', typeof LiuYao.tossCoin === 'function');
const one = LiuYao.tossCoin();
check('单次摇卦返回三枚铜钱', Array.isArray(one.values) && one.values.length === 3);
check('单次摇卦卦型合法', ['old_yin','young_yang','young_yin','old_yang'].indexOf(one.type) >= 0);
check('单次摇卦点数正确', one.values[0] + one.values[1] + one.values[2] === one.sum);

// coin 起卦应使用传入的逐爻结果
const coinCast = LiuYao.cast({method:'coin', lines:['young_yang','young_yang','young_yang','young_yang','young_yang','young_yang'], date:'2000-01-07T12:00:00'});
check('coin 起卦使用传入六爻', coinCast.ben.meta.image === '乾为天' && coinCast.hasMoving === false);

check('古文数据可按 bits 查询', LiuYao.getClassical('111111').guaci === '元亨，利贞。');

console.log('\n===== 六爻引擎测试结果 =====');
results.forEach(r => console.log(r));
console.log('===== 结束 =====');
