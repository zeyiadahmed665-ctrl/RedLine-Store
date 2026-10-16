import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HERO_SLIDES, SALE_ENDS_AT } from '../config';

const pad = (n) => String(n).padStart(2, '0');

// عداد تنازلي حقيقي لحد SALE_ENDS_AT — لو العرض خلص بيرجع null (بيختفي)
function useCountdown(endsAt) {
  const calc = () => Math.max(0, new Date(endsAt).getTime() - Date.now());
  const [ms, setMs] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setMs(calc()), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [endsAt]);
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${days > 0 ? days + 'd ' : ''}${pad(h)}:${pad(m)}:${pad(s % 60)}`;
}

// نزول من فوق بالتتابع (زي .hero في صفحة GEM): كل عنصر يتأخر 0.12 ثانية عن اللي قبله
const drop = (d) => ({
  initial: { opacity: 0, y: -18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay: d, ease: 'easeOut' },
});

// 🎞️ كاروسيل البانرات: بيتغير كل 4 ثواني، ويقف لما الماوس عليه
export default function HeroCarousel({ products = [] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const left = useCountdown(SALE_ENDS_AT);
  const n = HERO_SLIDES.length;

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), 4000);
    return () => clearInterval(t);
  }, [paused, n]);

  const slide = HERO_SLIDES[i];
  const img = products.length ? products[i % products.length].image : null;

  return (
    <div
      className="rl-hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          className="rl-hero-slide"
          style={{ background: slide.bg }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div className="rl-hero-text">
            <motion.div className="rl-hero-sub" {...drop(0)}>
              {slide.subtitle}
            </motion.div>
            <motion.h2 className="rl-hero-title" {...drop(0.12)}>
              {slide.title}
            </motion.h2>
            {slide.countdown && left && (
              <motion.div className="rl-hero-count" dir="ltr" {...drop(0.24)}>
                <span className="rl-glow-red">{left}</span> <small>متبقي</small>
              </motion.div>
            )}
            <motion.div {...drop(0.36)}>
              <Link to={slide.link} className="btn rl-hero-cta">
                {slide.cta}
              </Link>
            </motion.div>
          </div>
          {img && (
            <motion.img
              src={img}
              alt=""
              className="rl-hero-img"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      <button className="rl-arrow rl-arrow-r" onClick={() => setI((i + n - 1) % n)} aria-label="السابق">
        <i className="fas fa-chevron-right"></i>
      </button>
      <button className="rl-arrow rl-arrow-l" onClick={() => setI((i + 1) % n)} aria-label="التالي">
        <i className="fas fa-chevron-left"></i>
      </button>
      <div className="rl-dots">
        {HERO_SLIDES.map((s, k) => (
          <button key={s.id} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`بانر ${k + 1}`} />
        ))}
      </div>
    </div>
  );
}
