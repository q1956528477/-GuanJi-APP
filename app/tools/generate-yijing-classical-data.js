// 从指定 Markdown 生成 64 卦卦辞、爻辞古文数据。
// 用法：node tools/generate-yijing-classical-data.js <source.md> [--check]
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const TRIGRAM_BITS = {
  乾: '111',
  兑: '110',
  离: '101',
  震: '100',
  巽: '011',
  坎: '010',
  艮: '001',
  坤: '000',
};

function fail(message) {
  throw new Error(message);
}

function normalizeClassicalText(text) {
  return text.trim().replace(/\s*\n\s*/g, '');
}

function expectedLineTitles(bits, id) {
  const positions = ['初', '二', '三', '四', '五', '上'];
  const titles = bits.split('').map((bit, index) => {
    const polarity = bit === '1' ? '九' : '六';
    if (index === 0) return '初' + polarity;
    if (index === 5) return '上' + polarity;
    return polarity + positions[index];
  });
  if (id === 1) titles.push('用九');
  if (id === 2) titles.push('用六');
  return titles;
}

function loadExistingHexagrams(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const code = source.replace(
    'export const YIJING_HEXAGRAMS',
    'const YIJING_HEXAGRAMS'
  );
  const context = {};
  vm.createContext(context);
  vm.runInContext(code + '\nthis.hexagrams = YIJING_HEXAGRAMS;', context);
  if (!Array.isArray(context.hexagrams) || context.hexagrams.length !== 64) {
    fail('现有 yijing-data.js 未解析出 64 卦');
  }
  return context.hexagrams;
}

function parseClassicalSource(sourcePath, existingHexagrams) {
  const text = fs.readFileSync(sourcePath, 'utf8');
  const sections = text
    .split(/^## /m)
    .slice(1)
    .filter(section => !section.startsWith('目录'));

  if (sections.length !== 64) {
    fail(`Markdown 应包含 64 卦，实际为 ${sections.length} 卦`);
  }

  const seenIds = new Set();
  const seenNames = new Set();
  return sections.map((section, index) => {
    const [nameLine, ...bodyLines] = section.split('\n');
    const name = nameLine.trim();
    const body = bodyLines.join('\n');
    if (!name) fail(`第 ${index + 1} 卦缺少卦名`);
    if (seenNames.has(name)) fail(`卦名重复：${name}`);
    seenNames.add(name);

    const metaMatch = body.match(
      /\*\*第\s*(\d+)\s*卦\s*·\s*([^·]+?)\s*·\s*([^·]+?)\*\*/
    );
    if (!metaMatch) fail(`${name} 缺少卦序或上下卦信息`);
    const id = Number(metaMatch[1]);
    const trigramPair = metaMatch[2].trim();
    const pairMatch = trigramPair.match(/^(.)上(.)下$/);
    if (!pairMatch) fail(`${name} 的上下卦格式无法解析：${trigramPair}`);
    const upperTrigram = pairMatch[1];
    const lowerTrigram = pairMatch[2];
    if (!TRIGRAM_BITS[upperTrigram] || !TRIGRAM_BITS[lowerTrigram]) {
      fail(`${name} 含未知上下卦：${trigramPair}`);
    }
    if (seenIds.has(id)) fail(`卦序重复：${id}`);
    seenIds.add(id);

    const guaciMatch = body.match(
      /### 卦辞\s*\n+([\s\S]*?)\n+\s*### 爻辞/
    );
    if (!guaciMatch) fail(`${name} 缺少卦辞`);
    const guaci = normalizeClassicalText(guaciMatch[1]);
    if (!guaci) fail(`${name} 的卦辞为空`);

    const linesMatch = body.match(/### 爻辞\s*\n+([\s\S]*?)(?:\n---|$)/);
    if (!linesMatch) fail(`${name} 缺少爻辞`);
    const lines = [...linesMatch[1].matchAll(
      /^\s*-\s+\*\*([^*]+)\*\*[：:]\s*(.+?)\s*$/gm
    )].map(match => ({
      title: match[1].trim(),
      text: normalizeClassicalText(match[2]),
    }));

    const existing = existingHexagrams.find(item => item.id === id);
    if (!existing) fail(`现有数据缺少第 ${id} 卦`);
    if (existing.image !== name) {
      fail(`第 ${id} 卦名称不一致：Markdown=${name}，现有数据=${existing.image}`);
    }
    const expectedBits =
      TRIGRAM_BITS[lowerTrigram] + TRIGRAM_BITS[upperTrigram];
    if (existing.bits !== expectedBits) {
      fail(
        `${name} 上下卦与现有 bits 不一致：${trigramPair} => ${expectedBits}，现有=${existing.bits}`
      );
    }

    const expectedTitles = expectedLineTitles(existing.bits, id);
    if (lines.length !== expectedTitles.length) {
      fail(
        `${name} 爻辞数量异常：应为 ${expectedTitles.length} 条，实际 ${lines.length} 条`
      );
    }
    lines.forEach((line, lineIndex) => {
      if (line.title !== expectedTitles[lineIndex]) {
        fail(
          `${name} 第 ${lineIndex + 1} 条爻题异常：应为 ${expectedTitles[lineIndex]}，实际 ${line.title}`
        );
      }
      if (!line.text) fail(`${name} ${line.title} 的爻辞为空`);
    });

    return {
      id,
      name,
      bits: existing.bits,
      upperTrigram,
      lowerTrigram,
      guaci,
      lines,
      daxiang: null,
      daxiangSource: null,
    };
  }).sort((a, b) => a.id - b.id);
}

function buildOutput(sourcePath, hexagrams) {
  const sourceBuffer = fs.readFileSync(sourcePath);
  const sourceHash = crypto
    .createHash('sha256')
    .update(sourceBuffer)
    .digest('hex');
  const sourceInfo = {
    guaciAndLines: {
      title: '周易六十四卦：卦辞与爻辞',
      file: path.basename(sourcePath),
      sha256: sourceHash,
    },
    daxiang: {
      status: 'unverified',
      source: null,
    },
  };
  return [
    '// 由 tools/generate-yijing-classical-data.js 生成，请勿手工修改。',
    '// 卦辞、爻辞来源：' + sourceInfo.guaciAndLines.file,
    '',
    'export const YIJING_CLASSICAL = ' +
      JSON.stringify(hexagrams, null, 2) +
      ';',
    '',
    'export const YIJING_CLASSICAL_SOURCE = ' +
      JSON.stringify(sourceInfo, null, 2) +
      ';',
    '',
  ].join('\n');
}

function generate(sourcePath, outputPath, checkOnly) {
  const existingPath = path.join(__dirname, '..', 'src', 'yijing-data.js');
  const existing = loadExistingHexagrams(existingPath);
  const hexagrams = parseClassicalSource(sourcePath, existing);
  const output = buildOutput(sourcePath, hexagrams);
  if (checkOnly) {
    const current = fs.readFileSync(outputPath, 'utf8');
    if (current !== output) {
      fail('生成数据与当前文件不一致');
    }
  } else {
    fs.writeFileSync(outputPath, output, 'utf8');
  }
  return hexagrams;
}

if (require.main === module) {
  const sourcePath = process.argv[2];
  const checkOnly = process.argv.includes('--check');
  if (!sourcePath) {
    console.error(
      '用法: node tools/generate-yijing-classical-data.js <source.md> [--check]'
    );
    process.exit(1);
  }
  try {
    const outputPath = path.join(
      __dirname,
      '..',
      'src',
      'yijing-classical-data.js'
    );
    const hexagrams = generate(sourcePath, outputPath, checkOnly);
    console.log(
      (checkOnly ? '校验通过：' : '已生成：') +
        outputPath +
        '，共 ' +
        hexagrams.length +
        ' 卦'
    );
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = {
  buildOutput,
  generate,
  loadExistingHexagrams,
  parseClassicalSource,
};
