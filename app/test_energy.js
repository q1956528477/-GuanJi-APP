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

// 10. 复制过去一周作息信息
async function runWeeklyCopyTests(){
function saveWeeklyFixture(date, sleepTime, wakeTime, score){
  const real = window.daysAgo;
  window.daysAgo = () => date;
  document.getElementById('score-input').value = String(score);
  document.getElementById('note-input').value = '';
  document.getElementById('date-input').value = date;
  document.getElementById('sleep-input').value = sleepTime;
  document.getElementById('wake-input').value = wakeTime;
  document.getElementById('save-btn').click();
  window.daysAgo = real;
}
const copyWeekButton = document.getElementById('copy-week-energy-btn');
check('「数据与提醒」中存在复制一周状态信息按钮', !!copyWeekButton &&
  copyWeekButton.textContent.trim() === '复制一周状态信息' &&
  copyWeekButton.closest('.card').querySelector('h3').textContent.includes('数据与提醒'));

const yesterday = window.daysAgo(1);
const twoDaysAgo = window.daysAgo(2);
const threeDaysAgo = window.daysAgo(3);
saveWeeklyFixture(yesterday, '23:00', '07:00', 66);
saveWeeklyFixture(twoDaysAgo, '00:30', '08:15', 58);
const weeklyPrompt = window.buildWeeklyEnergyPrompt();
const weeklyDataLines = weeklyPrompt.split('\n').filter(line => line.startsWith('- '));
check('一周状态提示词包含最近 7 天且按日期升序',
  weeklyDataLines.length === 7 &&
  weeklyDataLines[0].includes(window.daysAgo(6)) &&
  weeklyDataLines[6].includes(window.todayStr()));
check('一周状态提示词包含完整作息与睡眠时长',
  weeklyPrompt.includes(yesterday + '（周') &&
  weeklyPrompt.includes('入睡 23:00；起床 07:00；睡眠时长 8小时') &&
  weeklyPrompt.includes(twoDaysAgo + '（周') &&
  weeklyPrompt.includes('入睡 00:30；起床 08:15；睡眠时长 7小时45分'));
check('缺失记录与不完整数据如实标注',
  weeklyDataLines.some(line => line.includes(threeDaysAgo) && line.includes('：未记录')) &&
  weeklyDataLines.some(line => line.includes(window.todayStr()) && line.includes('睡眠时长 数据不完整')));
check('一周状态提示词自带完整分析指令',
  weeklyPrompt.includes('总结过去一周的作息规律、睡眠稳定性和可能存在的问题') &&
  weeklyPrompt.includes('给出具体、可执行的作息与睡眠调整建议') &&
  weeklyPrompt.includes('不得猜测或补造缺失信息'));

const stateBeforeCopy = window.localStorage.getItem('guanji_data_v1');
let copiedWeekly = '';
Object.defineProperty(window.navigator, 'clipboard', {
  configurable:true,
  value:{ writeText: async text => { copiedWeekly = text; } },
});
copyWeekButton.click();
await new Promise(resolve => setTimeout(resolve, 20));
check('点击按钮复制完整一周提示词',
  copiedWeekly === weeklyPrompt && document.getElementById('toast').textContent === '一周状态信息已复制');

let fallbackCopied = '';
Object.defineProperty(window.navigator, 'clipboard', {
  configurable:true,
  value:{ writeText: async () => { throw new Error('clipboard unavailable'); } },
});
const realExecCommand = document.execCommand;
document.execCommand = function(){
  const area = document.querySelector('textarea[readonly]');
  fallbackCopied = area ? area.value : '';
  return true;
};
copyWeekButton.click();
await new Promise(resolve => setTimeout(resolve, 20));
check('系统剪贴板失败时使用 execCommand 兜底',
  fallbackCopied === weeklyPrompt &&
  document.getElementById('toast').textContent === '一周状态信息已复制');

document.execCommand = function(){ return false; };
copyWeekButton.click();
await new Promise(resolve => setTimeout(resolve, 20));
check('复制全部失败时打开完整文本供手动复制',
  document.getElementById('text-prompt-modal').classList.contains('show') &&
  document.getElementById('text-prompt-area').value === weeklyPrompt &&
  document.getElementById('toast').textContent === '复制失败，已打开文本，请手动选择复制');
document.getElementById('text-prompt-cancel').click();
document.execCommand = realExecCommand;
check('复制一周状态信息不会改写精力记录数据',
  window.localStorage.getItem('guanji_data_v1') === stateBeforeCopy);

const copyMonthButton = document.getElementById('copy-month-energy-btn');
check('「数据与提醒」中存在复制30天状态信息按钮并位于一周按钮下方',
  !!copyMonthButton &&
  copyMonthButton.textContent.trim() === '复制30天状态信息' &&
  copyWeekButton.nextElementSibling === copyMonthButton);

const monthlyPrompt = window.buildMonthlyEnergyPrompt();
const monthlyDataLines = monthlyPrompt.split('\n').filter(line => line.startsWith('- '));
check('30天状态提示词包含最近 30 天且按日期升序',
  monthlyDataLines.length === 30 &&
  monthlyDataLines[0].includes(window.daysAgo(29)) &&
  monthlyDataLines[29].includes(window.todayStr()));
check('30天状态提示词沿用作息、睡眠时长与缺失标注',
  monthlyPrompt.includes('入睡 23:00；起床 07:00；睡眠时长 8小时') &&
  monthlyPrompt.includes(threeDaysAgo + '（周') &&
  monthlyPrompt.includes('：未记录') &&
  monthlyPrompt.includes(window.todayStr() + '（周') &&
  monthlyPrompt.includes('睡眠时长 数据不完整'));
check('30天状态提示词明确时间范围与完整分析指令',
  monthlyPrompt.includes('过去 30 天的作息与睡眠数据') &&
  monthlyPrompt.includes('总结过去 30 天的作息规律、睡眠稳定性和可能存在的问题') &&
  monthlyPrompt.includes('给出具体、可执行的作息与睡眠调整建议') &&
  monthlyPrompt.includes('不得猜测或补造缺失信息'));

let copiedMonthly = '';
Object.defineProperty(window.navigator, 'clipboard', {
  configurable:true,
  value:{ writeText: async text => { copiedMonthly = text; } },
});
copyMonthButton.click();
await new Promise(resolve => setTimeout(resolve, 20));
check('点击按钮复制完整30天提示词',
  copiedMonthly === monthlyPrompt && document.getElementById('toast').textContent === '30天状态信息已复制');

let monthlyFallbackCopied = '';
Object.defineProperty(window.navigator, 'clipboard', {
  configurable:true,
  value:{ writeText: async () => { throw new Error('clipboard unavailable'); } },
});
document.execCommand = function(){
  const area = document.querySelector('textarea[readonly]');
  monthlyFallbackCopied = area ? area.value : '';
  return true;
};
copyMonthButton.click();
await new Promise(resolve => setTimeout(resolve, 20));
check('30天状态复制沿用 execCommand 兜底',
  monthlyFallbackCopied === monthlyPrompt &&
  document.getElementById('toast').textContent === '30天状态信息已复制');

document.execCommand = function(){ return false; };
copyMonthButton.click();
await new Promise(resolve => setTimeout(resolve, 20));
check('30天状态复制失败时打开完整文本供手动复制',
  document.getElementById('text-prompt-modal').classList.contains('show') &&
  document.getElementById('text-prompt-area').value === monthlyPrompt &&
  document.getElementById('toast').textContent === '复制失败，已打开文本，请手动选择复制');
document.getElementById('text-prompt-cancel').click();
document.execCommand = realExecCommand;
check('复制30天状态信息不会改写精力记录数据',
  window.localStorage.getItem('guanji_data_v1') === stateBeforeCopy);
}

runWeeklyCopyTests().then(() => {
  console.log('\n===== 精力状态模块测试结果 =====');
  results.forEach(result => console.log(result));
  console.log('===== 结束 =====');
}).catch(err => {
  console.error(err);
  process.exitCode = 1;
});
