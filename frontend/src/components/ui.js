import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Reveal from './Reveal';

// =====================================================================
// 🧩 مكونات مشتركة لصفحات الدفع والطلبات والأدمن (ستايل RedLine المتحرك)
// =====================================================================

// عنوان الصفحة: شريط أحمر بيكبر + العنوان بينزل من فوق. children = أزرار على الجنب
export function PageHead({ title, sub, children }) {
  return (
    <motion.div
      className="rl-pagehead"
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
    >
      <h1>
        {title}
        {sub && <small>{sub}</small>}
      </h1>
      {children && <div className="d-flex gap-2 flex-wrap">{children}</div>}
    </motion.div>
  );
}

// لوحة بيضاء بتظهر مع السكرول. edit = لينك صغير (مثلاً "تعديل") جنب العنوان
export function Panel({ title, icon, edit, delay = 0, className = '', children }) {
  return (
    <Reveal delay={delay}>
      <section className={`rl-panel ${className}`}>
        {title && (
          <h2 className="rl-panel-title">
            {icon && <i className={icon}></i>}
            {title}
            {edit && <span className="rl-edit">{edit}</span>}
          </h2>
        )}
        {children}
      </section>
    </Reveal>
  );
}

// شارة حالة: type = ok | no | wait | dark | gold | grey
export function Pill({ type = 'grey', children }) {
  return <span className={`rl-pill ${type}`}>{children}</span>;
}

// صف جدول بيظهر بالتتابع
export function Tr({ i = 0, children, ...rest }) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(i, 12) * 0.04 }}
      {...rest}
    >
      {children}
    </motion.tr>
  );
}

// حالة فاضية
export function Empty({ icon = 'far fa-folder-open', children }) {
  return (
    <div className="rl-empty">
      <i className={icon}></i>
      {children}
    </div>
  );
}

// عدّاد أرقام بيعدّ من صفر للقيمة (بيحترم تفضيل تقليل الحركة)
export function CountUp({ value = 0, format = (v) => Math.round(v).toLocaleString('en-US') }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || target === 0) {
      setShown(target);
      return;
    }
    let raf;
    const start = performance.now();
    const dur = 1000;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur);
      setShown(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span>{format(shown)}</span>;
}
