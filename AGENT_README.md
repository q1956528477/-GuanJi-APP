# 观己 APP · 多终端 Agent 交接说明

> 把本文件整份贴给任意终端上的 AI Agent，它即可接手本项目。
> 仓库：`https://github.com/q1956528477/-GuanJi-APP.git`　分支：`codex/liuyao-replica`
> 当前版本：**v1.14.6 (build 40)**　最后更新：2026-09-14

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
├── test_liuyao.js / test_bazi.js / test_bazi_page.js / test_navigation.js / test_records_pin.js # 六爻、八字、导航与置顶测试
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

**记录置顶（v1.14.5）**：长按记录 → 操作菜单「置顶 / 取消置顶」，置顶记录排到列表最前并带暖色底 + 置顶徽标；取消后按原时间顺序归位。

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
| `liuyao_history` | 六爻起卦记录数组（`fullResult` 存完整卦象；`pinned` / `pinnedAt` 存置顶状态） | `getLiuyaoHistory()` 等 |
| `guanji_bazi_groups_v1` | 八字命例分组数组 | `BaziStorage` 对象 |
| `guanji_bazi_persons_v1` | 八字命例数组（输入信息、四柱缓存与 `pinned` / `pinnedAt` 置顶状态） | `BaziStorage` 对象 |

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
- `test_navigation.js` 用 jsdom 验证顶级页面互斥、需求页返回目标，以及**返回栈逐级消费**：
  出生时间弹层、`#day-modal`、`#bz-action-modal`、`#bz-move-modal`、`#bz-group-modal` 各只关自身；
  排盘页返回回来源页；第 6 / 7 条「保持现状」也有断言兜底（防止别人顺手改掉）。
- `test_records_pin.js` 用 jsdom 验证命例 / 起卦记录的长按置顶、取消置顶、排序与落盘。
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
| 12 | 精力 / 六爻 / 命例记录页 | → 主界面 |
| 13 | 已经在主界面 | 2 秒内再按一次退出 App |

> 新增任何弹窗/浮层时，**必须把它加进 `handleBack()` 的最前面那几层**，否则会出现「返回键作用到底层页面、弹窗还浮在上面」的错乱。

**9.2 已入栈的层级**：出生时间弹层（v1.14.4 修复）、起卦记录操作菜单（v1.14.5）、
`#day-modal` / `#bz-action-modal` / `#bz-move-modal` / `#bz-group-modal`（v1.14.6 修复）。

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
- **工程若放在中文路径下，Node 跑 `npm test`（jsdom）和 `npm run build`（esbuild）都会直接崩（访问冲突 / 0xC0000005）**。把 `www/*.bundle.js`、`test_*.js` 和 `src/`、`scripts/` 复制到纯英文临时目录（如 `%TEMP%\guanji-build`，把 `app/node_modules` 一起带过去）再跑就正常——这是路径问题，不是代码问题。构建产物再拷回 `app/www/`。`test_app.js` 则是 jsdom 自身崩溃，任何路径都跑不了。
- 删除文件：本环境 `rm` 与未 unset 的 node 删除会被 safe-delete 拦截，用 `unset NODE_OPTIONS && node -e "fs.rmSync(...)"`。
- 清 build 目录：用 `robocopy 空目录 目标 /MIR`，**一次只清一个目录**（并行/循环会静默失败）。

---

## 12. 待开发 / 已知限制

- [x] 八字排盘模块（当前版本 v1.14.6，含四柱直排底部弹层）
- [x] 命例 / 起卦记录置顶（v1.14.5）
- [x] **返回栈**：4 个既有弹窗已入栈、排盘页已改为回来源页（v1.14.6），清单见 9.3
- [ ] **返回栈保留项（产品决定，非缺陷）**：① 保存后信息页返回 → 回命例记录页；② 起卦结果页返回 → 回起卦记录页。详见 9.4
- [ ] 深色模式、云端同步、更多起卦方式
- [ ] **iOS 版本**：技术上很顺（Capacitor 官方支持 iOS，且本项目无自定义原生代码），但需处理：
  - 必须有 macOS + Xcode + CocoaPods（或用云 Mac）
  - **`prompt()` 在 iOS WKWebView 不可用**，需把“改需求内容”“改所问事项”换成自绘输入弹窗
  - **CSV/JSON 的 `<a download>` 导出在 iOS 无效**，需改用 Filesystem + Share
  - 返回键逻辑（`App.addListener('backButton')`）是 Android 专属，iOS 不触发
  - 安装受苹果签名限制：免费 Apple ID 自签 7 天过期；正式分发需 $99/年开发者账号走 TestFlight 或 Ad Hoc；中国区上架还需 App 备案

---

## 13. 提交前自检清单

1. 脚本大括号/圆括号配平，浏览器控制台无报错。
2. 在 `http://localhost:8080` 走一遍受影响流程（起卦 → 结果页 → 历史记录 → 返回）。
3. 320 / 375 / 428px / 平板（≥768px）四档宽度下无横向溢出（尤其六爻卦象表格和出生时间弹层）。
4. 改了 `app/src/*.js` → 已 `npm run build`，并跑过 `npm test`（六爻引擎测试）。
5. 改了 `app/www/` → 已同步到 `android/app/src/main/assets/public`。
6. 版本号三处一致、已递增。
7. 已 `git commit` 并 `git push`。
