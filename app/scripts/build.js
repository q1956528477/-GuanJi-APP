const path = require('path');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '..');
const builds = [
  {entry:'src/native.js', outfile:'www/native.bundle.js'},
  {entry:'src/notify.js', outfile:'www/notify.bundle.js'},
  {entry:'src/liuyao.js', outfile:'www/liuyao.bundle.js', globalName:'LiuYao'},
  {entry:'src/bazi.js', outfile:'www/bazi.bundle.js', globalName:'Bazi'}
];

(async () => {
  await Promise.all(builds.map(item => esbuild.build({
    entryPoints:[path.join(root, item.entry)],
    outfile:path.join(root, item.outfile),
    bundle:true,
    minify:true,
    format:'iife',
    globalName:item.globalName,
    logLevel:'warning'
  })));
  console.log('构建完成：native.bundle.js / notify.bundle.js / liuyao.bundle.js / bazi.bundle.js');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
