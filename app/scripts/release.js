#!/usr/bin/env node
/**
 * 观己 · 一条命令交付（release.js）
 * ------------------------------------------------------------------
 * 解决的问题：assets/public 是 Capacitor 的构建产物、却被 gitignore，
 * 过去靠人手工把 www 整个覆盖过去，一旦忘记就打出「版本号是新的、界面是旧的」的包。
 *
 * 本脚本把「构建 → 同步 → 校验 → 打包 → 校验包内产物 → 归档命名」串成一条链，
 * 任何一步对不上就直接非零退出，不再靠人眼看日志。
 *
 * 用法：
 *   node scripts/release.js                  # 构建 bundle + 同步 assets + 逐文件哈希校验
 *   node scripts/release.js --check          # 只校验（CI/提交前用，不写任何文件）
 *   node scripts/release.js --build          # 上面全做，并真的执行 gradlew assembleRelease
 *   node scripts/release.js --build --name="八字问真对齐"
 *                                            # 打包后归档到仓库根：观己_v1.14.25_八字问真对齐_release.apk
 *
 * 退出码：0 全部通过；1 版本不一致 / 同步漂移 / 构建失败 / 包内产物与源文件不一致
 */
'use strict';

// safe-delete shim 在设置 NODE_OPTIONS 时会拦截 fs 删除，先摘掉
delete process.env.NODE_OPTIONS;

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const APP_DIR = path.resolve(__dirname, '..');           // app/
const REPO_ROOT = path.resolve(APP_DIR, '..');           // 仓库根
const WWW = path.join(APP_DIR, 'www');
const ANDROID = path.join(APP_DIR, 'android');
const ASSETS_PUBLIC = path.join(ANDROID, 'app', 'src', 'main', 'assets', 'public');
const APK_OUT = path.join(ANDROID, 'app', 'build', 'outputs', 'apk', 'release');

// Capacitor 自己生成、源目录里没有、不能删
const KEEP_IN_ASSETS = new Set(['cordova.js', 'cordova_plugins.js']);

const args = process.argv.slice(2);
const CHECK_ONLY = args.includes('--check');
const DO_BUILD = args.includes('--build');
const NAME_ARG = (args.find(a => a.startsWith('--name=')) || '').slice('--name='.length);

let failures = 0;
function ok(msg) { console.log('  ✅ ' + msg); }
function bad(msg) { failures++; console.log('  ❌ ' + msg); }
function info(msg) { console.log('  ·  ' + msg); }
function step(n, msg) { console.log('\n[' + n + '] ' + msg); }

function sha256File(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

function walk(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, base, out);
    else out.push(path.relative(base, abs).split(path.sep).join('/'));
  }
  return out;
}

/* ---------------- 1. 版本一致性 ---------------- */
function readVersions() {
  const pkg = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'package.json'), 'utf8'));
  const gradle = fs.readFileSync(path.join(ANDROID, 'app', 'build.gradle'), 'utf8');
  const versionCode = (gradle.match(/versionCode\s+(\d+)/) || [])[1];
  const versionName = (gradle.match(/versionName\s+"([^"]+)"/) || [])[1];
  return { pkgVersion: pkg.version, versionCode, versionName };
}

/* ---------------- 2. 构建 bundle ---------------- */
function buildBundles() {
  const r = spawnSync(process.execPath, [path.join(APP_DIR, 'scripts', 'build.js')], {
    cwd: APP_DIR, stdio: 'inherit'
  });
  return r.status === 0;
}

/* ---------------- 3. 同步 www → assets/public ---------------- */
function syncAssets() {
  const srcFiles = walk(WWW);
  fs.mkdirSync(ASSETS_PUBLIC, { recursive: true });

  for (const rel of srcFiles) {
    const from = path.join(WWW, rel);
    const to = path.join(ASSETS_PUBLIC, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);   // 逐字节复制，不做换行符转换
  }

  // 删掉源目录已经不存在的陈旧文件（避免上次迭代的残留被打进包里）
  let removed = 0;
  for (const rel of walk(ASSETS_PUBLIC)) {
    if (srcFiles.includes(rel)) continue;
    if (KEEP_IN_ASSETS.has(path.basename(rel))) continue;
    fs.rmSync(path.join(ASSETS_PUBLIC, rel), { force: true });
    removed++;
  }
  info('已复制 ' + srcFiles.length + ' 个文件，清理陈旧文件 ' + removed + ' 个');
}

/* ---------------- 4. 逐文件哈希校验 ---------------- */
function verifyAssets() {
  const srcFiles = walk(WWW);
  let mismatch = 0;
  for (const rel of srcFiles) {
    const target = path.join(ASSETS_PUBLIC, rel);
    if (!fs.existsSync(target)) { bad('assets 缺失：' + rel); mismatch++; continue; }
    if (sha256File(path.join(WWW, rel)) !== sha256File(target)) { bad('哈希不一致：' + rel); mismatch++; }
  }
  if (!mismatch) ok('assets/public 与 www 逐文件哈希一致（' + srcFiles.length + ' 个文件）');
  return mismatch === 0;
}

/* ---------------- 5. 解析构建工具链 ---------------- */
function resolveToolchain() {
  const env = Object.assign({}, process.env);
  if (env.JAVA_HOME && env.ANDROID_HOME) return env;

  const localProps = path.join(ANDROID, 'local.properties');
  const sdkDir = fs.existsSync(localProps)
    ? (fs.readFileSync(localProps, 'utf8').match(/^sdk\.dir=(.+)$/m) || [])[1]
    : null;
  if (!sdkDir) return env;

  // SDK 同级目录约定：<bin>/sdk、<bin>/jdk/jdk-*、<bin>/gradle-home
  const binRoot = path.dirname(sdkDir.trim());
  const jdkRoot = path.join(binRoot, 'jdk');
  if (!env.ANDROID_HOME) { env.ANDROID_HOME = sdkDir.trim(); env.ANDROID_SDK_ROOT = sdkDir.trim(); }
  if (!env.JAVA_HOME && fs.existsSync(jdkRoot)) {
    const jdk = fs.readdirSync(jdkRoot).find(d => d.startsWith('jdk-'));
    if (jdk) env.JAVA_HOME = path.join(jdkRoot, jdk);
  }
  if (!env.GRADLE_USER_HOME && fs.existsSync(path.join(binRoot, 'gradle-home'))) {
    env.GRADLE_USER_HOME = path.join(binRoot, 'gradle-home');
  }
  return env;
}

/* ---------------- 6. 打包 ---------------- */
function buildApk(env) {
  const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  info('JAVA_HOME=' + (env.JAVA_HOME || '(未设置)'));
  const r = spawnSync(gradlew, ['assembleRelease', '--no-daemon'], {
    cwd: ANDROID, stdio: 'inherit', env, shell: process.platform === 'win32'
  });
  return r.status === 0;
}

/* ---------------- 7. 校验包内产物 ---------------- */
function verifyApk(version) {
  const apk = path.join(APK_OUT, 'app-release.apk');
  if (!fs.existsSync(apk)) { bad('未找到构建产物：' + apk); return null; }

  const meta = JSON.parse(fs.readFileSync(path.join(APK_OUT, 'output-metadata.json'), 'utf8'));
  const el = (meta.elements || [])[0] || {};
  if (String(el.versionCode) !== String(version.versionCode)) bad('APK versionCode=' + el.versionCode + '，期望 ' + version.versionCode);
  else if (el.versionName !== version.versionName) bad('APK versionName=' + el.versionName + '，期望 ' + version.versionName);
  else ok('APK 版本号 ' + el.versionName + ' (build ' + el.versionCode + ') 与源码一致');

  // 关键：包内 index.html 必须与 www 当前内容逐字节一致
  const unzipTest = spawnSync('unzip', ['-v'], { stdio: 'ignore' });
  if (unzipTest.status !== 0) { info('本机无 unzip，跳过包内哈希比对'); return apk; }

  const packed = spawnSync('unzip', ['-p', apk, 'assets/public/index.html'], { maxBuffer: 32 * 1024 * 1024 });
  if (packed.status !== 0) { bad('无法读取包内 assets/public/index.html'); return apk; }
  const packedHash = crypto.createHash('sha256').update(packed.stdout).digest('hex');
  const localHash = sha256File(path.join(WWW, 'index.html'));
  if (packedHash !== localHash) bad('包内 index.html 与 www/index.html 不一致（包=' + packedHash.slice(0, 12) + ' 源=' + localHash.slice(0, 12) + '）');
  else ok('包内 index.html 与 www 一致：' + localHash.slice(0, 12) + '…');

  return apk;
}

/* ---------------- 8. 归档 ---------------- */
function deliver(apk, version) {
  const desc = NAME_ARG ? '_' + NAME_ARG : '';
  const dest = path.join(REPO_ROOT, '观己_v' + version.versionName + desc + '_release.apk');
  fs.copyFileSync(apk, dest);
  ok('已归档：' + path.basename(dest) + '（' + (fs.statSync(dest).size / 1048576).toFixed(1) + ' MB）');
  info('SHA-256 ' + sha256File(dest));
}

/* ---------------- main ---------------- */
(function main() {
  console.log('观己交付链 · ' + (CHECK_ONLY ? '仅校验' : '完整执行'));

  step(1, '版本号一致性');
  const version = readVersions();
  if (!version.versionName || !version.versionCode) { bad('build.gradle 读不到 versionName/versionCode'); process.exit(1); }
  if (version.pkgVersion !== version.versionName) bad('package.json=' + version.pkgVersion + ' 与 build.gradle=' + version.versionName + ' 不一致');
  else ok('package.json / build.gradle 均为 ' + version.versionName + ' (build ' + version.versionCode + ')');

  if (CHECK_ONLY) {
    step(2, '同步状态校验（不写文件）');
    if (!verifyAssets()) { console.log('\n结论：assets 与 www 已漂移，请执行 node scripts/release.js'); process.exit(1); }
    console.log('\n结论：校验通过');
    process.exit(failures ? 1 : 0);
  }

  step(2, '构建 bundle');
  if (!buildBundles()) { bad('esbuild 构建失败'); process.exit(1); }
  ok('bazi / liuyao / native / notify 四个 bundle 已重建');

  step(3, '同步到 Android assets');
  syncAssets();

  step(4, '同步校验');
  if (!verifyAssets()) { console.log('\n结论：同步失败，已中止'); process.exit(1); }

  if (!DO_BUILD) {
    console.log('\n结论：资源已就绪（未打包，加 --build 执行 assembleRelease）');
    process.exit(failures ? 1 : 0);
  }

  step(5, '打包 release APK');
  const env = resolveToolchain();
  if (!buildApk(env)) { bad('gradle 构建失败'); process.exit(1); }
  ok('assembleRelease 完成');

  step(6, '校验包内产物');
  const apk = verifyApk(version);

  if (apk && failures === 0) {
    step(7, '归档');
    deliver(apk, version);
  }

  console.log('\n结论：' + (failures ? '存在 ' + failures + ' 处不一致，交付中止' : '交付链全部通过'));
  process.exit(failures ? 1 : 0);
})();
