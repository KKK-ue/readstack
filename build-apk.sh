#!/usr/bin/env bash
#
# 阅栈 ReadStack · 一键封装 APK（PWA Builder / Bubblewrap TWA 流程）
# ============================================================================
# 本脚本使用 PWA Builder 底层同款工具链 Bubblewrap，把"已部署的 PWA"封装为
# 可安装的 Android TWA APK，并打包成 ReadStack-APK.zip。
#
# 前置依赖（需自行安装，脚本会检测并提示）：
#   1. Node.js >= 18        https://nodejs.org
#   2. JDK >= 17            https://adoptium.net  （含 keytool）
#   3. Android SDK cmdline-tools + build-tools(30+) + platform(34)
#      并配置 ANDROID_HOME / JAVA_HOME
#   4. 一份已用 HTTPS 部署的 PWA（或用 --local 临时隧道暴露）
#
# 用法：
#   ./build-apk.sh https://你的域名/manifest.webmanifest
#   ./build-apk.sh --local            # 本地起服务 + localtunnel 临时公网 HTTPS
#   KS_PASS=xxxx ./build-apk.sh URL   # 预置 keystore 密码（免交互）
#
# 在 Windows 上请用 Git Bash 或 WSL 运行本脚本。
# ============================================================================
set -euo pipefail

APP_NAME="阅栈"
PACKAGE_ID="com.readstack.pwa"
THEME="#A9D3FF"
NAV="#A9D3FF"
BG="#EDF5FF"
KEY_ALIAS="readstack"
TWA_DIR="./twa-project"
ZIP="ReadStack-APK.zip"

cecho() { printf '\033[1;36m%s\033[0m\n' "$1"; }
warn()  { printf '\033[1;33m%s\033[0m\n' "$1"; }
err()   { printf '\033[1;31m%s\033[0m\n' "$1"; exit 1; }

# ---- 参数 ----
MODE="url"; MANIFEST_URL=""
if [[ "${1:-}" == "--local" ]]; then MODE="local";
elif [[ -n "${1:-}" ]]; then MANIFEST_URL="$1";
else err "用法: $0 <manifest公网HTTPS地址> | --local"; fi

# ---- 前置检测 ----
command -v node >/dev/null 2>&1 || err "未检测到 Node.js，请先安装 (>=18) 并设置到 PATH"
command -v java >/dev/null 2>&1 || err "未检测到 JDK，请先安装 (>=17) 并设置 JAVA_HOME"
command -v sdkmanager >/dev/null 2>&1 || warn "未检测到 sdkmanager，请安装 Android cmdline-tools 并配置 ANDROID_HOME"
[[ -n "${ANDROID_HOME:-}" ]] || warn "ANDROID_HOME 未设置，Bubblewrap 可能无法定位 SDK"

# ---- keystore 密码（自动生成或预置） ----
if [[ -z "${KS_PASS:-}" ]]; then
  KS_PASS=$(python3 -c "import secrets,string;print(''.join(secrets.choice(string.ascii_letters+string.digits) for _ in range(24)))")
  echo "自动生成 keystore 密码: $KS_PASS （请妥善保存，后续升级 APK 需要它）"
fi
KEYSTORE="$(pwd)/android.keystore.jks"

# ---- 生成签名密钥（如不存在） ----
if [[ ! -f "$KEYSTORE" ]]; then
  cecho ">> 生成 Android 签名密钥 ($KEYSTORE)"
  keytool -genkeypair -v -keystore "$KEYSTORE" -alias "$KEY_ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=ReadStack, OU=ReadStack, O=ReadStack, C=CN" \
    -storepass "$KS_PASS" -keypass "$KS_PASS"
fi

# ---- 解析 / 启动 manifest URL ----
cleanup() {
  [[ -n "${SRV_PID:-}" ]] && kill "$SRV_PID" 2>/dev/null || true
  [[ -n "${TUN_PID:-}" ]] && kill "$TUN_PID" 2>/dev/null || true
}
trap cleanup EXIT

if [[ "$MODE" == "local" ]]; then
  cecho ">> 本地模式：启动静态服务 + localtunnel 隧道"
  python3 -m http.server 8123 >/tmp/rssrv.log 2>&1 & SRV_PID=$!
  npx -y localtunnel --port 8123 >/tmp/lt.log 2>&1 & TUN_PID=$!
  LT_URL=""
  for i in $(seq 1 40); do
    LT_URL=$(grep -oE 'https://[a-zA-Z0-9._-]+\.loca\.lt' /tmp/lt.log | head -1 || true)
    [[ -n "$LT_URL" ]] && break
    sleep 1
  done
  [[ -n "${LT_URL:-}" ]] || err "localtunnel 启动失败，请检查网络，或改用已部署的 URL"
  MANIFEST_URL="$LT_URL/manifest.webmanifest"
  warn "临时公网地址: $MANIFEST_URL （有效数小时，仅用于本次封装）"
fi
cecho ">> 使用 manifest: $MANIFEST_URL"

# ---- Bubblewrap init ----
cecho ">> Bubblewrap init"
npx -y @bubblewrap/cli init --manifest "$MANIFEST_URL" \
  --directory "$TWA_DIR" \
  --packageId "$PACKAGE_ID" \
  --appName "$APP_NAME" \
  --launcherName "$APP_NAME" \
  --display standalone \
  --themeColor "$THEME" \
  --navigationColor "$NAV" \
  --backgroundColor "$BG" \
  --startUrl /index.html \
  --webManifestUrl "$MANIFEST_URL" \
  --iconUrl "${MANIFEST_URL%/*}/assets/icons/icon-512.png" \
  --maskableIconUrl "${MANIFEST_URL%/*}/assets/icons/icon-maskable-512.png" \
  --enableNotifications false \
  --enableLocation false \
  --fallbackType customTabs || {
    warn "带参 init 失败，回退到最小参数 init（之后可手动补全应用信息）"
    npx -y @bubblewrap/cli init --manifest "$MANIFEST_URL" --directory "$TWA_DIR"
  }

# 防御性：把签名信息写进 twa-manifest.json，尽量避免 build 时交互弹窗
if [[ -f "$TWA_DIR/twa-manifest.json" ]]; then
  python3 - "$KEYSTORE" "$KEY_ALIAS" "$KS_PASS" <<'PY'
import json, sys
p, alias, pwd = sys.argv[1], sys.argv[2], sys.argv[3]
with open("twa-project/twa-manifest.json", encoding="utf-8") as f:
    m = json.load(f)
sk = m.setdefault("signingKey", {})
sk["path"] = p
sk["alias"] = alias
for k in ("password", "keyPassword"):
    sk[k] = pwd
m["password"] = pwd
with open("twa-project/twa-manifest.json", "w", encoding="utf-8") as f:
    json.dump(m, f, ensure_ascii=False, indent=2)
PY
fi

# ---- Bubblewrap build（签名 APK） ----
cecho ">> Bubblewrap build（生成并签名 APK）"
npx -y @bubblewrap/cli build --directory "$TWA_DIR" \
  --signing-key-path "$KEYSTORE" \
  --signing-key-alias "$KEY_ALIAS" \
  --signing-key-password "$KS_PASS" \
  || npx -y @bubblewrap/cli build --directory "$TWA_DIR"

# ---- 收集产物（APK 优先，其次 AAB） ----
APK=$(find "$TWA_DIR" -name "*.apk" 2>/dev/null | head -1)
[[ -n "$APK" ]] || APK=$(find "$TWA_DIR" -name "*.aab" 2>/dev/null | head -1)
[[ -n "$APK" ]] || err "未找到生成的 APK/AAB，请检查上方 Bubblewrap 输出"
cecho ">> 产物: $APK"

# ---- 打包 zip ----
python3 - "$APK" "$ZIP" <<'PY'
import zipfile, sys, os
apk, zipf = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(zipf, "w", zipfile.ZIP_DEFLATED) as z:
    z.write(apk, os.path.basename(apk))
    if os.path.exists("manifest.webmanifest"):
        z.write("manifest.webmanifest", "manifest.webmanifest")
print("已打包", zipf, os.path.getsize(zipf), "bytes")
PY

cecho "✅ 完成！安装包: $ZIP"
echo "   把 $ZIP 传到小米 17，允许『未知来源』后点击安装；或用："
echo "   adb install $(basename "$APK")"
echo "   keystore 密码（务必保存，升级 APK 时复用）: $KS_PASS"
