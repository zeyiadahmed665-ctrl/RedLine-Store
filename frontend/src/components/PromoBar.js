import { PROMO_TEXT } from '../config';

// شريط العرض الأسود اللي تحت الهيدر
export default function PromoBar() {
  return (
    <div className="rl-promo">
      <span>⚡</span> {PROMO_TEXT} <span>⚡</span>
    </div>
  );
}
