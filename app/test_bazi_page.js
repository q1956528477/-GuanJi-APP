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

const baziCard = [...document.querySelectorAll('.mod-card')].find(card => card.textContent.includes('八字排盘'));
check('主页存在八字排盘入口', !!baziCard);
baziCard.click();
check('八字排盘入口可打开', !document.getElementById('bazi-form-view').classList.contains('hidden'));

document.getElementById('bz-name').value = '测试命例';
document.querySelector('#bz-gender-tabs button[data-value="female"]').click();
document.getElementById('bz-solar-date').value = '1990-06-15';
document.getElementById('bz-exact-time').value = '08:32';
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
document.querySelector('#bz-calendar-tabs button[data-value="ganzhi"]').click();
document.getElementById('bz-reference-date').value = '2023-02-04';
document.getElementById('bz-exact-time').value = '10:45';
document.getElementById('bz-gz-year').value = '癸卯';
document.getElementById('bz-gz-month').value = '甲寅';
document.getElementById('bz-gz-day').value = '癸巳';
document.getElementById('bz-gz-hour').value = '丁巳';
document.getElementById('bz-submit').click();
const directPersons = JSON.parse(window.localStorage.getItem('guanji_bazi_persons_v1') || '[]');
const directPerson = directPersons.find(person => person.name === '直排测试');
check('四柱直排保存时同步出生日期', !!directPerson && directPerson.solarDate === '2023-02-04' && directPerson.time === '10:43');
check('四柱直排保存时同步出生农历', !!directPerson && directPerson.solarDatetime === '2023-02-04 10:43');
const reopenedDirect = window.Bazi.calculate({
  gender:directPerson.gender, calendarType:'solar', solarDate:directPerson.solarDate, time:directPerson.time,
  useTrueSolarTime:directPerson.useTrueSolarTime, applyChinaDst:directPerson.applyChinaDst
});
check('四柱直排保存后重新排盘仍为同一四柱', JSON.stringify(reopenedDirect.pillars) === JSON.stringify(directPerson.fourPillars));

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

console.log('\n===== 八字页面测试结果 =====');
results.forEach(result => console.log(result));
console.log('===== 结束 =====');
