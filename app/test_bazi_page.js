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

console.log('\n===== 八字页面测试结果 =====');
results.forEach(result => console.log(result));
console.log('===== 结束 =====');
