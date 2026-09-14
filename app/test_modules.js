// 主界面模块注册表测试。
// 刻意不写死模块数量与名称：以后新增模块时，这里会自动覆盖到，不需要改测试。
// （旧的 test_app.js 写死了「模块卡片 = 3」「即将上线只有 1 个」，每加一个模块都会误报。）
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
window.HTMLElement.prototype.scrollIntoView = () => {};

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

// 顶级视图清单，与 index.html 的 showView() 保持一致
const PRIMARY_VIEWS = ['home', 'energy', 'liuyao', 'bazi-form', 'bazi-records', 'bazi-info', 'req'];
function visibleViews(){
  return PRIMARY_VIEWS.filter(id => !document.getElementById(id + '-view').classList.contains('hidden'));
}
function homeVisible(){ return visibleViews().includes('home'); }
function moduleName(card){
  const el = card.querySelector('.t');
  return el ? el.textContent.trim() : '';
}

const cards = [...document.querySelectorAll('#module-grid .mod-card')];
check('主界面渲染出模块卡片', cards.length > 0);

const names = cards.map(moduleName);
check('每张模块卡片都有名称', names.every(n => n.length > 0));
check('模块卡片名称不重复', new Set(names).size === names.length);

// 逐个模块走一遍：点击 → 进入唯一视图 → 返回键逐级退回主界面
cards.forEach((card, index) => {
  const name = names[index] || ('第 ' + (index + 1) + ' 张卡片');
  const upcoming = card.classList.contains('soon');
  const badge = card.querySelector('.badge');
  const badgeText = badge ? badge.textContent.trim() : '';

  check('「' + name + '」徽标与上线状态一致', upcoming ? badgeText === '即将上线' : badgeText === '已上线');

  window.showView('home');
  card.click();
  const afterClick = visibleViews();

  if (upcoming) {
    check('「' + name + '」（未上线）：点击后停留在主界面', afterClick.length === 1 && afterClick[0] === 'home');
    return;
  }

  check('「' + name + '」：点击后只进入一个视图（' + (afterClick[0] || '无') + '）',
    afterClick.length === 1 && afterClick[0] !== 'home');

  let guard = 0;
  while (guard++ < 8 && !homeVisible()) window.handleBack();
  check('「' + name + '」：返回键可从该模块逐级回到主界面', homeVisible());
});

console.log('\n===== 模块注册表测试结果 =====');
results.forEach(result => console.log(result));
console.log('共 ' + cards.length + ' 个模块');
console.log('===== 结束 =====');
