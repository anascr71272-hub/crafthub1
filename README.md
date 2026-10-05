# CraftHub — Minecraft Community

## التشغيل
1. ثبّت Node.js 18+.
2. افتح Terminal داخل مجلد المشروع.
3. نفّذ:
   npm install
   npm start
4. افتح:
   http://localhost:3000

## حساب التجربة
Admin:
- username: Admin
- password: admin123

User:
- username: Steve
- password: steve123

## المزايا
- قائمة Minecraft servers + بحث وفلاتر.
- نسخ IP.
- تقييم 1-5 وكتابة مراجعة مرة لكل مستخدم.
- Favorites.
- Mods / Plugins directory.
- Accounts + JWT.
- Reports.
- Admin dashboard APIs.
- Voice rooms عبر WebRTC + Socket.IO.
- حفظ البيانات في data.json.

## ملاحظات مهمة للـVoice
- localhost يعمل للتجربة.
- عند النشر على الإنترنت استخدم HTTPS.
- WebRTC يحتاج signaling (موجود عبر Socket.IO).
- للإنتاج يفضّل إضافة TURN server لتحسين الاتصال عند وجود NAT/firewall.
- غيّر JWT_SECRET قبل النشر.
- البيانات الحالية في JSON مناسبة للنسخة التجريبية؛ للإنتاج استخدم PostgreSQL/MongoDB.
