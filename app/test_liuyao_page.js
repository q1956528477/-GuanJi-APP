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

  // ===== 卦名起卦 · 预设变卦（UI） =====
  document.getElementById('ly-recast').click();
  selectMethod('卦名起卦');
  const benSelect = document.getElementById('ly-hex-select');
  const variantSelect = document.getElementById('ly-variant-select');
  const variantHint = document.getElementById('ly-variant-hint');
  check('变卦下拉存在且默认选中「不变（静卦）」',
    !!variantSelect && variantSelect.options[0].value === '' &&
    variantSelect.options[0].textContent === '不变（静卦）' && variantSelect.value === '');
  // 说明：候选只在用户真的改动本卦（触发 change）时重算；程序化赋值不触发事件。
  // 上一条用例把本卦置成水雷屯且未派发 change，所以这里先切回乾为天并派发 change。
  benSelect.value = '111111';
  benSelect.dispatchEvent(new window.Event('change'));
  const variantOptions = [...variantSelect.options];
  check('变卦下拉列出全部 64 卦且含本卦自身（无任何子集过滤）',
    variantOptions.length === 65 &&
    variantOptions.slice(1).every(o => /^[01]{6}$/.test(o.value)) &&
    new Set(variantOptions.slice(1).map(o => o.value)).size === 64 &&
    variantOptions.slice(1).some(o => o.value === benSelect.value));
  check('默认静卦提示写明无动爻', variantHint.textContent.includes('不变（静卦）') &&
    variantHint.textContent.includes('无动爻'));

  variantSelect.value = '110111';
  variantSelect.dispatchEvent(new window.Event('change'));
  check('选中变卦后提示出准确的动爻数量与位置',
    variantHint.textContent.includes('乾为天') && variantHint.textContent.includes('天泽履') &&
    variantHint.textContent.includes('动爻 1 个') && variantHint.textContent.includes('三爻'));

  document.getElementById('ly-cast-btn').click();
  check('预设变卦起卦后结果页左侧本卦、右侧变卦',
    resultTitles().join(',') === '乾为天,天泽履');
  const presetPrompt = document.querySelector('#ly-result .rebu-prompt-text');
  check('预设变卦解卦提示词含本卦名、变卦名与动爻位置',
    !!presetPrompt && presetPrompt.textContent.includes('本卦：乾为天') &&
    presetPrompt.textContent.includes('变卦：天泽履') &&
    presetPrompt.textContent.includes('动爻：三爻'));
  check('预设变卦结果已按预设变卦写入起卦记录', history()[0].fullResult.zhi.meta.image === '天泽履');
  document.getElementById('ly-question').value = '';

  document.getElementById('ly-recast').click();
  selectMethod('卦名起卦');
  const benSelect2 = document.getElementById('ly-hex-select');
  const variantSelect2 = document.getElementById('ly-variant-select');
  benSelect2.value = '111111';
  benSelect2.dispatchEvent(new window.Event('change'));
  variantSelect2.value = '011111';
  variantSelect2.dispatchEvent(new window.Event('change'));
  check('初爻动的组合提示为初爻', variantHint.textContent.includes('动爻 1 个') &&
    variantHint.textContent.includes('初爻'));
  // 旧实现会在换本卦时把变卦重置为「不变」；按术数口径 64×64 全部合法，现在必须**保留**选择。
  benSelect2.value = '000000';
  benSelect2.dispatchEvent(new window.Event('change'));
  check('切换本卦后候选列表随之更新（含新本卦自身）',
    [...variantSelect2.options].length === 65 &&
    [...variantSelect2.options].slice(1).some(o => o.value === '000000'));
  check('新候选列表仍为六位唯一的 64 个变卦',
    [...variantSelect2.options].slice(1).every(o => /^[01]{6}$/.test(o.value)) &&
    new Set([...variantSelect2.options].slice(1).map(o => o.value)).size === 64);

  document.getElementById('ly-recast').click();
  selectMethod('卦名起卦');
  const benSelect3 = document.getElementById('ly-hex-select');
  const variantSelect3 = document.getElementById('ly-variant-select');

  // (A) 变卦 = 本卦：语义为静卦，UI 明确呈现、不报错
  benSelect3.value = '111111';
  benSelect3.dispatchEvent(new window.Event('change'));
  const selfOption = [...variantSelect3.options].find(o => o.value === '111111');
  check('候选列表包含本卦自身（自身即静卦，合法）', !!selfOption);
  variantSelect3.value = '111111';
  variantSelect3.dispatchEvent(new window.Event('change'));
  check('选本卦自身时提示明确为「与本卦相同，即无动爻的静卦」',
    variantHint.textContent.includes('与本卦相同') && variantHint.textContent.includes('静卦'));
  const beforeSame = history().length;
  document.getElementById('ly-cast-btn').click();
  check('变卦=本卦 起卦无报错提示、落地为静卦（无变卦列）',
    document.getElementById('toast').textContent !== '变卦不能与本卦相同，静卦请选择「不变」' &&
    history().length === beforeSame + 1 && history()[0].fullResult.zhi === null &&
    resultTitles().join(',') === '乾为天');
  document.getElementById('ly-question').value = '';

  // (B) 切换本卦必须保留变卦选择，只刷新动爻提示
  document.getElementById('ly-recast').click();
  selectMethod('卦名起卦');
  const benSelect4 = document.getElementById('ly-hex-select');
  const variantSelect4 = document.getElementById('ly-variant-select');
  benSelect4.value = '111111';
  benSelect4.dispatchEvent(new window.Event('change'));
  variantSelect4.value = '011111';
  variantSelect4.dispatchEvent(new window.Event('change'));
  check('乾为天→天风姤 提示初爻动', variantHint.textContent.includes('动爻 1 个') &&
    variantHint.textContent.includes('初爻'));
  benSelect4.value = '000000';
  benSelect4.dispatchEvent(new window.Event('change'));
  check('切换本卦后变卦选择被保留（64×64 全部合法）',
    variantSelect4.value === '011111' && variantHint.textContent.includes('天风姤'));
  check('切换本卦后动爻提示按新组合刷新（坤为地→天风姤 五爻动）',
    variantHint.textContent.includes('坤为地') && variantHint.textContent.includes('动爻 5 个') &&
    variantHint.textContent.includes('二爻') && variantHint.textContent.includes('上爻') &&
    !variantHint.textContent.includes('初爻'));
  document.getElementById('ly-cast-btn').click();
  check('保留的变卦参与起卦：坤为地→天风姤（五爻动）',
    resultTitles().join(',') === '坤为地,天风姤' &&
    document.querySelectorAll('#ly-result .gua-td-ben .move').length === 5);
  document.getElementById('ly-question').value = '';

  // (B2) 跨阴阳宫且单动爻：坤为地 → 地雷复（初爻动）
  document.getElementById('ly-recast').click();
  selectMethod('卦名起卦');
  const benSelectB2 = document.getElementById('ly-hex-select');
  const variantSelectB2 = document.getElementById('ly-variant-select');
  benSelectB2.value = '000000';
  benSelectB2.dispatchEvent(new window.Event('change'));
  variantSelectB2.value = '100000';
  variantSelectB2.dispatchEvent(new window.Event('change'));
  check('坤为地→地雷复 提示仅初爻动（跨阴阳宫组合可用）',
    variantHint.textContent.includes('坤为地') && variantHint.textContent.includes('地雷复') &&
    variantHint.textContent.includes('动爻 1 个') && variantHint.textContent.includes('初爻'));
  document.getElementById('ly-cast-btn').click();
  check('坤为地→地雷复 结果页左右正确',
    resultTitles().join(',') === '坤为地,地雷复');
  document.getElementById('ly-question').value = '';

  // (C) 乾为天 → 坤为地：六爻全动
  document.getElementById('ly-recast').click();
  selectMethod('卦名起卦');
  const benSelect5 = document.getElementById('ly-hex-select');
  const variantSelect5 = document.getElementById('ly-variant-select');
  benSelect5.value = '111111';
  benSelect5.dispatchEvent(new window.Event('change'));
  variantSelect5.value = '000000';
  variantSelect5.dispatchEvent(new window.Event('change'));
  check('六爻全动的提示列出全部六个爻位',
    variantHint.textContent.includes('动爻 6 个') &&
    ['初爻','二爻','三爻','四爻','五爻','上爻'].every(p => variantHint.textContent.includes(p)));
  document.getElementById('ly-cast-btn').click();
  check('乾为天→坤为地 结果页左右为乾为天、坤为地', resultTitles().join(',') === '乾为天,坤为地');
  check('乾为天→坤为地 本卦侧六个爻位全部标「动」',
    document.querySelectorAll('#ly-result .gua-td-ben .move').length === 6);
  check('乾为天→坤为地 变卦侧不标动爻',
    document.querySelectorAll('#ly-result .gua-td-zhi .move').length === 0);
  check('乾为天→坤为地 本卦变卦各自六爻逐行对齐',
    document.querySelectorAll('#ly-result .rebu-gua-table tbody tr').length === 6 &&
    document.querySelectorAll('#ly-result .gua-td-ben').length === 6 &&
    document.querySelectorAll('#ly-result .gua-td-zhi').length === 6);
  const allMovingPrompt = document.querySelector('#ly-result .rebu-prompt-text');
  check('乾为天→坤为地 解卦提示词列出六个动爻与两个卦名',
    !!allMovingPrompt && allMovingPrompt.textContent.includes('动爻：初爻、二爻、三爻、四爻、五爻、上爻') &&
    allMovingPrompt.textContent.includes('本卦：乾为天') && allMovingPrompt.textContent.includes('变卦：坤为地'));
  document.getElementById('ly-question').value = '';

  // (D) 静卦零回归：不选变卦时结果页只有单列
  document.getElementById('ly-recast').click();
  selectMethod('卦名起卦');
  const benSelect6 = document.getElementById('ly-hex-select');
  const variantSelect6 = document.getElementById('ly-variant-select');
  benSelect6.value = '100010';
  benSelect6.dispatchEvent(new window.Event('change'));
  // 候选含本卦自身，换本卦后上一轮的变卦会被保留 —— 这里显式复位成「不变（静卦）」
  variantSelect6.value = '';
  variantSelect6.dispatchEvent(new window.Event('change'));
  check('复位为「不变（静卦）」后提示写明无动爻',
    variantHint.textContent.includes('不变（静卦）') && variantHint.textContent.includes('无动爻'));
  document.getElementById('ly-cast-btn').click();
  check('默认静卦：结果页只有本卦一列（无变卦列）',
    resultTitles().join(',') === '水雷屯' &&
    document.querySelectorAll('#ly-result .rebu-gua-table th').length === 1 &&
    document.querySelectorAll('#ly-result .gua-td-zhi').length === 0);
  document.getElementById('ly-question').value = '';

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
  const legacyFullResult = JSON.parse(JSON.stringify(movingResult));
  legacyFullResult.ben.meta.classical = {
    guaci: '旧版卦辞哨兵',
    lines: legacyFullResult.ben.meta.classical.lines.map(line => ({
      title: line.title,
      text: line.text,
    })),
  };
  const historyRecord = {
    id: 9001,
    question: movingResult.question,
    method: movingResult.method,
    date: movingResult.astrology.solarDate,
    timestamp: '2026/9/16 10:00:00',
    benGua: movingResult.ben.meta.image,
    zhiGua: movingResult.zhi.meta.image,
    fullResult: legacyFullResult,
  };
  window.localStorage.setItem('liuyao_history', JSON.stringify([historyRecord]));
  const historyBeforeOpen = window.localStorage.getItem('liuyao_history');
  window.showLiuyaoHistory();
  document.querySelector('#ly-history-list .ly-history-item').click();
  const historyPromptText = document.getElementById('ly-prompt-text').textContent;
  const historyResultText = document.getElementById('ly-result').textContent;
  check('旧历史记录动态补全彖传、大象传与小象传',
    historyResultText.includes('万物资始，乃统天') &&
    historyResultText.includes('天行健，君子以自强不息。') &&
    historyResultText.includes('小象传阳在下也。') &&
    !historyResultText.includes('旧版卦辞哨兵'));
  check('历史记录动态补全不改写持久化数据且不重复建记录',
    window.localStorage.getItem('liuyao_history') === historyBeforeOpen &&
    history().length === 1 &&
    history()[0].id === 9001 &&
    history()[0].question === movingResult.question);
  check('历史记录进入的结果页也有同一段解卦提示词', historyPromptText === promptText);

  const malformedHistory = {
    id: 9002,
    question: '缺少卦象数据的旧记录',
    timestamp: '2026/9/16 10:01:00',
    benGua: '未知卦',
    zhiGua: '',
  };
  window.localStorage.setItem('liuyao_history', JSON.stringify([malformedHistory]));
  const malformedBeforeOpen = window.localStorage.getItem('liuyao_history');
  window.showLiuyaoHistory();
  document.querySelector('#ly-history-list .ly-history-item').click();
  check('缺少卦象数据的历史记录给出明确兜底提示',
    document.getElementById('toast').textContent === '这条历史记录缺少完整卦象数据，无法展示');
  check('异常历史记录不会触发写入或重复记录',
    window.localStorage.getItem('liuyao_history') === malformedBeforeOpen &&
    history().length === 1 && history()[0].id === 9002);
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
