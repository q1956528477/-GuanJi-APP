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

// 出生时间弹层（四柱直排）是一层返回层级：返回键先关弹层，再逐级退页面
window.showView('bazi-form');
window.openGzSheet();
check('弹层已打开且位于排盘页之上', document.getElementById('gz-sheet').classList.contains('show') && visible('bazi-form-view'));
window.handleBack();
check('弹层打开时返回键关闭弹层本身', !document.getElementById('gz-sheet').classList.contains('show'));
check('关弹层后仍停留在排盘页，父页面未被销毁', visible('bazi-form-view') && !visible('home-view'));
window.handleBack();
check('再次返回才离开排盘页回到主界面', visible('home-view') && !visible('bazi-form-view'));

// 弹层里改了草稿但未确认，返回关闭后不得写回出生时间
window.showView('bazi-form');
const timeBeforeBack = document.getElementById('bz-time-value').textContent;
window.openGzSheet();
window.document.querySelector('#gz-sheet-tabs button[data-tab="solar"]').click();
window.document.getElementById('gz-solar-date').value = '2001-02-03';
window.document.getElementById('gz-solar-date').dispatchEvent(new window.Event('change', {bubbles:true}));
window.handleBack();
check('返回关闭弹层不保存未确认的改动', document.getElementById('bz-time-value').textContent === timeBeforeBack);

// ===== 返回栈逐级返回修复（v1.14.6）=====
// 造两条命例数据，供命例记录页的弹窗场景使用
window.localStorage.setItem('guanji_bazi_persons_v1', JSON.stringify([
  { id:'p1', name:'阿一', gender:'male', calendarType:'solar', solarDate:'1990-06-15', time:'08:00', groupId:'group_1', createdAt:1 },
  { id:'p2', name:'波二', gender:'female', calendarType:'solar', solarDate:'1985-03-02', time:'13:00', groupId:'group_1', createdAt:2 }
]));

// 第 1 条：精力状态 → 日期详情弹窗
window.showView('energy');
window.openDayDetail(window.todayStr());
check('日期详情弹窗已打开且位于精力页之上', document.getElementById('day-modal').classList.contains('show') && visible('energy-view'));
window.handleBack();
check('第1条：返回键只关闭日期详情弹窗', !document.getElementById('day-modal').classList.contains('show'));
check('第1条：关弹窗后仍停留在精力状态页，背景未跳回主界面', visible('energy-view') && !visible('home-view'));
window.handleBack();
check('第1条：再次返回才离开精力状态页回到主界面', visible('home-view') && !visible('energy-view'));

// 第 2 条：命例记录 → 长按命例（操作菜单）
window.openBaziRecords();
window.openBaziPersonActions('p1');
check('命例操作菜单已打开且位于命例记录页之上', document.getElementById('bz-action-modal').classList.contains('show') && visible('bazi-records-view'));
window.handleBack();
check('第2条：返回键只关闭命例操作菜单', !document.getElementById('bz-action-modal').classList.contains('show'));
check('第2条：关菜单后仍停留在命例记录页', visible('bazi-records-view') && !visible('home-view'));

// 第 3 条：命例记录 → 长按 → 移动到分组弹窗
window.openBaziPersonActions('p1');
document.getElementById('bz-action-move').click();
check('移动到分组弹窗已打开且位于命例记录页之上', document.getElementById('bz-move-modal').classList.contains('show') && visible('bazi-records-view'));
check('打开移动弹窗时上层操作菜单已收起', !document.getElementById('bz-action-modal').classList.contains('show'));
window.handleBack();
check('第3条：返回键只关闭移动到分组弹窗', !document.getElementById('bz-move-modal').classList.contains('show'));
check('第3条：关弹窗后仍停留在命例记录页', visible('bazi-records-view') && !visible('home-view'));

// 第 4 条：命例记录 → 分组管理弹窗
window.openBaziGroupManager();
check('分组管理弹窗已打开且位于命例记录页之上', document.getElementById('bz-group-modal').classList.contains('show') && visible('bazi-records-view'));
window.handleBack();
check('第4条：返回键只关闭分组管理弹窗', !document.getElementById('bz-group-modal').classList.contains('show'));
check('第4条：关弹窗后仍停留在命例记录页', visible('bazi-records-view') && !visible('home-view'));

// 第 5 条：命例记录 → 长按 → 编辑重新排盘 → 排盘页
window.openBaziPersonActions('p1');
document.getElementById('bz-action-edit').click();
check('编辑重新排盘已进入排盘页', visible('bazi-form-view') && !visible('bazi-records-view'));
window.handleBack();
check('第5条：排盘页返回键回到命例记录页', visible('bazi-records-view') && !visible('bazi-form-view'));
check('第5条：排盘页返回键没有跳回主界面', !visible('home-view'));

// 排盘页来源记忆：主界面进入的排盘页仍然回主界面（不回归）
window.showView('home');
window.openBaziForm();
window.handleBack();
check('主界面进入的排盘页返回键仍回主界面', visible('home-view') && !visible('bazi-form-view'));

// 第 6 条：排盘页保存后进入命盘信息页 → 返回，按需求刻意保持「回命例记录页」
window.openBaziForm();
window.openBaziInfo('p1');
window.handleBack();
check('第6条（保持现状）：信息页返回键回到命例记录页', visible('bazi-records-view') && !visible('bazi-info-view'));
check('第6条（保持现状）：信息页返回键未停在排盘页', !visible('bazi-form-view'));

// 排盘页本身的返回按钮同样遵循来源记忆
window.openBaziRecords();
window.openBaziForm('p1');
document.getElementById('bz-form-back').click();
check('排盘页左上角返回按钮同样回到来源页', visible('bazi-records-view') && !visible('bazi-form-view'));

// 第 7 条：六爻起卦页 → 起卦完成结果页 → 返回，按需求刻意保持「回起卦记录页」
window.openLiuyao();
window.showLiuyaoResult(window.LiuYao.cast({ method:'time', question:'返回栈回归用例' }));
window.handleBack();
check('第7条（保持现状）：起卦结果页返回键回到起卦记录页', visible('liuyao-history-view') && !visible('liuyao-view'));

console.log('\n===== 页面导航测试结果 =====');
results.forEach(result => console.log(result));
console.log('===== 结束 =====');
