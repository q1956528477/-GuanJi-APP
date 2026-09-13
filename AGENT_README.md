# 观己 APP · 多终端 Agent 交接说明

> 把本文件整份贴给任意终端上的 AI Agent，它即可接手本项目。
> 仓库：`https://github.com/q1956528477/-GuanJi-APP.git`　分支：`codex/liuyao-replica`
> 当前版本：**v1.14.1 (build 35)**　最后更新：2026-09-13

---

## 使用方式｜让另一个终端接手（把下面的话发给它）

**情况 A｜新终端，代码还没拉下来** —— 把下面这段整段发给它：

```
从 GitHub 接手「观己」这个项目，先不要改任何代码，按顺序做完再说：

1) 拉代码：
   git clone https://github.com/q1956528477/-GuanJi-APP.git
   cd 仓库目录
   git checkout codex/liuyao-replica

2) 完整读一遍仓库根目录的 AGENT_README.md。它是这个项目的交接说明，
   包含技术栈、目录结构、页面架构、localStorage 键名、构建/打包流程、
   六爻结果页结构（v1.11.0 重构重点）、常见问题和本机环境坑。

3) 检查本机环境是否齐备：Node.js、JDK 17、Android SDK。
   如果换了机器，按 6.2 / 6.3 节核对
   app/android/local.properties 的 sdk.dir 与
   app/android/gradle.properties 的 projectcachedir。

4) 读完先向我汇报，不要动手改：
   - 当前分支与版本号
   - 你理解的项目结构和关键文件
   - 你打算怎么验证改动（预览方式、打包方式）
   - 有疑问的地方列出来问我
```

**情况 B｜这个终端已经有代码** —— 一句话就够：

```
在仓库根目录先 git pull（分支 codex/liuyao-replica），
然后重读一遍 AGENT_README.md 看有没有更新，再按里面的约定继续开发。
本次需求：<在这里写你的需求>
做完按约定：同步 android assets → 递增版本号三处 → 打包 APK → commit + push，
最后告诉我改了哪些文件、怎么验证的。
```

---

## 0. 交接铁律（先读这一节）

1. **只通过 Git 交接源码**，不再用压缩包传工程。
2. 每次开工**先同步**：`git pull`，确认本地与远端一致再动手。
3. 一个可验证的小改动 → 一条清晰提交 → **立即推送**。不要把多轮改动堆在本地不推。
4. APK / AAB、签名文件、用户备份数据**不进仓库**（`.gitignore` 已排除 `*.apk`、`*.aab`、`*.keystore`、`app/android/local.properties` 等）。
5. 提交信息格式：`功能描述 + 版本号 + 构建号`，例如 `六爻结果页修正：表头改回卦名 v1.11.0 (build 24)`。
6. 每次交接随提交说明写清：**本次目标 / 改动文件 / 验证结果 / 未完成事项 / 是否需要重新同步 Android 工程**。

### 常用命令（在工程根目录执行）

```powershell
git pull
git status --short
git add app/www/index.html app/android/app/build.gradle
git commit -m "功能描述 v1.11.0 (build 24)"
git push
```

---

## 1. 项目简介与技术栈

「观己」是身心状态记录 + 命理工具的混合 App，Capacitor 封装单页网页，完全离线、数据存 localStorage。

- **前端**：纯 HTML + CSS + Vanilla JS（无框架、无打包器）
- **框架**：Capacitor 6.x（Android 已接入；iOS 未接入）
- **原生插件**：`@capacitor/app`、`@capacitor/filesystem`、`@capacitor/local-notifications`
- **Android**：minSdk 22 / targetSdk 34 / compileSdk 34，Gradle 8.2.1，JDK 17
- **架构**：`app/www/index.html` 单文件承载全部 UI 与逻辑；`app/src/*.js` 经 esbuild 打成 `app/www/*.bundle.js`
- **重要**：`app/android/app/src/main/java/.../MainActivity.java` 是 Capacitor 默认的 `BridgeActivity`，**没有任何自定义原生代码**

---

## 2. 目录结构

```
app/
├── www/                        # 【真正的应用代码，改这里】
│   ├── index.html              # 单页应用主文件（全部 UI + 逻辑 + 样式）
│   ├── bazi.bundle.js          # 八字引擎 → window.Bazi（esbuild 生成）
│   ├── liuyao.bundle.js        # 六爻引擎 → window.LiuYao（esbuild 生成）
│   ├── native.bundle.js        # 原生桥接 → window.Native（esbuild 生成）
│   ├── notify.bundle.js        # 通知桥接 → window.Notify（esbuild 生成）
│   └── assets/coins/           # 铜钱图（*.png 正面 / *_back.png 背面）
├── src/                        # 桥接与引擎源码
│   ├── liuyao.js               # 六爻核心引擎（装卦、纳甲、六亲、世应、伏神、动变）
│   ├── bazi.js                 # 八字历法、四柱、十神、大运流年与神煞引擎
│   ├── yijing-data.js          # 64 卦数据（卦辞、白话、断易、邵雍、爻辞）
│   ├── native.js               # 返回键 / 退出 / 备份读写
│   └── notify.js               # 每日提醒调度
├── scripts/build.js / build.ps1 # 用 esbuild 生成四个 bundle.js（Node / PowerShell）
├── tools/generate-yijing-data.js  # 由《周易》结构化 JSON 生成 yijing-data.js
├── test_liuyao.js / test_bazi.js / test_bazi_page.js / test_navigation.js # 六爻、八字与导航测试
├── package.json                # 版本号三处之一
└── android/                    # Android 原生工程
    └── app/
        ├── build.gradle        # versionCode / versionName（版本号三处之一）
        └── src/main/assets/public/   # 同步目标目录（www 的拷贝，构建用）
```

---

## 3. 页面架构与视图层级

顶级视图互斥，靠 `.hidden` 类切换；**独立顶级视图不要嵌套进其他 view**。

```html
<div id="home-view">                     <!-- 主页 -->
<div id="bazi-form-view">                <!-- 八字排盘页 -->
<div id="bazi-records-view">             <!-- 八字命例记录 -->
<div id="bazi-info-view">                <!-- 八字基本盘 / 大运流年 -->
<div id="liuyao-view">                   <!-- 六爻模块 -->
  <div id="liuyao-cast-view">            <!--   起卦页（与结果页互斥） -->
  <div id="liuyao-result-view">          <!--   结果页 -->
</div>
<div id="liuyao-history-view">           <!-- 起卦记录（顶级、独立） -->
<div id="req-view">                      <!-- 迭代需求记录（顶级、独立） -->
<div id="day-modal">                     <!-- 日期详情弹窗 -->
```

导航参数：`currentResultId` 表示“结果页是从历史记录点进来的”，用来决定返回目标。

---

## 4. 核心功能模块

### 4.1 精力状态（Energy）

- 每日 0–100 分 + 备注 + 入睡/起床时间；14 天日历网格，点某天弹窗查看/编辑
- 只能记录最近 7 天，未来日期置灰
- 周/月趋势图，CSV 导出

### 4.2 八字排盘（Bazi）

- 主页入口进入排盘页，支持公历、农历（含闰月）、四柱直排三种模式；支持 12 时辰与精确分钟。
- 默认开启真太阳时；选择内置城市后按经度与均时差近似校正。
- 四柱严格以立春、节气为界；23:00–23:59 按晚子时规则，日柱进位、时干按当日日干起算。
- 命例按分组保存，预置默认、自己、家人、朋友、客户五组；支持搜索、排序、移动、编辑和删除。
- 信息页包含基本盘（十神、藏干、星运、自坐、纳音、空亡、神煞、胎元、命宫、身宫、五行统计）和大运流年细盘（每步大运、10 个流年、12 个流月）。
- 历法计算使用 `lunar-javascript`；神煞和司令分野的补充校验使用只读规则库 `bazi-lite`。

### 4.3 六爻卜卦（Liuyao）

**起卦方式**：铜钱摇卦（点击铜钱）、时间起卦、数字起卦、卦名起卦、手动指定、自动起卦。

**引擎能力**（`src/liuyao.js`）：纳甲装卦、六亲、世应、伏神、六神、动爻与变卦推演、用神推断、月建/日辰状态（旺相休囚死、月破、空亡、入墓、化进/化退/回头生克）、六冲六合与反吟伏吟提示。

**摇卦交互**：点铜钱 → 旋转 → 再点 → 出结果；重复 6 次；第 6 爻后 800ms 自动跳结果页并写入记录。

**count → 爻类型转换**（勿改错）：

```javascript
6 → 'old_yin'    // 老阴，动爻
7 → 'young_yang' // 少阳
8 → 'young_yin'  // 少阴
9 → 'old_yang'   // 老阳，动爻
```

**起卦记录**：存 `liuyao_history`，最多 100 条；支持查看、改事项、单条删除、编辑模式批量删除。

### 4.4 迭代需求记录（Requirements）

- 独立全屏页；增 / 改 / 删、一键复制全部、一键清空
- 数据格式：`{ text: string, createdAt: timestamp }`

---

## 5. 数据存储

全部使用 `localStorage`，**没有云端**。

| 键名 | 内容 | 代码位置 |
|---|---|---|
| `guanji_data_v1` | 精力状态：`{records:{[date]:{score,note,sleepTime,wakeTime,updatedAt}}, settings:{remindTime,lowThreshold}}` | `Storage` 对象 |
| `guanji_requirements_v2` | 迭代需求数组 | `ReqStorage` 对象 |
| `liuyao_history` | 六爻起卦记录数组（`fullResult` 存完整卦象） | `getLiuyaoHistory()` 等 |
| `guanji_bazi_groups_v1` | 八字命例分组数组 | `BaziStorage` 对象 |
| `guanji_bazi_persons_v1` | 八字命例数组（输入信息与四柱缓存） | `BaziStorage` 对象 |

**备份 / 恢复**：`native.js` 的 `writeBackup / readBackup` 会把 JSON 写到应用 Documents 目录（覆盖安装保留，卸载清除）；页面同时支持下载 JSON 与选择文件恢复。

> 改动数据结构时必须考虑旧数据兼容（读不到字段就走默认值），不要直接改键名。

---

## 6. 开发工作流

### 6.1 构建桥接模块（改了 `app/src/*.js` 才需要）

```powershell
cd app
npm run build        # 用 esbuild 生成 native / notify / liuyao / bazi 四个 bundle.js
```

> 只改 `app/www/index.html` 时**不需要**重新构建 bundle。

### 6.2 同步到 Android 工程（改了 `app/www/` 就必须做）

```powershell
$dst = "app\android\app\src\main\assets\public"
Copy-Item app\www\index.html $dst -Force
Copy-Item app\www\*.bundle.js $dst -Force
```

### 6.3 打包 Release APK

```powershell
cd app/android
$env:JAVA_HOME        = "C:\Users\v_huixqi\.workbuddy\binaries\android\jdk\jdk-17.0.20.1+1"
$env:ANDROID_HOME     = "C:\Users\v_huixqi\.workbuddy\binaries\android\sdk"
$env:GRADLE_USER_HOME = "C:\Users\v_huixqi\.workbuddy\binaries\android\gradle-home"
.\gradlew.bat assembleRelease --no-daemon
```

- 产物：`app\android\app\build\outputs\apk\release\app-release.apk`
- 交付：复制到工程根目录，命名 `观己_vX.Y_描述_release.apk`

> 另一台终端（用户名 `19565`）工具链路径结构相同，只是盘符/用户目录不同；换机前必须核对 `app/android/local.properties` 的 `sdk.dir` 与 `app/android/gradle.properties` 的 `projectcachedir`。

### 6.4 浏览器预览

```powershell
python -m http.server 8080 --directory app/www
# 打开 http://localhost:8080
```

### 6.5 版本号三处同步（打包前必须一致）

| 位置 | 字段 |
|---|---|
| `app/android/app/build.gradle` | `versionCode`（每次构建递增）、`versionName` |
| `app/package.json` | `version` |
| 交付 APK 文件名 | `观己_vX.Y_描述_release.apk` |

### 6.6 测试

```powershell
cd app
npm test            # 六爻引擎 + 八字引擎 + 八字页面集成 + 导航测试
npm run test:page   # test_app.js 页面测试，已过时且会崩，一般不用
```

- `test_liuyao.js` / `test_bazi.js` 直接读取对应 bundle 做纯逻辑校验；**改了 `app/src/*.js` 要先 `npm run build` 再跑**。
- `test_bazi_page.js` 用 jsdom 验证八字入口、保存命例、基本盘、大运流年和流月展开。
- `test_app.js` 是旧版本（v1.3 时代）的 jsdom 页面测试，检查的 DOM 结构早已不存在，且 jsdom 在本机运行会直接让 Node 崩（访问冲突），**不要用它判断代码对错**，页面一律以浏览器预览为准。

---

## 7. 六爻结果页结构（v1.11.0 重构，最容易被改坏的地方）

结果页由 `renderLiuyaoResult(r)` 统一渲染到 `#ly-result`，自上而下：

1. **信息表** `.rebu-info-table`：事项（含 `[修改]` 内联编辑）、日期、卦式、节气、干支（月/日/时与动爻地支相同则高亮）、空亡、神煞。
2. **卦象区** `.rebu-gua-area` → `renderGuaTable(ben, zhi, movingSet)`
   - 一张 table，**表头直接显示卦名**（`meta.image`，如“天泽夬”“天泽履”），左本卦、右变卦；无变卦时只有一列。
   - **本卦与变卦的同一爻放在同一行**（`i` 从 5 到 0 逐行），保证逐爻上下对齐。
   - 单爻由 `renderYaoRow(hexData, i, isMove)` 渲染，三段结构：
     `六亲+纳甲（左，含伏神）` → `爻线（正中）` → `世应/动（右）`
   - **爻线是 CSS 画的，不要改回 `▬` 字符**（字符会被字体拆成一排小方块）：
     阳爻 = `.rebu-yao-bar.yang > i.seg`（1 段 46px 黑线）；阴爻 = `.rebu-yao-bar.yin > i.seg` ×2（各 18px，间距 10px）。
   - 左/右预留区等宽（各 44px），所以爻线正好落在各卦区域**正中**，且六爻左右边缘对齐。
   - 变卦的世应、伏神一律**不增不改**（有就显示，没有就不加）。
3. **解卦区** `renderJieshiSection(ben, zhi, movingSet)`
   - 顶部两个切换按钮 `本卦：xxx` / `变卦：xxx`（无变卦时只有一个），点击调 `switchGuaJieshi('ben'|'zhi')` 切换下方面板。
   - 每个面板由 `renderJieshiContent(hexData, movingSet, isBen)` 生成，分五段独立展示：
     **卦辞**（`guaci`）→ **卦象**（`summary`）→ **卦义**（`guaciTranslation`）→ **爻辞**（`lines[]` 六爻，含原文 + 白话 + 【断易】，本卦动爻高亮标“动”）→ **传统解卦**（`shaoyong`，保留原有 🔖 框）。
4. **用神与提示** `.rebu-jieshi-gray`：`analysis.yongShen` / `yongDetail` / `alerts`（六冲六合、反吟伏吟等）。

> 卦数据字段只有 `guaci / guaciTranslation / summary / shaoyong / lines`，没有单独的“卦义”字段；当前映射如上。若用户要求调整，改 `renderJieshiContent` 里取的字段即可。

---

## 8. 代码规范

- 全部逻辑写在 `index.html` 的单个 `<script>` 内，**无模块、无依赖**；桥接能力通过 `window.LiuYao` / `window.Native` / `window.Notify` 暴露。
- 视图切换统一用 `.hidden` 类，不引入路由库。
- 样式写在 `<style>` 标签，CSS 变量在 `:root`；六爻主题金色 `#7a5d12`，主色 `--primary: #7c6cf0`。
- 所有用户输入拼进 HTML 时必须过 `escapeHtml()`。
- 命名习惯：`openXxx / backFromXxx / renderXxx / addXxx / editXxx / deleteXxx`。
- 事件绑定放在渲染函数末尾（重新 innerHTML 后需要重新绑定）。

---

## 9. 常见问题

**Q1 改完页面全白？** 单页架构里一个语法错误就全废。检查大括号/圆括号是否配平，浏览器控制台看第一条报错；提交前可用 `node --check` 校验抽出的脚本。

**Q2 摇卦不出结果？** 依次查 `finishCoin()` 的 count→爻类型转换、`doCast()` 是否拿到 question/date、`showLiuyaoResult()` 是否被调用、控制台是否报错。

**Q3 历史记录删了还在？** 删除后没写回 `localStorage.setItem('liuyao_history', ...)`。

**Q4 导航乱跳？** 检查 `currentResultId` 的设置/清除、各视图 `.hidden` 是否正确、独立顶级视图有没有被嵌进别的 view。

**Q5 摇出来总是坤卦？** count 映射写错（见 4.2）。

**Q6 日期显示 undefined？** `lunarDate` 可能为空，拼接前要判空。

**Q7 爻线变成一排小方块 / 本变卦错位？** 见第 7 节——爻线必须用 CSS 绘制，且本卦变卦要放在同一个 table 行内。

**Q8 改完 www 却打包没生效？** 忘了执行 6.2 同步到 `android/app/src/main/assets/public`。

**Q9 打完包界面还是旧的？** WebView 缓存；确认 `assets/public/index.html` 已更新（用 `Get-FileHash` 比对），必要时卸载重装。

### 环境坑（本机已知）

- 中文路径：`app/android/gradle.properties` 需保留 `android.overridePathCheck=true`。
- **工程若放在中文路径下，Node 跑 `npm test` 会直接崩（访问冲突 / 0xC0000005）**。把 `www/liuyao.bundle.js` 和 `test_liuyao.js` 复制到纯英文路径（如 `%TEMP%\guanji-test`）再跑就正常——这是路径问题，不是代码问题。`test_app.js` 则是 jsdom 自身崩溃，任何路径都跑不了。
- 删除文件：本环境 `rm` 与未 unset 的 node 删除会被 safe-delete 拦截，用 `unset NODE_OPTIONS && node -e "fs.rmSync(...)"`。
- 清 build 目录：用 `robocopy 空目录 目标 /MIR`，**一次只清一个目录**（并行/循环会静默失败）。

---

## 10. 待开发 / 已知限制

- [x] 八字排盘模块（当前版本 v1.14.1）
- [ ] 深色模式、云端同步、更多起卦方式
- [ ] **iOS 版本**：技术上很顺（Capacitor 官方支持 iOS，且本项目无自定义原生代码），但需处理：
  - 必须有 macOS + Xcode + CocoaPods（或用云 Mac）
  - **`prompt()` 在 iOS WKWebView 不可用**，需把“改需求内容”“改所问事项”换成自绘输入弹窗
  - **CSV/JSON 的 `<a download>` 导出在 iOS 无效**，需改用 Filesystem + Share
  - 返回键逻辑（`App.addListener('backButton')`）是 Android 专属，iOS 不触发
  - 安装受苹果签名限制：免费 Apple ID 自签 7 天过期；正式分发需 $99/年开发者账号走 TestFlight 或 Ad Hoc；中国区上架还需 App 备案

---

## 11. 提交前自检清单

1. 脚本大括号/圆括号配平，浏览器控制台无报错。
2. 在 `http://localhost:8080` 走一遍受影响流程（起卦 → 结果页 → 历史记录 → 返回）。
3. 320 / 360 / 390px 宽度下无横向溢出（尤其卦象表格）。
4. 改了 `app/src/*.js` → 已 `npm run build`，并跑过 `npm test`（六爻引擎测试）。
5. 改了 `app/www/` → 已同步到 `android/app/src/main/assets/public`。
6. 版本号三处一致、已递增。
7. 已 `git commit` 并 `git push`。
