// 记录置顶功能测试：八字命例记录 + 六爻起卦记录（长按置顶 / 取消置顶 / 排序）。
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
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function baziRowIds() {
  return [...document.querySelectorAll('#bz-person-list .bz-record-row')].map(row => row.dataset.id);
}
function baziRow(id) {
  return document.querySelector('#bz-person-list .bz-record-row[data-id="' + id + '"]');
}
function lyHistoryIds() {
  return [...document.querySelectorAll('#ly-history-list .ly-history-item')].map(item => item.dataset.id);
}
function lyHistoryItem(id) {
  return document.querySelector('#ly-history-list .ly-history-item[data-id="' + id + '"]');
}
// 长按 = touchstart 后等待 550ms 触发
async function longPress(element) {
  element.dispatchEvent(new window.Event('touchstart', { bubbles:true }));
  await sleep(650);
}

(async () => {
  window.localStorage.setItem('guanji_bazi_persons_v1', JSON.stringify([
    { id:'p1', name:'阿一', gender:'male', calendarType:'solar', solarDate:'1990-06-15', time:'08:00', groupId:'group_1', createdAt:1 },
    { id:'p2', name:'波二', gender:'female', calendarType:'solar', solarDate:'1991-07-16', time:'09:00', groupId:'group_1', createdAt:2 },
    { id:'p3', name:'陈三', gender:'male', calendarType:'solar', solarDate:'1992-08-17', time:'10:00', groupId:'group_1', createdAt:3 }
  ]));
  window.showView('bazi-records');
  check('命例记录默认按原有排序（阿一/波二/陈三）', baziRowIds().join(',') === 'p1,p2,p3');

  await longPress(baziRow('p3'));
  check('长按命例弹出操作菜单', document.getElementById('bz-action-modal').classList.contains('show'));
  check('未置顶命例的菜单项为「置顶」', document.getElementById('bz-action-pin').textContent === '置顶');
  document.getElementById('bz-action-pin').click();
  check('置顶后菜单关闭', !document.getElementById('bz-action-modal').classList.contains('show'));
  check('置顶命例移动到列表最顶部', baziRowIds()[0] === 'p3');
  check('其余命例保持原有排序', baziRowIds().slice(1).join(',') === 'p1,p2');
  check('置顶命例带醒目置顶标识', baziRow('p3').classList.contains('pinned') &&
    baziRow('p3').textContent.includes('置顶') &&
    !!document.querySelector('#bz-person-list .bz-records-section-title.pinned-title'));
  check('非置顶命例不带置顶样式', !baziRow('p1').classList.contains('pinned'));
  check('置顶状态已落盘', JSON.parse(window.localStorage.getItem('guanji_bazi_persons_v1')).find(p => p.id === 'p3').pinned === true);

  await longPress(baziRow('p3'));
  check('已置顶命例的菜单项为「取消置顶」', document.getElementById('bz-action-pin').textContent === '取消置顶');
  document.getElementById('bz-action-pin').click();
  check('取消置顶后回到原本排序位置', baziRowIds().join(',') === 'p1,p2,p3');
  check('取消置顶后背景样式恢复', !baziRow('p3').classList.contains('pinned'));
  check('取消置顶状态已落盘', !JSON.parse(window.localStorage.getItem('guanji_bazi_persons_v1')).find(p => p.id === 'p3').pinned);

  // ---- 六爻起卦记录 ----
  window.localStorage.setItem('liuyao_history', JSON.stringify([
    { id:3003, question:'第三条', timestamp:'2026-09-14 10:00:00', benGua:'天泽履', zhiGua:null, fullResult:null },
    { id:3002, question:'第二条', timestamp:'2026-09-13 10:00:00', benGua:'天泽履', zhiGua:null, fullResult:null },
    { id:3001, question:'第一条', timestamp:'2026-09-12 10:00:00', benGua:'天泽履', zhiGua:null, fullResult:null }
  ]));
  window.showView('liuyao-history');
  check('起卦记录默认保持原有排序', lyHistoryIds().join(',') === '3003,3002,3001');

  await longPress(lyHistoryItem('3001'));
  check('长按起卦记录弹出操作菜单', document.getElementById('ly-action-modal').classList.contains('show'));
  check('起卦记录未置顶时菜单项为「置顶」', document.getElementById('ly-action-pin').textContent === '置顶');
  document.getElementById('ly-action-pin').click();
  check('置顶后起卦记录菜单关闭', !document.getElementById('ly-action-modal').classList.contains('show'));
  check('置顶起卦记录移动到列表最顶部', lyHistoryIds().join(',') === '3001,3003,3002');
  check('起卦记录置顶后带醒目标识', lyHistoryItem('3001').classList.contains('pinned') &&
    lyHistoryItem('3001').textContent.includes('置顶'));
  check('其余起卦记录保持原有排序', lyHistoryIds().slice(1).join(',') === '3003,3002');
  check('起卦记录置顶状态已落盘', JSON.parse(window.localStorage.getItem('liuyao_history')).find(r => r.id === 3001).pinned === true);

  await longPress(lyHistoryItem('3001'));
  check('起卦记录置顶后菜单项为「取消置顶」', document.getElementById('ly-action-pin').textContent === '取消置顶');
  document.getElementById('ly-action-pin').click();
  check('起卦记录取消置顶后回到原位置', lyHistoryIds().join(',') === '3003,3002,3001');
  check('起卦记录取消置顶后样式恢复', !lyHistoryItem('3001').classList.contains('pinned'));

  // 长按不应误触发进入详情
  await longPress(lyHistoryItem('3002'));
  check('长按起卦记录不会误进详情页', document.getElementById('liuyao-result-view').classList.contains('hidden'));
  window.handleBack();
  check('返回键关闭起卦记录操作菜单且停留在记录页', !document.getElementById('ly-action-modal').classList.contains('show') &&
    !document.getElementById('liuyao-history-view').classList.contains('hidden'));

  console.log('\n===== 记录置顶功能测试结果 =====');
  results.forEach(result => console.log(result));
  console.log('===== 结束 =====');
})();
