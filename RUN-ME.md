=== التشغيل السريع (الأسرع - Terminal واحد) ===
أول مرة بس:
   npm run setup          (بيثبّت حزم الـ backend والـ frontend)
   npm run rebuild        (بيبني الـ frontend مرة واحدة - حوالي نص دقيقة)
بعد كده كل مرة:
   npm start              (وافتح http://localhost:4000)
لو عدّلت في كود الـ frontend: شغّل  npm run rebuild  تاني وحدّث الصفحة.

=== وضع التطوير (Terminal 2) - لما بتعدّل الكود وعايز تشوف النتيجة فوراً ===
1) Terminal 1:   cd backend
                 npm install
                 npm run dev      (nodemon: بيعيد تشغيل السيرفر مع كل حفظ)
                 أو  npm start    (من غير إعادة تشغيل تلقائي = أسرع مع القاعدة المؤقتة)
2) Terminal 2:   cd frontend
                 npm install
                 npm start
3) افتح http://localhost:3000

=== إعدادات المتجر (لكل عميل) ===
- frontend/src/config.js : اسم المتجر (RedLine)، العملة، الضريبة، الشحن. الموقع بالكامل عربي RTL.
- backend/data.js        : المنتجات (والأدمن من ADMIN_EMAIL / ADMIN_PASSWORD في backend/.env).
- backend/.env           : الأسرار والقاعدة (شوف backend/.env.example).

ملاحظات:
- MONGODB_URI=memory في backend/.env = قاعدة مؤقتة (بتتمسح وبتتحمّل من أول مع كل تشغيل).
  لتشغيل أسرع وبيانات دايمة: MongoDB مثبت (mongodb://localhost/amazona) أو Atlas المجاني.
  ومع قاعدة دايمة: حط ALLOW_SEED=true في backend/.env، افتح http://localhost:4000/api/seed مرة واحدة، وبعدها شيل السطر.
- أول تشغيل بالقاعدة المؤقتة بينزّل ملف MongoDB (محتاج نت)، بعد كده بيتخزّن.
  لو النسخة الافتراضية (7.0.24) مش بتشتغل: ضيف في backend/.env  MONGOMS_VERSION=6.0.14
Admin login (تجريبي): admin@example.com / 123456   (غيّره قبل التسليم)
