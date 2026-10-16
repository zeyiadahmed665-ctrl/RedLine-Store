import { COLOR_OPTIONS, SIZE_OPTIONS } from '../config';

// 🎛️ الفلاتر الجانبية: الفئة، السعر (سلايدر بمقبضين)، المقاس، اللون
export default function ProductFilters({ categories, bounds, f, setF }) {
  const [min, max] = bounds;
  const toggle = (key, v) =>
    setF({ ...f, [key]: f[key].includes(v) ? f[key].filter((x) => x !== v) : [...f[key], v] });

  return (
    <div className="rl-filters">
      <h6>الفئة</h6>
      {categories.map((c) => (
        <label key={c} className="rl-check">
          <input type="checkbox" checked={f.categories.includes(c)} onChange={() => toggle('categories', c)} /> {c}
        </label>
      ))}

      <h6>السعر</h6>
      <div className="rl-range">
        <input
          type="range"
          min={min}
          max={max}
          value={f.price[0]}
          onChange={(e) => setF({ ...f, price: [Math.min(+e.target.value, f.price[1]), f.price[1]] })}
        />
        <input
          type="range"
          min={min}
          max={max}
          value={f.price[1]}
          onChange={(e) => setF({ ...f, price: [f.price[0], Math.max(+e.target.value, f.price[0])] })}
        />
      </div>
      <div className="d-flex justify-content-between small mb-3" dir="ltr">
        <span>{f.price[0]} EGP</span>
        <span>{f.price[1]} EGP</span>
      </div>

      <h6>المقاس</h6>
      <div className="rl-chips">
        {SIZE_OPTIONS.map((s) => (
          <button key={s} className={f.sizes.includes(s) ? 'on' : ''} onClick={() => toggle('sizes', s)}>
            {s}
          </button>
        ))}
      </div>

      <h6>اللون</h6>
      <div className="rl-swatches">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c.value}
            title={c.label}
            aria-label={c.label}
            className={f.colors.includes(c.value) ? 'on' : ''}
            style={{ background: c.hex }}
            onClick={() => toggle('colors', c.value)}
          />
        ))}
      </div>

      <button className="btn btn-sm btn-link p-0 mt-3" onClick={() => setF({ categories: [], price: bounds, sizes: [], colors: [] })}>
        مسح الفلاتر
      </button>
    </div>
  );
}
