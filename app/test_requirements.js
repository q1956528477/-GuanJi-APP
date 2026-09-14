// 迭代需求记录页 + 通用文本输入弹窗测试。
//
// 背景（本轮修的 Bug）：点「修改」后输入框是空的，体验成了「新建一条」。
// 根因是原生 prompt() 在 Android WebView（Capacitor 的 BridgeWebChromeClient.onJsPrompt）
// 里被实现成"弹一个空 EditText"，**默认值被丢弃**。现改为自绘弹窗 openTextPrompt()，
// 这里就把"必须回填原值"这条锁死。
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
function promptOpen(){ return document.getElementById('text-prompt-modal').classList.contains('show'); }
function promptArea(){ return document.getElementById('text-prompt-area'); }
function promptInput(){ return document.getElementById('text-prompt-input'); }
function promptOk(){ return document.getElementById('text-prompt-ok'); }
// 当前实际生效的控件：多行场景是 textarea，单行场景是 input
function activeField(){
  return promptArea().classList.contains('hidden') ? promptInput() : promptArea();
}
function tick(){ return new Promise(resolve => setTimeout(resolve, 0)); }
function storedReqs(){ return JSON.parse(window.localStorage.getItem('guanji_requirements_v2')); }

const REQ_KEY = 'guanji_requirements_v2';
const ORIGINAL = [
  { text:'第一条需求：六爻结果页卦象对齐', createdAt:1700000000000 },
  { text:'第二条需求：四柱直排底部弹层', createdAt:1700000001000 }
];

(async function main(){
  window.localStorage.setItem(REQ_KEY, JSON.stringify(ORIGINAL));
  window.openReqView();
  check('进入需求记录页', visible('req-view'));
  check('需求列表渲染出 2 条', document.querySelectorAll('#req-list-container .req-item').length === 2);

  const firstItem = document.querySelectorAll('#req-list-container .req-item')[0];
  const editBtn = firstItem.querySelector('.req-item-edit-btn');
  check('第一条记录有「修改」按钮', !!editBtn);

  // —— 核心：点「修改」必须回填原内容，且不是新建 ——
  editBtn.click();
  check('点「修改」打开输入弹窗', promptOpen());
  check('弹窗带出该条记录的标题', document.getElementById('text-prompt-title').textContent === '修改需求');
  check('★输入框完整回填原内容（本轮 Bug 的验收点）', promptArea().value === ORIGINAL[0].text);
  check('回填的是多行文本控件（不是隐藏的空控件）', !promptArea().classList.contains('hidden'));
  check('回填内容非空，可直接在此基础上修改', promptArea().value.trim().length > 0);
  check('内容非空时「确定」可点', promptOk().disabled === false);

  // 清空 → 确定置灰，避免"确认后把内容清没了"
  promptArea().value = '   ';
  promptArea().dispatchEvent(new window.Event('input', { bubbles:true }));
  check('内容为空时「确定」置灰', promptOk().disabled === true);

  // 恢复并改一部分内容后保存
  promptArea().value = '第一条需求（已修改）：六爻结果页卦象逐爻对齐';
  promptArea().dispatchEvent(new window.Event('input', { bubbles:true }));
  promptOk().click();
  await tick();

  const afterEdit = storedReqs();
  check('保存后弹窗已关闭', !promptOpen());
  check('★保存是更新原记录，条数没变（不是新增一条）', afterEdit.length === ORIGINAL.length);
  check('★原记录的 createdAt 未被破坏', afterEdit[0].createdAt === ORIGINAL[0].createdAt);
  check('第一条内容已更新为修改后的文本', afterEdit[0].text === '第一条需求（已修改）：六爻结果页卦象逐爻对齐');
  check('第二条记录未被波及', afterEdit[1].text === ORIGINAL[1].text && afterEdit[1].createdAt === ORIGINAL[1].createdAt);
  check('列表已按新内容重绘', document.querySelectorAll('#req-list-container .req-item')[0].textContent.includes('已修改'));

  // —— 取消不写回 ——
  document.querySelectorAll('#req-list-container .req-item')[0].querySelector('.req-item-edit-btn').click();
  check('再次点「修改」仍能回填当前内容', promptArea().value === '第一条需求（已修改）：六爻结果页卦象逐爻对齐');
  promptArea().value = '这段不该被保存';
  promptArea().dispatchEvent(new window.Event('input', { bubbles:true }));
  document.getElementById('text-prompt-cancel').click();
  await tick();
  check('点「取消」关闭弹窗', !promptOpen());
  check('取消后数据未被改动', storedReqs()[0].text === '第一条需求（已修改）：六爻结果页卦象逐爻对齐');
  check('取消后仍停留在需求记录页', visible('req-view'));

  // —— 返回键只关弹窗（与 v1.14.6 返回栈一致） ——
  document.querySelectorAll('#req-list-container .req-item')[0].querySelector('.req-item-edit-btn').click();
  check('返回键测试前弹窗已打开', promptOpen());
  window.handleBack();
  await tick();
  check('返回键只关闭输入弹窗', !promptOpen());
  check('返回键没有把页面退回上一层', visible('req-view'));
  check('返回键关闭等于取消，数据未变', storedReqs()[0].text === '第一条需求（已修改）：六爻结果页卦象逐爻对齐');

  // —— 添加新需求：与编辑区分，弹窗应为空白 ——
  document.getElementById('req-add-new').click();
  check('「添加新需求」弹窗为空白（新建场景才是空白）', promptOpen() && activeField().value === '');
  check('新建时内容为空，「确定」置灰', promptOk().disabled === true);
  activeField().value = '第三条需求：新增模块';
  activeField().dispatchEvent(new window.Event('input', { bubbles:true }));
  promptOk().click();
  await tick();
  const afterAdd = storedReqs();
  check('新增后条数 +1，且新记录追加在末尾', afterAdd.length === 3 && afterAdd[2].text === '第三条需求：新增模块');
  check('新增记录带 createdAt', typeof afterAdd[2].createdAt === 'number');
  check('新增不会覆盖已有记录', afterAdd[0].text === '第一条需求（已修改）：六爻结果页卦象逐爻对齐');

  // —— 同根因的第二处：分组重命名也必须回填 ——
  const groups = [{ id:'group_1', name:'我的客户', sortOrder:0, isDefault:true, createdAt:1 }];
  window.localStorage.setItem('guanji_bazi_groups_v1', JSON.stringify(groups));
  window.openBaziRecords();
  window.openBaziGroupManager();
  const renameBtn = document.querySelector('#bz-group-list button[data-action="rename"]');
  check('分组管理里有「重命名」按钮', !!renameBtn);
  renameBtn.click();
  check('★重命名弹窗回填原名（同根因的第二处）', promptOpen() && promptInput().value === '我的客户');
  check('单行场景只显示单行控件，多行控件已隐藏', !promptInput().classList.contains('hidden') && promptArea().classList.contains('hidden'));
  promptInput().value = '老客户';
  promptInput().dispatchEvent(new window.Event('input', { bubbles:true }));
  promptOk().click();
  await tick();
  const savedGroups = JSON.parse(window.localStorage.getItem('guanji_bazi_groups_v1'));
  check('重命名按分组 ID 更新原分组，未新增分组', savedGroups.length === 1 && savedGroups[0].id === 'group_1');
  check('重命名后名称已更新', savedGroups[0].name === '老客户');
  check('重命名保留了 isDefault 等其它字段', savedGroups[0].isDefault === true && savedGroups[0].createdAt === 1);

  console.log('\n===== 需求记录页 / 输入弹窗测试结果 =====');
  results.forEach(result => console.log(result));
  console.log('===== 结束 =====');
})();
