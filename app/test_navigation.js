// 顶级页面导航与 Android 返回键行为测试。
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
function visible(id){ return !document.getElementById(id).classList.contains('hidden'); }

const liuyaoCard = [...document.querySelectorAll('.mod-card')].find(card => card.textContent.includes('六爻卜卦'));
liuyaoCard.click();
document.getElementById('ly-history-btn').click();
check('可进入六爻起卦记录页', visible('liuyao-history-view') && !visible('liuyao-view'));
check('起卦记录页保留六爻起卦子页', visible('liuyao-cast-view') && !visible('liuyao-result-view'));

document.getElementById('req-float-btn').click();
check('打开需求页时起卦记录已隐藏', visible('req-view') && !visible('liuyao-history-view'));

window.handleBack();
check('返回键从需求页回到起卦记录页', visible('liuyao-history-view') && !visible('req-view'));

window.handleBack();
check('返回键从起卦记录页回到六爻起卦页', visible('liuyao-view') && !visible('liuyao-history-view') && visible('liuyao-cast-view'));

document.getElementById('ly-history-btn').click();
window.showView('bazi-records');
check('切到八字页面时起卦记录已隐藏', visible('bazi-records-view') && !visible('liuyao-history-view'));

const primaryViews = ['home', 'energy', 'liuyao', 'bazi-form', 'bazi-records', 'bazi-info', 'req'];
primaryViews.forEach(id => {
  window.showView(id);
  check('切到 '+id+' 时其他顶级页面全部隐藏', primaryViews.every(other => {
    const otherEl = document.getElementById(other + '-view');
    return other === id ? visible(other + '-view') : otherEl.classList.contains('hidden');
  }) && !visible('liuyao-history-view'));
});

window.showView('bazi-info');
document.getElementById('req-float-btn').click();
window.handleBack();
check('需求页返回键回到打开它的八字页面', visible('bazi-info-view') && !visible('req-view'));

window.showView('liuyao');
document.getElementById('liuyao-cast-view').classList.add('hidden');
document.getElementById('liuyao-result-view').classList.remove('hidden');
window.showView('home');
window.handleBack();
check('隐藏的六爻结果页不会劫持主页返回键', visible('home-view'));

console.log('\n===== 页面导航测试结果 =====');
results.forEach(result => console.log(result));
console.log('===== 结束 =====');
