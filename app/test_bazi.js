// 八字排盘引擎纯逻辑测试（不依赖 jsdom，可在 Node 直接运行）
const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('www/bazi.bundle.js', 'utf8');
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

const Bazi = ctx.Bazi;
check('八字引擎已加载', !!(Bazi && Bazi.calculate));

// 验收用例 1：1990-06-15 08:32 女
const case1 = Bazi.calculate({
  gender:'female', calendarType:'solar', solarDate:'1990-06-15', time:'08:32', useTrueSolarTime:false
});
check('用例1 四柱正确', JSON.stringify(case1.pillars) === JSON.stringify({
  year:'庚午', month:'壬午', day:'辛亥', hour:'壬辰'
}));
check('用例1 阴年女顺排校验为逆排', case1.yun.forward === false);
check('用例1 大运起点正确', case1.yun.start.years === 3 && case1.yun.start.months === 0 && case1.yun.start.days === 10);
check('用例1 首步大运为辛巳', case1.yun.daYun[0].ganZhi === '辛巳');
check('十神计算正确', case1.pillarDetails.year.shiShen === '劫财' && case1.pillarDetails.month.shiShen === '伤官');
check('藏干与十神存在', case1.pillarDetails.day.hidden.length > 0 && !!case1.pillarDetails.day.hidden[0].shiShen);
check('四柱纳音存在', case1.columns.every(item => !!item.naYin));
check('空亡与神煞字段存在', case1.columns.every(item => item.xunKong && Array.isArray(item.shenSha)));
check('五行统计总数为8', Object.values(case1.extras.wuXing).reduce((a, b) => a + b, 0) === 8);
check('大运含10步', case1.yun.daYun.length === 10 && case1.yun.daYun[0].liuNian.length === 10);

// 验收用例 2：1985-03-20 10:30 男
const case2 = Bazi.calculate({
  gender:'male', calendarType:'solar', solarDate:'1985-03-20', time:'10:30', useTrueSolarTime:false
});
check('用例2 四柱正确', JSON.stringify(case2.pillars) === JSON.stringify({
  year:'乙丑', month:'己卯', day:'戊午', hour:'丁巳'
}));
check('用例2 阴年男逆排', case2.yun.forward === false);
check('用例2 大运起点正确', case2.yun.start.years === 4 && case2.yun.start.months === 10);

// 验收用例 3：晚子时，日柱进位、时干仍按当日日干
const case3 = Bazi.calculate({
  gender:'female', calendarType:'solar', solarDate:'1990-06-15', time:'23:30', useTrueSolarTime:false
});
check('23:30 日柱按次日计算', case3.pillars.day === '壬子');
check('23:30 时柱按当日日干起算', case3.pillars.hour === '庚子');

// 农历闰月校验
const leapMonths = Bazi.getLunarMonths(2023);
check('2023 年识别闰二月', leapMonths.some(item => item.value === -2 && item.label === '闰二月'));
check('2023 年农历月份数量正确', leapMonths.length === 13);
check('闰二月天数正确', Bazi.getLunarDays(2023, -2) === 29);
const lunarCase = Bazi.calculate({
  gender:'male', calendarType:'lunar', lunarYear:2023, lunarMonth:-2, lunarDay:1, time:'12:00', useTrueSolarTime:false
});
check('农历闰二月可转公历并排盘', lunarCase.solarDatetime === '2023-03-22 12:00' && lunarCase.pillars.year === '癸卯');

// 真太阳时开关
const trueSolar = Bazi.calculate({
  gender:'female', calendarType:'solar', solarDate:'1990-06-15', time:'08:32',
  useTrueSolarTime:true, longitude:116.4074
});
check('真太阳时执行经度校正', trueSolar.correctionMinutes < 0 && trueSolar.chartSolarDatetime !== trueSolar.solarDatetime);

// 四柱直排模式
const direct = Bazi.calculate({
  gender:'female', calendarType:'ganzhi', solarDate:'1990-06-15', time:'08:32', useTrueSolarTime:false,
  fourPillars:{year:'庚午', month:'壬午', day:'辛亥', hour:'壬辰'}
});
check('四柱直排保持用户输入', JSON.stringify(direct.pillars) === JSON.stringify({
  year:'庚午', month:'壬午', day:'辛亥', hour:'壬辰'
}));
check('四柱直排附加信息完整', !!direct.extras.mingGong && !!direct.extras.shenGong && direct.yun.daYun.length === 10);

console.log('\n===== 八字引擎测试结果 =====');
results.forEach(r => console.log(r));
console.log('===== 结束 =====');
