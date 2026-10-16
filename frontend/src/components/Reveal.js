import { motion } from 'framer-motion';

// ✨ ظهور عند النزول (Scroll Reveal): العنصر يطلع من تحت شوية مع fade — مرة واحدة بس
// زي كلاس .reveal في صفحة GEM Guide Bot (22px / 0.7s / threshold 0.12)
export default function Reveal({ children, delay = 0, y = 22, className }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.7, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  );
}
