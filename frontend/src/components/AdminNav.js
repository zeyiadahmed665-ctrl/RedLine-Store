import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

// 🛠️ شريط تنقل الأدمن (بيظهر فوق كل صفحات الأدمن) — الزرار النشط عليه فقاعة حمرا بتتحرك بين الأزرار
const ITEMS = [
  { to: '/admin/dashboard', icon: 'fas fa-chart-line', label: 'لوحة التحكم', match: ['/admin/dashboard'] },
  { to: '/admin/products', icon: 'fas fa-tshirt', label: 'المنتجات', match: ['/admin/products', '/admin/product/'] },
  { to: '/admin/orders', icon: 'fas fa-receipt', label: 'الطلبات', match: ['/admin/orders'] },
  { to: '/admin/users', icon: 'fas fa-users', label: 'المستخدمون', match: ['/admin/users', '/admin/user/'] },
];

export default function AdminNav() {
  const { pathname } = useLocation();
  return (
    <nav className="rl-adminnav" aria-label="إدارة المتجر">
      {ITEMS.map((it) => {
        const on = it.match.some((m) => pathname.startsWith(m));
        return (
          <Link key={it.to} to={it.to} className={on ? 'on' : ''}>
            {on && (
              <motion.span layoutId="rl-admin-bubble" className="bubble" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
            )}
            <i className={it.icon}></i>
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
