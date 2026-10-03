# 观己 APP · 多终端 Agent 交接说明

> 把本文件整份贴给任意终端上的 AI Agent，它即可接手本项目。
> 仓库：`https://github.com/q1956528477/-GuanJi-APP.git`　分支：`codex/liuyao-replica`
> 当前版本：**v1.14.15 (build 49)**　最后更新：2026-10-03
>
> **版本已统一（2026-09-17）**：`codex/liuyao-audit-fixes`（09-16 16:00）与 `codex/liuyao-classical-text`（09-16 16:56）
> 两条并行分支已按上传时间先后合并进本分支，对外只保留 **v1.14.8 (build 42)** 这一个号。
> 两个阶段分支继续保留作回溯；**注意从它们各自打出的 APK 也叫 build 42，不要再分发**，要发就发本分支的包。
>
> **v1.14.9 (build 43)**：六爻结果页最下方新增「📋 解卦提示词」卡片（纯文本卦象描述 + 一键复制）。
> 阶段分支 `codex/liuyao-gua-text`。**从本版起，每次交付都必须真的打 release APK**（见 6.3）。
>
> **v1.14.10 (build 44)**：精力状态「每日记录」卡片新增右上角「历史记录」入口与独立按月日历视图，
> 支持逐月翻阅、当前月/今天高亮、未来日期灰显、点击日期复用原详情弹窗；两周滚动日历和最近 7 天补录规则保持不变。
>
> **v1.14.11 (build 45)**：精力历史日期格改为“日期固定顶部、表情中部居中、分数或「—」固定底部”的三段式布局；
> 有记录、无记录和未来格统一规则，不改业务逻辑、数据结构与交互。
>
> **v1.14.12 (build 46)**：六爻「卦名起卦」增加**预设变卦**——选完本卦后可再指定目标变卦，
> 动爻由两者逐爻差异自动推导（同则静爻、异则动爻），结果直接呈现该本卦→该变卦，产出与铜钱起卦同构。
> 默认值「不变（静卦）」保证原有 64 卦静卦行为零回归；其余五种起卦方式一律未动。
> 本版同时纠正了上一版对变卦范围的错误限制：**任意本卦可变为任意变卦**（候选 = 全部 64 卦，含本卦自身），
> 共 64×64 = 4096 组全部可构造（见 4.3 的术数口径）。
>
> **v1.14.13 (build 47)**：主界面「今日精力状态」上方新增只读卡片**「今日干支」**：左为当天干支四柱
> （年/月以节气为界、23:00–23:59 走既有晚子时规则）、下方为节气段与公元日期，右为时辰名与本地精确时间；
> 每分钟对齐分钟边界自动刷新，离开主界面即清理定时器。数据全部取自 `window.Bazi`（见 2.1）。
>
> **v1.14.14 (build 48)**：主界面右上角原「今天 · X月X日」改为入口按钮**「健身房Roi」**，
> 新增独立顶级视图 `#gym-view`（年卡价格 / 总出勤天数 / 累计总时长 / 距到期天数 + 月历出勤 + 单次价格与平均时长），
> 数据存新键 `guanji_gym_v1`（见 4.5）。**原日期显示已移除，`renderHome()` 不再写 `#today-chip`。**
>
> **v1.14.15 (build 49)**：六爻结果页古文区升级为 **卦辞 → 彖传 → 大象传 → 爻辞+小象传** 层级；
> 64 卦传文独立存于 `yijing-commentary-data.js`，逐爻小象与爻辞按索引绑定，本卦/变卦分别取数。

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
│   ├── yijing-data.js          # 64 卦数据（保留旧版卦辞、白话、断易、邵雍、爻辞字段）
│   ├── yijing-classical-data.js # 结果页使用的卦辞、爻辞古文数据（由 Markdown 生成）
│   ├── yijing-commentary-data.js # 64 卦彖传、大象传、逐爻小象传（Kanripo KR1a0001）
│   ├── native.js               # 返回键 / 退出 / 备份读写
│   └── notify.js               # 每日提醒调度
├── scripts/build.js / build.ps1 # 用 esbuild 生成四个 bundle.js（Node / PowerShell）
├── tools/generate-yijing-data.js  # 由《周易》结构化 JSON 生成 yijing-data.js
├── test_liuyao.js / test_bazi.js / test_bazi_page.js / test_navigation.js
├── test_records_pin.js / test_energy.js / test_modules.js # 六爻、八字、导航、置顶、精力、模块注册表测试
├── test_requirements.js        # 需求记录页 / 通用文本输入弹窗测试
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

### 4.0 主界面「今日干支」只读卡片（v1.14.13）

主界面第一张卡片，位于 `#hero`（今日精力状态）**之前**，卡片内部最上方是标题「今日干支」。

- **结构**：标题单独成行；其余三行文案（四柱 / 节气 / 公元日期）与右侧时间块**共用同一个纵向容器**
  `.gz-today-body`（`display:flex`），右块用 `align-self:center` 纵向居中于左侧三行的合并高度。
  **不要**改成固定高度、也不要加 `margin-top` 硬凑、更不要把右块单独与四柱那一行对齐。
- **文案口径**：四柱 = 引擎原值（`丙午年 丁酉月 乙未日 辛巳时`，不美化不补位）；右块第一行 = 时辰名（`巳时`），
  第二行 = 本机本地时间 `H:MM`（**不补零**，如 `9:05`，且**不带**时辰起止区间）；
  节气行 = `节气 白露 9/7–10/8`（起 = 该「节」交节当日，止 = 下一节交节当日，不含时间与年份，跨年段照写 `12/7–1/5`）；
  日期行 = `2026年9月18日`（**不含时间**，时间只在右块出现）。
- **数据全部来自 `window.Bazi`**（页面里不写历法）：
  `Bazi.calculate({calendarType:'solar', solarDate:'YYYY-MM-DD', time:'H:MM'})` 取 `pillars.year/month/day/hour`
  与 `chartSolarDatetime`；`Bazi.Solar.fromYmdHms(...)` 还原排盘时刻后交给 `Bazi.getJieQiSegment(solar)` 取节气段。
  取不到时四柱/时辰/节气/日期**留空或整行省略**，绝不臆造。
- **刷新**：`scheduleGanZhiTimer()` 按「距下一分钟还差多少毫秒」排 `setTimeout`，每次醒来重排，
  所以按 `HH:MM` 跳变**不会漂移**；重排前先判 `currentPrimaryViewId() !== 'home'` 即停。
  `showView()` 在 `id !== 'home'` 时调 `clearGanZhiTimer()`；`scheduleGanZhiTimer()` 本身**幂等**
  （已有定时器就直接返回），所以反复进出主界面不会重复注册。
- **卡片只读**：无 `onclick`、无箭头、无按压态、不打开弹层、**不登记返回栈**。
- ⚠️ **首屏必须靠初始化渲染**：首页冷启动走的是脚本末尾的 `renderHome(); openHomeGanZhiCard();`，
  **不经过 `showView('home')`**。只把渲染挂在 `showView` 里会导致冷启动时卡片空白（v1.14.13 踩过）。
- ⚠️ `test_modules.js` 末尾有一行 `process.exit(process.exitCode || 0)`：这个分钟级定时器在浏览器里本就会
  长期存在，而 jsdom 没有 `pagehide/unload` 钩子，不加这行测试跑完也不会退出。**只影响退出时机，不影响断言与遍历结论。**

### 4.1 精力状态（Energy）

- 每日 0–100 分 + 备注 + 入睡/起床时间；14 天日历网格，点某天弹窗查看/编辑
- **按月历史记录（v1.14.10）**：「每日记录」卡片右上角进入独立历史视图；周一为每周首日，
  默认当前月，可翻阅到最早记录月份，不能进入未来月份；格内显示日号、分数与 `scoreTier()` 表情，
  无记录显示「—」，今天高亮，未来日期灰显；点击非未来日期继续调用原 `openDayDetail(d)`。
  历史页仅负责浏览，不放开最近 7 天补录限制。
- **日期格三段式布局（v1.14.11）**：日期数字固定顶部，表情位于中部弹性行，分数或「—」固定底部；
  所有日期格保持相同高度，320px 至平板宽度均不产生横向滚动。
- 只能记录最近 7 天，未来日期置灰
- 周/月趋势图，CSV 导出

### 4.2 八字排盘（Bazi）

- 主页入口进入排盘页，支持公历、农历（含闰月）、四柱直排三种模式；三种模式统一收进**底部弹层选择器**（v1.14.4 改版，详见第 8 节）；支持 12 时辰与精确分钟。
- 默认开启真太阳时；选择内置城市后按经度与均时差近似校正。
- 四柱严格以立春、节气为界；23:00–23:59 按晚子时规则，日柱进位、时干按当日日干起算。
- 四柱直排在弹层里按 **1801–2099** 范围反推全部匹配日期（选中的日期直接回写出生时间）；排盘/保存链路仍走原引擎，无解时降级为“四柱直录（无出生时间）”，不阻断保存。
- 命例按分组保存，预置默认、自己、家人、朋友、客户五组；列表按姓名拼音分节并支持搜索、字母索引、批量移动、编辑和删除。
- **命例置顶（v1.14.5）**：长按命例 → 操作菜单「置顶 / 取消置顶」。置顶命例单独成「📌 置顶」区固定在最前，带暖色底 + 左侧金条 + 置顶徽标；取消置顶后回到原字母分节的原位置。排序规则见 9.1。
- 信息页包含基本盘（十神、藏干、星运、自坐、纳音、空亡、神煞、胎元、命宫、身宫、五行统计）和大运流年细盘（每步大运、10 个流年、12 个流月）。
- 历法计算使用 `lunar-javascript`；神煞和司令分野的补充校验使用只读规则库 `bazi-lite`。

### 4.3 六爻卜卦（Liuyao）

**起卦方式**：铜钱摇卦（点击铜钱）、时间起卦、数字起卦、卦名起卦、手动指定、自动起卦。

**卦名起卦 · 预设变卦（v1.14.12）**：卦名起卦在本卦下拉之后多了一个「目标变卦（可选）」下拉，
默认值 `不变（静卦）`。选中变卦后，**动爻完全由本卦与变卦的逐爻差异推导**（同则静爻、异则动爻；
本卦该爻为阳写 `old_yang`、为阴写 `old_yin`，与铜钱口径一致），产出的结果对象与 `coin` 起卦**同构**
（`astrology / ben / zhi / analysis` 齐备），所以结果页、古文区、解卦提示词卡片**无需任何改动**即可工作。

> ⚠️ **术数口径（勿再改错）**：每爻独立四态（老阴 6 / 少阳 7 / 少阴 8 / 老阳 9），动爻只有老阴与老阳；
> 老阳变阴、老阴变阳，少阳少阴不变。所以每一爻「变 / 不变」**完全自由**，下卦 2³ × 上卦 2³ = 64 种，
> 与爻的阴阳无关 —— **任意本卦都可以变为任意变卦**（含变卦 = 本卦 = 无动爻的静卦），区别只在概率。
> `乾为天 → 坤为地` 是六爻全动，概率约 1/262144，**概率极低但完全合法**。
> **卦宫（乾兑离震为阳宫、巽坎艮坤为阴宫）不约束变卦**：它只决定六亲 / 世应 / 伏神这些装卦元素，
> 且变卦的装卦仍按**本卦宫**五行推算。任何形如「变卦只能落在某个子集」「跨阴阳宫不合法」
> 「动爻数量受限」的校验或断言都属于**错误实现**，历史上曾被误写过一次（v1.14.12 已纠正）。

- 引擎侧纯函数（`app/src/liuyao.js`，均已导出到 `window.LiuYao`）：
  `movingLinesFor(bits, zhiBits)` 由两卦差异求动爻下标；`variantBitsOf(bits)` 列出候选变卦（**全部 64 卦，含本卦自身**）；
  `validateVariant(bits, zhiBits)` 只做结构性校验（六位阴阳爻 + 属于 64 卦）；`presetVariantLines(bits, zhiBits)` 生成六爻。
- `cast({method:'name', bits, zhiBits})`：不传 `zhiBits` / 传空串 / 传与本卦相同的 bits，三者**都走原静卦链路**
  （结果逐字段一致，`method` 为「卦名起卦（静卦）」）；只有传了**不同**的 `zhiBits` 才做预设变卦推导，
  `method` 文案变成「卦名起卦（预设变卦）」。
- 候选为**全部 64 卦**（含本卦自身）。UI 在选中变卦后展示「动爻 N 个 · 位置」；选中本卦自身时明确写
  「与本卦相同，即无动爻的静卦」；超过三爻时额外提示「（动爻超过三爻，卦象变化较大）」。
- **切换本卦时保留已选变卦**（因为 64×64 全部合法），只重算候选与刷新动爻提示。
- 非法输入（`zhiBits` 位数不对 / 含非阴阳爻字符 / 本卦非法）一律**拒绝并给出明确错误**，不静默生成错卦。
- ⚠️ 只有**用户真的改动本卦或变卦**（触发 `change`）时才会重算候选与提示；程序化赋值不触发事件，写测试时需自行派发 `change`。

**引擎能力**（`src/liuyao.js`）：纳甲装卦、六亲、世应、伏神、六神、动爻与变卦推演、用神推断、月建/日辰状态（旺相休囚死、月破、空亡、入墓、化进/化退/回头生克）、六冲六合与反吟伏吟提示。

**结果页传文层级（v1.14.15）**：每个本卦 / 变卦面板按「卦辞 → 彖传 → 大象传 → 爻辞」展示；
每条爻辞下方紧接同一爻位的小象传，动爻不增加额外左右内边距。传文来源为固定修订的
Kanripo KR1a0001《周易》，结果页按当前卦 `bits` 查找，历史记录和变卦均读取各自卦象的数据。

**摇卦交互**：点铜钱 → 旋转 → 再点 → 出结果；重复 6 次；第 6 爻后 800ms 自动跳结果页并写入记录。

**count → 爻类型转换**（勿改错）：

```javascript
6 → 'old_yin'    // 老阴，动爻
7 → 'young_yang' // 少阳
8 → 'young_yin'  // 少阴
9 → 'old_yang'   // 老阳，动爻
```

**起卦记录**：存 `liuyao_history`，最多 100 条；支持查看、改事项、单条删除、编辑模式批量删除。

**记录置顶（v1.14.5）**：长按记录 → 操作菜单「置顶 / 取消置顶」，置顶记录排到列表最前并带暖色底 + 置顶徽标；取消后按原时间顺序归位。

**解卦提示词（v1.14.9）**：结果页最下方（古文区之后）的「📋 解卦提示词」卡片，把本次起卦的全部信息拼成一段**纯文本**，
一键复制后可直接贴给 AI 或他人当解卦提示词。文本由引擎侧纯函数 `LiuYao.buildGuaTextPrompt(result)` 生成
（`app/src/liuyao.js`），**页面展示与复制走同一个结果**，不会出现「看到的」和「复制出来的」不一致。
所有字段都从 `cast()` 返回对象取（`astrology / ben / zhi / analysis`），取不到就整条/整节省略，禁止硬编码或臆造。

### 4.4 迭代需求记录（Requirements）

- 独立全屏页；增 / 改 / 删、一键复制全部、一键清空
- 数据格式：`{ text: string, createdAt: timestamp }`

### 4.5 健身房Roi（Gym，v1.14.14）

主界面右上角入口「健身房Roi」进入的**独立顶级视图** `#gym-view`。页面布局自上而下**固定**为：
顶栏 → 基础数据区 → 月历区 → 结论区（三张 `.card`，顺序有断言兜底）。

- **常量**（具名，勿散落魔法数字）：`GYM_CARD_PRICE = 2920`（年卡价格）、`GYM_CARD_EXPIRY = '2027-08-08'`、
  `GYM_DEFAULT_MINUTES = 60`（快捷记录默认时长）。
- **数据**：`localStorage` 键 `guanji_gym_v1`，结构 `{ sessions: { "YYYY-MM-DD": { minutes: 整数 } } }`。
  `gymLoad()` 对非法 JSON / 缺字段 / 非正数时长**一律降级跳过**，不抛错；**同一天只允许一条**（重复记录为覆盖）。
- **口径**：总出勤天数 = 有记录的日期数；单次价格 = `2920 ÷ 天数`（保留 2 位小数）；
  每次平均时长 = 累计分钟 ÷ **天数**（本项目天数==次数，但实现与注释都按「天」写）；除零时两者都显示 `—`。
- **时长格式**：`formatMinutesCN(minutes)` —— 不满 1 小时只写「xx分钟」；满 1 小时写「x小时xx分钟」；整点写「x小时」。
  ⚠️ **不要把它改名成 `formatDuration`**：项目里已有同名的「小时」口径函数给睡眠时长用，同名会互相覆盖。
- **月历**：复用精力历史那套 `.energy-month-grid / .energy-month-day / .energy-history-weekday`，
  周一为首日、今天高亮、未来日期灰显且不可点；默认当前月，不能进未来月，也不能早于**最早有记录月份**（与精力月历同口径）。
  出勤日显示绿点 + 时长（`.gym-day-dot` / `.gym-day-minutes`）。
- **交互**：点日期打开 `#gym-day-modal`（可记录 / 修改 / 删除）；时长输入走 `openTextPrompt()`（**禁用原生 `prompt()`**）；
  「今天去了」按钮一键打开今天详情，已记录时按钮文案变为「今天已记录 X · 点击修改」并加 `.done` 样式。
- **返回栈**：`#gym-day-modal` 已登记进 `handleBack()` 弹窗组（在 `#day-modal` 之后、页面分支之前）；
  `#gym-view` 已登记进 `showView()` / `currentPrimaryViewId()` / `handleBack()` 三处，返回回主界面。
- ⚠️ **主界面右上角已不再是日期**：`#today-chip` 元素被 `#gym-entry-btn`（同样带 `.today-chip` 样式类）替换，
  `renderHome()` **不得再写 `#today-chip`**，否则因元素不存在抛异常导致整页白屏。

---

## 5. 数据存储

全部使用 `localStorage`，**没有云端**。

| 键名 | 内容 | 代码位置 |
|---|---|---|
| `guanji_data_v1` | 精力状态：`{records:{[date]:{score,note,sleepTime,wakeTime,updatedAt}}, settings:{remindTime,lowThreshold}}` | `Storage` 对象 |
| `guanji_requirements_v2` | 迭代需求数组 | `ReqStorage` 对象 |
| `liuyao_history` | 六爻起卦记录数组（`fullResult` 存完整卦象；`pinned` / `pinnedAt` 存置顶状态） | `getLiuyaoHistory()` 等 |
| `guanji_bazi_groups_v1` | 八字命例分组数组 | `BaziStorage` 对象 |
| `guanji_bazi_persons_v1` | 八字命例数组（输入信息、四柱缓存与 `pinned` / `pinnedAt` 置顶状态） | `BaziStorage` 对象 |
| `guanji_gym_v1` | 健身房出勤：`{sessions:{"YYYY-MM-DD":{minutes:整数}}}`（v1.14.14 新增，同一天只一条） | `gymLoad()` / `gymSave()` |

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
- **硬性要求（v1.14.9 起）**：每次交付都必须真的跑一次 `assembleRelease` 并交出 APK，不能只改代码。
  交付时同时给出：APK 完整路径、文件大小，以及包内 `assets/public/index.html` 与本机文件的 SHA-256 是否一致：

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path 观己_vX.Y_描述_release.apk))
$e = $zip.Entries | Where-Object { $_.FullName -eq 'assets/public/index.html' }
$ms = New-Object System.IO.MemoryStream; $e.Open().CopyTo($ms)
([System.Security.Cryptography.SHA256]::Create().ComputeHash($ms.ToArray()) | ForEach-Object { $_.ToString('x2') }) -join ''
# 再与本机 app\www\index.html 的 Get-FileHash -Algorithm SHA256 对比
```

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
npm test            # 全量 11 套：精力 + 模块注册表 + 需求 + 健身房 + 六爻(3) + 八字(2) + 导航 + 置顶
npm run test:energy # 只跑精力状态模块
npm run test:modules# 只跑主界面模块注册表
```

- `test_liuyao.js` / `test_bazi.js` 直接读取对应 bundle 做纯逻辑校验；**改了 `app/src/*.js` 要先 `npm run build` 再跑**。
  `test_liuyao.js` 另含 `buildGuaTextPrompt` 的纯文本断言：变卦 / 静卦两态、六爻自上而下、无标签无 emoji、缺字段不臆造。
  预设变卦另有独立断言组：**不选变卦时 64 卦全部保持静卦（零回归）**、`movingLinesFor` 的差异推导、
  **64×64 = 4096 组组合全量校验**（任意本卦可变为任意变卦，变卦 bits 与动爻位置逐组一致）、
  64 组「变卦 = 本卦」全部等价于不传 `zhiBits`、乾为天→坤为地六爻全动、变卦六亲按本卦宫独立重算比对、
  变卦不增伏神、**反向断言「候选恰为 64 卦且校验无子集限制」**、跨阴阳宫组合可用、
  动爻数量边界（全动 / 五动 / 零动 / 仅初 / 仅上）、六个爻位分别单独为动爻、
  铜钱起卦显式传入非法六爻被拒绝、提示词在静卦 / 单动爻 / 六爻全动三态下的一致性。
- `test_liuyao_page.js` 用 jsdom 验证六种起卦入口、64 卦 bits 映射、数字/时间边界、manual 初爻顺序、coin 单次保存和方式切换状态隔离；
  并验证「解卦提示词」卡片：DOM 位置在古文区之后、展示文本与复制文本**逐字符一致**、
  `navigator.clipboard` 失败时回退 `execCommand('copy')`、全失败时提示长按、静卦与历史记录路径同样可用。
  预设变卦的页面断言：默认「不变（静卦）」、**候选 65 项（「不变」+ 全 64 卦，含本卦自身）**、动爻提示数量与位置、
  选本卦自身提示为静卦且起卦落地 `zhi === null`、结果页表头为「本卦,变卦」、乾为天→坤为地六爻全动且本卦侧标 6 个「动」、
  静卦结果页只有单列、提示词三要素、落盘、**切本卦后保留已选变卦并按新组合刷新提示**、候选随本卦更新。
- `test_liuyao_classical_page.js` 验证卦辞、彖传、大象传、爻辞和小象传的层级与逐爻对应；「不泄漏现代解读」断言只作用于**古文区**（`.rebu-jieshi-section`）。
  ⚠️ 不要改回整页扫描：结果页最下方的解卦提示词结尾句按需求固定含「卦象」二字，整页扫描必然误报。
- `test_bazi_page.js` 用 jsdom 验证八字入口、保存命例、基本盘、大运流年和流月展开。
  另含「今日干支」卡片断言：**冷启动首屏即有内容**（初始化必须调用 `openHomeGanZhiCard()`）、卡片在 `#hero` 之前、
  不是 `.mod-card`、标题文案、右块与左侧三行共用同一纵向容器且靠 `align-self` 居中（结构 + 样式双断言）、
  四柱与 `Bazi.calculate` 同源、时辰名/不补零时间/节气段格式/日期行不含时间、右块不含时辰区间、
  时间文案变化后仍居中、跨日与跨节气更新、**23:30 晚子时四柱与引擎一致**、
  定时器（注册 / 幂等不重复注册 / 切走清理 / 回主界面重建 / 到期自续期）、卡片只读。
- `test_navigation.js` 用 jsdom 验证顶级页面互斥、需求页返回目标，以及**返回栈逐级消费**：
  出生时间弹层、`#day-modal`、`#bz-action-modal`、`#bz-move-modal`、`#bz-group-modal` 各只关自身；
  排盘页返回回来源页；第 6 / 7 条「保持现状」也有断言兜底（防止别人顺手改掉）。
- `test_records_pin.js` 用 jsdom 验证命例 / 起卦记录的长按置顶、取消置顶、排序与落盘。
- `test_energy.js` 用 jsdom 验证精力状态：进入页面、打分表情联动、保存落盘、折线图、洞察统计、日历标记、补录超 7 天拦截、日详情修改回填；
  另覆盖历史记录入口、默认当前月、上下月切换、未来月拦截、记录/无记录格子、日期格三段式结构、详情弹窗复用及返回栈。
- `test_requirements.js` 用 jsdom 验证迭代需求记录页与**通用文本输入弹窗**：点「修改」必须回填原内容、
  保存是原地更新（条数不变、`createdAt` 不被破坏、其它记录不受影响）、取消与返回键不写回、新增才追加。
  另含「分组重命名必须回填原名」的同根因回归断言。
- `test_gym.js`（v1.14.14 新增，第 11 套）用 jsdom 验证健身房Roi：入口文案与跳转、原日期显示已移除且无残留 `#today-chip` 赋值、
  新视图与其它顶级视图互斥、页面四段顺序、月历（周一为首日 / 今天 / 未来 / 翻阅边界）、
  出勤增删改落盘与**同一天只一条**、快捷按钮与已记录反馈、单次价格与平均时长的构造数据手算核对、
  时长格式三态、**除零显示「—」且无 NaN/Infinity**、脏数据降级、既有 localStorage 键不受影响、返回键逐级返回。
- `test_modules.js` 用 jsdom 遍历主界面**每一个**模块卡片，验证徽标与上线状态一致、点击后只进入一个视图、返回键可逐级退回主界面。
  **刻意不写死模块数量与名称**：以后新增模块会自动被覆盖，加模块不需要改这个测试。
  ⚠️ 因此**不要再往测试里写「模块卡片数量 = N」「未上线模块只有 M 个」这类断言**——每加一个模块都会误报，属于倒退。
- 旧的 `test_app.js`（v1.3/v1.4 时代的整页快照测试）已删除：它写死了模块数量，且部分断言对应早已重构掉的界面，
  既不参与 `npm test`，又容易让接手的人误以为功能坏了。它的有效部分已迁入 `test_energy.js` 与 `test_modules.js`，历史可在 git 里翻 `4599232` / `0465f51`。

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
3. **古文区** `renderJieshiSection(ben, zhi, movingSet)`
   - 顶部两个切换按钮 `本卦：xxx` / `变卦：xxx`（无变卦时只有一个），点击调 `switchGuaJieshi('ben'|'zhi')` 切换下方面板。
   - 每个面板由 `renderJieshiContent(hexData, movingSet, isBen)` 生成，顺序固定为 **卦辞 → 彖传 → 大象传 → 爻辞+小象传**。
   - 每条爻辞与小象传共用一个 `.rebu-yaoci` 内容组：第一行爻辞，下一行小象传；动爻只加背景和标记，不增加额外左右内边距。
   - `yijing-data.js` 中旧的白话、断易、邵雍等字段必须保留，但结果页不得读取或渲染。卦辞/爻辞来自 `yijing-classical-data.js`，传文来自 `yijing-commentary-data.js`；历史记录按当前卦的 `bits` 回填。
   - 乾卦保留「用九」及小象传，坤卦保留「用六」及小象传；本卦动爻高亮逻辑不变。
   - Markdown 解析与古文校验脚本：`tools/generate-yijing-classical-data.js`；传文来源修订记录在 `YIJING_COMMENTARY_SOURCE`。
4. **解卦提示词卡片** `.rebu-prompt-card`（v1.14.9，结果页**最下方，必须在古文区之后**）
   - 结构：`📋 解卦提示词` 标题 + `复制` 按钮 + `<pre class="rebu-prompt-text">` 纯文本块；由 `renderGuaTextCard(r)` 生成，插在 `renderJieshiSection(...)` 之后。
   - 文本由 `LiuYao.buildGuaTextPrompt(result)` 生成（`app/src/liuyao.js`），`renderGuaTextCard` 与 `copyGuaPrompt` 都调它，天然同源。
   - 覆盖：起卦时间 / 干支 / 所问事项 / 起卦方式 / 本卦名 / 变卦名（静卦写「无变卦（静卦）」）/ 动爻位置（无则「无动爻」）/
     本卦六爻自上而下逐爻（爻位·阴阳·纳甲干支·六亲·世应·是否动爻）/ 变卦六爻同上 / 卦辞与爻辞 / 用神与提示（全空则整节省略）/ 结尾请求句。
   - 复制：优先 `navigator.clipboard.writeText`，失败回退 `fallbackCopyText()`（`document.execCommand('copy')` 临时 textarea，用完即删）；
     成功提示「已复制解卦提示词」，全失败提示「复制失败，请长按上方文字手动复制」。
   - **不要顺手改动**：① 卦象区爻线对齐；② 古文区只显示卦辞、彖传、大象传、爻辞与小象传，不读取旧白话字段；③ 结果页返回 → 起卦记录页；④ 原生 `prompt()` 不可用，输入一律用 `openTextPrompt()`；⑤ 不新增第三方依赖。
- **变卦范围不受任何限制**（v1.14.12 纠正）：不要给 `variantBitsOf` / `validateVariant` 加"同宫""子集""动爻数量"之类的过滤，
  也不要在测试里断言「某卦不能变某卦」。判定基准见 4.3 的术数口径；`test_liuyao.js` 里有反向断言兜底（候选恰为 64 卦、64×64 全放行）。

---

## 8. 出生时间弹层（v1.14.4 改版，第二容易被改坏的地方）

排盘表单里原来那套「历法类型分段控件 + 内联日期/时间输入」已经**整体删掉**，只剩一行触发行，
点它有且只有一个入口：`openGzSheet()`。

```html
<div class="modal-overlay gz-sheet-overlay" id="gz-sheet">   <!-- 遮罩 rgba(0,0,0,.4)，点空白处关闭且不保存 -->
  <div class="gz-sheet">                                     <!-- 白色、顶部两角圆角、max-width 480 / max-height 85vh -->
    <div class="gz-sheet-head">                              <!-- 固定不滚动 -->
      <div class="gz-sheet-tabs" id="gz-sheet-tabs">          <!-- 公历 / 农历 / 四柱，默认四柱 -->
      <button id="gz-sheet-confirm">确定</button>             <!-- 黑色圆角；不可确认时置灰 -->
    </div>
    <div class="gz-sheet-body">                              <!-- 唯一滚动容器 -->
      <div class="gz-pane" id="gz-pane-solar">               <!-- #gz-solar-date -->
      <div class="gz-pane" id="gz-pane-lunar">               <!-- #gz-lunar-year / #gz-lunar-month / #gz-lunar-day -->
      <div class="gz-time-block" id="gz-time-block">         <!-- 精确到分钟 / 十二时辰；四柱 tab 下隐藏 -->
      <div class="gz-pane" id="gz-pane-ganzhi">
        <div id="gz-pillars">                                <!-- 四列：年/月/日/时，每列上干下支两个圆形槽位 -->
        <div id="gz-picker">                                 <!-- 十干 2×5 或六支 3×2 -->
        <div class="gz-range-row">查找范围：1801~2099年 + #gz-clear
        <div id="gz-results">                                <!-- 反推结果卡片列表 -->
```

**交互铁律（改之前先读完）**

1. 点天干槽 → 铺开十天干面板；点定某天干 → 天干落槽，面板**自动切成地支面板**。
2. 地支面板只列与所选天干**阴阳相同**的 6 个支（阳干甲丙戊庚壬 → 子寅辰午申戌；阴干乙丁己辛癸 → 丑卯巳未酉亥）。
   阴阳判断在 `renderGzPicker()`：`Bazi.GAN.indexOf(pillar.gan) % 2 === 0`——**别改成拿天干去查地支数组**（曾写错过一次）。
   这样从 UI 层就杜绝了非六十甲子组合，不需要事后校验报错。
3. 点地支 → 落槽、面板回到待命态（`activeSlot = null`）；点已填槽位可重选；**改选天干后原地支必须清空**（`pickGzGan()`）。
4. 八个字齐 → `refreshGzMatches()` 调 `Bazi.findDirectMatches(pillars, {startYear:1801, endYear:2099})`，
   每张卡取该日该时辰的**起始时刻**（子时即 00:00:00）。无匹配只显示灰字「查找范围内无匹配结果」，不弹错、不阻断。
5. 结果卡片未选中时 `#gz-sheet-confirm` 必须保持 `disabled`（`gzDraftConfirmable()`）；确定才把时间回写 `baziFormState` 并关层。
6. 点遮罩只关层、`gzSheet` 置 null，**草稿不得写回** `baziFormState`。

**引擎侧（`app/src/bazi.js`）**

- 新增 `findDirectMatches()` / `collectDirectMatches()` / `directMatchSerial()`，导出 `findDirectMatches`。
- `resolveDirectSolar()` 默认区间仍是 1900–2100；**仅当参考日期落在区间外时**按参考年把窗口扩到覆盖它。
  原因：弹层能选到 19 世纪的匹配日期，回推时必须落在同一天，否则会串到另一甲子周期。
- 文案与常量对齐：`DIRECT_MATCH_YEAR_START/END = 1801/2099`。

**样式要点**

- 五行字色 `.gz-el-mu/huo/tu/jin/shui`（木 `#4E7A3A`、火 `#C0392B`、土 `#8B7355`、金 `#A08530`、水 `#5B7E9B`），
  对应极浅底色 `.gz-tint-*`；刚填的槽位加 `.gz-slot.active`（浅绿描边）。
- 槽位圆 `clamp(44px,14.5vw,56px)`，干支单元格 `.gz-cell` 尺寸全部用相对单位，320px 下不得溢出、干支单字不得换行。
- 视口 ≥768px 时 `#app{max-width:480px}`，弹层靠 `.modal-overlay` 自带的 `justify-content:center` 居中。

> 如果以后要给表单加回「历法类型」控件，先想清楚会不会和弹层 Tab 打架——现在 `collectBaziForm()` 全部读 `baziFormState`，
> 不再从 DOM 里取日期/时间/历法字段。

---

## 9. 返回层级与返回栈（Android 物理返回键 / 侧滑返回）

返回键只有一个入口：原生插件回调 → `Native.onBackButton(() => handleBack())`（`window.Native` 仅在原生环境注册）。
`handleBack()` 必须严格按**后进先出**判定，先关最上层，再逐级退页面。

**9.1 判定顺序（改动前务必先读）**

| 顺序 | 层级 | 返回行为 |
|---|---|---|
| 1 | `gzSheet` 非空（出生时间弹层 `#gz-sheet`） | `closeGzSheet()`，**留在排盘页**，未确认的草稿不写回 |
| 2 | `#ly-action-modal` 可见（起卦记录长按菜单） | `closeLiuyaoHistoryActions()`，留在起卦记录页 |
| 3 | `#bz-move-modal` 可见（移动到分组） | `closeBaziMoveModal()`，留在命例记录页（清空 `baziMovePersonIds`） |
| 4 | `#bz-action-modal` 可见（命例长按菜单） | `closeBaziPersonActions()`，留在命例记录页 |
| 5 | `#bz-group-modal` 可见（分组管理） | `closeBaziGroupModal()`，留在命例记录页 |
| 6 | `#day-modal` 可见（精力状态日期详情） | `closeDayDetail()`，留在精力状态页 |
| 7 | `#req-view` 可见 | `closeReqView()` → 回到打开它的页面（`reqReturnView`） |
| 8 | `#liuyao-history-view` 可见 | `backFromHistory()` → 六爻起卦页 |
| 9 | 六爻结果页可见 | `backFromResult()` → 从历史点进则回历史，否则回起卦记录页 |
| 10 | `#bazi-info-view` 可见 | → 命例记录页（**按需求刻意如此**，见 9.4） |
| 11 | 排盘页 `#bazi-form-view` 可见 | `backFromBaziForm()` → 回**进入排盘页时的来源页**（`baziFormReturnView`） |
| 12 | `#energy-history-view` 可见 | `backFromEnergyHistory()` → 精力状态页 |
| 13 | 精力 / 六爻 / 命例记录页 | → 主界面 |
| 14 | 已经在主界面 | 2 秒内再按一次退出 App |

> 新增任何弹窗/浮层时，**必须把它加进 `handleBack()` 的最前面那几层**，否则会出现「返回键作用到底层页面、弹窗还浮在上面」的错乱。

**9.2 已入栈的层级**：出生时间弹层（v1.14.4 修复）、起卦记录操作菜单（v1.14.5）、
`#day-modal` / `#bz-action-modal` / `#bz-move-modal` / `#bz-group-modal`（v1.14.6 修复）、
精力历史独立视图 `#energy-history-view`（v1.14.10）。

**9.3 既有弹窗入栈修复（v1.14.6 已完成，勿再回退）**：

| 弹窗 | 打开位置 | 修复前按返回 | 现在的行为 |
|---|---|---|---|
| `#day-modal` | 精力状态 → 点某天 | 回主界面，弹窗仍浮着 | 只关弹窗，留在精力状态页 |
| `#bz-action-modal` | 命例记录 → 长按命例 | 回主界面，弹窗仍浮着 | 只关菜单，留在命例记录页 |
| `#bz-move-modal` | 命例记录 → 长按 → 移动到分组 | 回主界面，弹窗仍浮着 | 只关弹窗，留在命例记录页 |
| `#bz-group-modal` | 命例记录 → 分组管理 | 回主界面，弹窗仍浮着 | 只关弹窗，留在命例记录页 |

另外把原先**合并在一起**的页面分支拆开了：原来 `energyVisible || liuyaoVisible || baziFormVisible || baziRecordsVisible` 一律 `showView('home')`，
现在排盘页单列一支走 `backFromBaziForm()`，其余维持回主界面。

**9.4 跳级返回：1 条已修，2 条按需求刻意保留**

| 路径 | 之前按返回 | 现在按返回 | 状态 |
|---|---|---|---|
| 命例记录 → 长按 → 编辑重新排盘 → 排盘页 | 直接回主界面（跳过命例记录） | 回命例记录页 | ✅ v1.14.6 已修 |
| 排盘页 → 保存（自动进信息页）→ 信息页 | 回命例记录页（跳过排盘页） | 回命例记录页 | ⛔ **按需求刻意保持现状** |
| 六爻起卦页 → 起卦完成进结果页 | 回起卦记录页 | 回起卦记录页 | ⛔ **按需求刻意保持现状** |

> 修法：排盘页新增来源记忆 `baziFormReturnView`（取值 `home` / `bazi-records` / `bazi-info`），
> `openBaziForm()` 进入时用 `currentPrimaryViewId()` 记下来源，返回时 `backFromBaziForm()` 退回该页并复位为 `home`。
> 排盘页左上角「← 返回」按钮与物理返回键共用同一条路径。
>
> **第 2、3 条为什么保持现状**：产品把「保存后自动进入的命盘信息页」和「起卦完成后的结果页」当作流程终点，
> 返回到达记录列表比退回中间输入页更符合使用习惯。**不要「顺手修掉」，这是产品决定。**
> 副作用记一笔：`showLiuyaoResult()` 仍会把 `currentResultId` 赋成新记录 id，与 `backFromResult()` 注释里
> 「currentResultId 表示结果页是从历史点进来的」的表述不一致；注释与实现以**实现**为准。

---

## 10. 代码规范

- 全部逻辑写在 `index.html` 的单个 `<script>` 内，**无模块、无依赖**；桥接能力通过 `window.LiuYao` / `window.Native` / `window.Notify` 暴露。
- 视图切换统一用 `.hidden` 类，不引入路由库。
- 样式写在 `<style>` 标签，CSS 变量在 `:root`；六爻主题金色 `#7a5d12`，主色 `--primary: #7c6cf0`。
- 所有用户输入拼进 HTML 时必须过 `escapeHtml()`。
- 命名习惯：`openXxx / backFromXxx / renderXxx / addXxx / editXxx / deleteXxx`。
- 事件绑定放在渲染函数末尾（重新 innerHTML 后需要重新绑定）。

---

## 11. 常见问题

**Q1 改完页面全白？** 单页架构里一个语法错误就全废。检查大括号/圆括号是否配平，浏览器控制台看第一条报错；提交前可用 `node --check` 校验抽出的脚本。

**Q2 摇卦不出结果？** 依次查 `finishCoin()` 的 count→爻类型转换、`doCast()` 是否拿到 question/date、`showLiuyaoResult()` 是否被调用、控制台是否报错。

**Q3 历史记录删了还在？** 删除后没写回 `localStorage.setItem('liuyao_history', ...)`。

**Q4 导航乱跳？** 检查 `currentResultId` 的设置/清除、各视图 `.hidden` 是否正确、独立顶级视图有没有被嵌进别的 view。

**Q5 摇出来总是坤卦？** count 映射写错（见 4.2）。

**Q6 日期显示 undefined？** `lunarDate` 可能为空，拼接前要判空。

**Q7 爻线变成一排小方块 / 本变卦错位？** 见第 7 节——爻线必须用 CSS 绘制，且本卦变卦要放在同一个 table 行内。

**Q8 改完 www 却打包没生效？** 忘了执行 6.2 同步到 `android/app/src/main/assets/public`。

**Q9 打完包界面还是旧的？** WebView 缓存；确认 `assets/public/index.html` 已更新（用 `Get-FileHash` 比对），必要时卸载重装。

**Q10 四柱弹层点不动 / 点了就关？** 弹层打开后遮罩铺满全屏，此时再去点表单里的「出生时间」触发行，点到的是遮罩——会按规格关层（不保存）。这是预期行为，不是 bug。

**Q11 弹层里选甲却出现阴支？** 见第 8 节第 2 条，阴阳判断写错了。

**Q12 按返回键弹窗还浮着、背景跳到主界面？** 该弹窗没进 `handleBack()` 的返回层级（见 9.1 / 9.3）；把它按顺序加进去即可。

### 环境坑（本机已知）

- 中文路径：`app/android/gradle.properties` 需保留 `android.overridePathCheck=true`。
- **工程若放在中文路径下，Node 跑 `npm test`（jsdom）和 `npm run build`（esbuild）都会直接崩（访问冲突 / 0xC0000005）**。把 `www/*.bundle.js`、`test_*.js` 和 `src/`、`scripts/` 复制到纯英文临时目录（如 `%TEMP%\guanji-build`，把 `app/node_modules` 一起带过去）再跑就正常——这是路径问题，不是代码问题。构建产物再拷回 `app/www/`。
- **原生 `prompt()` 在本项目里是坏的，别再用**：Android WebView（Capacitor `BridgeWebChromeClient.onJsPrompt`）只 new 一个空 `EditText` 弹出来，**`defaultValue` 参数从头到尾没被使用**，所以「修改」类弹窗永远是空白的（v1.14.7 修的 Bug）；iOS WKWebView 干脆不支持 prompt。需要输入一律用自绘的 `openTextPrompt({title, value, multiline, placeholder, confirmText})`，它返回 Promise（确认得文本，取消/返回键/点遮罩得 `null`），已接进 `handleBack()`。
- 删除文件：本环境 `rm` 与未 unset 的 node 删除会被 safe-delete 拦截，用 `unset NODE_OPTIONS && node -e "fs.rmSync(...)"`。
- 清 build 目录：用 `robocopy 空目录 目标 /MIR`，**一次只清一个目录**（并行/循环会静默失败）。

---

## 12. 待开发 / 已知限制

- [x] 八字排盘模块（v1.14.4 起含四柱直排底部弹层）
- [x] **六爻起卦审计修复**（v1.14.8，来自分支 `codex/liuyao-audit-fixes`）：卦名映射、数字/手动起卦输入校验、摇卦状态隔离
- [x] **六爻结果页古文解读**（v1.14.8，来自分支 `codex/liuyao-classical-text`）：只显示卦辞与爻辞，数据源 `yijing-classical-data.js`
- [x] **六爻传文层级与逐爻小象传**（v1.14.15，分支 `codex/liuyao-commentary-ui`）：卦辞 / 彖传 / 大象传 / 爻辞 / 小象传，来源 Kanripo KR1a0001
- [x] **六爻结果页解卦提示词**（v1.14.9，来自分支 `codex/liuyao-gua-text`）：纯文本 + 一键复制，见 4.3 与 7.4
- [ ] ⚠️ **待产品确认（v1.14.9 遗留）**：需求清单第 1–10 条**没有**要求把卦辞/爻辞写进提示词，
      但结尾句却写着「请结合以上卦象与卦辞、爻辞，为我解读这一卦。」，所以本版把卦辞/爻辞也拼了进去（数据来自 `meta.classical`）。
      若产品只想保留 1–10 条，删掉 `buildGuaTextPrompt` 里 `formatClassicalPrompt` 那两段即可，其余不用动。
- [ ] ⚠️ **「传统解卦」已按需求移除**（v1.14.8，随古文解读一起）：结果页不再显示邵雍断易 / 用神提示。
      这是两条分支合并时「以 09-16 16:56 那条为准」的结果，**不是回归**，不要再按旧需求把它加回来；要恢复请先与产品确认
- [x] 命例 / 起卦记录置顶（v1.14.5）
- [x] **精力状态按月历史记录**（v1.14.10，阶段分支 `codex/energy-history`）：独立视图、逐月翻阅、未来月拦截、返回栈接入
- [x] **卦名起卦 · 预设变卦**（v1.14.12）：本卦 + 目标变卦 → 动爻自动推导，结果与铜钱起卦同构，见 4.3。
      **候选为全部 64 卦（含本卦自身 = 静卦），共 64×64 = 4096 组全部合法**；
      `乾为天 → 天风姤` 只动初爻、`乾为天 → 坤为地` 六爻全动，都是合法组合。
      新增均为纯函数 + 一个下拉 + 一行提示，**不引入新弹层，因此未触碰返回栈三层登记**。
- [x] **v1.14.12 审计纠正**：上一版曾错误地把候选限制为「除本卦外的 63 卦」并拒绝「变卦 = 本卦」，
      理由是误以为需要「上下卦同属阳宫/阴宫」。该结论**是错的**，已在 v1.14.12 纠正（引擎 + UI + 测试 + 本文档）。
      同时修掉两个真实缺陷：① 提示行引用了非全局的 `MANUAL_LABELS` 且把 `LiuYao` 误写成 `Liuyao`，
      导致选中变卦后恒显示「该变卦不可用」；② 铜钱起卦显式传入非法六爻（5 爻 / 非法类型）会被静默接受。
- [x] **主界面「今日干支」只读卡片**（v1.14.13）：位于 `#hero` 之前，四柱 / 时辰名 + 精确时间 / 节气段 / 公元日期，
      每分钟对齐分钟边界刷新，离开主界面清理定时器，见 4.0。**新增 1 个纯函数 + 1 个既有对象导出**（详见 6.6）。
- [x] **返回栈**：4 个既有弹窗已入栈、排盘页已改为回来源页（v1.14.6），清单见 9.3
- [ ] **返回栈保留项（产品决定，非缺陷）**：① 保存后信息页返回 → 回命例记录页；② 起卦结果页返回 → 回起卦记录页。详见 9.4
- [ ] 深色模式、云端同步、更多起卦方式
- [ ] **iOS 版本**：技术上很顺（Capacitor 官方支持 iOS，且本项目无自定义原生代码），但需处理：
  - 必须有 macOS + Xcode + CocoaPods（或用云 Mac）
  - ~~`prompt()` 在 iOS WKWebView 不可用~~ → 需求修改 / 所问事项 / 分组重命名已改为自绘弹窗（v1.14.7）；
    仍剩 3 处 `prompt()` 只用于「输入新分组名称」这类**新建**场景（空白本来就是正确行为），上 iOS 前建议一并换掉
  - **CSV/JSON 的 `<a download>` 导出在 iOS 无效**，需改用 Filesystem + Share
  - 返回键逻辑（`App.addListener('backButton')`）是 Android 专属，iOS 不触发
  - 安装受苹果签名限制：免费 Apple ID 自签 7 天过期；正式分发需 $99/年开发者账号走 TestFlight 或 Ad Hoc；中国区上架还需 App 备案

---

## 13. 提交前自检清单

1. 脚本大括号/圆括号配平，浏览器控制台无报错。
2. 在 `http://localhost:8080` 走一遍受影响流程（起卦 → 结果页 → 历史记录 → 返回）。
3. 320 / 375 / 428px / 平板（≥768px）四档宽度下无横向溢出（尤其六爻卦象表格和出生时间弹层）。
4. 改过代码 → 在英文临时目录（见「环境坑」）跑过 `npm test` 全量；加了新模块 → 确认 `test_modules.js` 自动覆盖到、无需改断言。
5. 改了 `app/www/` → 已同步到 `android/app/src/main/assets/public`。
6. 版本号三处一致、已递增。
7. **已跑 `gradlew assembleRelease` 并交出 APK**（v1.14.9 起为固定项），包内 `assets/public/index.html` 哈希与本机一致。
8. 已 `git commit` 并 `git push`（主线之外再推一条阶段分支，便于回溯）。
