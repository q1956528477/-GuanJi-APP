// 六爻结果页古文展示回归测试：卦辞 / 彖传 / 大象传 / 爻辞 / 小象传。
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync('www/index.html', 'utf8');
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', err => console.error('jsdomError:', err.message));
const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  url: 'http://localhost/',
  pretendToBeVisual: true,
  virtualConsole,
});
const { window } = dom;
const { document } = window;
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};

['bazi.bundle.js', 'liuyao.bundle.js', 'notify.bundle.js', 'native.bundle.js'].forEach(file => {
  window.eval(fs.readFileSync(path.join('www', file), 'utf8'));
});
const inlineBlocks = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
  .filter(match => match[1].trim());
window.eval(inlineBlocks[inlineBlocks.length - 1][1]);

const results = [];
function check(name, cond) {
  results.push((cond ? '✅' : '❌') + ' ' + name);
  if (!cond) process.exitCode = 1;
}

const fixedDate = '2026-09-16T10:00:00';
const methods = {
  coin: { method:'coin', lines:['young_yang','young_yang','young_yang','young_yang','young_yang','young_yang'] },
  time: { method:'time' },
  number: { method:'number', numbers:[1,2,3] },
  name: { method:'name', bits:'111111' },
  manual: { method:'manual', lines:['young_yang','young_yang','young_yang','young_yang','young_yang','young_yang'] },
  random: { method:'random' },
};

for (const [name, opts] of Object.entries(methods)) {
  const result = window.LiuYao.cast({ ...opts, date:fixedDate, question:'测试' });
  window.renderLiuyaoResult(result);
  const text = document.getElementById('ly-result').textContent;
  // 「不泄漏现代解读」的约束只针对古文区：结果页最下方另有按需求新增的「解卦提示词」卡片，
  // 其结尾句按需求固定为「请结合以上卦象与卦辞、爻辞，为我解读这一卦。」，会自然出现「卦象」二字。
  const jieshiText = document.querySelector('#ly-result .rebu-jieshi-section').textContent;
  const modernLeak = ['卦象','卦义','白话','断易','邵雍','传统解卦','现代解读']
    .filter(word => jieshiText.includes(word));
  check(name + ' 结果页展示完整传文层级',
    text.includes('卦辞') && text.includes('彖传') && text.includes('大象传') &&
    text.includes('爻辞') && text.includes('小象传') &&
    text.includes(result.ben.meta.classical.guaci) &&
    text.includes(result.ben.meta.classical.tuan) &&
    text.includes(result.ben.meta.classical.daxiang));
  check(name + ' 古文区不泄漏现代解读', modernLeak.length === 0);
}

const qian = window.LiuYao.cast({
  method:'manual',
  lines:['young_yang','young_yang','young_yang','young_yang','young_yang','young_yang'],
  date:fixedDate,
});
qian.ben.meta.guaci = '现代卦辞哨兵';
qian.ben.meta.guaciTranslation = '现代翻译哨兵';
qian.ben.meta.summary = '现代卦象哨兵';
qian.ben.meta.shaoyong = '邵雍解卦哨兵';
qian.ben.naJia[0].translation = '现代爻辞哨兵';
const qianHtml = window.renderJieshiContent(qian.ben, new Set([0]), true);
check('页面忽略旧数据中的现代解释字段',
  !qianHtml.includes('现代卦辞哨兵') &&
  !qianHtml.includes('现代卦辞哨兵') &&
  !qianHtml.includes('现代翻译哨兵') &&
  !qianHtml.includes('现代卦象哨兵') &&
  !qianHtml.includes('邵雍解卦哨兵') &&
  !qianHtml.includes('现代爻辞哨兵'));
check('爻辞保留完整爻题', qianHtml.includes('初九：潜龙，勿用。') && qianHtml.includes('上九：亢龙，有悔。'));
check('乾卦用九显示在末位', qianHtml.includes('用九：见群龙无首，吉。'));
check('动爻高亮仍保留', qianHtml.includes('rebu-yaoci moving') && qianHtml.includes('rebu-yaoci-dong'));
check('乾卦彖传/大象传/卦辞/爻辞按层级展示',
  qianHtml.indexOf('卦辞') < qianHtml.indexOf('彖传') &&
  qianHtml.indexOf('彖传') < qianHtml.indexOf('大象传') &&
  qianHtml.indexOf('大象传') < qianHtml.indexOf('爻辞') &&
  qianHtml.includes('万物资始，乃统天') &&
  qianHtml.includes('天行健，君子以自强不息。'));

const qianGroup = document.createElement('div');
qianGroup.innerHTML = qianHtml;
const qianYaoItems = [...qianGroup.querySelectorAll('.rebu-yaoci')];
check('每个爻位均按“爻辞后紧接小象传”展示', qianYaoItems.length === 7 &&
  qianYaoItems.every(item =>
    item.firstElementChild.classList.contains('rebu-yaoci-title') &&
    item.lastElementChild.classList.contains('rebu-xiaoxiang')));
check('乾卦初爻小象与用九小象准确对应',
  qianYaoItems[0].textContent.includes('初九：潜龙，勿用。') &&
  qianYaoItems[0].textContent.includes('小象传阳在下也。') &&
  qianYaoItems[6].textContent.includes('用九：见群龙无首，吉。') &&
  qianYaoItems[6].textContent.includes('小象传天德不可为首也。'));
check('动爻内容没有额外水平内边距',
  /\.rebu-yaoci\.moving\{[^}]*padding:6px 0;/.test(html));

const legacyMeta = {
  bits:'111111',
  image:'乾为天',
  guaci:'旧数据卦辞',
  guaciTranslation:'旧数据翻译',
  summary:'旧数据卦象',
  shaoyong:'旧数据邵雍',
  lines:[{ text:'旧数据爻辞', translation:'旧数据白话' }],
};
const legacyHtml = window.renderJieshiContent({ meta:legacyMeta }, new Set(), true);
check('历史记录使用当前古文数据回填',
  legacyHtml.includes('元亨，利贞。') &&
  legacyHtml.includes('万物资始，乃统天') &&
  legacyHtml.includes('天行健，君子以自强不息。') &&
  legacyHtml.includes('初九：潜龙，勿用。') &&
  legacyHtml.includes('>小象传</span>阳在下也。'));
check('历史记录不显示旧现代解释', !legacyHtml.includes('旧数据翻译') && !legacyHtml.includes('旧数据邵雍') && !legacyHtml.includes('旧数据白话'));

const unknownHtml = window.renderJieshiContent({
  meta:{ bits:'999999', image:'未知历史卦' },
}, new Set(), true);
check('无法识别的历史卦象显示统一兜底文案',
  unknownHtml.includes('暂无对应卦象的卦辞与传文数据') &&
  !unknownHtml.includes('未知历史卦'));

const changing = window.LiuYao.cast({
  method:'manual',
  lines:['old_yang','young_yang','young_yang','young_yang','young_yang','young_yang'],
  date:fixedDate,
});
window.renderLiuyaoResult(changing);
const benText = document.getElementById('rebu-jieshi-ben').textContent;
const zhiText = document.getElementById('rebu-jieshi-zhi').textContent;
check('本卦与变卦古文数据不串用',
  benText.includes('万物资始，乃统天') &&
  benText.includes('天行健，君子以自强不息。') &&
  benText.includes('小象传阳在下也。') &&
  zhiText.includes('天下有风') &&
  zhiText.includes('后以施命诰四方。') &&
  zhiText.includes('柔道牵也。') &&
  !zhiText.includes('万物资始，乃统天') &&
  !zhiText.includes('阳在下也。'));

console.log('\n===== 六爻古文结果页测试结果 =====');
results.forEach(result => console.log(result));
console.log('===== 结束 =====');

// 收尾：jsdom 的 pretendToBeVisual 会保留动画帧循环，测试跑完进程也不会退出。
// 显式结束进程（只影响退出时机，不影响任何断言；exitCode 已由 check() 设置）。
process.exit(process.exitCode || 0);
