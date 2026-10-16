import { motion } from 'framer-motion';

// 🧭 شريط خطوات الشراء: الخط الأحمر بيتملي لحد الخطوة الحالية، والخطوة الحالية بتنبض
const LABELS = ['تسجيل الدخول', 'الشحن', 'الدفع', 'تأكيد الطلب'];

export default function CheckoutSteps(props) {
  const flags = [props.step1, props.step2, props.step3, props.step4];
  const current = flags.filter(Boolean).length; // عدد الخطوات النشطة
  const progress = current <= 1 ? 0 : (current - 1) / (LABELS.length - 1);
  return (
    <motion.div
      className="rl-steps"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="rl-steps-line">
        <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: progress }} transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }} />
      </div>
      {LABELS.map((label, idx) => {
        const n = idx + 1;
        const cls = n < current ? 'done' : n === current ? 'active' : '';
        return (
          <div key={label} className={`rl-step ${cls}`}>
            <b>{n < current ? <i className="fas fa-check"></i> : n}</b>
            {label}
          </div>
        );
      })}
    </motion.div>
  );
}
