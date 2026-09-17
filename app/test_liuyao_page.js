// 六爻起卦页面回归测试：六种入口、输入边界、状态隔离与记录保存。
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync('www/index.html', 'utf8');
const runtimeErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', err => runtimeErrors.push(err.message));
const dom = new JSDOM(html, {
  runScripts:'outside-only',
  url:'http://localhost/',
  pretendToBeVisual:true,
  virtualConsole,
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
function visible(id) {
  return !document.getElementById(id).classList.contains('hidden');
}
function history() {
  return JSON.parse(window.localStorage.getItem('liuyao_history') || '[]');
}
function method(name) {
  return [...document.querySelectorAll('.ly-method')].find(el => el.textContent === name);
}
function selectMethod(name) {
  method(name).click();
}
function resultTitles() {
  return [...document.querySelectorAll('#ly-result .rebu-gua-table th')].map(el => el.textContent);
}
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  window.openLiuyao();
  const methodNames = [...document.querySelectorAll('.ly-method')].map(el => el.textContent);
  check('六种起卦入口完整', methodNames.join(',') === '在线摇卦,时间起卦,数字起卦,卦名起卦,手动指定,自动起卦');

  selectMethod('卦名起卦');
  const options = [...document.querySelectorAll('#ly-hex-select option')];
  check('卦名下拉共 64 项', options.length === 64);
  check('卦名 option 全部使用唯一 bits', options.every(o => /^[01]{6}$/.test(o.value)) &&
    new Set(options.map(o => o.value)).size === 64);
  document.getElementById('ly-hex-select').selectedIndex = 63;
  document.getElementById('ly-cast-btn').click();
  check('卦名起卦正确生成所选火水未济', resultTitles().join(',') === '火水未济');
  document.getElementById('ly-recast').click();
  selectMethod('卦名起卦');
  document.getElementById('ly-hex-select').value = '100010';
  document.getElementById('ly-cast-btn').click();
  check('卦名起卦上下卦未颠倒', resultTitles().join(',') === '水雷屯');

  document.getElementById('ly-recast').click();
  selectMethod('数字起卦');
  const beforeInvalid = history().length;
  document.getElementById('ly-num1').value = '-1';
  document.getElementById('ly-num2').value = '2';
  document.getElementById('ly-num3').value = '3';
  document.getElementById('ly-cast-btn').click();
  check('负数数字起卦被拦截', history().length === beforeInvalid && document.getElementById('toast').textContent === '请输入三个非负整数');
  document.getElementById('ly-num1').value = '1.5';
  document.getElementById('ly-cast-btn').click();
  check('小数数字起卦被拦截', history().length === beforeInvalid && document.getElementById('toast').textContent === '请输入三个非负整数');
  document.getElementById('ly-num1').value = '';
  document.getElementById('ly-cast-btn').click();
  check('空数字起卦被拦截', history().length === beforeInvalid && document.getElementById('toast').textContent === '请填写三个数字');
  document.getElementById('ly-num1').value = '1';
  document.getElementById('ly-cast-btn').click();
  check('合法数字 1/2/3 生成天泽履', resultTitles()[0] === '天泽履' && history().length === beforeInvalid + 1);

  document.getElementById('ly-recast').click();
  selectMethod('时间起卦');
  document.getElementById('ly-time').value = '2000-01-01T00:00';
  selectMethod('数字起卦');
  document.getElementById('ly-num1').value = '1';
  document.getElementById('ly-num2').value = '2';
  document.getElementById('ly-num3').value = '3';
  document.getElementById('ly-cast-btn').click();
  const dateText = [...document.querySelectorAll('#ly-result .rebu-info-table tr')]
    .find(row => row.textContent.includes('日期')).textContent;
  check('切换方式后隐藏时间不会串入数字起卦', !dateText.includes('2000年') && dateText.includes(String(new Date().getFullYear())));

  document.getElementById('ly-recast').click();
  selectMethod('手动指定');
  document.getElementById('ly-cast-btn').click();
  check('手动指定默认六爻生成乾为天', resultTitles().join(',') === '乾为天');
  document.getElementById('ly-recast').click();
  const manualRows = [...document.querySelectorAll('#ly-manual .ly-manual-row')];
  manualRows[manualRows.length - 1].querySelectorAll('button')[2].click();
  document.getElementById('ly-cast-btn').click();
  check('手动指定初爻位于索引 0 并正确识别动爻', history()[0].fullResult.ben.moving.join(',') === '0');

  document.getElementById('ly-recast').click();
  selectMethod('自动起卦');
  document.getElementById('ly-cast-btn').click();
  check('自动起卦生成六个纳甲爻', document.querySelectorAll('#ly-result .rebu-gua-table tbody tr').length === 6);

  document.getElementById('ly-recast').click();
  selectMethod('时间起卦');
  document.getElementById('ly-time').value = '2026-09-10T10:00';
  document.getElementById('ly-cast-btn').click();
  check('时间起卦正常生成泽地萃', resultTitles()[0] === '泽地萃');

  window.localStorage.setItem('liuyao_history', '[]');
  const tossSequence = [0.1,0.1,0.1, 0.1,0.1,0.9, 0.1,0.9,0.9, 0.9,0.9,0.9, 0.1,0.1,0.9, 0.1,0.9,0.9];
  window.Math.random = () => tossSequence.shift();
  document.getElementById('ly-recast').click();
  selectMethod('在线摇卦');
  document.getElementById('ly-time').value = '2000-01-01T00:00';
  document.getElementById('ly-coin-start').click();
  for (let i = 0; i < 6; i++) {
    document.getElementById('ly-coin1').click();
    document.getElementById('ly-coin1').click();
  }
  window.showView('home');
  await wait(900);
  check('离开起卦页会取消第六爻延时保存', history().length === 0 && visible('home-view') && !visible('liuyao-result-view'));

  window.openLiuyao();
  const normalSequence = [0.1,0.1,0.1, 0.1,0.1,0.9, 0.1,0.9,0.9, 0.9,0.9,0.9, 0.1,0.1,0.9, 0.1,0.9,0.9];
  window.Math.random = () => normalSequence.shift();
  selectMethod('在线摇卦');
  document.getElementById('ly-coin-start').click();
  for (let i = 0; i < 6; i++) {
    document.getElementById('ly-coin1').click();
    document.getElementById('ly-coin1').click();
  }
  await wait(900);
  check('在线摇卦六爻顺序与本变卦正确', document.querySelectorAll('#ly-tossed-lines .ly-tossed-line').length === 6 &&
    resultTitles().join(',') === '泽水困,水泽节');
  check('在线摇卦老阴文案使用三枚钱口径',
    document.querySelector('#ly-tossed-lines .ly-tossed-line').textContent.includes('三个背'));
  check('第六爻只保存一次记录', history().length === 1);

  document.getElementById('ly-recast').click();
  const restartSequence = [0.1,0.1,0.1, 0.1,0.1,0.9, 0.1,0.9,0.9, 0.9,0.9,0.9, 0.1,0.1,0.9, 0.1,0.9,0.9];
  window.Math.random = () => restartSequence.shift();
  selectMethod('在线摇卦');
  document.getElementById('ly-coin-start').click();
  for (let i = 0; i < 6; i++) {
    document.getElementById('ly-coin1').click();
    document.getElementById('ly-coin1').click();
  }
  document.getElementById('ly-coin-start').click();
  await wait(900);
  check('第六爻后重新开始不会保存旧结果', history().length === 1);

  // ===== 解卦提示词：纯文本描述 + 一键复制 =====
  const promptDate = '2026-09-16T10:00:00';
  const movingResult = window.LiuYao.cast({
    method:'manual',
    lines:['old_yang','young_yang','young_yang','young_yang','young_yang','young_yang'],
    date:promptDate,
    question:'这次合作能不能成',
  });
  window.renderLiuyaoResult(movingResult);
  const promptCard = document.getElementById('ly-prompt-card');
  const promptText = document.getElementById('ly-prompt-text').textContent;
  check('结果页出现解卦提示词卡片', !!promptCard && promptCard.querySelector('.rebu-prompt-title').textContent === '📋 解卦提示词');
  check('提示词包含本卦与变卦卦名', promptText.includes('本卦：乾为天') && promptText.includes('变卦：天风姤'));
  check('提示词包含动爻位置', promptText.includes('动爻：初爻'));
  check('提示词包含所问事项', promptText.includes('所问事项：这次合作能不能成'));
  check('提示词包含本卦六爻自上而下明细',
    promptText.includes('本卦六爻（自上而下）：') &&
    promptText.indexOf('上爻：') < promptText.indexOf('初爻：') &&
    ['上爻','五爻','四爻','三爻','二爻','初爻'].every(p => promptText.indexOf('\n' + p + '：') >= 0));

  const jieshiEl = document.querySelector('#ly-result .rebu-jieshi-section');
  const containerEl = document.querySelector('#ly-result .rebu-container');
  check('解卦提示词卡片固定在古文区之后（结果页最下方）',
    !!jieshiEl && !!containerEl &&
    !!(jieshiEl.compareDocumentPosition(promptCard) & window.Node.DOCUMENT_POSITION_FOLLOWING) &&
    containerEl.lastElementChild === promptCard);

  // 复制内容与页面展示必须同源
  function stubClipboard(writeText) {
    try {
      Object.defineProperty(window.navigator, 'clipboard', { value:{writeText}, configurable:true, writable:true });
    } catch (e) {
      window.navigator.clipboard = {writeText};
    }
    return window.navigator.clipboard && window.navigator.clipboard.writeText === writeText;
  }

  let copiedText = null;
  check('可注入剪贴板实现用于测试', stubClipboard(text => { copiedText = text; return Promise.resolve(); }));
  document.getElementById('ly-prompt-copy').click();
  await wait(20);
  check('复制出来的文本与页面展示完全一致', copiedText === promptText);
  check('复制成功提示文案正确', document.getElementById('toast').textContent === '已复制解卦提示词');

  // clipboard 不可用时回退 execCommand
  let execCopied = null;
  const textareasBefore = document.querySelectorAll('textarea').length;
  stubClipboard(() => Promise.reject(new Error('clipboard blocked')));
  document.execCommand = function(cmd) {
    if (cmd !== 'copy') return false;
    const all = document.querySelectorAll('textarea');
    const ta = all[all.length - 1];
    execCopied = ta ? ta.value : null;
    return true;
  };
  document.getElementById('ly-prompt-copy').click();
  await wait(20);
  check('clipboard 失败时回退 execCommand 并复制同一文本', execCopied === promptText);
  check('降级复制成功同样提示已复制', document.getElementById('toast').textContent === '已复制解卦提示词');
  check('降级复制的临时输入框已清理', document.querySelectorAll('textarea').length === textareasBefore);

  // 两种方式都失败时给出长按引导
  stubClipboard(() => Promise.reject(new Error('clipboard blocked')));
  document.execCommand = function() { return false; };
  document.getElementById('ly-prompt-copy').click();
  await wait(20);
  check('复制全部失败时提示长按手动复制',
    document.getElementById('toast').textContent === '复制失败，请长按上方文字手动复制');

  // 静卦同样可用
  const staticResult = window.LiuYao.cast({method:'name', bits:'111111', date:promptDate});
  window.renderLiuyaoResult(staticResult);
  const staticText = document.getElementById('ly-prompt-text').textContent;
  check('静卦提示词写明无变卦与无动爻',
    staticText.includes('变卦：无变卦（静卦）') && staticText.includes('动爻：无动爻') &&
    !staticText.includes('变卦六爻'));
  check('静卦仍有复制按钮', !!document.getElementById('ly-prompt-copy'));

  // 历史记录点进去的结果页复用同一套渲染逻辑
  const historyRecord = {
    id: 9001,
    question: movingResult.question,
    method: movingResult.method,
    date: movingResult.astrology.solarDate,
    timestamp: '2026/9/16 10:00:00',
    benGua: movingResult.ben.meta.image,
    zhiGua: movingResult.zhi.meta.image,
    fullResult: JSON.parse(JSON.stringify(movingResult)),
  };
  window.localStorage.setItem('liuyao_history', JSON.stringify([historyRecord]));
  window.showLiuyaoHistory();
  document.querySelector('#ly-history-list .ly-history-item').click();
  const historyPromptText = document.getElementById('ly-prompt-text').textContent;
  check('历史记录进入的结果页也有同一段解卦提示词', historyPromptText === promptText);
  window.localStorage.setItem('liuyao_history', '[]');

  check('页面运行无未捕获异常', runtimeErrors.length === 0);

  console.log('\n===== 六爻页面测试结果 =====');
  results.forEach(result => console.log(result));
  console.log('===== 结束 =====');
  window.close();
})().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
