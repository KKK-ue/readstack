#!/usr/bin/env python
# 打包 阅栈 ReadStack 为可分发 PWA 压缩包（不含生成脚本本身）
import json, os, zipfile

ROOT = os.path.dirname(__file__)
OUT = os.path.join(ROOT, "ReadStack-PWA.zip")
EXCLUDE = {"make_icons.py", "package.py", "ReadStack-PWA.zip"}

# 1) 校验 manifest
with open(os.path.join(ROOT, "manifest.webmanifest"), encoding="utf-8") as f:
    json.load(f)
print("manifest.webmanifest OK")

# 2) 校验图标存在
for p in ("assets/icons/icon-192.png", "assets/icons/icon-512.png", "assets/icons/icon-maskable-512.png"):
    assert os.path.exists(os.path.join(ROOT, p)), p
print("icons OK")

# 3) 打包（以 mibook 目录内容为根）
if os.path.exists(OUT):
    os.remove(OUT)
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    for dirpath, dirs, files in os.walk(ROOT):
        for fn in files:
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, ROOT)
            if rel in EXCLUDE or rel.startswith("docs" + os.sep + "smoke-test"):
                continue
            z.write(full, rel)
print("wrote", OUT, os.path.getsize(OUT), "bytes")
