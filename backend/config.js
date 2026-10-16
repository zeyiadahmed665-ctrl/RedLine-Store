// =====================================================================
// ⚙️ إعدادات الحساب على السيرفر (لازم تطابق frontend/src/config.js)
// السيرفر هو اللي بيحسب الأسعار الحقيقية للطلب — مش بنصدّق الأرقام اللي جاية من المتصفح.
// =====================================================================
export const TAX_RATE = Number(process.env.TAX_RATE ?? 0.14);
export const SHIPPING_FEE = Number(process.env.SHIPPING_FEE ?? 50);
export const FREE_SHIPPING_THRESHOLD = Number(
  process.env.FREE_SHIPPING_THRESHOLD ?? 1000
);
