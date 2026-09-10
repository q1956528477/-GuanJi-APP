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

console.log('\n===== 六爻引擎测试结果 =====');
results.forEach(r => console.log(r));
console.log('===== 结束 =====');