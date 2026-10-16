import { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store } from '../Store';

// 🏬 زرارين واضحين تحت الهيدر: (قسم القطاعي) و (قسم الجملة / المصنع) — كل زائر يوصل للي محتاجه في ثانية.
// بيظهروا بس في صفحات التصفح (الرئيسية / البحث / المنتج / الجملة).
export default function SectionTabs() {
  const { pathname } = useLocation();
  const { state } = useContext(Store);
  const { userInfo } = state;

  const isWh = pathname.startsWith('/wholesale');
  const isRetail = pathname === '/' || pathname.startsWith('/search');
  const browsing = isWh || isRetail || pathname.startsWith('/product/');
  if (!browsing) return null;

  return (
    <div className="rl-sections" dir="rtl">
      <Link to="/" className={`rl-sec ${isRetail ? 'on' : ''}`}>
        {isRetail && <motion.span layoutId="rl-sec-bubble" className="bubble" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
        <i className="fas fa-shopping-bag"></i> قسم القطاعي <small>بالقطعة</small>
      </Link>
      <Link to="/wholesale" className={`rl-sec wh ${isWh ? 'on' : ''}`}>
        {isWh && <motion.span layoutId="rl-sec-bubble" className="bubble" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
        <i className="fas fa-industry"></i> قسم الجملة / المصنع <small>أسعار التجار</small>
      </Link>
      {userInfo && userInfo.isWholesale && (
        <span className="rl-sec-who d-none d-md-flex">
          <span className="rl-pill gold">
            <i className="fas fa-check-circle"></i> تاجر معتمد
          </span>
        </span>
      )}
    </div>
  );
}
