// 健身房Roi：入口、顶级视图、月历、出勤增删改、费用与时长口径、返回键、除零保护。
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync('www/index.html', 'utf8');
const virtualConsole = new VirtualConsole();
const runtimeErrors = [];
virtualConsole.on('jsdomError', err => runtimeErrors.push(err.message));
virtualConsole.on('error', msg => runtimeErrors.push(String(msg)));
const dom = new JSDOM(html, {
  runScripts:'outside-only', url:'http://localhost/', pretendToBeVisual:true, virtualConsole
});
const { window } = dom;
const { document } = window;
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};

// ---- 预置数据：既有键（验证不受影响）+ 本功能键 ----
const pad = n => String(n).padStart(2, '0');
const now = new Date();
const y = now.getFullYear(), mo = now.getMonth() + 1;
const D = d => y + '-' + pad(mo) + '-' + pad(d);
const todayStr = y + '-' + pad(mo) + '-' + pad(now.getDate());
// 构造 3 天本月出勤：45 / 75 / 120 分钟（用本月内一定是过去或今天的日期）
const day1 = 1, day2 = 2, day3 = Math.min(3, now.getDate());
const seedSessions = {};
seedSessions[D(day1)] = { minutes: 45 };
seedSessions[D(day2)] = { minutes: 75 };
seedSessions[D(day3)] = { minutes: 120 };
// 若今天是 1 号或 2 号，避免与前面重叠导致天数不足 3
if (now.getDate() < 3) { seedSessions[D(1)] = { minutes: 45 }; seedSessions[D(2)] = { minutes: 75 }; }
// 再补一条「上个月」的记录：用于验证向前翻阅与「不能早于最早记录月份」
const prevMonthDate = new Date(y, mo - 2, 15);
const prevKey = prevMonthDate.getFullYear() + '-' + pad(prevMonthDate.getMonth() + 1) + '-15';
seedSessions[prevKey] = { minutes: 50 };
window.localStorage.setItem('guanji_gym_v1', JSON.stringify({ sessions: seedSessions }));
window.localStorage.setItem('guanji_data_v1', JSON.stringify({
  records: { [todayStr]: { score: 66, note: '既有数据', sleepTime:'23:00', wakeTime:'07:00', updatedAt: 1 } },
  settings: { remindTime:'', lowThreshold:40 }
}));

['bazi.bundle.js', 'liuyao.bundle.js', 'notify.bundle.js', 'native.bundle.js'].forEach(file => {
  window.eval(fs.readFileSync(path.join('www', file), 'utf8'));
});
const inlineBlocks = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].filter(match => match[1].trim());
const inlineSource = inlineBlocks[inlineBlocks.length - 1][1];
window.eval(inlineSource);

const results = [];
function check(name, cond) {
  results.push((cond ? '✅' : '❌') + ' ' + name);
  if (!cond) process.exitCode = 1;
}
// 文本输入弹窗的保存是 Promise 链，需要让出事件循环再断言
const settle = () => new Promise(resolve => setTimeout(resolve, 30));
const $ = sel => document.getElementById(sel) || document.querySelector(sel);
const visible = id => !$(id).classList.contains('hidden');
const gymStore = () => JSON.parse(window.localStorage.getItem('guanji_gym_v1') || '{"sessions":{}}');
const txt = id => ($(id) ? $(id).textContent.trim() : null);
const dayCell = dateStr => document.querySelector('#gym-month-grid .energy-month-day[data-date="' + dateStr + '"]');

(async () => {
// ===== 1. 入口 =====
const entry = $('gym-entry-btn');
check('主界面右上角存在入口按钮', !!entry);
check('入口文案精确为「健身房Roi」', !!entry && entry.textContent === '健身房Roi');
check('入口复用 today-chip 胶囊样式且是按钮', !!entry && entry.classList.contains('today-chip') &&
  entry.tagName === 'BUTTON');
check('原「今天 · X月X日」日期显示已移除（home-view 内不再有 #today-chip）',
  !$('today-chip') && !document.querySelector('#home-view #today-chip'));
check('没有残留对 #today-chip 的赋值代码（避免整页白屏）',
  inlineSource.indexOf("getElementById('today-chip')") < 0 &&
  !/today-chip'\)\s*\.textContent\s*=/.test(inlineSource));

// ===== 2. 进入新页面 + 顶级视图互斥 =====
entry.click();
check('点击入口进入健身房页面', visible('gym-view') && !visible('home-view'));
check('健身房页面是独立顶级视图（未嵌套进其它 view）',
  $('gym-view').parentElement.id === 'app' || $('gym-view').parentElement.tagName === 'BODY' ||
  !$('gym-view').closest('#home-view, #energy-view, #energy-history-view, #liuyao-view, #bazi-form-view, #bazi-records-view, #bazi-info-view, #req-view, #liuyao-history-view'));
check('进入健身房时其它顶级视图全部隐藏',
  !visible('home-view') && !visible('energy-view') && !visible('energy-history-view') &&
  !visible('liuyao-view') && !visible('bazi-form-view') && !visible('bazi-records-view') &&
  !visible('bazi-info-view') && !visible('req-view') && !visible('liuyao-history-view'));

// ===== 3. 页面自上而下顺序：顶栏 → 基础数据区 → 月历区 → 结论区 =====
const gymChildren = [...$('gym-view').children];
check('页面顺序为 顶栏 → 基础数据区 → 月历区 → 结论区',
  gymChildren.length === 4 &&
  gymChildren[0].classList.contains('topbar') &&
  !!gymChildren[1].querySelector('#gym-days') &&
  !!gymChildren[2].querySelector('#gym-month-grid') &&
  !!gymChildren[3].querySelector('#gym-percost'));
check('布局固定顺序（月历在结论之前、基础数据在最前）',
  gymChildren[1].compareDocumentPosition(gymChildren[2]) & window.Node.DOCUMENT_POSITION_FOLLOWING &&
  gymChildren[2].compareDocumentPosition(gymChildren[3]) & window.Node.DOCUMENT_POSITION_FOLLOWING);

// ===== 4. 基础数据区 =====
check('年卡价格显示 2920 元', txt('gym-price') === '2920');
check('总出勤天数 = 有记录的日期数量 4（本月 3 天 + 上月 1 天）', txt('gym-days') === '4');
check('累计总时长 = 45+75+120+50 = 290 分钟 → 4小时50分钟', txt('gym-total') === '4小时50分钟');
const expiryDiff = Math.round((new Date(2027, 7, 8) - new Date(y, mo - 1, now.getDate())) / 86400000);
check('距年卡到期天数按 2027-08-08 与本地日期计算',
  txt('gym-remain') === String(expiryDiff) && !isNaN(Number(txt('gym-remain'))));

// ===== 5. 结论区口径 =====
check('单次价格 = 2920 ÷ 4 = 730.00（保留 2 位）', txt('gym-percost') === '730.00');
check('每次平均时长 = 290 ÷ 4 = 72.5 → 73 分钟 = 1小时13分钟', txt('gym-peravg') === '1小时13分钟');

// ===== 6. 月历 =====
check('月历默认展示当前月', txt('gym-month') === y + '年' + mo + '月');
const weekdayHeaders = [...document.querySelectorAll('#gym-view .energy-history-weekday')].map(e => e.textContent);
check('月历周一为每周首日（表头 一…日）', weekdayHeaders.join('') === '一二三四五六日');
const lead = (new Date(y, mo - 1, 1).getDay() + 6) % 7;
const cells = [...document.querySelectorAll('#gym-month-grid .energy-month-day')];
const blankCount = document.querySelectorAll('#gym-month-grid .energy-month-blank').length;
check('月历按 7 列网格排布且每行 7 格、首日偏移正确',
  cells.length === new Date(y, mo, 0).getDate() &&
  (cells.length + blankCount) % 7 === 0 &&
  (!cells[0] || cells[0].dataset.date === D(1)));
const todayCell = document.querySelector('#gym-month-grid .energy-month-day[data-date="' + todayStr + '"]');
check('今天高亮', !!todayCell && todayCell.classList.contains('today'));
const futureCell = cells.find(c => c.dataset.date > todayStr);
check('未来日期灰显且不可操作',
  !!futureCell && futureCell.classList.contains('future') &&
  (futureCell.click(), !$('gym-day-modal').classList.contains('show')));
const recCell = document.querySelector('#gym-month-grid .energy-month-day[data-date="' + D(day1) + '"]');
check('出勤日有明确标记（圆点 + 时长，且能看出有记录）',
  !!recCell && !!recCell.querySelector('.gym-day-dot') &&
  recCell.textContent.includes('45分钟') && recCell.classList.contains('recorded'));
// 必须挑「非未来 且 无记录」的日期，否则点击会被未来日期拦截（连锁失败）
const emptyCell = cells.find(c => !c.classList.contains('recorded') && !c.classList.contains('future'));
check('无出勤日显示占位标记', !!emptyCell && emptyCell.textContent.includes('—'));
check('当前月时「下一月」不可用', $('gym-next').disabled === true);
// 口径与精力月历一致：不能进入未来月，也不能早于「最早有记录的月份」（预置里上个月有一条）
$('gym-prev').click();
check('可以向前翻阅到上个月',
  txt('gym-month') === prevMonthDate.getFullYear() + '年' + (prevMonthDate.getMonth() + 1) + '月');
check('非当前月的「下一月」可用', $('gym-next').disabled === false);
$('gym-prev').click();
check('不能翻阅到最早记录月份之前（已被拦截）',
  txt('gym-month') === prevMonthDate.getFullYear() + '年' + (prevMonthDate.getMonth() + 1) + '月');
$('gym-next').click();
$('gym-next').click();
check('可以切回当前月', txt('gym-month') === y + '年' + mo + '月');
check('回到当前月后「下一月」再次禁用', $('gym-next').disabled === true);

// ===== 7. 日详情弹窗：记录 / 修改 / 删除（走自绘弹窗，不用原生 prompt）=====
const target = emptyCell.dataset.date;
emptyCell.click();
check('点击日期打开该日详情弹窗', $('gym-day-modal').classList.contains('show'));
check('未记录日期的详情显示「未记录」', txt('gym-day-body').includes('未记录'));
window.handleBack();
check('返回键只关闭日详情弹窗、页面不动',
  !$('gym-day-modal').classList.contains('show') && visible('gym-view'));

emptyCell.click();
$('gym-day-edit').click();
check('记录时长走项目自绘弹窗（不是原生 prompt）', $('text-prompt-modal').classList.contains('show'));
$('text-prompt-input').value = '90';
$('text-prompt-ok').click();
await settle();
check('新增出勤记录后弹窗关闭且落盘',
  !$('text-prompt-modal').classList.contains('show') && gymStore().sessions[target] &&
  gymStore().sessions[target].minutes === 90);
check('新增后总出勤天数与月历同步更新',
  txt('gym-days') === '5' &&
  (document.querySelector('#gym-month-grid .energy-month-day[data-date="' + target + '"]') || {}).textContent.includes('1小时30分钟'));

// 同一天再记一次 → 覆盖，不产生第二条
dayCell(D(day1)).click();
$('gym-day-edit').click();
$('text-prompt-input').value = '30';
$('text-prompt-ok').click();
await settle();
check('同一天只允许一条记录（重复记录为覆盖）',
  Object.keys(gymStore().sessions).filter(k => k === D(day1)).length === 1 &&
  gymStore().sessions[D(day1)].minutes === 30 && txt('gym-days') === '5');
// 非法时长被拒绝
const beforeInvalid = JSON.stringify(gymStore());
dayCell(D(day1)).click();
$('gym-day-edit').click();
$('text-prompt-input').value = '1.5';
$('text-prompt-ok').click();
await settle();
check('非整数时长被拒绝且不写回', JSON.stringify(gymStore()) === beforeInvalid && txt('toast') === '请输入大于 0 的整数分钟');
// 返回键逐级消费：先关日详情弹窗（页面不动），再离开页面（实测行为，见下方断言）
window.handleBack();
check('日详情弹窗打开时返回键只关弹窗、页面不动',
  !$('gym-day-modal').classList.contains('show') && visible('gym-view'));
window.handleBack();
check('再按一次返回才离开健身房页面', visible('home-view') && !visible('gym-view'));
entry.click();
// 行为验证：即使当前月无可点日期，也能确认「日详情弹窗打开时返回键只关弹窗、页面不动」
entry.click();
const anyCell = document.querySelector('#gym-month-grid .energy-month-day:not(.future)');
if (anyCell) {
  anyCell.click();
  check('日详情弹窗可打开', $('gym-day-modal').classList.contains('show'));
  window.handleBack();
  check('日详情弹窗打开时返回键只关弹窗、页面不动（行为）',
    !$('gym-day-modal').classList.contains('show') && visible('gym-view'));
  check('此后仍需再按一次返回才离开页面（弹窗各占一层）',
    (window.handleBack(), visible('home-view') && !visible('gym-view')));
  entry.click();
}

// 删除
dayCell(target).click();
$('gym-day-del').click();
check('可以删除该日出勤并落盘', !gymStore().sessions[target] && txt('gym-days') === '4' &&
  !$('gym-day-modal').classList.contains('show'));

// ===== 8. 「今天去了」快捷按钮 =====
const todayHasRecord = !!gymStore().sessions[todayStr];
check('「今天去了」按钮存在', !!$('gym-today-btn'));
if (!todayHasRecord) {
  check('今天未记录时按钮文案为「今天去了」', txt('gym-today-btn') === '今天去了');
  $('gym-today-btn').click();
  check('快捷按钮打开今天详情', $('gym-day-modal').classList.contains('show') &&
    txt('gym-day-title').indexOf(todayStr) === 0);
  $('gym-day-edit').click();
  $('text-prompt-ok').click();   // 用默认时长直接保存
  await settle();
  check('快捷记录默认 60 分钟并落盘', gymStore().sessions[todayStr] &&
    gymStore().sessions[todayStr].minutes === 60);
}
check('今天已记录时按钮有明确反馈',
  txt('gym-today-btn').startsWith('今天已记录') && $('gym-today-btn').classList.contains('done'));

// ===== 9. 时长格式与除零保护 =====
const fmt = m => window.eval('formatMinutesCN(' + m + ')');
check('时长格式：不满 1 小时只显示分钟', fmt(45) === '45分钟' && fmt(1) === '1分钟');
check('时长格式：满 1 小时显示 x小时xx分钟', fmt(75) === '1小时15分钟' && fmt(61) === '1小时1分钟');
check('时长格式：整点显示 x小时', fmt(120) === '2小时' && fmt(60) === '1小时');
// 删空全部记录 → 显示「—」
Object.keys(gymStore().sessions).forEach(d => window.eval('gymDeleteDay("' + d + '")'));
window.eval('renderGymView()');
check('出勤为 0 时单次价格与平均时长显示「—」',
  txt('gym-percost') === '—' && txt('gym-peravg') === '—');
check('出勤为 0 时不出现 NaN / Infinity',
  !/NaN|Infinity/.test($('gym-view').textContent) && txt('gym-days') === '0' &&
  txt('gym-total') === '0分钟');
check('出勤为 0 时「今天去了」回到初始文案', txt('gym-today-btn') === '今天去了');

// ===== 10. 落盘与旧数据兼容 =====
check('新键 guanji_gym_v1 存在且为 JSON', !!window.localStorage.getItem('guanji_gym_v1'));
window.localStorage.setItem('guanji_gym_v1', JSON.stringify({ sessions: {} }));
window.eval('gymState = gymLoad(); renderGymView();');
check('键存在但 sessions 为空时不抛错、显示「—」', txt('gym-percost') === '—' && txt('gym-days') === '0');
window.localStorage.setItem('guanji_gym_v1', '{ 坏 JSON');
window.eval('gymState = gymLoad(); renderGymView();');
check('脏数据（非法 JSON）不抛错，降级为空记录', txt('gym-days') === '0' && txt('gym-percost') === '—');
window.localStorage.setItem('guanji_gym_v1', JSON.stringify({ sessions: { [D(day1)]: { minutes: 'x' }, [D(day2)]: {} } }));
window.eval('gymState = gymLoad(); renderGymView();');
check('记录缺字段 / 非法时长被跳过而不是崩掉', txt('gym-days') === '0');
window.localStorage.setItem('guanji_gym_v1', JSON.stringify({ sessions: seedSessions }));
window.eval('gymState = gymLoad(); renderGymView();');
check('既有 localStorage 键未受影响（精力数据仍可读）',
  !!window.localStorage.getItem('guanji_data_v1') &&
  JSON.parse(window.localStorage.getItem('guanji_data_v1')).records[todayStr].score === 66);
check('既有键名与结构未被改动',
  JSON.parse(window.localStorage.getItem('guanji_data_v1')).records[todayStr].note === '既有数据');

// ===== 11. 返回键与返回按钮 =====
$('gym-back').click();
check('左上角返回按钮回到主界面', visible('home-view') && !visible('gym-view'));
entry.click();
window.handleBack();
check('返回键从健身房页面回到主界面', visible('home-view') && !visible('gym-view'));
check('主界面三个既有区块零变化（干支卡片 / 精力卡片 / 模块网格）',
  !!$('ganzhi-today-card') && !!$('hero') && !!$('module-grid') &&
  document.querySelectorAll('#module-grid .mod-card').length === 3 &&
  document.querySelectorAll('#ganzhi-today-card').length === 1);
check('健身房未进入模块数组（不生成 .mod-card）',
  ![...document.querySelectorAll('.mod-card')].some(c => c.textContent.includes('健身房')));
check('页面运行无未捕获异常', runtimeErrors.length === 0);

})().then(() => {
console.log('\n===== 健身房Roi 测试结果 =====');
results.forEach(r => console.log(r));
console.log('===== 结束 =====');
process.exit(process.exitCode || 0);
});
