// =====================================================================
// ⚙️ إعدادات المتجر في مكان واحد — ده أول ملف تعدّل فيه لكل عميل
// =====================================================================
export const STORE_NAME = 'RedLine'; // اسم المتجر (الـ Navbar وعنوان الصفحة والفوتر)
export const CURRENCY = 'ج.م'; // العملة اللي بتظهر بعد كل سعر
export const TAX_RATE = 0.14; // الضريبة (0.14 = 14%). خليها 0 لو العميل مش بيحسب ضريبة
export const SHIPPING_FEE = 50; // مصاريف الشحن
export const FREE_SHIPPING_THRESHOLD = 1000; // الشحن مجاني لو إجمالي المنتجات أكبر من الرقم ده

// أسماء طرق الدفع (بتتخزن في الطلب — متغيّرهاش بعد ما يبقى فيه طلبات)
export const PAYMENT_PAYPAL = 'PayPal';
export const PAYMENT_COD = 'Cash on Delivery';

// الاسم اللي بيظهر للعميل لطريقة الدفع
export const paymentLabel = (method) =>
  method === PAYMENT_COD ? 'الدفع عند الاستلام' : method;

// 🏭 أدوار الحسابات (بتظهر في الواجهة): user = قطاعي | wholesale = تاجر معتمد | admin = إدارة
export const ROLE_LABELS = { user: 'عميل قطاعي', wholesale: 'تاجر جملة', admin: 'أدمن' };

// اسم الباكيت حسب حجمه: 12 = دستة، غير كده = كرتونة/باكيت
export const packName = (n) => (Number(n) === 12 ? 'دستة' : Number(n) === 6 ? 'نصف دستة' : 'باكيت');

// تنسيق السعر: money(120) => "120.00 ج.م"
export const money = (value) => `${Number(value || 0).toFixed(2)} ${CURRENCY}`;

// تنسيق التاريخ بالعربي (أرقام إنجليزي): formatDate("2026-10-12T10:30:00Z") => "12 أكتوبر 2026 في 1:30 م"
export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString('ar-EG-u-nu-latn', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '';

// =====================================================================
// 🔥 العروض والبانر (الصفحة الرئيسية)
// =====================================================================
// تاريخ انتهاء العرض الحقيقي — العداد التنازلي بيعد لحد التاريخ ده، ولما يخلص بيختفي.
export const SALE_ENDS_AT = '2026-11-30T23:59:59';
export const PROMO_TEXT = 'RedLine RUSH SALE — خصومات حتى 40%';

// كل عنصر = بانر في الكاروسيل (بيتغير كل 4 ثواني). countdown:true يظهر العداد.
export const HERO_SLIDES = [
  {
    id: 'sale',
    title: 'خصم 40%',
    subtitle: 'على كل الهوديز والجاكيتات',
    cta: 'تسوق العرض الآن',
    link: '/search?category=هوديز',
    countdown: true,
    bg: 'linear-gradient(120deg,#fff 0%,#ffe3d6 100%)',
  },
  {
    id: 'new',
    title: 'وصل حديثاً',
    subtitle: 'أحدث موديلات الموسم لسه نازلة',
    cta: 'اكتشف الجديد',
    link: '/search?order=newest',
    bg: 'linear-gradient(120deg,#fff 0%,#e6ecff 100%)',
  },
  {
    id: 'wholesale',
    title: 'جملة وقطاعي',
    subtitle: 'أسعار خاصة للتجار والكميات الكبيرة',
    cta: 'شوف المنتجات',
    link: '/search',
    bg: 'linear-gradient(120deg,#fff 0%,#e5f6e9 100%)',
  },
];

// الألوان اللي بتظهر في فلتر الألوان (value = اللي بيتخزن في حقل colors بالمنتج)
export const COLOR_OPTIONS = [
  { value: 'black', label: 'أسود', hex: '#111111' },
  { value: 'red', label: 'أحمر', hex: '#d71920' },
  { value: 'white', label: 'أبيض', hex: '#ffffff' },
  { value: 'blue', label: 'أزرق', hex: '#1d4ed8' },
];
export const SIZE_OPTIONS = ['S', 'M', 'L', 'XL'];
