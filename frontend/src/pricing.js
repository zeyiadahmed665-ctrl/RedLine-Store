import { TAX_RATE, SHIPPING_FEE, FREE_SHIPPING_THRESHOLD } from './config';

// =====================================================================
// 💰 منطق الجملة والقطاعي في الواجهة (نفس منطق backend/pricing.js)
// السيرفر هو المرجع النهائي للسعر عند تأكيد الطلب، والدوال دي بتعرض نفس الحساب للعميل.
// =====================================================================

// هل السعر هنا بالجملة؟ = العميل تاجر معتمد + المنتج ليه سعر جملة
export const wholesaleApplies = (product, userInfo) =>
  Boolean(userInfo && userInfo.isWholesale && Number(product.wholesalePrice) > 0);

// سعر الشريحة: لو الكمية وصلت لشريحة أرخص بنطبّقها
export const tierPrice = (product, qty) => {
  let price = Number(product.wholesalePrice);
  (product.priceTiers || []).forEach((t) => {
    if (qty >= t.minQty && t.price > 0 && t.price < price) price = t.price;
  });
  return price;
};

// سعر القطعة الفعلي لكمية معينة
export const unitPrice = (product, qty, userInfo) =>
  wholesaleApplies(product, userInfo) ? tierPrice(product, qty) : Number(product.price);

// أقل كمية مسموحة (التاجر: wholesaleMinQty — غير كده 1)
export const minQty = (product, userInfo) =>
  wholesaleApplies(product, userInfo) ? Math.max(1, Number(product.wholesaleMinQty) || 1) : 1;

// خطوة الزيادة (التاجر: حجم الباكيت/الدستة — غير كده 1)
export const qtyStep = (product, userInfo) =>
  wholesaleApplies(product, userInfo) ? Math.max(1, Number(product.packSize) || 1) : 1;

// أقرب كمية صالحة (>= الحد الأدنى، ومن مضاعفات الباكيت للتاجر، وفي حدود المخزون)
export const normalizeQty = (product, qty, userInfo) => {
  const min = minQty(product, userInfo);
  const step = qtyStep(product, userInfo);
  let q = Math.max(min, Math.round(Number(qty) || min));
  if (step > 1) q = min + Math.round((q - min) / step) * step;
  while (q > product.countInStock && q - step >= min) q -= step;
  return q;
};

const round2 = (n) => Math.round(n * 100 + Number.EPSILON) / 100;

// إجماليات السلة (الشحن والضريبة من config.js)
export const calcTotals = (cartItems, userInfo) => {
  const itemsPrice = round2(
    cartItems.reduce((a, c) => a + c.quantity * unitPrice(c, c.quantity, userInfo), 0)
  );
  const retailTotal = round2(cartItems.reduce((a, c) => a + c.quantity * Number(c.price), 0));
  const shippingPrice = itemsPrice > FREE_SHIPPING_THRESHOLD || itemsPrice === 0 ? 0 : SHIPPING_FEE;
  const taxPrice = round2(TAX_RATE * itemsPrice);
  return {
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice: round2(itemsPrice + shippingPrice + taxPrice),
    savings: round2(Math.max(0, retailTotal - itemsPrice)), // الوفر مقارنة بالقطاعي
    count: cartItems.reduce((a, c) => a + c.quantity, 0),
  };
};
