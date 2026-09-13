import lunarPkg from 'lunar-javascript';
import {
  analyzePillars, collectNatalShenSha, packPillar, selectRenyuanSiling, shenShaNames, GENDER
} from 'bazi-lite';

const { Solar, Lunar, LunarYear } = lunarPkg;

const GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const ZHI = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const ZODIAC = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
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
  fuXing: {甲:['寅','子'], 乙:['丑','卯'], 丙:['寅','子'], 丁:['亥'], 戊:['申'], 己:['未'], 庚:['午'], 辛:['巳'], 壬:['辰'], 癸:['丑','卯']},
  guoYin: {甲:['戌'], 乙:['亥'], 丙:['丑'], 丁:['寅'], 戊:['丑'], 己:['寅'], 庚:['辰'], 辛:['巳'], 壬:['未'], 癸:['申']},
  yangRen: {甲:['卯'], 乙:['寅'], 丙:['午'], 丁:['巳'], 戊:['午'], 己:['巳'], 庚:['酉'], 辛:['申'], 壬:['子'], 癸:['亥']},
  luShen: {甲:['寅'], 乙:['卯'], 丙:['巳'], 丁:['午'], 戊:['巳'], 己:['午'], 庚:['申'], 辛:['酉'], 壬:['亥'], 癸:['子']},
  jinYu: {甲:['辰'], 乙:['巳'], 丙:['未'], 丁:['申'], 戊:['未'], 己:['申'], 庚:['戌'], 辛:['亥'], 壬:['丑'], 癸:['寅']},
  hongYan: {甲:['午'], 乙:['午'], 丙:['寅'], 丁:['未'], 戊:['辰'], 己:['辰'], 庚:['戌'], 辛:['酉'], 壬:['子'], 癸:['申']},
  liuXia: {甲:['酉'], 乙:['戌'], 丙:['未'], 丁:['申'], 戊:['巳'], 己:['午'], 庚:['辰'], 辛:['卯'], 壬:['亥'], 癸:['寅']}
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
  zaiSha: {申:'午', 子:'午', 辰:'午', 寅:'子', 午:'子', 戌:'子', 巳:'卯', 酉:'卯', 丑:'卯', 亥:'酉', 卯:'酉', 未:'酉'},
  wangShen: {申:'亥', 子:'亥', 辰:'亥', 寅:'巳', 午:'巳', 戌:'巳', 巳:'申', 酉:'申', 丑:'申', 亥:'寅', 卯:'寅', 未:'寅'}
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
function chinaDstCorrectionMinutes(parts) {
  const ranges = {
    1986:['1986-05-04T02:00','1986-09-14T02:00'],
    1987:['1987-04-12T02:00','1987-09-13T02:00'],
    1988:['1988-04-10T02:00','1988-09-11T02:00'],
    1989:['1989-04-16T02:00','1989-09-17T02:00'],
    1990:['1990-04-15T02:00','1990-09-16T02:00'],
    1991:['1991-04-14T02:00','1991-09-15T02:00']
  }[parts.year];
  if (!ranges) return 0;
  const current = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const start = Date.parse(ranges[0] + '+08:00');
  const end = Date.parse(ranges[1] + '+08:00');
  return current >= start && current < end ? -60 : 0;
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
  const pillar = details[key];
  const zhi = pillar.zhi;
  const gan = pillar.gan;
  const dayZhi = details.day.zhi;
  const yearGan = details.year.gan;
  const monthZhi = details.month.zhi;
  const result = [];
  const addByTable = (name, table, bases) => {
    if (bases.some(base => (table[base] || []).includes(zhi))) uniquePush(result, name);
  };
  const ganBases = [dayGan, yearGan];
  addByTable('天乙贵人', SHEN_SHA_TABLES.tianYi, ganBases);
  addByTable('太极贵人', SHEN_SHA_TABLES.taiJi, ganBases);
  addByTable('文昌', SHEN_SHA_TABLES.wenChang, ganBases);
  addByTable('福星贵人', SHEN_SHA_TABLES.fuXing, ganBases);
  addByTable('国印贵人', SHEN_SHA_TABLES.guoYin, ganBases);
  addByTable('羊刃', SHEN_SHA_TABLES.yangRen, [dayGan]);
  addByTable('禄神', SHEN_SHA_TABLES.luShen, [dayGan]);
  addByTable('金舆', SHEN_SHA_TABLES.jinYu, [dayGan]);
  addByTable('红艳煞', SHEN_SHA_TABLES.hongYan, [dayGan]);
  addByTable('流霞', SHEN_SHA_TABLES.liuXia, [dayGan]);

  const branchBases = [yearZhi, dayZhi];
  const branchNames = {yiMa:'驿马', taoHua:'桃花', huaGai:'华盖', jiangXing:'将星', jieSha:'劫煞', zaiSha:'灾煞', wangShen:'亡神'};
  Object.keys(branchNames).forEach(groupKey => {
    if (branchBases.some(base => SHEN_SHA_BY_GROUP[groupKey][base] === zhi)) uniquePush(result, branchNames[groupKey]);
  });

  if (zhi === CHANG_SHENG_START[dayGan]) uniquePush(result, '学堂');
  addByTable('词馆', SHEN_SHA_TABLES.luShen, [dayGan]);

  const tianYi = {寅:'丑', 卯:'寅', 辰:'卯', 巳:'辰', 午:'巳', 未:'午', 申:'未', 酉:'申', 戌:'酉', 亥:'戌', 子:'亥', 丑:'子'};
  if (zhi === tianYi[monthZhi]) uniquePush(result, '天医');

  const tianDe = {寅:'丁', 卯:'申', 辰:'壬', 巳:'辛', 午:'亥', 未:'甲', 申:'癸', 酉:'寅', 戌:'丙', 亥:'乙', 子:'巳', 丑:'庚'};
  const yueDe = {寅:'丙', 午:'丙', 戌:'丙', 申:'壬', 子:'壬', 辰:'壬', 亥:'甲', 卯:'甲', 未:'甲', 巳:'庚', 酉:'庚', 丑:'庚'};
  const tianDeValue = tianDe[monthZhi];
  if (tianDeValue === gan || tianDeValue === zhi) uniquePush(result, '天德贵人');
  if (GAN.includes(tianDeValue)) {
    const heGan = GAN[(GAN.indexOf(tianDeValue) + 5) % 10];
    if (heGan === gan) uniquePush(result, '天德合');
  }
  if (yueDe[monthZhi] === gan) uniquePush(result, '月德贵人');
  if (GAN.includes(yueDe[monthZhi])) {
    const heGan = GAN[(GAN.indexOf(yueDe[monthZhi]) + 5) % 10];
    if (heGan === gan) uniquePush(result, '月德合');
  }

  const guChen = {亥:'寅', 子:'寅', 丑:'寅', 寅:'巳', 卯:'巳', 辰:'巳', 巳:'申', 午:'申', 未:'申', 申:'亥', 酉:'亥', 戌:'亥'}[yearZhi];
  const guaSu = {亥:'戌', 子:'戌', 丑:'戌', 寅:'丑', 卯:'丑', 辰:'丑', 巳:'辰', 午:'辰', 未:'辰', 申:'未', 酉:'未', 戌:'未'}[yearZhi];
  if (zhi === guChen) uniquePush(result, '孤辰');
  if (zhi === guaSu) uniquePush(result, '寡宿');
  if ((yearZhi === '戌' && zhi === '亥') || (yearZhi === '亥' && zhi === '戌')) uniquePush(result, '天罗');
  if ((yearZhi === '辰' && zhi === '巳') || (yearZhi === '巳' && zhi === '辰')) uniquePush(result, '地网');

  const yinCha = ['丙子','丙午','丁丑','丁未','戊寅','戊申','辛卯','辛酉','壬辰','壬戌','癸巳','癸亥'];
  if (key === 'day' && yinCha.includes(pillar.ganZhi)) uniquePush(result, '阴差阳错');
  const shiLing = ['甲辰','乙亥','丙辰','丁酉','戊午','己卯','庚戌','辛亥','壬寅','癸未'];
  if (key === 'day' && shiLing.includes(pillar.ganZhi)) uniquePush(result, '十灵日');
  if (key === 'day' && ['庚辰','庚戌','壬辰','戊戌'].includes(pillar.ganZhi)) uniquePush(result, '魁罡');

  const season = ['寅','卯','辰'].includes(monthZhi) ? '春' : ['巳','午','未'].includes(monthZhi) ? '夏' :
    ['申','酉','戌'].includes(monthZhi) ? '秋' : '冬';
  const tianShe = {春:'戊寅', 夏:'甲午', 秋:'戊申', 冬:'甲子'};
  if (key === 'day' && pillar.ganZhi === tianShe[season]) uniquePush(result, '天赦日');

  const hongLuanBases = [yearZhi];
  hongLuanBases.forEach(base => {
    const hongLuan = ZHI[(ZHI.indexOf('卯') - ZHI.indexOf(base) + 12) % 12];
    const tianXi = ZHI[(ZHI.indexOf(hongLuan) + 6) % 12];
    if (zhi === hongLuan) uniquePush(result, '红鸾');
    if (zhi === tianXi) uniquePush(result, '天喜');
  });
  if (key === 'day' && dayZhi === zhi && result.length === 0) {
    // 无神煞时保留空列表，页面统一显示“无”。
  }
  return result;
}
const BAZI_LITE_SHEN_SHA_ALIAS = {
  '咸池（桃花）':'桃花',
  '文昌贵人':'文昌',
  '日干学堂':'学堂',
  '日干词馆':'词馆',
  '天厨贵人（本旬）':'天厨贵人'
};
function buildShenShaFromLibrary(pillars, gender) {
  const packed = {
    year:packPillar(GAN.indexOf(pillars.year[0]), ZHI.indexOf(pillars.year[1])),
    month:packPillar(GAN.indexOf(pillars.month[0]), ZHI.indexOf(pillars.month[1])),
    day:packPillar(GAN.indexOf(pillars.day[0]), ZHI.indexOf(pillars.day[1])),
    hour:packPillar(GAN.indexOf(pillars.hour[0]), ZHI.indexOf(pillars.hour[1]))
  };
  const analysis = analyzePillars(packed);
  const natal = collectNatalShenSha(analysis, {
    gender:gender === 'male' ? GENDER.MALE : GENDER.FEMALE
  });
  return ['year','month','day','hour'].reduce((result, key) => {
    result[key] = Array.from(new Set(shenShaNames(natal[key])
      .map(name => BAZI_LITE_SHEN_SHA_ALIAS[name] || name)
      .filter(name => name !== '空亡')));
    return result;
  }, {});
}
function buildPillars(pillars, dayGan, dayGender, yearZhi) {
  const order = ['year','month','day','hour'];
  const labels = ['年柱','月柱','日柱','时柱'];
  const details = {};
  let libraryShenSha = null;
  try {
    libraryShenSha = buildShenShaFromLibrary(pillars, dayGender);
  } catch (e) {
    libraryShenSha = null;
  }
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
    details[key].shenSha = libraryShenSha
      ? libraryShenSha[key]
      : shenShaForPillar(details, key, dayGan, yearZhi);
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
function getRenYuanSiLing(solar, monthZhi) {
  const previousJie = solar.getLunar().getPrevJie().getSolar();
  const daysAfterJie = Math.max(0, solar.subtractMinute(previousJie) / 1440);
  const segment = selectRenyuanSiling(ZHI.indexOf(monthZhi), daysAfterJie);
  return { gan:GAN[segment.stem], daysAfterJie };
}
function pillarListFromDetails(details) {
  return ['year','month','day','hour'].map(key => details[key]);
}
function positiveMod(value, base) {
  return ((value % base) + base) % base;
}
function addCalendarComponents(solar, years, months, remainingDays) {
  const parts = solarParts(solar);
  const monthIndex = parts.month - 1 + months;
  const targetYear = parts.year + years + Math.floor(monthIndex / 12);
  const targetMonth = positiveMod(monthIndex, 12) + 1;
  const base = Date.UTC(targetYear, targetMonth - 1, parts.day, parts.hour, parts.minute, parts.second);
  const result = new Date(base + remainingDays * 86400000);
  return Solar.fromYmdHms(
    result.getUTCFullYear(), result.getUTCMonth() + 1, result.getUTCDate(),
    result.getUTCHours(), result.getUTCMinutes(), result.getUTCSeconds()
  );
}
function calculateTraditionalStart(solar, yun) {
  const lunar = solar.getLunar();
  const previousJie = lunar.getPrevJie();
  const nextJie = lunar.getNextJie();
  const intervalMinutes = yun.isForward()
    ? nextJie.getSolar().subtractMinute(solar)
    : solar.subtractMinute(previousJie.getSolar());
  const scaledDays = Math.max(0, intervalMinutes) / 12;
  const years = Math.floor(scaledDays / 360);
  const afterYears = scaledDays - years * 360;
  const months = Math.floor(afterYears / 30);
  const remainingDays = afterYears - months * 30;
  const wholeDays = Math.floor(remainingDays);
  const remainingMinutes = Math.round((remainingDays - wholeDays) * 1440);
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes - hours * 60;
  const startSolar = addCalendarComponents(solar, years, months, remainingDays);
  const startLunar = startSolar.getLunar();
  const actualPreviousJie = startLunar.getPrevJie();
  return {
    years, months, days:wholeDays, hours, minutes,
    solar:startSolar,
    jieQiName:actualPreviousJie.getName(),
    jieQiDateTime:actualPreviousJie.getSolar().toYmdHms(),
    daysAfterJie:Math.max(0, startSolar.subtract(actualPreviousJie.getSolar()))
  };
}
function buildYun(solar, pillars, input, birthYear) {
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();
  eightChar.setSect(2);
  const genderValue = input.gender === 'male' ? 1 : 0;
  const yun = eightChar.getYun(genderValue, 1);
  const traditionalStart = calculateTraditionalStart(solar, yun);
  const sourceDaYun = yun.getDaYun(11);
  const startAge = sourceDaYun[1] ? sourceDaYun[1].getStartAge() : traditionalStart.years + 1;
  const daYun = sourceDaYun.slice(1, 11).map(item => {
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
        const termNames = ['立春','惊蛰','清明','立夏','芒种','小暑','立秋','白露','寒露','立冬','大雪','小寒'];
        const termYear = nian.getYear();
        const termTable = Solar.fromYmd(termYear, 6, 1).getLunar().getJieQiTable();
        const nextTermTable = Solar.fromYmd(termYear + 1, 1, 15).getLunar().getJieQiTable();
        return {
          ganZhi:ngz,
          gan:ngz[0], zhi:ngz[1],
          shiShen:tenGod(pillars.day[0], ngz[0]),
          age:nian.getAge(),
          year:nian.getYear(),
          liuYue:nian.getLiuYue().map((yue, index) => {
            const ygz = yue.getGanZhi();
            const termName = termNames[index] || '';
            const termSolar = index === 11 ? nextTermTable[termName] : termTable[termName];
            return {
              name:yue.getMonthInChinese(),
              ganZhi:ygz,
              shiShen:tenGod(pillars.day[0], ygz[0]),
              jieQiName:termName,
              jieQiDate:termSolar ? termSolar.toYmd() : '',
              jieQiDateTime:termSolar ? termSolar.toYmdHms() : ''
            };
          })
        };
      })
    };
  });
  return {
    forward:yun.isForward(),
    directionLabel:yun.isForward() ? '顺排' : '逆排',
    start:{
      years:traditionalStart.years,
      months:traditionalStart.months,
      days:traditionalStart.days,
      hours:traditionalStart.hours,
      minutes:traditionalStart.minutes,
      age:startAge,
      solar:traditionalStart.solar.toYmdHms(),
      jieQiName:traditionalStart.jieQiName,
      jieQiDateTime:traditionalStart.jieQiDateTime,
      daysAfterJie:traditionalStart.daysAfterJie,
      text:`${traditionalStart.years}年${traditionalStart.months}月${traditionalStart.days}天${traditionalStart.hours ? traditionalStart.hours + '时' : ''}`
    },
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
function solarSerial(solar) {
  return Date.UTC(solar.getYear(), solar.getMonth() - 1, solar.getDay(), solar.getHour(), solar.getMinute(), solar.getSecond());
}
function rawPillarsFromSolar(solar) {
  const parts = solarParts(solar);
  const eightChar = solar.getLunar().getEightChar();
  eightChar.setSect(2);
  const pillars = {
    year:eightChar.getYear(), month:eightChar.getMonth(),
    day:eightChar.getDay(), hour:eightChar.getTime()
  };
  if (parts.hour === 23) {
    const next = addMinutes(parts, 60 - parts.minute);
    const nextSolar = Solar.fromYmdHms(next.year, next.month, next.day, 0, 0, 0);
    const nextEightChar = nextSolar.getLunar().getEightChar();
    nextEightChar.setSect(2);
    pillars.day = nextEightChar.getDay();
    const currentDayGan = eightChar.getDayGan();
    pillars.hour = GAN[((GAN.indexOf(currentDayGan) % 5) * 2) % 10] + ZHI[0];
  }
  return pillars;
}
function samePillars(a, b) {
  return a.year === b.year && a.month === b.month && a.day === b.day && a.hour === b.hour;
}
const DIRECT_MONTH_ZHI_ORDER = ['寅','卯','辰','巳','午','未','申','酉','戌','亥','子','丑'];
const DIRECT_MONTH_JIE = {
  寅:['立春','惊蛰'], 卯:['惊蛰','清明'], 辰:['清明','立夏'], 巳:['立夏','芒种'],
  午:['芒种','小暑'], 未:['小暑','立秋'], 申:['立秋','白露'], 酉:['白露','寒露'],
  戌:['寒露','立冬'], 亥:['立冬','大雪'], 子:['大雪','小寒'], 丑:['小寒','立春']
};
const DIRECT_SEARCH_START = Date.UTC(1900, 0, 1, 0, 0, 0);
const DIRECT_SEARCH_END = Date.UTC(2100, 11, 31, 23, 59, 59);
const DIRECT_JIE_MARGIN_MS = 30 * 60 * 1000;

function directExpectedMonthGan(yearGan, monthZhi) {
  const firstMonthGanIndex = ((GAN.indexOf(yearGan) % 5) * 2 + 2) % 10;
  const monthIndex = DIRECT_MONTH_ZHI_ORDER.indexOf(monthZhi);
  return GAN[(firstMonthGanIndex + monthIndex) % 10];
}
function directExpectedHourGan(dayGan, hourZhi) {
  const firstHourGanIndex = (GAN.indexOf(dayGan) % 5) * 2;
  return GAN[(firstHourGanIndex + ZHI.indexOf(hourZhi)) % 10];
}
function validateDirectPillars(pillars) {
  ['year','month','day','hour'].forEach(key => {
    if (!validGanZhi(pillars[key])) throw new Error('四柱格式不正确：' + (pillars[key] || '空'));
  });
  if (pillars.month[0] !== directExpectedMonthGan(pillars.year[0], pillars.month[1])) {
    throw new Error('年柱与月柱不符合五虎遁规则，请检查');
  }
  const expectedHourGan = directExpectedHourGan(pillars.day[0], pillars.hour[1]);
  let lateZiHourGan = '';
  if (pillars.hour[1] === '子') {
    const dayIndex = JIAZI.indexOf(pillars.day);
    if (dayIndex >= 0) {
      const previousDayGan = JIAZI[(dayIndex + 59) % 60][0];
      lateZiHourGan = directExpectedHourGan(previousDayGan, '子');
    }
  }
  if (pillars.hour[0] !== expectedHourGan && pillars.hour[0] !== lateZiHourGan) {
    throw new Error('日柱与时柱不符合五鼠遁规则，请检查');
  }
}
const DIRECT_JIE_QI_CACHE = {};
function directTermSolar(year, name) {
  if (!DIRECT_JIE_QI_CACHE[year]) {
    DIRECT_JIE_QI_CACHE[year] = Solar.fromYmd(year, 6, 1).getLunar().getJieQiTable();
  }
  return DIRECT_JIE_QI_CACHE[year][name];
}
function directYearPillar(year) {
  return JIAZI[((year - 4) % 60 + 60) % 60];
}
function directMonthWindow(year, monthZhi) {
  const [startName, endName] = DIRECT_MONTH_JIE[monthZhi];
  if (monthZhi === '子') return [directTermSolar(year, startName), directTermSolar(year + 1, endName)];
  if (monthZhi === '丑') return [directTermSolar(year + 1, startName), directTermSolar(year + 1, endName)];
  return [directTermSolar(year, startName), directTermSolar(year, endName)];
}
function directDateSerial(year, month, day, hour, minute) {
  return Date.UTC(year, month - 1, day, hour || 0, minute || 0, 0);
}
function directHourWindows(year, month, day, hourZhi) {
  if (hourZhi === '子') {
    return [
      [directDateSerial(year, month, day, 0, 0), directDateSerial(year, month, day, 1, 0)],
      [directDateSerial(year, month, day, 23, 0), directDateSerial(year, month, day + 1, 0, 0)]
    ];
  }
  const startHour = (ZHI.indexOf(hourZhi) * 2 + 23) % 24;
  return [[
    directDateSerial(year, month, day, startHour, 0),
    directDateSerial(year, month, day, startHour + 2, 0)
  ]];
}
function directSolarFromSerial(serial) {
  const date = new Date(serial);
  return Solar.fromYmdHms(
    date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(),
    date.getUTCHours(), date.getUTCMinutes(), 0
  );
}
function resolveDirectSolar(pillars, reference) {
  const candidates = [];
  const seen = new Set();
  for (let year = 1900; year <= 2100; year++) {
    if (directYearPillar(year) !== pillars.year) continue;
    const [windowStartSolar, windowEndSolar] = directMonthWindow(year, pillars.month[1]);
    const safeStart = Math.max(DIRECT_SEARCH_START, solarSerial(windowStartSolar) + DIRECT_JIE_MARGIN_MS);
    const safeEnd = Math.min(DIRECT_SEARCH_END, solarSerial(windowEndSolar) - DIRECT_JIE_MARGIN_MS);
    if (safeStart > safeEnd) continue;
    const firstDate = Date.UTC(windowStartSolar.getYear(), windowStartSolar.getMonth() - 1, windowStartSolar.getDay());
    const lastDate = Date.UTC(windowEndSolar.getYear(), windowEndSolar.getMonth() - 1, windowEndSolar.getDay());
    for (let dateSerial = firstDate; dateSerial <= lastDate; dateSerial += 86400000) {
      const date = new Date(dateSerial);
      const yearPart = date.getUTCFullYear();
      const monthPart = date.getUTCMonth() + 1;
      const dayPart = date.getUTCDate();
      directHourWindows(yearPart, monthPart, dayPart, pillars.hour[1]).forEach(([hourStart, hourEnd]) => {
        const candidateStart = Math.max(safeStart, hourStart);
        const candidateEnd = Math.min(safeEnd, hourEnd);
        if (candidateStart > candidateEnd) return;
        const midpoint = candidateStart + (candidateEnd - candidateStart) / 2;
        const minuteStart = Math.ceil(candidateStart / 60000) * 60000;
        const minuteEnd = Math.floor(candidateEnd / 60000) * 60000;
        if (minuteStart > minuteEnd) return;
        const candidateSerial = Math.min(Math.max(Math.round(midpoint / 60000) * 60000, minuteStart), minuteEnd);
        if (seen.has(candidateSerial)) return;
        const candidate = directSolarFromSerial(candidateSerial);
        if (!samePillars(rawPillarsFromSolar(candidate), pillars)) return;
        seen.add(candidateSerial);
        candidates.push(candidate);
      });
    }
  }
  if (!candidates.length) return null;
  const referenceSerial = reference ? solarSerial(reference) : Date.UTC(2000, 0, 1, 0, 0, 0);
  return candidates.reduce((best, item) => {
    return Math.abs(solarSerial(item) - referenceSerial) < Math.abs(solarSerial(best) - referenceSerial) ? item : best;
  }, candidates[0]);
}
function calculate(input) {
  input = input || {};
  const chartType = input.calendarType || 'solar';
  const isDirect = chartType === 'ganzhi';
  const direct = isDirect ? (input.fourPillars || {}) : null;

  let referenceSolar = null;
  let solar = null;
  let chartSolar = null;
  let dstCorrectionMinutes = 0;
  let longitudeCorrectionMinutes = 0;
  let correctionMinutes = 0;
  if (isDirect) {
    if (input.solarDate) {
      referenceSolar = resolveSolar(Object.assign({}, input, { calendarType:'solar' }));
    }
    solar = referenceSolar || Solar.fromYmdHms(2000, 1, 1, 12, 0, 0);
  } else {
    solar = resolveSolar(input);
    const original = solarParts(solar);
    dstCorrectionMinutes = input.applyChinaDst === false ? 0 : chinaDstCorrectionMinutes(original);
    const standard = addMinutes(original, dstCorrectionMinutes);
    const hasLongitude = input.longitude !== null && input.longitude !== undefined && input.longitude !== '';
    const longitude = hasLongitude ? Number(input.longitude) : NaN;
    longitudeCorrectionMinutes = input.useTrueSolarTime && isFinite(longitude)
      ? Math.round((longitude - 120) * 4)
      : 0;
    const adjusted = addMinutes(standard, longitudeCorrectionMinutes);
    chartSolar = Solar.fromYmdHms(adjusted.year, adjusted.month, adjusted.day, adjusted.hour, adjusted.minute, 0);
    correctionMinutes = dstCorrectionMinutes + longitudeCorrectionMinutes;
  }

  let rawPillars = isDirect
    ? { year:direct.year, month:direct.month, day:direct.day, hour:direct.hour }
    : rawPillarsFromSolar(chartSolar);
  let resolvedSolar = chartSolar;
  let directTimeResolved = true;
  const directSolar = isDirect ? resolveDirectSolar(rawPillars, referenceSolar) : null;
  const hasBirthTime = !isDirect || !!directSolar;
  if (isDirect) {
    resolvedSolar = directSolar;
    directTimeResolved = !!resolvedSolar;
  }
  const resolvedParts = resolvedSolar ? solarParts(resolvedSolar) : null;
  const chartBaseSolar = isDirect ? resolvedSolar : chartSolar;
  const dayGan = rawPillars.day[0];
  const dayGender = input.gender === 'female' ? 'female' : 'male';
  const details = buildPillars(rawPillars, dayGan, dayGender, rawPillars.year[1]);
  let sourceEightChar = null;
  if (chartBaseSolar) {
    sourceEightChar = chartBaseSolar.getLunar().getEightChar();
    sourceEightChar.setSect(2);
  }
  const extras = buildExtras(rawPillars, details, sourceEightChar);
  extras.renYuanSiLing = chartBaseSolar
    ? getRenYuanSiLing(chartBaseSolar, rawPillars.month[1])
    : { gan:'', daysAfterJie:0 };
  const birthSolar = isDirect ? resolvedSolar : solar;
  const birthLunar = birthSolar ? birthSolar.getLunar() : null;
  const yun = chartBaseSolar ? buildYun(chartBaseSolar, rawPillars, input, resolvedParts.year) : null;
  const zodiac = birthLunar ? birthLunar.getYearShengXiao() : ZODIAC[ZHI.indexOf(rawPillars.year[1])];

  return {
    input:Object.assign({}, input, { gender:dayGender }),
    calendarType:chartType,
    solarDatetime:birthSolar ? fmtSolar(solarParts(birthSolar)) : '',
    chartSolarDatetime:chartBaseSolar ? fmtSolar(solarParts(chartBaseSolar)) : '',
    trueSolarDatetime:!isDirect && correctionMinutes ? fmtSolar(solarParts(chartSolar)) : '',
    correctionMinutes,
    dstCorrectionMinutes,
    longitudeCorrectionMinutes,
    lunarText:birthLunar ? birthLunar.toString() : '',
    chartLunarText:chartBaseSolar ? chartBaseSolar.getLunar().toString() : '',
    zodiac,
    constellation:birthSolar ? birthSolar.getXingZuo() : '',
    resolvedSolarDate:birthSolar ? birthSolar.toYmd() : '',
    resolvedTime:birthSolar
      ? (birthSolar.getHour() < 10 ? '0' : '') + birthSolar.getHour() + ':' +
        (birthSolar.getMinute() < 10 ? '0' : '') + birthSolar.getMinute()
      : '',
    directTimeResolved,
    hasBirthTime,
    pillars:rawPillars,
    pillarDetails:details,
    columns:pillarListFromDetails(details),
    extras,
    yun,
    currentYear:new Date().getFullYear(),
    virtualAge:birthSolar ? new Date().getFullYear() - birthSolar.getYear() + 1 : null
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
function getNaYin(ganZhi) {
  return lunarPkg.LunarUtil.NAYIN[ganZhi] || '';
}
function getHiddenGan(zhi) {
  return (HIDDEN_GAN[zhi] || []).slice();
}

export {
  calculate, validateDirectPillars, getLunarMonths, getLunarDays, getNaYin, getHiddenGan,
  CITIES, JIAZI, GAN, ZHI, GAN_ELEMENT, ZHI_ELEMENT, tenGod, changSheng
};
