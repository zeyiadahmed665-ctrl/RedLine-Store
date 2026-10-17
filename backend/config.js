// =====================================================================
// ⚙️ إعدادات الحساب على السيرفر (لازم تطابق frontend/src/config.js)
// السيرفر هو اللي بيحسب الأسعار الحقيقية للطلب — مش بنصدّق الأرقام اللي جاية من المتصفح.
// =====================================================================
export const TAX_RATE = Number(process.env.TAX_RATE ?? 0.14);
export const SHIPPING_FEE = Number(process.env.SHIPPING_FEE ?? 50);
export const FREE_SHIPPING_THRESHOLD = Number(
  process.env.FREE_SHIPPING_THRESHOLD ?? 1000
);

// 🎁 نظام نقاط الولاء (للعملاء القطاعي فقط)
//   كل 100 ج.م من المنتجات = POINTS_PER_100 نقطة، بتتضاف لما الطلب يتسلّم
//   كل نقطة = POINT_VALUE ج.م خصم، وأقصى خصم = MAX_POINTS_DISCOUNT_RATE من سعر المنتجات
export const POINTS_PER_100 = Number(process.env.POINTS_PER_100 ?? 10);
export const POINT_VALUE = Number(process.env.POINT_VALUE ?? 0.1);
export const MAX_POINTS_DISCOUNT_RATE = Number(process.env.MAX_POINTS_DISCOUNT_RATE ?? 0.3);
