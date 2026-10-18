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

const parityFixture = JSON.parse(fs.readFileSync('test/fixtures/bazi-parity.json', 'utf8'));
check('八字黄金样本文件覆盖历法与规则边界', Array.isArray(parityFixture.cases) && parityFixture.cases.length >= 20);
parityFixture.cases.forEach(item => {
  const actual = Bazi.calculate(item.input);
  const expected = item.expected;
  check('黄金样本 ' + item.id,
    (!expected.pillars || JSON.stringify(actual.pillars) === JSON.stringify(expected.pillars)) &&
    (expected.solarDatetime === undefined || actual.solarDatetime === expected.solarDatetime) &&
    (expected.chartSolarDatetime === undefined || actual.chartSolarDatetime === expected.chartSolarDatetime) &&
    (expected.dayun === undefined || (actual.yun ? actual.yun.daYun.length : 0) === expected.dayun) &&
    (expected.direction === undefined || (actual.yun ? actual.yun.forward : null) === expected.direction) &&
    (expected.chenggu === undefined || (actual.extras.chenggu && actual.extras.chenggu.weightName) === expected.chenggu));
});

// 验收用例 1：1990-06-15 08:32 女
const case1 = Bazi.calculate({
  gender:'female', calendarType:'solar', solarDate:'1990-06-15', time:'08:32', useTrueSolarTime:false
});
check('用例1 四柱正确', JSON.stringify(case1.pillars) === JSON.stringify({
  year:'庚午', month:'壬午', day:'辛亥', hour:'壬辰'
}));
check('用例1 阴年女顺排校验为逆排', case1.yun.forward === false);
check('用例1 大运起点包含夏令时修正', case1.yun.start.years === 3 && case1.yun.start.months === 0 && case1.yun.start.days === 3 && case1.yun.start.hours === 20);
check('用例1 起运虚岁正确', case1.yun.start.age === 4);
check('用例1 首步大运为辛巳', case1.yun.daYun[0].ganZhi === '辛巳');
check('十神计算正确', case1.pillarDetails.year.shiShen === '劫财' && case1.pillarDetails.month.shiShen === '伤官');
check('藏干与十神存在', case1.pillarDetails.day.hidden.length > 0 && !!case1.pillarDetails.day.hidden[0].shiShen);
check('四柱纳音存在', case1.columns.every(item => !!item.naYin));
check('空亡与神煞字段存在', case1.columns.every(item => item.xunKong && Array.isArray(item.shenSha)));
check('神煞规则库已完整载入', case1.pillarDetails.day.shenSha.includes('天厨贵人') && case1.pillarDetails.day.shenSha.includes('孤鸾煞'));
check('五行统计总数为8', Object.values(case1.extras.wuXing).reduce((a, b) => a + b, 0) === 8);
check('大运默认120年含12步', case1.yun.daYun.length === 12 && case1.yun.daYun[0].liuNian.length === 10);

// 验收用例 2：1985-03-20 10:30 男
const case2 = Bazi.calculate({
  gender:'male', calendarType:'solar', solarDate:'1985-03-20', time:'10:30', useTrueSolarTime:false
});
check('用例2 四柱正确', JSON.stringify(case2.pillars) === JSON.stringify({
  year:'乙丑', month:'己卯', day:'戊午', hour:'丁巳'
}));
check('用例2 阴年男逆排', case2.yun.forward === false);
check('用例2 大运起点正确', case2.yun.start.years === 4 && case2.yun.start.months === 9 && case2.yun.start.days === 26);

// 验收用例 3：晚子时，日柱进位、时干仍按当日日干
const case3 = Bazi.calculate({
  gender:'female', calendarType:'solar', solarDate:'1990-06-15', time:'23:30', useTrueSolarTime:false, applyChinaDst:false
});
check('23:30 日柱按次日计算', case3.pillars.day === '壬子');
check('23:30 时柱按当日日干起算', case3.pillars.hour === '戊子');

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
const trueSolarWithEot = Bazi.calculate({
  gender:'female', calendarType:'solar', solarDate:'2026-09-04', time:'02:03',
  useTrueSolarTime:true, longitude:104.0665, applyChinaDst:false
});
check('真太阳时包含经度与均时差校正',
  trueSolarWithEot.longitudeCorrectionMinutes === -63.7 &&
  trueSolarWithEot.eotCorrectionMinutes === 0.5 &&
  trueSolarWithEot.chartSolarDatetime === '2026-09-04 01:00');
const longitudeOnly = Bazi.calculate({
  gender:'female', calendarType:'solar', solarDate:'2026-09-04', time:'02:03',
  useTrueSolarTime:true, longitude:104.0665, applyChinaDst:false, equationOfTime:false
});
check('可关闭均时差仅保留经度校正',
  longitudeOnly.longitudeCorrectionMinutes === -63.7 &&
  longitudeOnly.eotCorrectionMinutes === 0 &&
  longitudeOnly.chartSolarDatetime === '2026-09-04 00:59');
const noLongitude = Bazi.calculate({
  gender:'female', calendarType:'solar', solarDate:'1990-06-15', time:'08:32',
  useTrueSolarTime:true, longitude:null, applyChinaDst:false
});
check('未选出生地不执行经度校正', noLongitude.longitudeCorrectionMinutes === 0 && noLongitude.pillars.hour === '壬辰');
const dstCase = Bazi.calculate({
  gender:'female', calendarType:'solar', solarDate:'1990-06-15', time:'08:32', useTrueSolarTime:false
});
check('中国夏令时自动减1小时', dstCase.dstCorrectionMinutes === -60 && dstCase.chartSolarDatetime === '1990-06-15 07:32');

// 四柱直排模式
const direct = Bazi.calculate({
  gender:'female', calendarType:'ganzhi', solarDate:'1990-06-15', time:'08:32', useTrueSolarTime:false,
  fourPillars:{year:'庚午', month:'壬午', day:'辛亥', hour:'壬辰'}
});
check('四柱直排保持用户输入', JSON.stringify(direct.pillars) === JSON.stringify({
  year:'庚午', month:'壬午', day:'辛亥', hour:'壬辰'
}));
check('四柱直排附加信息完整', !!direct.extras.mingGong && !!direct.extras.shenGong && direct.yun.daYun.length === 12);
check('四柱直排自动反推公历时间', direct.resolvedSolarDate === '1990-06-15' && direct.resolvedTime === '08:00');
const directReopened = Bazi.calculate({
  gender:'female', calendarType:'solar', solarDate:direct.resolvedSolarDate, time:direct.resolvedTime,
  useTrueSolarTime:false, applyChinaDst:false
});
check('四柱直排反推时间可复现同一四柱', JSON.stringify(directReopened.pillars) === JSON.stringify(direct.pillars));
check('人元司令按交节天数计算', direct.extras.renYuanSiLing.gan === '丁');

const jieBoundaryCase = Bazi.calculate({
  gender:'female', calendarType:'solar', solarDate:'2023-02-04', time:'10:45', useTrueSolarTime:false
});
check('交节当日司令计算正确', jieBoundaryCase.extras.renYuanSiLing.gan === '戊');

const directFuture = Bazi.calculate({
  gender:'female', calendarType:'ganzhi', solarDate:'2023-02-04', time:'10:45', useTrueSolarTime:false,
  fourPillars:{year:'癸卯', month:'甲寅', day:'癸巳', hour:'丁巳'}
});
check('四柱直排跟随节气边界反推', directFuture.resolvedSolarDate === '1963-02-19' && directFuture.resolvedTime === '10:00');

const directAcrossCycles = Bazi.calculate({
  gender:'male', calendarType:'ganzhi', solarDate:'2026-09-13', time:'12:00', useTrueSolarTime:false,
  fourPillars:{year:'甲子', month:'丙寅', day:'戊辰', hour:'壬子'}
});
check('四柱直排可向前跨 60 年周期反推', directAcrossCycles.hasBirthTime &&
  directAcrossCycles.resolvedSolarDate === '1924-02-19' && directAcrossCycles.resolvedTime === '00:30');
const directClockOnly = Bazi.calculate({
  gender:'male', calendarType:'ganzhi', solarDate:'2026-09-13', time:'12:00',
  useTrueSolarTime:true, longitude:104.0665, fourPillars:{year:'甲子', month:'丙寅', day:'戊辰', hour:'壬子'}
});
check('四柱直排校验统一使用钟表时间', directClockOnly.resolvedSolarDate === directAcrossCycles.resolvedSolarDate &&
  directClockOnly.resolvedTime === directAcrossCycles.resolvedTime);

const directLateZi = Bazi.calculate({
  gender:'male', calendarType:'ganzhi', solarDate:'1990-06-01', time:'12:00', useTrueSolarTime:false,
  fourPillars:{year:'庚午', month:'壬午', day:'壬子', hour:'戊子'}
});
check('四柱直排晚子时反推正确', directLateZi.hasBirthTime &&
  directLateZi.resolvedSolarDate === '1990-06-15' && directLateZi.resolvedTime === '23:30');

let fiveTigerMessage = '';
try {
  Bazi.validateDirectPillars({year:'甲子', month:'戊寅', day:'戊辰', hour:'壬子'});
} catch (err) {
  fiveTigerMessage = err.message;
}
check('矛盾年月柱给出五虎遁提示', fiveTigerMessage === '年柱与月柱不符合五虎遁规则，请检查');

const directNoSolution = Bazi.calculate({
  gender:'male', calendarType:'ganzhi', solarDate:'', time:'', useTrueSolarTime:false,
  fourPillars:{year:'甲子', month:'丙寅', day:'癸丑', hour:'丙辰'}
});
check('合法四柱无解时返回四柱直录结果', !directNoSolution.hasBirthTime && !directNoSolution.directTimeResolved &&
  directNoSolution.solarDatetime === '' && directNoSolution.yun === null && !!directNoSolution.extras.taiYuan);

// 问真兼容的逐柱空亡、称骨、规则快照与换年边界
const parityCase = Bazi.calculate({
  gender:'male', calendarType:'solar', solarDate:'1990-01-01', time:'00:00',
  useTrueSolarTime:false, applyChinaDst:false
});
check('逐柱空亡按各自旬首计算',
  parityCase.columns.map(item => item.xunKong).join('/') === '戌亥/申酉/戌亥/午未');
check('称骨数据与问真运行样例一致',
  parityCase.extras.chenggu.weightName === '四两二钱' &&
  parityCase.extras.chenggu.total === 42 &&
  parityCase.extras.chenggu.lines[0] === '得宽怀处且宽怀，何用双眉皱不开；' &&
  parityCase.extras.chenggu.lines[1] === '若使中年命运济，那时名利一齐来。');
check('称骨来源和胎息/星宿/命卦字段已接入',
  parityCase.extras.chenggu.source === Bazi.CHENGGU_SOURCE &&
  parityCase.extras.taiXi === '辛亥' &&
  parityCase.extras.xingXiu === '心' &&
  !!parityCase.extras.mingGua);
const chengguValidation = JSON.parse(fs.readFileSync('test/fixtures/chenggu-validate.json', 'utf8'));
check('问真称骨运行样本共12组', Array.isArray(chengguValidation) && chengguValidation.length === 12);
chengguValidation.forEach((item, index) => {
  const male = Bazi.calculateChenggu(item.year, item.month, item.day, item.hour, 'male');
  const female = Bazi.calculateChenggu(item.year, item.month, item.day, item.hour, 'female');
  check('问真称骨样本 ' + (index + 1),
    !!male && !!female && male.id === item.id && male.text === item.man && female.text === item.woman);
});
check('规则快照记录历法/换年/时区/大运跨度',
  parityCase.rulesSnapshot.yearBoundary === 'lichun' &&
  parityCase.rulesSnapshot.utcOffset === 8 &&
  parityCase.rulesSnapshot.dayunSpanYears === 120 &&
  parityCase.rulesSnapshot.engineVersion === 'wenzhen-2.8.1-free');
const span80 = Bazi.calculate({
  gender:'male', calendarType:'solar', solarDate:'1990-01-01', time:'00:00',
  useTrueSolarTime:false, applyChinaDst:false,
  rulesSnapshot:{dayunSpanYears:80}
});
check('大运支持80年选项', span80.yun.daYun.length === 8 && span80.yun.spanYears === 80);
const dahan = Bazi.calculate({
  gender:'male', calendarType:'solar', solarDate:'2024-01-25', time:'12:00',
  useTrueSolarTime:false, applyChinaDst:false,
  rulesSnapshot:{yearBoundary:'dahan'}
});
const lichun = Bazi.calculate({
  gender:'male', calendarType:'solar', solarDate:'2024-01-25', time:'12:00',
  useTrueSolarTime:false, applyChinaDst:false,
  rulesSnapshot:{yearBoundary:'lichun'}
});
check('换年规则切换后年柱按边界变化', dahan.pillars.year === '甲辰' && lichun.pillars.year === '癸卯');
const utcZero = Bazi.calculate({
  gender:'male', calendarType:'solar', solarDate:'1990-06-15', time:'08:32',
  useTrueSolarTime:true, longitude:121.4737, applyChinaDst:false,
  rulesSnapshot:{utcOffset:0}
});
check('时区偏移参与真太阳时基准计算', utcZero.longitudeCorrectionMinutes > 400 && !!utcZero.rulesSnapshot);
const boundary1801 = Bazi.calculate({gender:'male', calendarType:'solar', solarDate:'1801-01-01', time:'12:00', useTrueSolarTime:false});
const boundary2100 = Bazi.calculate({gender:'female', calendarType:'solar', solarDate:'2100-01-01', time:'12:00', useTrueSolarTime:false});
check('1801与2100边界年份可排盘', !!boundary1801.pillars.year && !!boundary2100.pillars.year);

// 流月使用真实交节日期
const timeline = Bazi.calculate({
  gender:'female', calendarType:'solar', solarDate:'1990-06-15', time:'08:32', useTrueSolarTime:false
});
let liuNian2026 = null;
timeline.yun.daYun.forEach(dayun => {
  const found = dayun.liuNian.find(item => item.year === 2026);
  if(found) liuNian2026 = found;
});
check('流年包含真实节气日期', !!liuNian2026 && liuNian2026.liuYue[0].jieQiDate === '2026-02-04');
check('流月春季节气日期正确', !!liuNian2026 && liuNian2026.liuYue[1].jieQiDate === '2026-03-05' && liuNian2026.liuYue[3].jieQiDate === '2026-05-05');
check('年末流月跨年节气正确', !!liuNian2026 && liuNian2026.liuYue[11].jieQiDate === '2027-01-05');

// ===== 主界面「今日干支」卡片所需的历法能力（节气段）=====
check('节气段函数已导出', typeof Bazi.getJieQiSegment === 'function');
check('Solar 构造器已导出（供页面按排盘时刻反推节气段）',
  typeof Bazi.Solar === 'object' && typeof Bazi.Solar.fromYmdHms === 'function');

const segOf = (y, mo, d, h, mi) => Bazi.getJieQiSegment(Bazi.Solar.fromYmdHms(y, mo, d, h, mi, 0));
const segMid = segOf(2026, 9, 18, 9, 5);
check('节气段：白露段格式为「名 M/D–M/D」',
  !!segMid && segMid.name === '白露' && segMid.start === '9/7' && segMid.end === '10/8' && segMid.text === '白露 9/7–10/8');
check('节气段：起止均为交节当日（不含时间与年份）',
  !!segMid && /^\d{1,2}\/\d{1,2}$/.test(segMid.start) && /^\d{1,2}\/\d{1,2}$/.test(segMid.end));
check('节气段：跨年段只写 M/D–M/D',
  (() => { const s = segOf(2026, 12, 20, 12, 0); return !!s && s.text === '大雪 12/7–1/5'; })());
check('节气段：交节时刻切换（2026 白露在 9/7 22:41:16，前一刻仍属立秋段）',
  (() => {
    const before = segOf(2026, 9, 7, 22, 0);   // 交节前 → 仍是立秋段
    const after = segOf(2026, 9, 7, 23, 0);    // 交节后 → 白露段
    return !!before && !!after &&
      before.name === '立秋' && before.text === '立秋 8/7–9/7' &&
      after.name === '白露' && after.start === '9/7' && after.end === '10/8';
  })());
check('节气段：非法入参返回 null 而不是抛错或臆造',
  Bazi.getJieQiSegment(null) === null && Bazi.getJieQiSegment({}) === null && Bazi.getJieQiSegment(undefined) === null);
check('节气段与月柱同源（节气段可正常取得且与排盘并存）',
  (() => {
    let ok = 0;
    [[2026, 1, 5, 10, 0], [2026, 3, 21, 12, 0], [2026, 9, 18, 9, 5], [2026, 12, 20, 12, 0]].forEach(([y, mo, d, h, mi]) => {
      const chart = Bazi.calculate({ calendarType: 'solar', solarDate: `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`, time: `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}` });
      const seg = Bazi.getJieQiSegment(Bazi.Solar.fromYmdHms(y, mo, d, h, mi, 0));
      if (seg && seg.name && chart.pillars.month) ok++;
    });
    return ok === 4;
  })());

// 新增只做加法：既有导出与常量零影响
check('新增节气段不改变既有导出',
  typeof Bazi.calculate === 'function' && typeof Bazi.validateDirectPillars === 'function' &&
  typeof Bazi.findDirectMatches === 'function' && typeof Bazi.getLunarMonths === 'function' &&
  typeof Bazi.getLunarDays === 'function' && typeof Bazi.getNaYin === 'function' &&
  typeof Bazi.getHiddenGan === 'function' && typeof Bazi.tenGod === 'function' &&
  typeof Bazi.changSheng === 'function' &&
  Array.isArray(Bazi.CITIES) && Bazi.GAN.length === 10 && Bazi.ZHI.length === 12 && Bazi.JIAZI.length === 60);

console.log('\n===== 八字引擎测试结果 =====');
results.forEach(r => console.log(r));
console.log('===== 结束 =====');
