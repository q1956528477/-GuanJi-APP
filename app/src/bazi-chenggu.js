import catalog from './data/bazi-chenggu.json';

// Data recovered from WZ8ZPP 2.8.1 runtime resources; see
// WZ8ZPP分析/dynamic/称骨歌诀与匹配机制.md for the evidence chain.
const JIAZI = [];
for (let i = 0; i < 60; i++) JIAZI.push('甲乙丙丁戊己庚辛壬癸'[i % 10] + '子丑寅卯辰巳午未申酉戌亥'[i % 12]);

const YEAR_WEIGHTS = [
  12, 9, 6, 7, 12, 5, 9, 8, 7, 8, 15, 9,
  16, 8, 8, 19, 12, 6, 8, 7, 5, 15, 6, 16,
  15, 7, 9, 12, 10, 7, 15, 6, 5, 14, 14, 9,
  7, 7, 9, 12, 8, 7, 13, 5, 14, 5, 9, 17,
  5, 7, 12, 8, 8, 6, 19, 6, 8, 16, 10, 7
];
const MONTH_WEIGHTS = [6, 7, 18, 9, 5, 16, 9, 15, 18, 8, 9, 5];
const DAY_WEIGHTS = [
  5, 10, 8, 15, 16, 15, 8, 16, 8, 16,
  9, 17, 8, 17, 10, 8, 9, 18, 5, 15,
  10, 9, 8, 9, 15, 18, 7, 8, 16, 6
];
const HOUR_WEIGHTS = [16, 6, 7, 10, 9, 16, 10, 8, 8, 9, 6, 6];
const CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const songsById = new Map(
  ((catalog && catalog.data) || []).map(item => [item.id, item])
);

export const CHENGGU_CATALOG = Array.from(songsById.values());
export const CHENGGU_SOURCE = 'WZ8ZPP 2.8.1 运行时 ChengGuGe.json（53 条）';

function cnCount(value) {
  if (value <= 10) return CN_NUM[value];
  if (value < 20) return '十' + CN_NUM[value - 10];
  return CN_NUM[Math.floor(value / 10)] + '十' + (value % 10 ? CN_NUM[value % 10] : '');
}

export function chengguWeightName(total) {
  if (!Number.isFinite(total) || total <= 0) return '';
  if (total % 10 === 0) return cnCount(total / 10) + '两';
  return cnCount(Math.floor(total / 10)) + '两' + CN_NUM[total % 10] + '钱';
}

export function chengguHourIndex(hour) {
  const value = Math.trunc(Number(hour));
  if (!Number.isFinite(value) || value < 0 || value > 23) return -1;
  const index = Math.trunc((value + 1) / 2);
  return index === 0 || index === 12 ? 0 : index;
}

export function splitChengguSong(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const parts = (raw.match(/[^。]+。?/g) || [raw]).map(part => part.trim()).filter(Boolean);
  if (!parts.length) return [];
  if (parts.length === 1) return [parts[0].replace(/[。；;]$/, '') + '。'];
  const first = parts[0].replace(/[。；;]$/, '') + '；';
  const rest = parts.slice(1).join('').replace(/[。；;]$/, '') + '。';
  return [first, rest];
}

export function calculateChenggu(yearPillar, lunarMonth, lunarDay, hour, gender) {
  const yearIndex = JIAZI.indexOf(String(yearPillar || ''));
  const monthIndex = Math.abs(Math.trunc(Number(lunarMonth))) - 1;
  const dayIndex = Math.trunc(Number(lunarDay)) - 1;
  const hourIndex = chengguHourIndex(hour);
  if (yearIndex < 0 || monthIndex < 0 || monthIndex >= 12 ||
      dayIndex < 0 || dayIndex >= 30 || hourIndex < 0) {
    return null;
  }

  const weights = {
    year: YEAR_WEIGHTS[yearIndex],
    month: MONTH_WEIGHTS[monthIndex],
    day: DAY_WEIGHTS[dayIndex],
    hour: HOUR_WEIGHTS[hourIndex]
  };
  const total = weights.year + weights.month + weights.day + weights.hour;
  if (total <= 20) {
    const fallback = '二两以内不上书，谁要遇见赶着呼。一世受贫无的怨，那世修来全比无。';
    return {
      weightName: '二两以内',
      total,
      weights,
      id: '',
      text: fallback,
      lines: splitChengguSong(fallback),
      source: CHENGGU_SOURCE
    };
  }

  const id = chengguWeightName(total);
  const row = songsById.get(id) || null;
  const female = gender === 'female';
  const preferred = row ? (female ? row.woman : row.man) : '';
  const alternate = row ? (female ? row.man : row.woman) : '';
  const text = String(preferred || alternate || '').trim();
  return {
    weightName: id,
    total,
    weights,
    id,
    text,
    lines: splitChengguSong(text),
    types: row ? (female ? row.types_woman : row.types_man) : '',
    source: CHENGGU_SOURCE
  };
}
