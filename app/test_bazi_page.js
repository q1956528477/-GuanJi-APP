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
check('基本盘渲染完成', document.querySelectorAll('.bz-basic-table tbody tr').length === 8);

document.querySelector('.bz-info-tabs button[data-tab="luck"]').click();
check('大运渲染10步', document.querySelectorAll('.bz-dayun-card').length === 10);
check('流年渲染10条', document.querySelectorAll('.bz-liunian-item').length === 10);
document.querySelector('.bz-liunian-item').click();
check('流年可展开流月', document.querySelectorAll('.bz-liuyue-grid > div').length === 12);

console.log('\n===== 八字页面测试结果 =====');
results.forEach(result => console.log(result));
console.log('===== 结束 =====');
