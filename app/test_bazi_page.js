// 八字页面集成冒烟测试：入口、新建命例、基本盘、大运流年。
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync('www/index.html', 'utf8');
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', err => console.error('jsdomError:', err.message));
const dom = new JSDOM(html, {
  runScripts:'outside-only', url:'http://localhost/', pretendToBeVisual:true, virtualConsole
});
const { window } = dom;
const { document } = window;
window.scrollTo = () => {};

['bazi.bundle.js', 'liuyao.bundle.js', 'notify.bundle.js', 'native.bundle.js'].forEach(file => {
  window.eval(fs.readFileSync(path.join('www', file), 'utf8'));
});
const inlineBlocks = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].filter(match => match[1].trim());
window.eval(inlineBlocks[inlineBlocks.length - 1][1]);

const results = [];
function check(name, cond) {
  results.push((cond ? '✅' : '❌') + ' ' + name);
  if (!cond) process.exitCode = 1;
}

// ---- 出生时间弹层操作辅助 ----
function openTimeSheet(tab) {
  document.getElementById('bz-time-trigger').click();
  if (tab) document.querySelector('#gz-sheet-tabs button[data-tab="' + tab + '"]').click();
}
function setSheetValue(id, value) {
  const el = document.getElementById(id);
  el.value = value;
  el.dispatchEvent(new window.Event('change', {bubbles:true}));
}
function pickPillar(key, gan, zhi) {
  document.querySelector('.gz-slot[data-slot="' + key + '-gan"]').click();
  document.querySelector('#gz-picker .gz-cell[data-kind="gan"][data-value="' + gan + '"]').click();
  document.querySelector('#gz-picker .gz-cell[data-kind="zhi"][data-value="' + zhi + '"]').click();
}
function sheetResultCards() {
  return [...document.querySelectorAll('#gz-results .gz-result')];
}
function sheetConfirm() {
  document.getElementById('gz-sheet-confirm').click();
}

const baziCard = [...document.querySelectorAll('.mod-card')].find(card => card.textContent.includes('八字排盘'));
check('主页存在八字排盘入口', !!baziCard);
baziCard.click();
check('八字排盘入口可打开', !document.getElementById('bazi-form-view').classList.contains('hidden'));

document.getElementById('bz-name').value = '测试命例';
document.querySelector('#bz-gender-tabs button[data-value="female"]').click();
openTimeSheet('solar');
setSheetValue('gz-solar-date', '1990-06-15');
setSheetValue('gz-exact-time', '08:32');
sheetConfirm();
document.getElementById('bz-true-solar').checked = false;
document.getElementById('bz-submit').click();

const persons = JSON.parse(window.localStorage.getItem('guanji_bazi_persons_v1') || '[]');
check('保存命例成功', persons.length === 1 && persons[0].name === '测试命例');
check('保存后自动进入信息页', !document.getElementById('bazi-info-view').classList.contains('hidden'));
check('基本信息页四柱正确', JSON.stringify(persons[0].fourPillars) === JSON.stringify({
  year:'庚午', month:'壬午', day:'辛亥', hour:'壬辰'
}));
const profileText = document.querySelector('.bz2-profile').textContent;
check('顶部农历信息格式正确', profileText.includes('农历：1990年五月廿三 辰时 坤造'));
check('顶部阳历信息格式正确', profileText.includes('阳历：1990年06月15日 08:32:00'));
check('基本盘11行渲染完成', document.querySelectorAll('.bz2-table tbody tr').length === 11);
check('五列等宽结构已生成', document.querySelectorAll('.bz2-table colgroup col').length === 5);
check('五行着色元素已生成', document.querySelectorAll('.bz2-table [class*="bz2-el-"]').length > 0);
const kongRow = [...document.querySelectorAll('.bz2-table tbody tr')].find(row => row.firstElementChild.textContent.trim() === '空亡');
check('空亡按各柱旬空显示', !!kongRow && !kongRow.textContent.includes('—'));
check('占位卡片已移除', document.querySelectorAll('.bz2-action-card').length === 0);
check('干支作用关系三行渲染完成', document.querySelectorAll('.bz2-relation-row').length === 3);

document.querySelector('.bz-info-tabs button[data-tab="fine"]').click();
check('细盘七列表格结构正确', document.querySelectorAll('.bz3-table colgroup col').length === 7);
check('细盘大运流年列默认高亮', document.querySelectorAll('.bz3-table .bz3-active-col').length === 20);
check('大运、流年、流月三条横带存在', document.querySelectorAll('.bz3-strip').length === 3);
check('三条横带默认各高亮一列', document.querySelectorAll('.bz3-strip-col.active').length === 3);
check('起运与交运信息完整', document.querySelector('.bz3-start-info').textContent.includes('起运：') && document.querySelector('.bz3-start-info').textContent.includes('交运：'));
check('五行旺衰五段渲染完成', document.querySelectorAll('.bz3-wuxing > div').length === 5);
check('五行旺衰按出生月令计算', document.querySelector('.bz3-wuxing > div').textContent.includes('火旺'));
check('岁运与原局共六行关系', document.querySelectorAll('.bz3-relation-row').length === 6);
check('三类神煞区渲染完成', document.querySelectorAll('.bz3-shensha-title').length === 3);
const secondLiuNian = document.querySelectorAll('#bz3-liunian-scroll .bz3-strip-col')[1];
secondLiuNian.click();
check('点击流年可联动高亮', document.querySelectorAll('#bz3-liunian-scroll .bz3-strip-col')[1].classList.contains('active'));
const beforeExpandRows = document.querySelectorAll('.bz3-shensha-row').length;
document.getElementById('bz3-toggle-liunian-shensha').click();
check('流年神煞可展开', document.querySelectorAll('.bz3-shensha-row').length > beforeExpandRows);

const relationResult = window.Bazi.calculate({
  gender:'male', calendarType:'ganzhi', solarDate:'1990-06-15', time:'12:00', useTrueSolarTime:false,
  fourPillars:{year:'丙申', month:'辛巳', day:'癸丑', hour:'戊午'}
});
const relations = window.analyzeBaziRelations(relationResult);
check('天干五合判定存在', relations.gan.includes('丙辛合化水'));
check('地支六合判定正确', relations.zhi.includes('申巳合化水'));
check('地支拱合判定正确', relations.zhi.includes('巳丑拱合酉'));
check('地支暗合按地支简写显示', relations.zhi.includes('巳丑暗合'));
check('暗合不再附带藏干说明', !relations.zhi.some(item => /见.+暗合/.test(item)));
check('地支刑破害判定正确', ['申巳相刑','申巳相破','丑午相害'].every(item => relations.zhi.includes(item)));
check('盖头截脚判定正确', relations.full.includes('丙申盖头') && relations.full.includes('辛巳截脚'));
const combineDisputeResult = window.Bazi.calculate({
  gender:'male', calendarType:'ganzhi', solarDate:'1990-06-15', time:'12:00', useTrueSolarTime:false,
  fourPillars:{year:'丙申', month:'辛巳', day:'丙午', hour:'戊戌'}
});
check('天干争合判定正确', window.analyzeBaziRelations(combineDisputeResult).gan.includes('丙辛争合'));

const interactionResult = window.Bazi.calculate({
  gender:'male', calendarType:'ganzhi', solarDate:'1990-06-15', time:'12:00', useTrueSolarTime:false,
  fourPillars:{year:'丙辰', month:'庚戌', day:'丁巳', hour:'壬申'}
});
const interactions = window.analyzeBaziRelations(interactionResult);
check('天干相冲与相克判定正确', interactions.gan.some(item => item === '丙壬相冲' || item === '壬丙相冲') && interactions.gan.includes('丙庚相克'));
check('非标准藏干暗合已过滤', !interactions.zhi.some(item => ['辰戌见戊暗合','辰巳见庚暗合','戌巳见丙暗合'].includes(item)));
check('整柱关系补充完整', interactions.full.length > 0);

const fanYinResult = window.Bazi.calculate({
  gender:'male', calendarType:'ganzhi', solarDate:'1990-06-15', time:'12:00', useTrueSolarTime:false,
  fourPillars:{year:'甲子', month:'庚午', day:'乙丑', hour:'辛未'}
});
check('天比地冲与反吟判定正确', window.analyzeBaziRelations(fanYinResult).full.includes('甲子庚午反吟'));

const crossBase = window.Bazi.calculate({
  gender:'male', calendarType:'ganzhi', solarDate:'1990-06-15', time:'12:00', useTrueSolarTime:false,
  fourPillars:{year:'甲子', month:'乙丑', day:'甲子', hour:'乙丑'}
});
const crossFlow = window.Bazi.calculate({
  gender:'male', calendarType:'ganzhi', solarDate:'1990-06-15', time:'12:00', useTrueSolarTime:false,
  fourPillars:{year:'甲子', month:'乙丑', day:'甲子', hour:'己丑'}
}).pillarDetails.hour;
const crossRelations = window.analyzeBaziCrossRelations(crossBase.columns, [crossFlow]);
check('岁运关系包含原局与大运流年交叉', crossRelations.gan.includes('甲己合化土') && crossRelations.zhi.includes('子丑合化土'));

window.openBaziForm();
document.getElementById('bz-name').value = '直排测试';
document.getElementById('bz-time-trigger').click();
check('弹层默认选中四柱', document.querySelector('#gz-sheet-tabs button.active').dataset.tab === 'ganzhi');
pickPillar('year', '癸', '卯');
pickPillar('month', '甲', '寅');
pickPillar('day', '癸', '巳');
pickPillar('hour', '丁', '巳');
check('四柱直排弹层列出匹配结果', sheetResultCards().length === 2);
check('结果卡片含阳历与阴历两行', sheetResultCards().some(card =>
  card.textContent.includes('阳历：1963-02-19 09:00:00') && card.textContent.includes('阴历：') &&
  card.textContent.includes('巳时')));
check('未选中结果时确定置灰', document.getElementById('gz-sheet-confirm').disabled === true);
sheetResultCards().find(card => card.textContent.includes('1963-02-19')).click();
check('选中结果卡片高亮', (document.querySelector('#gz-results .gz-result.active') || {}).textContent.includes('1963-02-19'));
check('选中结果后确定可点', document.getElementById('gz-sheet-confirm').disabled === false);
sheetConfirm();
check('点确定关闭弹层', !document.getElementById('gz-sheet').classList.contains('show'));
check('点确定回写出生时间字段', document.getElementById('bz-time-value').textContent.includes('1963-02-19 09:00'));
document.getElementById('bz-submit').click();
const directPersons = JSON.parse(window.localStorage.getItem('guanji_bazi_persons_v1') || '[]');
const directPerson = directPersons.find(person => person.name === '直排测试');
check('四柱直排保存时同步出生日期', !!directPerson && directPerson.solarDate === '1963-02-19' && directPerson.time === '10:00');
check('四柱直排保存时同步出生农历', !!directPerson && directPerson.solarDatetime === '1963-02-19 10:00');
const reopenedDirect = window.Bazi.calculate({
  gender:directPerson.gender, calendarType:'solar', solarDate:directPerson.solarDate, time:directPerson.time,
  useTrueSolarTime:directPerson.useTrueSolarTime, applyChinaDst:directPerson.applyChinaDst
});
check('四柱直排保存后重新排盘仍为同一四柱', JSON.stringify(reopenedDirect.pillars) === JSON.stringify(directPerson.fourPillars));

// 验收用例：己巳 丙子 丙寅 戊子 在 1801~2099 范围内的反推结果
window.openBaziForm();
openTimeSheet('ganzhi');
pickPillar('year', '己', '巳');
pickPillar('month', '丙', '子');
pickPillar('day', '丙', '寅');
pickPillar('hour', '戊', '子');
const acceptanceCards = sheetResultCards().map(card => card.textContent);
check('反推结果包含 1990-01-01', acceptanceCards.some(text => text.includes('阳历：1990-01-01 00:00:00')));
check('反推结果包含 2049-12-17', acceptanceCards.some(text => text.includes('阳历：2049-12-17 00:00:00')));
check('子时结果农历行含冬月廿三', acceptanceCards.some(text => text.includes('阴历：2049年冬月廿三 子时')));
sheetResultCards().find(card => card.textContent.includes('2049-12-17')).click();
sheetConfirm();
check('选中 2049-12-17 后回写出生时间', document.getElementById('bz-time-value').textContent.includes('2049-12-17 00:00'));

// 干支面板的阴阳约束与改选/清除
openTimeSheet('ganzhi');
document.querySelector('.gz-slot[data-slot="year-gan"]').click();
check('天干面板为十天干', document.querySelectorAll('#gz-picker .gz-cell').length === 10);
document.querySelector('#gz-picker .gz-cell[data-value="甲"]').click();
check('选甲后地支只剩六个阳支',
  [...document.querySelectorAll('#gz-picker .gz-cell')].map(cell => cell.textContent).join('') === '子寅辰午申戌');
document.querySelector('.gz-slot[data-slot="year-gan"]').click();
document.querySelector('#gz-picker .gz-cell[data-value="乙"]').click();
check('选乙后地支只剩六个阴支',
  [...document.querySelectorAll('#gz-picker .gz-cell')].map(cell => cell.textContent).join('') === '丑卯巳未酉亥');
document.querySelector('#gz-picker .gz-cell[data-value="丑"]').click();
check('年柱可选中乙丑', document.querySelector('.gz-slot[data-slot="year-zhi"]').textContent === '丑');
document.querySelector('.gz-slot[data-slot="year-gan"]').click();
document.querySelector('#gz-picker .gz-cell[data-value="丙"]').click();
check('改选天干后原地支清空', document.querySelector('.gz-slot[data-slot="year-zhi"]').textContent === '');
document.getElementById('gz-clear').click();
check('清除按钮清空四柱槽位', document.querySelectorAll('.gz-slot.filled').length === 0);
check('清除按钮清空结果列表', sheetResultCards().length === 0);

// 点遮罩关闭不保存修改
const timeTextBefore = document.getElementById('bz-time-value').textContent;
openTimeSheet('ganzhi');
pickPillar('year', '壬', '申');
document.getElementById('gz-sheet').click();
check('点遮罩关闭弹层且不保存', !document.getElementById('gz-sheet').classList.contains('show') &&
  document.getElementById('bz-time-value').textContent === timeTextBefore);

let directAlertMessage = '';
const originalAlert = window.alert;
window.alert = message => { directAlertMessage = message; };
window.openBaziForm();
document.getElementById('bz-name').value = '矛盾四柱';
openTimeSheet('ganzhi');
pickPillar('year', '甲', '子');
pickPillar('month', '戊', '寅');
pickPillar('day', '戊', '辰');
pickPillar('hour', '壬', '子');
check('五虎遁不合时列表提示无匹配结果', document.getElementById('gz-results').textContent.includes('查找范围内无匹配结果'));
check('五虎遁不合时补出原因提示', document.getElementById('gz-results').textContent.includes('年柱与月柱不符合五虎遁规则，请检查'));
check('无匹配结果时确定保持置灰', document.getElementById('gz-sheet-confirm').disabled === true);
document.getElementById('gz-sheet').click();
check('点遮罩关闭弹层', !document.getElementById('gz-sheet').classList.contains('show'));

// 老版本保存下来的“四柱直录”命例（无解、无出生时间）重新保存时应保持原状
const directRecordSeed = JSON.parse(window.localStorage.getItem('guanji_bazi_persons_v1') || '[]');
directRecordSeed.unshift({
  id:'p_legacy_direct', name:'四柱直录测试', gender:'male', calendarType:'ganzhi',
  fourPillars:{year:'甲子', month:'丙寅', day:'癸丑', hour:'丙辰'},
  solarDate:'', time:'', timeMode:'unknown', groupId:directPersons[0].groupId, createdAt:1
});
window.localStorage.setItem('guanji_bazi_persons_v1', JSON.stringify(directRecordSeed));
window.openBaziForm('p_legacy_direct');
document.getElementById('bz-submit').click();
window.alert = originalAlert;
check('四柱直录保存过程无弹窗', directAlertMessage === '');
const fallbackPersons = JSON.parse(window.localStorage.getItem('guanji_bazi_persons_v1') || '[]');
const fallbackPerson = fallbackPersons.find(person => person.name === '四柱直录测试');
check('合法四柱无解时仍可保存', !!fallbackPerson && fallbackPerson.directRecord === true &&
  fallbackPerson.solarDate === '' && fallbackPerson.timeMode === 'unknown');
check('四柱直录详情显示无出生时间', document.querySelector('.bz2-profile').textContent.includes('四柱直录（无出生时间）'));
document.querySelector('.bz-info-tabs button[data-tab="fine"]').click();
check('四柱直录无出生时间时不进入细盘', document.querySelector('.bz-info-tabs button[data-tab="basic"]').classList.contains('active'));
window.showView('bazi-records');
check('四柱直录命例卡片显示标记与完整四柱', document.querySelector('[data-id="' + fallbackPerson.id + '"] .bz-record-date').textContent === '四柱直录（无出生时间）' &&
  document.querySelector('[data-id="' + fallbackPerson.id + '"] .bz-record-pillars').textContent === '甲丙癸丙子寅丑辰');

const recordGroups = [
  {id:'group_1', name:'默认', sortOrder:0, isDefault:true, createdAt:1},
  {id:'group_2', name:'自己', sortOrder:1, isDefault:false, createdAt:2}
];
const recordPersons = [
  {id:'p_jason', name:'Jason', gender:'male', calendarType:'solar', solarDate:'2000-01-01', solarDatetime:'2000-01-01 23:30', fourPillars:{year:'己卯', month:'丙子', day:'戊午', hour:'壬子'}, groupId:'group_1', createdAt:9},
  {id:'p_kong', name:'孔子', gender:'male', calendarType:'solar', solarDate:'1996-05-01', solarDatetime:'1996-05-01 08:00', fourPillars:{year:'丙子', month:'壬辰', day:'丁酉', hour:'甲辰'}, groupId:'group_1', createdAt:8},
  {id:'p_li', name:'李四', gender:'female', calendarType:'lunar', lunarText:'一九九六年三月十四', solarDatetime:'1996-05-01 08:00', fourPillars:{year:'丙子', month:'壬辰', day:'丁酉', hour:'甲辰'}, groupId:'group_1', createdAt:7},
  {id:'p_ouyang', name:'欧阳娜', gender:'female', calendarType:'solar', solarDate:'2026-09-04', solarDatetime:'2026-09-04 02:03', fourPillars:{year:'丙午', month:'丙申', day:'辛亥', hour:'己丑'}, groupId:'group_1', createdAt:6},
  {id:'p_shan', name:'单田芳', gender:'male', calendarType:'solar', solarDate:'1934-12-17', solarDatetime:'1934-12-17 12:00', fourPillars:{year:'甲戌', month:'丙子', day:'壬申', hour:'丙午'}, groupId:'group_1', createdAt:5},
  {id:'p_unknown', name:'王某', gender:'male', calendarType:'solar', solarDate:'1999-04-14', solarDatetime:'1999-04-14 12:00', fourPillars:{year:'己卯', month:'己巳', day:'己卯', hour:''}, timeMode:'unknown', groupId:'group_1', createdAt:4},
  {id:'p_yang', name:'杨九', gender:'female', calendarType:'solar', solarDate:'1990-06-15', solarDatetime:'1990-06-15 08:32', fourPillars:{year:'庚午', month:'壬午', day:'辛亥', hour:'壬辰'}, groupId:'group_1', createdAt:3},
  {id:'p_zeng', name:'曾先生', gender:'male', calendarType:'solar', solarDate:'1949-10-01', solarDatetime:'1949-10-01 15:00', fourPillars:{year:'己丑', month:'癸酉', day:'甲子', hour:'壬申'}, groupId:'group_2', createdAt:2},
  {id:'p_zhang', name:'张三', gender:'male', calendarType:'solar', solarDate:'2023-02-04', solarDatetime:'2023-02-04 10:43', fourPillars:{year:'癸卯', month:'甲寅', day:'癸巳', hour:'丁巳'}, groupId:'group_2', createdAt:1}
];
window.localStorage.setItem('guanji_bazi_groups_v1', JSON.stringify(recordGroups));
window.localStorage.setItem('guanji_bazi_persons_v1', JSON.stringify(recordPersons));
window.showView('bazi-records');

check('命例列表显示搜索与筛选控件', document.getElementById('bz-search').placeholder === '请输入搜索的内容' && document.getElementById('bz-records-filter').textContent === '筛选');
const recordIndexLetters = [...document.querySelectorAll('.bz-records-index-item')].map(item => item.dataset.letter);
check('命例按拼音首字母分节并生成索引', JSON.stringify(recordIndexLetters) === JSON.stringify(['J','K','L','O','S','W','Y','Z']));
check('多音字姓氏分节采用统一口径', !!document.querySelector('#bz-records-letter-S [data-id="p_shan"]') &&
  !!document.querySelector('#bz-records-letter-Z [data-id="p_zeng"]'));
const sSectionNames = [...document.querySelectorAll('#bz-records-letter-S .bz-record-name')].map(item => item.textContent);
const zSectionNames = [...document.querySelectorAll('#bz-records-letter-Z .bz-record-name')].map(item => item.textContent);
check('同一分节内按拼音排序', JSON.stringify(sSectionNames) === JSON.stringify(['单田芳']) &&
  JSON.stringify(zSectionNames) === JSON.stringify(['曾先生','张三']));
check('单条命例分节标题仍正常显示', !!document.querySelector('#bz-records-letter-K .bz-records-section-title'));
check('农历命例显示农历出生日期', document.querySelector('[data-id="p_li"] .bz-record-date').textContent === '农历一九九六年三月十四');
const unknownPillars = document.querySelector('[data-id="p_unknown"] .bz-record-pillars');
check('未知时辰显示星号占位', unknownPillars.textContent === '己己己*卯巳卯*');
check('未知时辰使用灰色占位样式', unknownPillars.querySelectorAll('.bz-record-ganzi-unknown').length === 2);
check('命例行包含生肖图标', document.querySelectorAll('.bz-record-zodiac').length === recordPersons.length);

const searchInput = document.getElementById('bz-search');
searchInput.value = '张';
searchInput.dispatchEvent(new window.Event('input', {bubbles:true}));
check('搜索实时过滤当前分组并保留结果分节', document.querySelectorAll('.bz-records-section').length === 1 &&
  document.querySelector('.bz-records-section').dataset.letter === 'Z' &&
  document.querySelectorAll('.bz-record-row').length === 1);
searchInput.value = '';
searchInput.dispatchEvent(new window.Event('input', {bubbles:true}));

document.getElementById('bz-records-filter').click();
check('筛选按钮保留为占位功能', document.getElementById('toast').textContent.includes('敬请期待'));

document.getElementById('bz-records-edit-btn').click();
check('编辑模式显示选择框和批量操作栏', document.querySelectorAll('.bz-record-check').length === recordPersons.length &&
  !document.getElementById('bz-records-bulk-bar').classList.contains('hidden') &&
  document.getElementById('bz-records-edit-btn').textContent === '完成' &&
  document.getElementById('req-float-btn').classList.contains('hidden'));
document.querySelector('.bz-record-row').click();
check('点击命例行可切换选中状态', document.querySelectorAll('.bz-record-row.selected').length === 1 &&
  document.getElementById('bz-records-selected-count').textContent === '已选 1 项');
document.getElementById('bz-records-move-selected').click();
check('批量移动到分组入口可用', document.getElementById('bz-move-modal').classList.contains('show'));
document.getElementById('bz-move-close').click();
document.getElementById('bz-records-edit-btn').click();
check('再次点击编辑按钮退出编辑模式', document.querySelectorAll('.bz-record-check').length === 0 &&
  document.getElementById('bz-records-bulk-bar').classList.contains('hidden') &&
  !document.getElementById('req-float-btn').classList.contains('hidden'));

document.querySelector('[data-id="p_kong"]').click();
check('点击命例行进入八字信息页', !document.getElementById('bazi-info-view').classList.contains('hidden'));
window.showView('bazi-records');
const selfGroupTab = [...document.querySelectorAll('#bz-group-tabs .bz-group-tab')].find(tab => tab.textContent === '自己');
selfGroupTab.click();
const activeGroupTab = [...document.querySelectorAll('#bz-group-tabs .bz-group-tab')].find(tab => tab.textContent === '自己');
check('分组切换保留且过滤正确', document.querySelectorAll('.bz-record-row').length === 2 &&
  activeGroupTab.classList.contains('active'));

// ===== 主界面「今日干支」只读卡片 =====
// 首屏回归：应用初始化（脚本末尾的 renderHome()）之后卡片就必须有内容 ——
// 只靠 showView('home') 渲染是不够的，首页冷启动不走 showView。
const initSource = inlineBlocks[inlineBlocks.length - 1][1];
check('初始化会渲染今日干支卡片（冷启动首屏不为空）',
  /renderHome\(\);\s*(\/\/[^\n]*\n\s*)?openHomeGanZhiCard\(\);/.test(initSource));
check('冷启动时卡片已有四柱内容（未经过 showView）',
  document.getElementById('ganzhi-pillars').textContent.length > 0 &&
  document.getElementById('ganzhi-shichen').textContent.length > 0 &&
  document.getElementById('ganzhi-clock').textContent.length > 0);

const gzCard = document.getElementById('ganzhi-today-card');
const gzHero = document.getElementById('hero');
check('今日干支卡片存在', !!gzCard);
check('今日干支卡片位于 #hero 之前（主界面第一张卡片）',
  !!gzCard && !!gzHero && !!(gzCard.compareDocumentPosition(gzHero) & window.Node.DOCUMENT_POSITION_FOLLOWING));
check('今日干支卡片不是 .mod-card（不影响模块注册表遍历）',
  !!gzCard && !gzCard.classList.contains('mod-card') && gzCard.className.indexOf('mod-card') < 0);
check('今日干支卡片标题为「今日干支」',
  !!gzCard && gzCard.querySelector('.gz-today-title').textContent === '今日干支');
check('今日干支卡片复用现有卡片体系（.card + 圆角变量）',
  !!gzCard && gzCard.classList.contains('card'));

const gzBody = gzCard.querySelector('.gz-today-body');
const gzLeft = gzCard.querySelector('.gz-today-left');
const gzRight = gzCard.querySelector('.gz-today-right');
check('右块与左侧三行文案共用同一纵向容器（标题单独成行、在容器之外）',
  !!gzBody && !!gzLeft && !!gzRight &&
  gzBody.contains(gzLeft) && gzBody.contains(gzRight) &&
  !gzBody.contains(gzCard.querySelector('.gz-today-title')) &&
  gzLeft.children.length === 3);
const styleText = document.querySelector('style') ? document.querySelector('style').textContent : '';
const cssRule = sel => { const i = styleText.indexOf(sel); return i < 0 ? '' : styleText.slice(i, styleText.indexOf('}', i) + 1); };
const bodyRule = cssRule('.gz-today-body{');
const rightRule = cssRule('.gz-today-right{');
// 只禁「写死尺寸/用间距硬凑居中」：允许 gap / padding 这类常规间距
const hasFixedSize = rule => /(^|[;{])\s*(height|min-height|max-height|width|min-width|max-width)\s*:/.test(rule);
check('容器的居中约束来自 align-self（不是固定尺寸 / margin-top 硬凑）',
  window.getComputedStyle(gzBody).display === 'flex' &&
  window.getComputedStyle(gzRight).alignSelf === 'center' &&
  bodyRule.indexOf('align-items') < 0 &&                 // 没有靠拉伸整行来"看起来居中"
  bodyRule.indexOf('justify-content') < 0 &&
  !hasFixedSize(bodyRule) &&                             // 容器高度由内容撑开
  !hasFixedSize(cssRule('.gz-today-card{')) &&           // 卡片没写死高度
  rightRule.indexOf('margin-top') < 0 &&                 // 右块不用 margin-top 硬凑
  rightRule.indexOf('align-self') >= 0 &&                // 居中交给 flex 的 align-self
  rightRule.indexOf('align-self:center') >= 0);
check('节气行与日期行都在左块内、与四柱不同行（纵向排列）',
  gzLeft.children[0].classList.contains('gz-today-pillars') &&
  gzLeft.children[1].classList.contains('gz-today-term') &&
  gzLeft.children[2].classList.contains('gz-today-date'));
check('卡片只读：无 onclick、无内联 onclick 属性、无按压态类',
  gzCard.onclick === null && !gzCard.hasAttribute('onclick') && !gzCard.classList.contains('mod-card'));

const renderCard = date => { window.renderGanZhiTodayCard(date); };
const enginePillars = d => {
  const pad = n => String(n).padStart(2, '0');
  const r = window.Bazi.calculate({
    calendarType: 'solar',
    solarDate: d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()),
    time: pad(d.getHours()) + ':' + pad(d.getMinutes())
  });
  const p = r.pillars;
  return { text: p.year + '年 ' + p.month + '月 ' + p.day + '日 ' + p.hour + '时', shichen: p.hour[1] + '时' };
};

const dayDate = new Date(2026, 8, 18, 9, 5, 0);   // 2026-09-18 09:05
renderCard(dayDate);
const expected = enginePillars(dayDate);
check('四柱与引擎同源（Bazi.calculate 的 pillars 原值，未美化未补位）',
  document.getElementById('ganzhi-pillars').textContent === expected.text &&
  document.getElementById('ganzhi-pillars').textContent === '丙午年 丁酉月 乙未日 辛巳时');
check('右块第一行是时辰名（引擎时柱地支 + 时）',
  document.getElementById('ganzhi-shichen').textContent === expected.shichen &&
  document.getElementById('ganzhi-shichen').textContent === '巳时');
check('右块第二行为 HH:MM 且不补零（9:05）',
  document.getElementById('ganzhi-clock').textContent === '9:05');
check('右块只显示时辰名，不含时辰起止区间',
  !/\d{1,2}:\d{2}\s*[–\-~至]/.test(document.getElementById('ganzhi-shichen').textContent) &&
  document.getElementById('ganzhi-shichen').textContent.indexOf('时') ===
  document.getElementById('ganzhi-shichen').textContent.length - 1);
check('节气行为「节气名 M/D–M/D」',
  document.getElementById('ganzhi-term').textContent === '节气 白露 9/7–10/8');
check('日期行只有公元日期、没有时间',
  document.getElementById('ganzhi-date').textContent === '2026年9月18日' &&
  !/\d{1,2}:\d{2}/.test(document.getElementById('ganzhi-date').textContent));

// 时间文案长度变化后仍与左侧同一容器（居中关系不依赖时间文本长度）
renderCard(new Date(2026, 8, 18, 12, 5, 0));
check('时间文案长度变化（9:05 → 12:05）后右块仍在同一居中容器内',
  document.getElementById('ganzhi-clock').textContent === '12:05' &&
  gzCard.querySelector('.gz-today-right').parentElement === gzBody &&
  window.getComputedStyle(gzCard.querySelector('.gz-today-right')).alignSelf === 'center');
check('时间变化后四柱同步更新（午时）',
  document.getElementById('ganzhi-pillars').textContent === '丙午年 丁酉月 乙未日 壬午时' &&
  document.getElementById('ganzhi-shichen').textContent === '午时');

// 跨日：日期行随之更新
renderCard(new Date(2026, 8, 19, 9, 5, 0));
check('跨日后日期行随之更新', document.getElementById('ganzhi-date').textContent === '2026年9月19日');

// 23:30 晚子时：日柱进位、时柱同源、时辰名为子时（与八字排盘同口径）
const lateZi = new Date(2026, 8, 18, 23, 30, 0);
renderCard(lateZi);
const lateZiEngine = window.Bazi.calculate({ calendarType:'solar', solarDate:'2026-09-18', time:'23:30' });
check('23:30 晚子时：卡片四柱与引擎一致（日柱进位丙申、时柱丙子）',
  document.getElementById('ganzhi-pillars').textContent === lateZiEngine.pillars.year + '年 ' +
    lateZiEngine.pillars.month + '月 ' + lateZiEngine.pillars.day + '日 ' + lateZiEngine.pillars.hour + '时' &&
  document.getElementById('ganzhi-pillars').textContent === '丙午年 丁酉月 丙申日 丙子时');
check('23:30 时辰名为子时', document.getElementById('ganzhi-shichen').textContent === '子时');
check('23:30 时间不补零', document.getElementById('ganzhi-clock').textContent === '23:30');

// 跨节气：把时间推到交节时刻之后
renderCard(new Date(2026, 8, 7, 22, 0, 0));
const termBefore = document.getElementById('ganzhi-term').textContent;
renderCard(new Date(2026, 8, 7, 23, 0, 0));
check('跨节气后节气行随之更新（9/7 22:41 交白露）',
  termBefore === '节气 立秋 8/7–9/7' && document.getElementById('ganzhi-term').textContent === '节气 白露 9/7–10/8');

// 定时器：切走清理、回到主界面重建、不重复注册、自续期
const realSetTimeout = window.setTimeout;
const realClearTimeout = window.clearTimeout;
let created = 0, cleared = 0, lastDelay = null, lastFn = null;
window.setTimeout = (fn, delay) => { created++; lastDelay = delay; lastFn = fn; return realSetTimeout(fn, delay); };
window.clearTimeout = id => { if (id !== null && id !== undefined) cleared++; return realClearTimeout(id); };

window.showView('energy');                        // 先清干净（前面 showView('home') 会留下一个）
const c0 = created, cl0 = cleared;
window.openHomeGanZhiCard();
check('进入主界面注册一个对齐分钟边界的定时器',
  created === c0 + 1 && typeof lastDelay === 'number' && lastDelay > 0 && lastDelay <= 60000);
const beforeRepeat = created;
window.openHomeGanZhiCard();
window.openHomeGanZhiCard();
check('重复进入主界面不会重复注册（仍只有一个定时器）', created === beforeRepeat);
window.showView('energy');
check('切到其它视图后清理定时器', cleared === cl0 + 1);
window.showView('home');
check('重新进入主界面重建定时器', created === beforeRepeat + 1);
const beforeTick = created;
window.clearTimeout = realClearTimeout;           // 这一拍会真实触发，避免再次拦截 clear
if(lastFn) lastFn();
window.clearTimeout = id => { if (id !== null && id !== undefined) cleared++; return realClearTimeout(id); };
check('定时器到期后自动重排（分钟级持续刷新）', created === beforeTick + 1);
window.showView('energy');                        // 离开主界面，保证没有遗留定时器
window.setTimeout = realSetTimeout;
window.clearTimeout = realClearTimeout;

console.log('\n===== 八字页面测试结果 =====');
results.forEach(result => console.log(result));
console.log('===== 结束 =====');
