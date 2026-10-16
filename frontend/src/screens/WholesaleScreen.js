import { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Store } from '../Store';
import { getError } from '../utils';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import Reveal from '../components/Reveal';
import { Panel, Pill, Empty } from '../components/ui';
import QtyStepper, { PackButtons } from '../components/QtyStepper';
import { money, packName, STORE_NAME } from '../config';
import { minQty, qtyStep, tierPrice, normalizeQty } from '../pricing';

const PERKS = [
  { icon: 'fas fa-tags', title: 'أسعار الجملة', text: 'سعر القطعة بيقل كل ما الكمية تزيد' },
  { icon: 'fas fa-boxes', title: 'بالدستة والباكيت', text: 'زوّد الكمية بضغطة زر' },
  { icon: 'fas fa-industry', title: 'من المصنع مباشرة', text: 'من غير وسطاء، وتوفير حقيقي' },
  { icon: 'fas fa-user-check', title: 'حساب تاجر معتمد', text: 'بيتفعّل بعد مراجعة بياناتك' },
];

// صف منتج في جدول التاجر: صورة + شرائح الأسعار + اختيار الكمية + إضافة للسلة
function WholesaleRow({ product, userInfo, cartQty, onAdd }) {
  const min = minQty(product, userInfo);
  const step = qtyStep(product, userInfo);
  const [qty, setQty] = useState(() => normalizeQty(product, cartQty || min, userInfo));
  const unit = tierPrice(product, qty);
  const tiers = [{ minQty: min, price: Number(product.wholesalePrice) }, ...(product.priceTiers || [])];
  const soldOut = product.countInStock < min;

  return (
    <Reveal>
      <div className="rl-panel">
        <div className="d-flex gap-3 flex-wrap flex-md-nowrap">
          <Link to={`/product/${product.slug}`}>
            <img src={product.image} alt={product.name} style={{ width: 96, height: 118, objectFit: 'cover', borderRadius: 10 }} />
          </Link>
          <div className="flex-grow-1" style={{ minWidth: 210 }}>
            <Link to={`/product/${product.slug}`} className="rl-line-name d-block mb-1">
              {product.name}
            </Link>
            <div className="small text-muted mb-2">
              {product.category} · أقل طلب {min} قطعة · {packName(step)} = {step}
            </div>
            <table className="rl-tiers">
              <thead>
                <tr>
                  <th>الكمية</th>
                  <th>سعر القطعة</th>
                  <th>الوفر عن القطاعي</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((t, i) => {
                  const next = tiers[i + 1];
                  const cur = qty >= t.minQty && (!next || qty < next.minQty);
                  return (
                    <tr key={t.minQty} className={cur ? 'cur' : ''}>
                      <td>{next ? `${t.minQty} – ${next.minQty - 1}` : `${t.minQty}+`}</td>
                      <td>{money(t.price)}</td>
                      <td>{Math.round((1 - t.price / product.price) * 100)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ minWidth: 200 }} className="d-flex flex-column gap-2">
            <div>
              <span className="rl-whprice fs-5">{money(unit)}</span> <span className="small text-muted">للقطعة</span>
              <span className="rl-strike">{money(product.price)}</span>
            </div>
            {soldOut ? (
              <Pill type="no">غير متوفر بالكمية دي</Pill>
            ) : (
              <>
                <QtyStepper big product={product} quantity={qty} userInfo={userInfo} onChange={(q) => setQty(normalizeQty(product, q, userInfo))} />
                <PackButtons product={product} quantity={qty} userInfo={userInfo} onChange={(q) => setQty(normalizeQty(product, q, userInfo))} />
                <div className="fw-bold">الإجمالي: {money(unit * qty)}</div>
                <button className="rl-btn-main" onClick={() => onAdd(product, qty)}>
                  <i className="fas fa-cart-plus"></i> أضف للسلة
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

// 🏭 قسم الجملة / المصنع
//  - الزائر والعميل العادي: صفحة تعريفية + دعوة لتسجيل حساب تاجر (من غير أي أسعار جملة)
//  - التاجر المعتمد: جدول المنتجات بأسعار الجملة وشرائح الكميات والإضافة بالدستة
export default function WholesaleScreen() {
  const { state, dispatch } = useContext(Store);
  const { userInfo, cart } = state;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isWh = Boolean(userInfo && userInfo.isWholesale);
  const token = userInfo && userInfo.token;

  useEffect(() => {
    let off = false;
    setLoading(true);
    axios
      .get('/api/products')
      .then(({ data }) => !off && setProducts(data))
      .catch((e) => !off && setError(getError(e)))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [token, isWh]);

  const list = useMemo(() => products.filter((p) => p.hasWholesale), [products]);

  const addToCart = async (product, quantity) => {
    const { data } = await axios.get(`/api/products/${product._id}`);
    if (data.countInStock < quantity) {
      window.alert('الكمية المطلوبة غير متوفرة حاليًا');
      return;
    }
    dispatch({ type: 'CART_ADD_ITEM', payload: { ...data, quantity } });
    dispatch({ type: 'CART_DRAWER_OPEN' });
  };

  return (
    <div>
      <Helmet>
        <title>قسم الجملة | {STORE_NAME}</title>
      </Helmet>

      <motion.div className="rl-wh-hero" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <span className="rl-pill gold">
          <i className="fas fa-industry"></i> للتجار وأصحاب المحلات
        </span>
        <h2>قسم الجملة / المصنع</h2>
        <p>
          اشترِ بالدستة أو بالكرتونة بأسعار المصنع. كل ما زادت الكمية، سعر القطعة بيقل.
          {isWh ? ' أسعارك المعروضة تحت هي أسعار الجملة الخاصة بحسابك.' : ''}
        </p>
        {!userInfo && (
          <div className="d-flex gap-2 flex-wrap">
            <Link to="/signup?type=wholesale&redirect=/wholesale" className="btn rl-hero-cta">
              سجّل كتاجر
            </Link>
            <Link to="/signin?redirect=/wholesale" className="btn btn-outline-light fw-bold">
              دخول التجار
            </Link>
          </div>
        )}
        {userInfo && !isWh && (
          <div className="d-flex gap-2 flex-wrap align-items-center">
            {userInfo.wholesaleRequest ? (
              <Pill type="wait">
                <i className="fas fa-hourglass-half"></i> طلب حساب التاجر قيد المراجعة
              </Pill>
            ) : (
              <Link to="/profile" className="btn rl-hero-cta">
                اطلب تفعيل حساب تاجر
              </Link>
            )}
          </div>
        )}
        {isWh && (
          <Pill type="gold">
            <i className="fas fa-check-circle"></i> تاجر معتمد — أسعار الجملة مفعّلة
          </Pill>
        )}
      </motion.div>

      <div className="rl-wh-perks">
        {PERKS.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.07}>
            <div className="rl-perk">
              <i className={p.icon}></i>
              <b>{p.title}</b>
              <span>{p.text}</span>
            </div>
          </Reveal>
        ))}
      </div>

      {isWh ? (
        loading ? (
          <LoadingBox />
        ) : error ? (
          <MessageBox variant="danger">{error}</MessageBox>
        ) : list.length === 0 ? (
          <Panel>
            <Empty icon="fas fa-boxes">مفيش منتجات متاحة بسعر الجملة حاليًا.</Empty>
          </Panel>
        ) : (
          <>
            <h2 className="rl-section-title mb-3">منتجات الجملة</h2>
            {list.map((p) => (
              <WholesaleRow
                key={p._id}
                product={p}
                userInfo={userInfo}
                cartQty={(cart.cartItems.find((x) => x._id === p._id) || {}).quantity}
                onAdd={addToCart}
              />
            ))}
          </>
        )
      ) : (
        <Panel title="إزاي تبدأ؟" icon="fas fa-route">
          <ol className="mb-3 ps-3">
            <li>سجّل حساب جديد واختر «أنا تاجر» وأدخل اسم محلك ورقم موبايلك.</li>
            <li>فريقنا بيراجع الطلب وبيفعّل حسابك كتاجر معتمد.</li>
            <li>أول ما تدخل بحسابك، الأسعار بتتحول تلقائيًا لأسعار الجملة وتظهرلك شرائح الكميات.</li>
          </ol>
          {!loading && list.length > 0 && (
            <small className="text-muted">
              {list.length} منتج متاح بأسعار الجملة — الأسعار بتظهر بعد تفعيل حساب التاجر.
            </small>
          )}
        </Panel>
      )}
    </div>
  );
}
