import lunarPkg from 'lunar-javascript';

const { Solar, Lunar, LunarYear } = lunarPkg;

const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const ELEMENTS = ['木','火','土','金','水'];
const GAN_ELEMENT = {甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const ZHI_ELEMENT = {子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
const HIDDEN_GAN = {
  子:['癸'], 丑:['己','癸','辛'], 寅:['甲','丙','戊'], 卯:['乙'],
  辰:['戊','乙','癸'], 巳:['丙','戊','庚'], 午:['丁','己'], 未:['己','丁','乙'],
  申:['庚','壬','戊'], 酉:['辛'], 戌:['戊','辛','丁'], 亥:['壬','甲']
};
const CHANG_SHENG = ['长生','沐浴','冠带','临官','帝旺','衰','病','死','墓','绝','胎','养'];
const CHANG_SHENG_START = {甲:'亥',乙:'午',丙:'寅',丁:'酉',戊:'寅',己:'酉',庚:'巳',辛:'子',壬:'申',癸:'卯'};
const JIAZI = [];
for (let i = 0; i < 60; i++) JIAZI.push(GAN[i % 10] + ZHI[i % 12]);

const CITIES = [
  {province:'北京', name:'北京', longitude:116.4074},
  {province:'上海', name:'上海', longitude:121.4737},
  {province:'天津', name:'天津', longitude:117.2000},
  {province:'重庆', name:'重庆', longitude:106.5516},
  {province:'广东', name:'广州', longitude:113.2644},
  {province:'广东', name:'深圳', longitude:114.0579},
  {province:'广东', name:'佛山', longitude:113.1220},
  {province:'广东', name:'东莞', longitude:113.7518},
  {province:'广东', name:'珠海', longitude:113.5767},
  {province:'四川', name:'成都', longitude:104.0665},
  {province:'浙江', name:'杭州', longitude:120.1551},
  {province:'浙江', name:'宁波', longitude:121.5503},
  {province:'浙江', name:'温州', longitude:120.6994},
  {province:'江苏', name:'南京', longitude:118.7969},
  {province:'江苏', name:'苏州', longitude:120.5853},
  {province:'江苏', name:'无锡', longitude:120.3119},
  {province:'湖北', name:'武汉', longitude:114.3055},
  {province:'陕西', name:'西安', longitude:108.9398},
  {province:'河南', name:'郑州', longitude:113.6254},
  {province:'湖南', name:'长沙', longitude:112.9388},
  {province:'辽宁', name:'沈阳', longitude:123.4315},
  {province:'黑龙江', name:'哈尔滨', longitude:126.5349},
  {province:'吉林', name:'长春', longitude:125.3235},
  {province:'山东', name:'济南', longitude:117.1201},
  {province:'山东', name:'青岛', longitude:120.3826},
  {province:'安徽', name:'合肥', longitude:117.2272},
  {province:'福建', name:'福州', longitude:119.2965},
  {province:'福建', name:'厦门', longitude:118.0894},
  {province:'江西', name:'南昌', longitude:115.8582},
  {province:'云南', name:'昆明', longitude:102.8329},
  {province:'贵州', name:'贵阳', longitude:106.6302},
  {province:'广西', name:'南宁', longitude:108.3669},
  {province:'海南', name:'海口', longitude:110.1999},
  {province:'甘肃', name:'兰州', longitude:103.8343},
  {province:'青海', name:'西宁', longitude:101.7782},
  {province:'宁夏', name:'银川', longitude:106.2309},
  {province:'新疆', name:'乌鲁木齐', longitude:87.6168},
  {province:'西藏', name:'拉萨', longitude:91.1409},
  {province:'内蒙古', name:'呼和浩特', longitude:111.7492},
  {province:'山西', name:'太原', longitude:112.5489},
  {province:'河北', name:'石家庄', longitude:114.5149},
  {province:'香港', name:'香港', longitude:114.1694},
  {province:'澳门', name:'澳门', longitude:113.5439},
  {province:'台湾', name:'台北', longitude:121.5654}
];

const SHEN_SHA_TABLES = {
  tianYi: {
    甲:['丑','未'], 戊:['丑','未'], 庚:['丑','未'], 乙:['子','申'], 己:['子','申'],
    丙:['亥','酉'], 丁:['亥','酉'], 壬:['卯','巳'], 癸:['卯','巳'], 辛:['午','寅']
  },
  taiJi: {
    甲:['子','午'], 乙:['子','午'], 丙:['卯','酉'], 丁:['卯','酉'],
    戊:['辰','戌','丑','未'], 己:['辰','戌','丑','未'], 庚:['寅','亥'], 辛:['寅','亥'], 壬:['巳','申'], 癸:['巳','申']
  },
  wenChang: {甲:['巳'], 乙:['午'], 丙:['申'], 丁:['酉'], 戊:['申'], 己:['酉'], 庚:['亥'], 辛:['子'], 壬:['寅'], 癸:['卯']},
  yangRen: {甲:['卯'], 乙:['寅'], 丙:['午'], 丁:['巳'], 戊:['午'], 己:['巳'], 庚:['酉'], 辛:['申'], 壬:['子'], 癸:['亥']},
  luShen: {甲:['寅'], 乙:['卯'], 丙:['巳'], 丁:['午'], 戊:['巳'], 己:['午'], 庚:['申'], 辛:['酉'], 壬:['亥'], 癸:['子']},
  jinYu: {甲:['辰'], 乙:['巳'], 丙:['未'], 丁:['申'], 戊:['未'], 己:['申'], 庚:['戌'], 辛:['亥'], 壬:['丑'], 癸:['寅']}
};

const GROUP_TABLE = {
  申:['子','辰'], 子:['申','辰'], 辰:['申','子'],
  寅:['午','戌'], 午:['寅','戌'], 戌:['寅','午'],
  巳:['酉','丑'], 酉:['巳','丑'], 丑:['巳','酉'],
  亥:['卯','未'], 卯:['亥','未'], 未:['亥','卯']
};

const SHEN_SHA_BY_GROUP = {
  yiMa: {申:'寅', 子:'寅', 辰:'寅', 寅:'申', 午:'申', 戌:'申', 巳:'亥', 酉:'亥', 丑:'亥', 亥:'巳', 卯:'巳', 未:'巳'},
  taoHua: {申:'酉', 子:'酉', 辰:'酉', 寅:'卯', 午:'卯', 戌:'卯', 巳:'午', 酉:'午', 丑:'午', 亥:'子', 卯:'子', 未:'子'},
  huaGai: {申:'辰', 子:'辰', 辰:'辰', 寅:'戌', 午:'戌', 戌:'戌', 巳:'丑', 酉:'丑', 丑:'丑', 亥:'未', 卯:'未', 未:'未'},
  jiangXing: {申:'子', 子:'子', 辰:'子', 寅:'午', 午:'午', 戌:'午', 巳:'酉', 酉:'酉', 丑:'酉', 亥:'卯', 卯:'卯', 未:'卯'},
  jieSha: {申:'巳', 子:'巳', 辰:'巳', 寅:'亥', 午:'亥', 戌:'亥', 巳:'寅', 酉:'寅', 丑:'寅', 亥:'申', 卯:'申', 未:'申'},
  zaiSha: {申:'午', 子:'午', 辰:'午', 寅:'子', 午:'子', 戌:'子', 巳:'卯', 酉:'卯', 丑:'卯', 亥:'酉', 卯:'酉', 未:'酉'}
};

function pad2(n) { return String(n).padStart(2, '0'); }
function parseDate(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || ''));
  if (!m) throw new Error('请选择有效的公历日期');
  return { year:Number(m[1]), month:Number(m[2]), day:Number(m[3]) };
}
function parseTime(str) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(str || ''));
  if (!m) throw new Error('请选择有效的时间');
  const hour = Number(m[1]), minute = Number(m[2]);
  if (hour > 23 || minute > 59) throw new Error('请选择有效的时间');
  return { hour, minute };
}
function solarParts(solar) {
  return {
    year:solar.getYear(), month:solar.getMonth(), day:solar.getDay(),
    hour:solar.getHour(), minute:solar.getMinute(), second:solar.getSecond()
  };
}
function fmtSolar(parts) {
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)} ${pad2(parts.hour)}:${pad2(parts.minute)}`;
}
function addMinutes(parts, minutes) {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute + minutes, 0));
  return {
    year:d.getUTCFullYear(), month:d.getUTCMonth() + 1, day:d.getUTCDate(),
    hour:d.getUTCHours(), minute:d.getUTCMinutes(), second:0
  };
}
function dayOfYear(parts) {
  const start = Date.UTC(parts.year, 0, 0);
  const current = Date.UTC(parts.year, parts.month - 1, parts.day);
  return Math.floor((current - start) / 86400000);
}
function equationOfTime(parts) {
  const gamma = 2 * Math.PI / 365 * (dayOfYear(parts) - 1 + (parts.hour - 12) / 24);
  return 229.18 * (
    0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma)
  );
}
function isYangGan(gan) { return GAN.indexOf(gan) % 2 === 0; }
function elementGenerates(a, b) {
  return (a === '木' && b === '火') || (a === '火' && b === '土') || (a === '土' && b === '金') ||
    (a === '金' && b === '水') || (a === '水' && b === '木');
}
function elementControls(a, b) {
  return (a === '木' && b === '土') || (a === '土' && b === '水') || (a === '水' && b === '火') ||
    (a === '火' && b === '金') || (a === '金' && b === '木');
}
function tenGod(dayGan, targetGan) {
  if (!dayGan || !targetGan) return '';
  if (dayGan === targetGan) return '比肩';
  const de = GAN_ELEMENT[dayGan], te = GAN_ELEMENT[targetGan];
  const samePolarity = isYangGan(dayGan) === isYangGan(targetGan);
  if (de === te) return samePolarity ? '比肩' : '劫财';
  if (elementGenerates(te, de)) return samePolarity ? '偏印' : '正印';
  if (elementGenerates(de, te)) return samePolarity ? '食神' : '伤官';
  if (elementControls(de, te)) return samePolarity ? '偏财' : '正财';
  if (elementControls(te, de)) return samePolarity ? '七杀' : '正官';
  return '';
}
function changSheng(gan, zhi) {
  const start = ZHI.indexOf(CHANG_SHENG_START[gan]);
  const target = ZHI.indexOf(zhi);
  const offset = isYangGan(gan) ? (target - start + 12) % 12 : (start - target + 12) % 12;
  return CHANG_SHENG[offset];
}
function xunKong(ganZhi) {
  const idx = JIAZI.indexOf(ganZhi);
  if (idx < 0) return '';
  const startZhi = idx % 12;
  return ZHI[(startZhi + 10) % 12] + ZHI[(startZhi + 11) % 12];
}
function validGanZhi(gz) {
  return JIAZI.includes(gz);
}
function hideGanFor(zhi, dayGan) {
  return (HIDDEN_GAN[zhi] || []).map(gan => ({ gan, shiShen:tenGod(dayGan, gan), element:GAN_ELEMENT[gan] }));
}
function getGroupBranch(yearZhi, dayZhi) {
  return { yearZhi, dayZhi };
}
function uniquePush(list, value) {
  if (value && list.indexOf(value) < 0) list.push(value);
}
function shenShaForPillar(details, key, dayGan, yearZhi) {
  const zhi = details[key].zhi;
  const dayZhi = details.day.zhi;
  const result = [];
  const addByTable = (name, table, key) => {
    if ((table[key] || []).includes(zhi)) uniquePush(result, name);
  };
  addByTable('天乙贵人', SHEN_SHA_TABLES.tianYi, dayGan);
  addByTable('太极贵人', SHEN_SHA_TABLES.taiJi, dayGan);
  addByTable('文昌', SHEN_SHA_TABLES.wenChang, dayGan);
  addByTable('羊刃', SHEN_SHA_TABLES.yangRen, dayGan);
  addByTable('禄神', SHEN_SHA_TABLES.luShen, dayGan);
  addByTable('金舆', SHEN_SHA_TABLES.jinYu, dayGan);
  for (const key of ['yiMa','taoHua','huaGai','jiangXing','jieSha','zaiSha']) {
    if (SHEN_SHA_BY_GROUP[key][yearZhi] === zhi) uniquePush(result, {yiMa:'驿马', taoHua:'桃花', huaGai:'华盖', jiangXing:'将星', jieSha:'劫煞', zaiSha:'灾煞'}[key]);
  }
  const yearGroup = GROUP_TABLE[yearZhi] || [];
  const guChen = {亥:'寅', 子:'寅', 丑:'寅', 寅:'巳', 卯:'巳', 辰:'巳', 巳:'申', 午:'申', 未:'申', 申:'亥', 酉:'亥', 戌:'亥'}[yearZhi];
  const guaSu = {亥:'戌', 子:'戌', 丑:'戌', 寅:'丑', 卯:'丑', 辰:'丑', 巳:'辰', 午:'辰', 未:'辰', 申:'未', 酉:'未', 戌:'未'}[yearZhi];
  if (zhi === guChen) uniquePush(result, '孤辰');
  if (zhi === guaSu) uniquePush(result, '寡宿');
  if (['戌','亥'].includes(yearZhi) && ['戌','亥'].includes(zhi)) uniquePush(result, '天罗');
  if (['辰','巳'].includes(yearZhi) && ['辰','巳'].includes(zhi)) uniquePush(result, '地网');

  const yinCha = ['丙子','丙午','丁丑','丁未','戊寅','戊申','辛卯','辛酉','壬辰','壬戌','癸巳','癸亥'];
  if (key === 'day' && yinCha.includes(details[key].ganZhi)) uniquePush(result, '阴差阳错');
  const shiLing = ['甲辰','乙亥','丙辰','丁酉','戊午','己卯','庚戌','辛亥','壬寅','癸未'];
  if (key === 'day' && shiLing.includes(details[key].ganZhi)) uniquePush(result, '十灵日');
  if (key === 'day' && ['庚辰','庚戌','壬辰','戊戌'].includes(details[key].ganZhi)) uniquePush(result, '魁罡');
  const hongLuan = ZHI[(ZHI.indexOf('卯') - ZHI.indexOf(yearZhi) + 12) % 12];
  const tianXi = ZHI[(ZHI.indexOf(hongLuan) + 6) % 12];
  if (zhi === hongLuan) uniquePush(result, '红鸾');
  if (zhi === tianXi) uniquePush(result, '天喜');
  if (key === 'day' && dayZhi === zhi && result.length === 0) {
    // 保持空列表，避免为了展示而虚构神煞。
  }
  return result;
}
function buildPillars(pillars, dayGan, dayGender, yearZhi) {
  const order = ['year','month','day','hour'];
  const labels = ['年柱','月柱','日柱','时柱'];
  const details = {};
  order.forEach((key, idx) => {
    const ganZhi = pillars[key];
    const gan = ganZhi[0], zhi = ganZhi[1];
    details[key] = {
      key, label:labels[idx], gan, zhi, ganZhi,
      ganElement:GAN_ELEMENT[gan], zhiElement:ZHI_ELEMENT[zhi],
      shiShen:key === 'day' ? (dayGender === 'male' ? '元男' : '元女') : tenGod(dayGan, gan),
      hidden:hideGanFor(zhi, dayGan),
      starLuck:changSheng(dayGan, zhi),
      selfSeat:changSheng(gan, zhi),
      naYin:lunarPkg.LunarUtil.NAYIN[ganZhi] || '',
      xunKong:xunKong(ganZhi),
      shenSha:[]
    };
  });
  order.forEach((key, idx) => {
    details[key].shenSha = shenShaForPillar(details, key, dayGan, yearZhi);
  });
  return details;
}
function buildExtras(pillars, details, sourceEightChar) {
  const counts = {金:0, 木:0, 水:0, 火:0, 土:0};
  ['year','month','day','hour'].forEach(key => {
    counts[details[key].ganElement]++;
    counts[details[key].zhiElement]++;
  });
  const monthGanIndex = GAN.indexOf(pillars.month[0]);
  const monthZhiIndex = ZHI.indexOf(pillars.month[1]);
  let taiYuan = GAN[(monthGanIndex + 1) % 10] + ZHI[(monthZhiIndex + 3) % 12];
  let mingGong = '';
  let shenGong = '';
  if (sourceEightChar) {
    try { taiYuan = sourceEightChar.getTaiYuan() || taiYuan; } catch (e) {}
    try { mingGong = sourceEightChar.getMingGong() || ''; } catch (e) {}
    try { shenGong = sourceEightChar.getShenGong() || ''; } catch (e) {}
  }
  const dayGan = pillars.day[0];
  return {
    taiYuan,
    mingGong,
    shenGong,
    wuXing:counts,
    dayMaster:{gan:dayGan, element:GAN_ELEMENT[dayGan], yinYang:isYangGan(dayGan) ? '阳' : '阴'}
  };
}
function pillarListFromDetails(details) {
  return ['year','month','day','hour'].map(key => details[key]);
}
function buildYun(solar, pillars, input, birthYear) {
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  eightChar.setSect(2);
  const genderValue = input.gender === 'male' ? 1 : 0;
  const yun = eightChar.getYun(genderValue, 1);
  let startYear = yun.getStartYear();
  const startMonth = yun.getStartMonth();
  const startDay = yun.getStartDay();
  const startHour = yun.getStartHour();
  if (startYear === 0 && startMonth === 0 && startDay === 0 && startHour === 0) startYear = 1;
  const startAge = birthYear + startYear + 1;
  const startSolar = yun.getStartSolar().toYmdHms();
  const daYun = yun.getDaYun(11).slice(1, 11).map(item => {
    const gz = item.getGanZhi();
    const gan = gz[0], zhi = gz[1];
    return {
      ganZhi:gz,
      gan, zhi,
      shiShen:tenGod(pillars.day[0], gan),
      naYin:lunarPkg.LunarUtil.NAYIN[gz] || '',
      starLuck:changSheng(pillars.day[0], zhi),
      startAge:item.getStartAge(),
      endAge:item.getEndAge(),
      startYear:item.getStartYear(),
      endYear:item.getEndYear(),
      liuNian:item.getLiuNian(10).map(nian => {
        const ngz = nian.getGanZhi();
        return {
          ganZhi:ngz,
          gan:ngz[0], zhi:ngz[1],
          shiShen:tenGod(pillars.day[0], ngz[0]),
          age:nian.getAge(),
          year:nian.getYear(),
          liuYue:nian.getLiuYue().map(yue => {
            const ygz = yue.getGanZhi();
            return {
              name:yue.getMonthInChinese(),
              ganZhi:ygz,
              shiShen:tenGod(pillars.day[0], ygz[0])
            };
          })
        };
      })
    };
  });
  return {
    forward:yun.isForward(),
    directionLabel:yun.isForward() ? '顺排' : '逆排',
    start:{ years:startYear, months:startMonth, days:startDay, hours:startHour, age:startAge, solar:startSolar,
      text:`${startYear}年${startMonth}月${startDay}天${startHour ? startHour + '时' : ''}` },
    daYun
  };
}
function resolveSolar(input) {
  const calendarType = input.calendarType || 'solar';
  const time = parseTime(input.time || '12:00');
  let solar;
  if (calendarType === 'lunar') {
    const year = Number(input.lunarYear);
    const month = Number(input.lunarMonth);
    const day = Number(input.lunarDay);
    if (!year || !month || !day) throw new Error('请选择完整的农历出生日期');
    try {
      solar = Lunar.fromYmdHms(year, month, day, time.hour, time.minute, 0).getSolar();
    } catch (err) {
      throw new Error('农历日期无效：' + err.message);
    }
  } else {
    const date = parseDate(input.solarDate);
    solar = Solar.fromYmdHms(date.year, date.month, date.day, time.hour, time.minute, 0);
  }
  return solar;
}
function calculate(input) {
  input = input || {};
  const chartType = input.calendarType || 'solar';
  const solar = resolveSolar(input);
  const original = solarParts(solar);
  const longitude = Number(input.longitude);
  let correctionMinutes = 0;
  let chartSolar = solar;
  if (input.useTrueSolarTime && isFinite(longitude)) {
    const correction = (longitude - 120) * 4 + equationOfTime(original);
    correctionMinutes = Math.round(correction);
    const adjusted = addMinutes(original, correctionMinutes);
    chartSolar = Solar.fromYmdHms(adjusted.year, adjusted.month, adjusted.day, adjusted.hour, adjusted.minute, 0);
  }

  const chartParts = solarParts(chartSolar);
  const lunar = chartSolar.getLunar();
  const eightChar = lunar.getEightChar();
  eightChar.setSect(2);
  let rawPillars = {
    year:eightChar.getYear(), month:eightChar.getMonth(),
    day:eightChar.getDay(), hour:eightChar.getTime()
  };
  if (chartParts.hour === 23) {
    const next = addMinutes(chartParts, 60 - chartParts.minute);
    const nextSolar = Solar.fromYmdHms(next.year, next.month, next.day, 0, 0, 0);
    const nextEightChar = nextSolar.getLunar().getEightChar();
    nextEightChar.setSect(2);
    rawPillars.day = nextEightChar.getDay();
    rawPillars.hour = eightChar.getTime();
  }
  if (chartType === 'ganzhi') {
    const direct = input.fourPillars || {};
    ['year','month','day','hour'].forEach(key => {
      if (!validGanZhi(direct[key])) throw new Error('四柱格式不正确：' + (direct[key] || '空'));
    });
    rawPillars = { year:direct.year, month:direct.month, day:direct.day, hour:direct.hour };
  }

  const dayGan = rawPillars.day[0];
  const dayGender = input.gender === 'female' ? 'female' : 'male';
  const details = buildPillars(rawPillars, dayGan, dayGender, rawPillars.year[1]);
  let sourceEightChar = eightChar;
  if (chartType === 'ganzhi') {
    try {
      const matches = Solar.fromBaZi(rawPillars.year, rawPillars.month, rawPillars.day, rawPillars.hour, 2, original.year);
      if (matches && matches.length) sourceEightChar = matches[0].getLunar().getEightChar();
    } catch (e) {}
  }
  const extras = buildExtras(rawPillars, details, sourceEightChar);
  const birthLunar = solar.getLunar();
  const yun = buildYun(chartSolar, rawPillars, input, original.year);

  return {
    input:Object.assign({}, input, { gender:dayGender }),
    calendarType:chartType,
    solarDatetime:fmtSolar(original),
    chartSolarDatetime:fmtSolar(chartParts),
    trueSolarDatetime:correctionMinutes ? fmtSolar(chartParts) : '',
    correctionMinutes,
    lunarText:birthLunar.toString(),
    chartLunarText:lunar.toString(),
    zodiac:birthLunar.getYearShengXiao(),
    constellation:solar.getXingZuo(),
    pillars:rawPillars,
    pillarDetails:details,
    columns:pillarListFromDetails(details),
    extras,
    yun,
    currentYear:new Date().getFullYear(),
    virtualAge:new Date().getFullYear() - original.year + 1
  };
}
function getLunarMonths(year) {
  const lunarYear = LunarYear.fromYear(Number(year));
  return lunarYear.getMonthsInYear().map(m => {
    const value = m.getMonth();
    return {
      value,
      label:(value < 0 ? '闰' : '') + ['','正','二','三','四','五','六','七','八','九','十','冬','腊'][Math.abs(value)] + '月',
      days:m.getDayCount()
    };
  });
}
function getLunarDays(year, month) {
  const lunarYear = LunarYear.fromYear(Number(year));
  const info = lunarYear.getMonth(Number(month));
  if (!info) throw new Error('该年份不存在所选农历月份');
  return info.getDayCount();
}

export { calculate, getLunarMonths, getLunarDays, CITIES, JIAZI, GAN, ZHI, tenGod, changSheng };
