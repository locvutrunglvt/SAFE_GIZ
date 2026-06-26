# SAFE Vietnam — Workspace Rules

## 🌐 Server & Domain
- **Production URL**: `https://safe-vietnam.coffeedata.it.com`
- **VPS IP**: `163.61.72.193` (AlmaLinux 8, 8GB RAM, 4 CPU)
- **SSH**: `ssh root@163.61.72.193`
- **PocketBase**: `http://127.0.0.1:8097` (systemd: `pocketbase.service`)
- **Admin PB**: `https://safe-vietnam.coffeedata.it.com/_/` — `admin@safegiz.com` / `Admin123456`
- **Frontend path**: `/var/www/safe-vietnam/public/`
- **PocketBase path**: `/opt/pocketbase/`
- **GitHub**: `https://github.com/locvutrunglvt/SAFE_GIZ`

## 🚀 Deploy Workflow
```bash
# 1. Build
npx vite build

# 2. Clean + upload
ssh root@163.61.72.193 "rm -rf /var/www/safe-vietnam/public/assets/*"
scp -r dist/* root@163.61.72.193:/var/www/safe-vietnam/public/

# 3. Permissions + reload
ssh root@163.61.72.193 "chmod -R 755 /var/www/safe-vietnam/public/ && nginx -s reload"
```

## 📌 Quy tắc bắt buộc
- **Author**: Tất cả file Excel/Word phải có `creator = "Lộc Vũ Trung"`
- **Excel**: LUÔN dùng công thức, KHÔNG hardcode
- **Chính quyền 2 cấp**: Tỉnh → Xã (bỏ Huyện)
- **ID structure**:
  - Sơn La: `SAFEGIZ-SL{XXXX}` / `SAFEGIZ-SL{XXXX}-01`
  - Gia Lai: `SAFEGIZ-GL{XXXX}` / `SAFEGIZ-GL{XXXX}-{YY}`
- **SW cache**: Bump `safe-vietnam-v{N}` trong `public/sw.js` mỗi lần deploy
- **Language**: Response bằng tiếng Việt, code bằng English

## ⛔ KHÔNG BAO GIỜ
- Dùng domain cũ `lvtcenter.it.com` — ĐÃ DEPRECATED
- Dùng VPS cũ `36.50.26.99` — ĐÃ HẾT HẠN
- Deploy mà không bump SW version
- Hardcode giá trị trong Excel
