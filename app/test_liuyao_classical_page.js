// 六爻结果页古文展示回归测试：只允许大象传（若已核验）/卦辞/爻辞进入页面。
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
  const modernLeak = ['卦象','卦义','白话','断易','邵雍','传统解卦','现代解读']
    .filter(word => text.includes(word));
  check(name + ' 结果页展示古文卦辞与爻辞',
    text.includes('卦辞') && text.includes('爻辞') && text.includes(result.ben.meta.classical.guaci));
  check(name + ' 结果页不泄漏现代解读', modernLeak.length === 0);
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
check('未核验大象传不显示空标题', !qianHtml.includes('大象传'));

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
check('历史记录使用当前古文数据回填', legacyHtml.includes('元亨，利贞。') && legacyHtml.includes('初九：潜龙，勿用。'));
check('历史记录不显示旧现代解释', !legacyHtml.includes('旧数据翻译') && !legacyHtml.includes('旧数据邵雍') && !legacyHtml.includes('旧数据白话'));

const verifiedQian = Object.assign({}, qian.ben, {
  meta: Object.assign({}, qian.ben.meta, {
    classical: Object.assign({}, qian.ben.meta.classical, {
      daxiang:'天行健，君子以自强不息。',
      daxiangSource:{ title:'测试核验来源' },
    }),
  }),
});
const verifiedHtml = window.renderJieshiContent(verifiedQian, new Set(), true);
check('已核验大象传按顺序显示',
  verifiedHtml.indexOf('大象传') >= 0 &&
  verifiedHtml.indexOf('大象传') < verifiedHtml.indexOf('卦辞') &&
  verifiedHtml.indexOf('卦辞') < verifiedHtml.indexOf('爻辞') &&
  verifiedHtml.includes('天行健，君子以自强不息。'));

const changing = window.LiuYao.cast({
  method:'manual',
  lines:['old_yang','young_yang','young_yang','young_yang','young_yang','young_yang'],
  date:fixedDate,
});
window.renderLiuyaoResult(changing);
const benText = document.getElementById('rebu-jieshi-ben').textContent;
const zhiText = document.getElementById('rebu-jieshi-zhi').textContent;
check('本卦与变卦古文数据不串用',
  benText.includes('元亨，利贞。') &&
  zhiText.includes('女壮，勿用取女。') &&
  !zhiText.includes('元亨，利贞。'));

console.log('\n===== 六爻古文结果页测试结果 =====');
results.forEach(result => console.log(result));
console.log('===== 结束 =====');
