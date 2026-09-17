// 精力状态模块（Energy）行为测试。
// 由旧版 test_app.js 中**至今仍然有效**的精力部分拆出；写死模块数量 / 徽标数量的旧断言已剔除。
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

// 1. 从主界面进入精力状态（按模块名查找，不写死卡片数量）
const energyCard = [...document.querySelectorAll('#module-grid .mod-card')]
  .find(card => card.textContent.includes('精力状态'));
check('主界面存在「精力状态」模块卡片', !!energyCard);
check('精力状态卡片标记为已上线', !!energyCard && energyCard.querySelector('.badge').textContent.includes('已上线'));
energyCard.click();
check('点击后进入精力状态页', visible('energy-view') && !visible('home-view'));

// 2. 打分与表情联动
const scoreInput = document.getElementById('score-input');
scoreInput.value = '75';
scoreInput.dispatchEvent(new window.Event('input'));
check('输入 75 分显示对应表情', document.getElementById('score-emoji').textContent === '🙂');

// 3. 保存记录
document.getElementById('note-input').value = '今天状态不错';
document.getElementById('save-btn').click();
const saved = JSON.parse(window.localStorage.getItem('guanji_data_v1'));
check('保存后 records 有今天一条', !!saved && Object.keys(saved.records).length === 1);
const todayKey = Object.keys(saved.records)[0];
check('保存的日期就是今天', todayKey === window.todayStr());
check('分数 = 75 已落盘', saved.records[todayKey].score === 75);
check('备注已落盘', saved.records[todayKey].note === '今天状态不错');

// 4. 折线图
const svg = document.getElementById('chart-wrap').querySelector('svg');
check('折线图 SVG 已生成', !!svg);
check('图表含平均线文字', !!svg && svg.textContent.includes('均'));

// 5. 统计洞察
const statsText = document.getElementById('stats').textContent;
check('统计含平均 / 最高 / 最低', statsText.includes('平均') && statsText.includes('最高') && statsText.includes('最低'));

// 6. 日历
const cells = [...document.querySelectorAll('.cal-day')];
check('日历已渲染', cells.length > 0);
const todayCell = cells.find(el => el.classList.contains('today'));
check('今天格子带 today 标记且显示分数', !!todayCell && todayCell.textContent.includes('75'));

// 7. 越界校验：补录超过 7 天应被拦截
const oldAlert = window.alert;
let alertMsg = '';
window.alert = m => { alertMsg = m; };
document.getElementById('score-input').value = '50';
const past = new Date();
past.setDate(past.getDate() - 10);
document.getElementById('date-input').value = [
  past.getFullYear(),
  String(past.getMonth() + 1).padStart(2, '0'),
  String(past.getDate()).padStart(2, '0')
].join('-');
document.getElementById('save-btn').click();
check('补录超过 7 天被拦截', alertMsg.includes('最近 7 天'));
window.alert = oldAlert;

// 8. 日详情 → 修改回填
todayCell.click();
check('点击日历格子打开日期详情弹窗', document.getElementById('day-modal').classList.contains('show'));
const editBtn = [...document.querySelectorAll('#day-detail .btn')].find(b => b.textContent.includes('修改'));
check('详情里有「修改」按钮', !!editBtn);
check('「修改」按钮仍绑定 enableDayEdit', !!editBtn && (editBtn.getAttribute('onclick') || '').includes('enableDayEdit'));
// 注：内联 onclick 属性在 runScripts:'outside-only' 下不会被编译成函数，
// 因此这里直接调用按钮指向的同一个处理函数，验证回填结果。
window.enableDayEdit(window.todayStr());
check('修改后分数回填为 75', document.getElementById('day-score').value === '75');
check('修改后备注回填正确', document.getElementById('day-note').value === '今天状态不错');

// 9. 精力历史记录：独立月历视图、翻月、详情与返回栈
const recordsHead = document.querySelector('.energy-records-head');
const historyButton = document.getElementById('energy-history-btn');
check('「每日记录」标题行存在「历史记录」按钮', !!recordsHead && !!historyButton &&
  recordsHead.contains(historyButton) && historyButton.textContent.trim() === '历史记录');

const previousMonth = new Date();
previousMonth.setDate(1);
previousMonth.setMonth(previousMonth.getMonth() - 1);
const previousKey = window.toDateStr(previousMonth);
const realDaysAgo = window.daysAgo;
window.daysAgo = () => previousKey;
document.getElementById('score-input').value = '42';
document.getElementById('note-input').value = '上月记录';
document.getElementById('date-input').value = previousKey;
document.getElementById('save-btn').click();
window.daysAgo = realDaysAgo;

historyButton.click();
check('点击历史记录进入独立视图', visible('energy-history-view') && !visible('energy-view'));
const currentMonthTitle = new Date().getFullYear() + '年' + (new Date().getMonth() + 1) + '月';
check('历史记录默认展示当前月', document.getElementById('energy-history-month').textContent === currentMonthTitle);

const historyTodayCell = document.querySelector('.energy-month-day[data-date="' + window.todayStr() + '"]');
check('历史月历今天带高亮', !!historyTodayCell && historyTodayCell.classList.contains('today'));
check('有记录的日期格显示分数 75', !!historyTodayCell && historyTodayCell.textContent.includes('75'));
check('记录格采用日期、表情、底部分数三段式结构', !!historyTodayCell &&
  historyTodayCell.firstElementChild.classList.contains('dn') &&
  !!historyTodayCell.querySelector(':scope > .energy-history-emoji') &&
  historyTodayCell.lastElementChild.classList.contains('energy-history-score'));
historyTodayCell.click();
check('历史月历点击日期沿用现有详情弹窗', document.getElementById('day-modal').classList.contains('show'));
window.handleBack();
check('关闭详情后仍停留在历史记录页', !document.getElementById('day-modal').classList.contains('show') && visible('energy-history-view'));

document.getElementById('energy-history-prev').click();
const previousMonthTitle = previousMonth.getFullYear() + '年' + (previousMonth.getMonth() + 1) + '月';
check('可以切到上一月', document.getElementById('energy-history-month').textContent === previousMonthTitle);
const previousRecordCell = document.querySelector('.energy-month-day[data-date="' + previousKey + '"]');
check('上一月记录格显示对应分数 42', !!previousRecordCell && previousRecordCell.textContent.includes('42'));
const noRecordCell = document.querySelector('.energy-month-day.empty:not(.future)');
check('无记录日期显示占位且不显示分数', !!noRecordCell &&
  noRecordCell.textContent.includes('—') && !noRecordCell.querySelector('.energy-history-score'));
check('无记录格占位仍固定在底部', !!noRecordCell &&
  noRecordCell.lastElementChild.classList.contains('energy-history-placeholder'));

document.getElementById('energy-history-next').click();
check('可以切回下一月', document.getElementById('energy-history-month').textContent === currentMonthTitle);
document.getElementById('energy-history-next').click();
check('位于当前月时不能切到未来月份', document.getElementById('energy-history-month').textContent === currentMonthTitle);

window.handleBack();
check('历史记录页返回键回到精力状态页而不是主界面', visible('energy-view') && !visible('energy-history-view') && !visible('home-view'));
historyButton.click();
const historyBackButton = document.getElementById('energy-history-back');
check('历史记录页存在左上角返回按钮', !!historyBackButton && historyBackButton.textContent.includes('返回'));
historyBackButton.click();
check('历史记录页返回按钮与返回键行为一致', visible('energy-view') && !visible('energy-history-view'));

console.log('\n===== 精力状态模块测试结果 =====');
results.forEach(result => console.log(result));
console.log('===== 结束 =====');
