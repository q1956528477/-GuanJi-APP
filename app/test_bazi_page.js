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
check('五行着色元素已生成', document.querySelectorAll('.bz2-table [class*="bz2-el-"]').length > 0);
check('占位卡片渲染正确', document.querySelectorAll('.bz2-action-card').length === 2);
check('干支作用关系三行渲染完成', document.querySelectorAll('.bz2-relation-row').length === 3);

document.querySelector('.bz-info-tabs button[data-tab="luck"]').click();
check('大运渲染10步', document.querySelectorAll('.bz-dayun-card').length === 10);
check('流年渲染10条', document.querySelectorAll('.bz-liunian-item').length === 10);
document.querySelector('.bz-liunian-item').click();
check('流年可展开流月', document.querySelectorAll('.bz-liuyue-grid > div').length === 12);

const relationResult = window.Bazi.calculate({
  gender:'male', calendarType:'ganzhi', solarDate:'1990-06-15', time:'12:00', useTrueSolarTime:false,
  fourPillars:{year:'丙申', month:'辛巳', day:'癸丑', hour:'戊午'}
});
const relations = window.analyzeBaziRelations(relationResult);
check('天干五合判定存在', relations.gan.includes('丙辛合化水'));
check('地支六合判定正确', relations.zhi.includes('申巳合化水'));
check('地支拱合判定正确', relations.zhi.includes('巳丑拱合酉'));
check('地支暗合判定正确', relations.zhi.includes('巳丑见辛暗合'));
check('地支刑破害判定正确', ['申巳相刑','申巳相破','丑午相害'].every(item => relations.zhi.includes(item)));
check('盖头截脚判定正确', relations.full.includes('丙申盖头') && relations.full.includes('辛巳截脚'));
const combineDisputeResult = window.Bazi.calculate({
  gender:'male', calendarType:'ganzhi', solarDate:'1990-06-15', time:'12:00', useTrueSolarTime:false,
  fourPillars:{year:'丙申', month:'辛巳', day:'丙午', hour:'戊戌'}
});
check('天干争合判定正确', window.analyzeBaziRelations(combineDisputeResult).gan.includes('丙辛争合'));

console.log('\n===== 八字页面测试结果 =====');
results.forEach(result => console.log(result));
console.log('===== 结束 =====');
