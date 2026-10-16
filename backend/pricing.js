// =====================================================================
// 💰 منطق أسعار الجملة والقطاعي (نفس المنطق موجود في frontend/src/pricing.js)
//   - العميل العادي  → price (سعر القطاعي)
//   - التاجر المعتمد → wholesalePrice (أو أقل لو الكمية وصلت لشريحة في priceTiers)
//   - الحد الأدنى للتاجر = wholesaleMinQty (مثلاً 12 = دستة)، وبيتزود بمضاعفات packSize
// =====================================================================

// الدور الفعلي للمستخدم (بيدعم الحسابات القديمة اللي معندهاش role)
export const roleOf = (u) => {
  if (!u) return 'guest';
  if (u.isAdmin || u.role === 'admin') return 'admin';
  return u.role === 'wholesale' ? 'wholesale' : 'user';
};

// مين يقدر يشوف حقول الجملة؟ التاجر والأدمن
export const canSeeWholesale = (u) => ['wholesale', 'admin'].includes(roleOf(u));

// مين بيدفع بسعر الجملة؟ التاجر بس
export const paysWholesale = (u) => roleOf(u) === 'wholesale';

export const hasWholesale = (p) => Number(p.wholesalePrice) > 0;

const round2 = (n) => Math.round(n * 100 + Number.EPSILON) / 100;

export const tierPrice = (p, qty) => {
  let price = Number(p.wholesalePrice);
  (p.priceTiers || []).forEach((t) => {
    if (qty >= t.minQty && t.price > 0 && t.price < price) price = t.price;
  });
  return price;
};

export const minQtyFor = (p, u) =>
  paysWholesale(u) && hasWholesale(p) ? Math.max(1, Number(p.wholesaleMinQty) || 1) : 1;

export const unitPriceFor = (p, qty, u) =>
  paysWholesale(u) && hasWholesale(p) ? tierPrice(p, qty) : Number(p.price);

// بيشيل حقول الجملة من المنتج لو الزائر مش تاجر/أدمن (الزائر يعرف بس إن فيه سعر جملة)
export const shapeProduct = (product, u) => {
  const o = product && product.toObject ? product.toObject() : { ...product };
  o.hasWholesale = hasWholesale(o);
  if (!canSeeWholesale(u)) {
    delete o.wholesalePrice;
    delete o.wholesaleMinQty;
    delete o.packSize;
    delete o.priceTiers;
  }
  return o;
};

export { round2 };
