# 阅栈 ReadStack · 安装与部署说明

本应用是 **零三方依赖的纯前端 PWA**（HTML/CSS/JS + Service Worker），因此有两种"安装包"形态：

1. **PWA 安装包（推荐）** —— 无需编译，部署到任意 HTTPS 站点后，在小米 17 上"添加到主屏幕"即可像原生 App 一样全屏运行、可离线使用。
2. **Android .apk 原生安装包** —— 把 PWA 进一步封装为 APK（见下文"方式二"），适合需要传统安装包分发的场景。

---

## 方式一：PWA 安装到澎湃 OS（零构建，推荐）

### 1. 部署到 HTTPS 静态托管
把整个 `mibook/` 文件夹上传到任意支持 HTTPS 的静态托管，例如：
- **GitHub Pages**（仓库根目录放 `mibook/`，开启 Pages）
- 任意带 HTTPS 的静态服务器 / 对象存储（OSS、COS）
- 内网也可用带 HTTPS 的自建服务

> 注意：浏览器**只在安全上下文（https:// 或 http://localhost）下允许安装 PWA**。
> 直接用 `file://` 双击打开 HTML 无法安装，也无法离线缓存。

### 2. 在小米 17（澎湃 OS）上安装
1. 用系统浏览器 / Chrome / Edge 打开部署好的地址。
2. 两种方式触发安装：
   - **系统弹窗**：满足可安装条件时，地址栏右侧会出现"安装应用"图标，点一下即可。
   - **手动**：浏览器菜单 →「添加到主屏幕 / 安装应用」。
   - **应用内**：进入「我的」页，点「安装到桌面」按钮直接唤起安装。
3. 桌面出现「阅栈」图标，点开即全屏运行，**无地址栏、无浏览器 chrome、可离线**。

### 3. 离线能力
`sw.js` 已在首次访问时缓存整个 App Shell。断网后第二次打开仍可正常使用，数据保存在本机 `localStorage`。

---

## 方式二：封装为 Android .apk（原生安装包）

本构建环境未安装 Android SDK，无法直接编译 APK。任选其一：

### A. Microsoft PWA Builder（云端，最简单）
1. 打开 https://www.pwabuilder.com
2. 填入你的 PWA 地址（需公网 HTTPS），按引导生成
3. 下载 `.apk` 或 `.aab`，传到手机安装即可

### B. 本地 Bubblewrap（需 Android SDK + JDK）
```bash
npx @bubblewrap/cli init --manifest https://你的域名/manifest.webmanifest
npx @bubblewrap/cli build
```
> 需要本地已配置 `JAVA_HOME`、Android SDK 命令行工具、`apksigner` / `zipalign`，且能联网下载依赖。

### C. 一键脚本（把封装步骤自动化）

仓库已附带 `build-apk.sh`，把上面 A/B 的手动步骤浓缩成一条命令（底层仍是 PWA Builder 同款 Bubblewrap 工具链）：

```bash
# 1) 先确保已用 HTTPS 部署 PWA（GitHub Pages / OSS 等），拿到 manifest 公网地址
./build-apk.sh https://你的域名/manifest.webmanifest

# 或者完全本地、无需提前部署（脚本会起服务 + localtunnel 临时隧道）
./build-apk.sh --local

# 预置签名密码可免交互：
KS_PASS=你的密码 ./build-apk.sh https://你的域名/manifest.webmanifest
```

脚本会自动：检测 Node/JDK/SDK → 生成/复用 Android 签名 keystore → `bubblewrap init` → `bubblewrap build`（签名）→ 把产物打包成 `ReadStack-APK.zip`。
首次运行会在 `twa-project/` 生成原生工程，后续重新构建会复用；**升级 APK 时务必保留 `android.keystore.jks` 与密码**（同签名才能覆盖安装）。

**前置安装（一次性）**：
- Node.js ≥ 18：https://nodejs.org
- JDK ≥ 17（含 keytool）：https://adoptium.net
- Android cmdline-tools + build-tools(30+) + platform(34)，并设 `ANDROID_HOME` / `JAVA_HOME`
- Windows 用户请用 **Git Bash** 或 **WSL** 运行本脚本

### 安装 APK 到小米 17
- 开启「设置 → 更多设置 → 开发者选项 → USB 调试」，用 `adb install ReadStack.apk`；
- 或直接把 APK 传到手机，允许"未知来源"后点击安装。

---

## 卸载与数据备份
- 卸载 PWA 或 APK 会**清除本机 localStorage 数据**，卸载前请到「我的 → 导出备份文件」生成 Excel 备份(.xlsx)。
- 重新安装后可用「从备份恢复」（支持 Excel / JSON，覆盖 / 合并导入）。

---

## 产物清单
| 文件 | 说明 |
|------|------|
| `index.html` | 应用入口 |
| `manifest.webmanifest` | PWA 清单（名称/图标/standalone/竖屏） |
| `sw.js` | Service Worker（离线缓存） |
| `assets/css/*.css` | 设计系统与各模块样式（4 份） |
| `assets/js/*.js` | 数据层/图表/界面/视图/表单/报告/外壳（7 份） |
| `assets/icons/icon-{192,512,maskable-512}.png` | 应用图标（粉蓝渐变，含 maskable） |
| `ReadStack-PWA.zip` | 可分发压缩包（含以上全部，68 KB） |
| `docs/需求规格说明书.md` | 收敛后的需求规格与验收清单 |
| `docs/smoke-test.js` | 数据层逻辑测试（37 passed / 0 failed） |
