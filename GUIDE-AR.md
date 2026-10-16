# دليل مشروع Amazona (شرح + إزاي تعدّل)

المشروع ده موقع متجر إلكتروني بتقنية **MERN**:

| الحرف | التقنية | بتعمل إيه |
|---|---|---|
| M | MongoDB | قاعدة البيانات (المنتجات، المستخدمين، الطلبات) |
| E | Express | سيرفر الـ backend |
| R | React | واجهة الموقع اللي بتشوفها في المتصفح |
| N | Node.js | بيشغّل كود الـ backend |

> كل مكان هتعدّل فيه في الكود، فيه **تعليقات بالعربي** جوه الملف نفسه (دور على علامة `=====`).

---

## 1) شكل الفولدرات

```
mern-amazona-master/
├── backend/                  ← السيرفر (بورت 4000)
│   ├── server.js             ← نقطة البداية + الاتصال بالقاعدة
│   ├── data.js               ← المنتجات والمستخدمين التجريبيين ⭐
│   ├── .env                  ← الإعدادات (رابط القاعدة، الأسرار)
│   ├── models/               ← شكل البيانات في القاعدة
│   │   └── productModel.js   ← حقول المنتج
│   └── routes/               ← الـ API
│       ├── productRoutes.js  ← المنتجات
│       ├── userRoutes.js     ← المستخدمين وتسجيل الدخول
│       ├── orderRoutes.js    ← الطلبات
│       └── uploadRoutes.js   ← رفع الصور (Cloudinary)
└── frontend/                 ← واجهة الموقع (بورت 3000)
    ├── public/images/        ← الصور بتتحط هنا ⭐
    └── src/
        ├── App.js            ← الـ Navbar وجدول الصفحات
        ├── screens/          ← كل صفحة ملف (HomeScreen, ProductScreen...)
        └── components/       ← أجزاء صغيرة (Product = كارت المنتج)
```

## 2) إزاي بيشتغل (الفكرة)

1. بتفتح `http://localhost:3000`، فـ React بيعرض الصفحة.
2. `HomeScreen.js` بيطلب من الـ backend: `GET /api/products`.
3. الـ backend (`productRoutes.js`) بيجيب المنتجات من MongoDB ويبعتها.
4. React بيعرض كل منتج بكومبوننت `Product.js`.

الـ frontend بيكلّم الـ backend على بورت 4000 تلقائي (سطر `"proxy"` في `frontend/package.json`).

## 3) التشغيل

```
# Terminal 1
cd backend
npm install
npm start

# Terminal 2
cd frontend
npm install
npm start
```

بعدين افتح `http://localhost:3000`.

- أدمن: `admin@example.com` / `123456`
- مستخدم عادي: `user@example.com` / `123456`

### إعدادات `backend/.env`

| المتغير | معناه |
|---|---|
| `MONGODB_URI=memory` | قاعدة مؤقتة جاهزة، من غير تثبيت. **البيانات بتتمسح مع كل تشغيل** |
| `MONGODB_URI=mongodb://localhost/amazona` | MongoDB مثبت على جهازك |
| `MONGODB_URI=mongodb+srv://...` | MongoDB Atlas (بيانات دايمة) |
| `JWT_SECRET` | كلمة سر لتشفير تسجيل الدخول |

---

## 4) إزاي تضيف منتج

### الطريقة (أ): من الكود، دايمة ⭐ (الأنسب لك دلوقتي)

افتح `backend/data.js`، وانسخ منتج موجود والصقه آخر القائمة `products`، وعدّل قيمه:

```js
{
  name: 'Puma Polo Shirt',      // لازم يكون مختلف عن أي منتج
  slug: 'puma-polo-shirt',      // للرابط: حروف صغيرة وشرطات، ومختلف
  category: 'Shirts',           // التصنيف
  image: '/images/p5.jpg',      // مسار الصورة (شوف الفقرة الجاية)
  price: 90,                    // السعر
  countInStock: 7,              // الكمية (0 = Out of stock)
  brand: 'Puma',                // الماركة
  rating: 4,                    // من 0 لـ 5
  numReviews: 5,                // عدد التقييمات
  description: 'Soft cotton polo shirt',
},
```

احفظ الملف. الـ backend بيعيد التشغيل لوحده (nodemon) وبعدين اعمل Refresh للصفحة.

> ⚠️ لازم يبقى فيه **فاصلة `,`** بين كل منتج والتاني، وكل الحقول موجودة، وإلا هيطلع error.

### الطريقة (ب): من لوحة الأدمن

1. سجّل دخول بحساب الأدمن.
2. من القائمة اللي فيها اسمك اختار **Products**.
3. اضغط **Create Product**، وبعدين عدّل بياناته واضغط Update.

في الوضع المؤقت (`MONGODB_URI=memory`) المنتجات دي **بتضيع** لما توقف الـ backend. لو عايزها دايمة استخدم الطريقة (أ) أو MongoDB Atlas.

---

## 5) إزاي تضيف صورة

1. حط ملف الصورة في فولدر **`frontend/public/images/`** (جنب `p1.jpg`).
2. في `backend/data.js` اكتب في `image`: `'/images/اسم-الصورة.jpg'`.
3. اسم الملف لازم يتطابق بالظبط (حروف صغيرة/كبيرة وامتداد `.jpg` أو `.png`).

مقاس مناسب: حوالي **679 × 829** بيكسل.

> زرار رفع الصور في لوحة الأدمن بيستخدم **Cloudinary** ومحتاج مفاتيح في `.env`. من غيرها مش هيشتغل، فالأسهل الطريقة اللي فوق.

---

## 6) إزاي تعدّل حاجة

| عايز | روح فين | اعمل إيه |
|---|---|---|
| تغيّر عنوان الصفحة الرئيسية | `frontend/src/screens/HomeScreen.js` | غيّر `<h1>Featured Products</h1>` |
| تغيّر اسم المتجر | `frontend/src/config.js` | غيّر `STORE_NAME` |
| تغيّر العملة / الضريبة / الشحن | `frontend/src/config.js` | غيّر `CURRENCY` و`TAX_RATE` و`SHIPPING_FEE` و`FREE_SHIPPING_THRESHOLD` |
| تغيّر عدد المنتجات في الصف | `HomeScreen.js` | `lg={3}` = 4 في الصف، `lg={4}` = 3 في الصف |
| تعرض الماركة على الكارت | `Product.js` | أضف `<Card.Text>{product.brand}</Card.Text>` |
| تغيّر الألوان والتنسيق | `frontend/src/App.css` | عدّل قواعد CSS |
| تمسح منتج | لوحة الأدمن، أو احذفه من `data.js` | — |

### إضافة حقل جديد للمنتج (مثلاً `color`)

1. `backend/models/productModel.js`: أضف `color: { type: String },`
2. `backend/data.js`: أضف `color: 'Red',` للمنتجات.
3. `frontend/src/components/Product.js`: اعرضه `{product.color}`.
4. (لو عايز تعدله من لوحة الأدمن) أضف `product.color = req.body.color;` في راوت PUT في `productRoutes.js`، وحقل إدخال في `ProductEditScreen.js`.

### إضافة صفحة جديدة (مثلاً `/about`)

1. اعمل `frontend/src/screens/AboutScreen.js`:
   ```js
   function AboutScreen() {
     return <h1>About us</h1>;
   }
   export default AboutScreen;
   ```
2. في `App.js` استورده: `import AboutScreen from './screens/AboutScreen';`
3. جوه `<Routes>` أضف: `<Route path="/about" element={<AboutScreen />} />`
4. افتح `http://localhost:3000/about`.

---

## 7) الـ API (الراوتس)

| الطريقة | المسار | الوظيفة |
|---|---|---|
| GET | `/api/products` | كل المنتجات |
| GET | `/api/products/slug/:slug` | منتج واحد |
| GET | `/api/products/search` | بحث وفلترة |
| POST | `/api/products` | أدمن: إنشاء منتج |
| PUT | `/api/products/:id` | أدمن: تعديل منتج |
| DELETE | `/api/products/:id` | أدمن: مسح منتج |
| POST | `/api/users/signin` | تسجيل دخول |
| POST | `/api/users/signup` | تسجيل حساب جديد |
| POST | `/api/orders` | إنشاء طلب |
| GET | `/api/seed` | يمسح القاعدة ويرجّع البيانات التجريبية |

تقدر تجرّب أي GET من المتصفح مباشرة، مثلاً `http://localhost:4000/api/products`.

---

## 8) حل المشاكل

| المشكلة | الحل |
|---|---|
| `npm` مش معروف | ثبّت Node.js وأعد تشغيل VS Code |
| `Request failed with status code 500` | الـ backend مش شغّال أو مش متصل بالقاعدة، بص على terminal الـ backend |
| `DB error:` في terminal الـ backend | تحميل MongoDB المؤقت فشل (تأكد من النت)، أو رابط `MONGODB_URI` غلط |
| `EADDRINUSE` | البورت مستخدم، اقفل الـ terminal القديم أو غيّر `PORT` |
| منتجي مش ظاهر | تأكد من الفواصل `,` في `data.js` ومن إن `name` و`slug` مش مكررين |
| الصورة مش ظاهرة | تأكد من اسم الملف والمسار `/images/...` والصورة جوه `frontend/public/images` |
| شاشة بيضة | شغّل بـ `npm start` وافتح `localhost:3000`، **مش** Live Server |

بعد أي تعديل في `backend` لازم الـ backend يعيد التشغيل (nodemon بيعملها لوحده). تعديلات `frontend` بتظهر لوحدها في المتصفح.


---

## ملف إعدادات المتجر وتسليم نسخة لعميل

- `frontend/src/config.js` فيه اسم المتجر والعملة والضريبة والشحن في مكان واحد.
- أدمن البيانات الأولية: `ADMIN_EMAIL` و`ADMIN_PASSWORD` في `backend/.env` (شوف `backend/.env.example`).
- اسم المرسل في الإيميلات: `MAIL_FROM` في `backend/.env`. لو Mailgun مش متظبط، الإيميلات بتتخطى وبتتكتب في الـ console.
- `/api/seed` مقفول افتراضياً (بيمسح كل البيانات). يتفتح بـ `ALLOW_SEED=true` وقت التطوير بس.
- طرق الدفع: الدفع عند الاستلام (الأدمن بيعمل Deliver فالطلب بيتعلّم مدفوع) وPayPal. PayPal مش بيدعم الجنيه المصري، فاعتبره للتجربة بس.


---

## الموقع بالعربي (RTL) واسم RedLine

- الاسم والعملة والضريبة والشحن في `frontend/src/config.js` (`STORE_NAME = 'RedLine'`، `CURRENCY = 'ج.م'`).
- كل نصوص الواجهة عربي جوه ملفات `frontend/src/screens/*` و`components/*`. رسائل السيرفر والإيميلات عربي في `backend/routes/*` و`backend/utils.js`.
- الاتجاه RTL من `frontend/public/index.html` (`dir="rtl"`) و`bootstrap.rtl.min.css` في `frontend/src/index.js`.
- الألوان (الأحمر الأساسي) في أول `frontend/src/index.css` (`--brand-red`). الخط Cairo بيتحمل من النت، ولو مفيش نت بيشتغل خط النظام.
- اللوجو والأيقونة: `frontend/public/logo192.png` و`logo512.png` و`favicon.ico` (غيّرهم بلوجو العميل).
- المنتجات التجريبية بالعربي في `backend/data.js` (الأقسام: قمصان / بناطيل). مع قاعدة دايمة لازم تعمل seed تاني عشان تظهر.


---

## 🏭 نظام الجملة والقطاعي (Roles: User / Wholesale / Admin)

### الفكرة
| الدور | بيشوف إيه | بيشتري إزاي |
|---|---|---|
| زائر / عميل (`user`) | سعر القطاعي بس | بالقطعة |
| تاجر معتمد (`wholesale`) | سعر الجملة + شرائح الكميات | بالدستة/الباكيت، وبحد أدنى |
| أدمن (`admin`) | كل حاجة + لوحة التحكم | — |

- **زرارين في الهيدر**: «قسم القطاعي» و«قسم الجملة / المصنع» (`components/SectionTabs.js`).
- **صفحة الجملة** `/wholesale`: الزائر يشوف صفحة تعريفية بدون أسعار جملة، والتاجر المعتمد يشوف جدول منتجاته بالشرائح.
- **التسجيل كتاجر**: من `/signup?type=wholesale` (أو من صفحة الملف الشخصي). الحساب بيبدأ قطاعي وفي قايمة انتظار.
- **الموافقة**: الأدمن يدخل **المستخدمون** ← «طلبات التجار» ← **اعتماد** (أو من صفحة تعديل المستخدم يختار الدور).
  الأسعار بتتحول لجملة تلقائيًا من غير ما التاجر يعمل خروج ودخول.

### إزاي تحدد سعر الجملة لمنتج
أدمن ← المنتجات ← تعديل ← قسم **أسعار الجملة**:
- `سعر القطعة بالجملة` (0 = المنتج مش متاح للجملة)
- `أقل كمية للتاجر` (مثلاً 12) و`حجم الباكيت` (12 = دستة، والكمية بتزيد بمضاعفاته)
- `شرائح الكميات`: مثلاً من 36 قطعة السعر 225، ومن 72 السعر 210.

أو من الكود في `backend/data.js` (الحقول: `wholesalePrice`, `wholesaleMinQty`, `packSize`, `priceTiers`).

### 🔒 الأمان
- **السيرفر هو اللي بيحسب سعر الطلب** (`backend/routes/orderRoutes.js`) من القاعدة وحسب دور العميل — الأرقام اللي في المتصفح للعرض بس.
- أسعار الجملة مبتتبعتش من الـ API غير للتاجر المعتمد والأدمن (`backend/pricing.js ← shapeProduct`).
- الحد الأدنى للجملة والمخزون بيتراجعوا على السيرفر عند تأكيد الطلب.

### حسابات تجريبية (بعد `/api/seed` أو القاعدة المؤقتة)
- أدمن: `admin@example.com` / `123456`
- عميل: `user@example.com` / `123456`
- تاجر: `wholesale@example.com` / `123456`

### ⚠️ لو عندك قاعدة بيانات دايمة (Atlas) فيها بيانات قديمة
- المستخدمين القدام شغالين عادي (من غير حقل `role` بيتعاملوا كقطاعي، والأدمن القديم بيفضل أدمن).
- المنتجات القديمة مفيهاش سعر جملة: ادخل عدّل كل منتج من لوحة الأدمن وحط سعر الجملة، أو شغّل `/api/seed` (⚠️ بيمسح كل البيانات).
