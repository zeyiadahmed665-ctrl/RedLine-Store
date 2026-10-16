import { minQty, qtyStep, wholesaleApplies } from '../pricing';
import { packName } from '../config';

// ➕➖ عدّاد الكمية: للقطاعي بيزيد 1، وللتاجر بيزيد بحجم الباكيت (دستة مثلاً) ومينزلش عن الحد الأدنى
export default function QtyStepper({ product, quantity, userInfo, onChange, big = false }) {
  const min = minQty(product, userInfo);
  const step = qtyStep(product, userInfo);
  return (
    <div className={`rl-qty ${big ? 'big' : ''}`} dir="ltr">
      <button
        type="button"
        onClick={() => onChange(quantity - step)}
        disabled={quantity - step < min}
        aria-label="تقليل"
      >
        −
      </button>
      <span>{quantity}</span>
      <button
        type="button"
        onClick={() => onChange(quantity + step)}
        disabled={quantity + step > product.countInStock}
        aria-label="زيادة"
      >
        +
      </button>
    </div>
  );
}

// ⚡ أزرار كميات جاهزة للتاجر: دستة / 3 دست / 6 دست (+ شرائح الخصم)
export function PackButtons({ product, quantity, userInfo, onChange }) {
  if (!wholesaleApplies(product, userInfo)) return null;
  const min = minQty(product, userInfo);
  const step = qtyStep(product, userInfo);
  const raw = [1, 3, 6].map((k) => k * step);
  (product.priceTiers || []).forEach((t) => raw.push(t.minQty));
  const choices = [...new Set(raw)]
    .filter((q) => q >= min && q <= product.countInStock)
    .sort((a, b) => a - b)
    .slice(0, 4);
  if (choices.length === 0) return null;
  return (
    <div className="rl-packs">
      {choices.map((q) => (
        <button key={q} type="button" className={q === quantity ? 'on' : ''} onClick={() => onChange(q)}>
          {q % step === 0 ? `${q / step} × ${packName(step)} (${q})` : q}
        </button>
      ))}
    </div>
  );
}
