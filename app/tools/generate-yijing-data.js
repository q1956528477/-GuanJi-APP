// 一次性生成 src/yijing-data.js：从下载的《周易》结构化 JSON 中提取
// 64 卦的卦名、卦辞、爻辞、白话译文、断易与邵雍解语，并合并八宫、世应等元数据。
// 用法：node tools/generate-yijing-data.js <path-to-yijing.json>
const fs = require('fs');
const path = require('path');

const srcPath = process.argv[2];
if (!srcPath) {
  console.error('用法: node tools/generate-yijing-data.js <yijing.json>');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

const PALACES = {
  '111111': { palace: '乾宫', element: '金', shi: 6 },
  '011111': { palace: '乾宫', element: '金', shi: 1 },
  '001111': { palace: '乾宫', element: '金', shi: 2 },
  '000111': { palace: '乾宫', element: '金', shi: 3 },
  '000011': { palace: '乾宫', element: '金', shi: 4 },
  '000001': { palace: '乾宫', element: '金', shi: 5 },
  '000101': { palace: '乾宫', element: '金', shi: 4 },
  '111101': { palace: '乾宫', element: '金', shi: 3 },
  '110110': { palace: '兑宫', element: '金', shi: 6 },
  '010110': { palace: '兑宫', element: '金', shi: 1 },
  '000110': { palace: '兑宫', element: '金', shi: 2 },
  '001110': { palace: '兑宫', element: '金', shi: 3 },
  '001010': { palace: '兑宫', element: '金', shi: 4 },
  '001000': { palace: '兑宫', element: '金', shi: 5 },
  '001100': { palace: '兑宫', element: '金', shi: 4 },
  '110100': { palace: '兑宫', element: '金', shi: 3 },
  '101101': { palace: '离宫', element: '火', shi: 6 },
  '001101': { palace: '离宫', element: '火', shi: 1 },
  '011101': { palace: '离宫', element: '火', shi: 2 },
  '010101': { palace: '离宫', element: '火', shi: 3 },
  '010001': { palace: '离宫', element: '火', shi: 4 },
  '010011': { palace: '离宫', element: '火', shi: 5 },
  '010111': { palace: '离宫', element: '火', shi: 4 },
  '101111': { palace: '离宫', element: '火', shi: 3 },
  '100100': { palace: '震宫', element: '木', shi: 6 },
  '000100': { palace: '震宫', element: '木', shi: 1 },
  '010100': { palace: '震宫', element: '木', shi: 2 },
  '011100': { palace: '震宫', element: '木', shi: 3 },
  '011000': { palace: '震宫', element: '木', shi: 4 },
  '011010': { palace: '震宫', element: '木', shi: 5 },
  '011110': { palace: '震宫', element: '木', shi: 4 },
  '100110': { palace: '震宫', element: '木', shi: 3 },
  '011011': { palace: '巽宫', element: '木', shi: 6 },
  '111011': { palace: '巽宫', element: '木', shi: 1 },
  '101011': { palace: '巽宫', element: '木', shi: 2 },
  '100011': { palace: '巽宫', element: '木', shi: 3 },
  '100111': { palace: '巽宫', element: '木', shi: 4 },
  '100101': { palace: '巽宫', element: '木', shi: 5 },
  '100001': { palace: '巽宫', element: '木', shi: 4 },
  '011001': { palace: '巽宫', element: '木', shi: 3 },
  '010010': { palace: '坎宫', element: '水', shi: 6 },
  '110010': { palace: '坎宫', element: '水', shi: 1 },
  '100010': { palace: '坎宫', element: '水', shi: 2 },
  '101010': { palace: '坎宫', element: '水', shi: 3 },
  '101110': { palace: '坎宫', element: '水', shi: 4 },
  '101100': { palace: '坎宫', element: '水', shi: 5 },
  '101000': { palace: '坎宫', element: '水', shi: 4 },
  '010000': { palace: '坎宫', element: '水', shi: 3 },
  '001001': { palace: '艮宫', element: '土', shi: 6 },
  '101001': { palace: '艮宫', element: '土', shi: 1 },
  '111001': { palace: '艮宫', element: '土', shi: 2 },
  '110001': { palace: '艮宫', element: '土', shi: 3 },
  '110101': { palace: '艮宫', element: '土', shi: 4 },
  '110111': { palace: '艮宫', element: '土', shi: 5 },
  '110011': { palace: '艮宫', element: '土', shi: 4 },
  '001011': { palace: '艮宫', element: '土', shi: 3 },
  '000000': { palace: '坤宫', element: '土', shi: 6 },
  '100000': { palace: '坤宫', element: '土', shi: 1 },
  '110000': { palace: '坤宫', element: '土', shi: 2 },
  '111000': { palace: '坤宫', element: '土', shi: 3 },
  '111100': { palace: '坤宫', element: '土', shi: 4 },
  '111110': { palace: '坤宫', element: '土', shi: 5 },
  '111010': { palace: '坤宫', element: '土', shi: 4 },
  '000010': { palace: '坤宫', element: '土', shi: 3 },
};

function asArray(v) { return Array.isArray(v) ? v : (v == null ? [] : [v]); }
function txt(v) { return asArray(v).join(' ').trim(); }

const hexagrams = data.hexagrams.map(h => {
  const bits = h.bits.join('');
  const meta = PALACES[bits];
  if (!meta) throw new Error('缺少八宫映射: ' + bits + ' ' + h.name);

  const ov = h.overview || {};
  const guaci = asArray(h.canon && h.canon.guaci).join(' ');
  const guaciTranslation = txt(ov.translation && ov.translation.text);
  const summary = txt(ov.duanyi);
  const shaoyong = txt(ov.shaoyong);

  const lines = asArray(h.canon && h.canon.lines).map((l, i) => {
    const lineObj = h.lines && h.lines[i] ? h.lines[i] : {};
    return {
      text: l && l.text ? l.text : '',
      translation: txt(lineObj.translation && lineObj.translation.text),
      shaoyong: txt(lineObj.shaoyong),
    };
  });

  if (lines.length !== 6) throw new Error('爻辞数量异常: ' + h.name + ' ' + lines.length);

  return {
    id: h.id,
    name: h.name,
    image: h.image,
    bits,
    palace: meta.palace,
    element: meta.element,
    shi: meta.shi,
    guaci,
    guaciTranslation,
    summary,
    shaoyong,
    lines,
  };
});

const outPath = path.join(__dirname, '..', 'src', 'yijing-data.js');
fs.writeFileSync(outPath, 'export const YIJING_HEXAGRAMS = ' + JSON.stringify(hexagrams, null, 2) + ';\n', 'utf8');
console.log('已生成', outPath, '共', hexagrams.length, '卦');