import { useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Store } from '../Store';
import { money } from '../config';
import { calcTotals, unitPrice, wholesaleApplies, normalizeQty } from '../pricing';
import QtyStepper from './QtyStepper';

// 🛒 السلة الجانبية: بتنزلق من اليمين مع خلفية معتمة + بلور
function CartDrawer() {
  const { state, dispatch } = useContext(Store);
  const { cartDrawerOpen, cart, userInfo } = state;
  const { cartItems } = cart;
  const navigate = useNavigate();

  const close = () => dispatch({ type: 'CART_DRAWER_CLOSE' });
  const { itemsPrice: total, savings } = calcTotals(cartItems, userInfo);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && close();
    if (cartDrawerOpen) window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line
  }, [cartDrawerOpen]);

  const setQty = (item, quantity) => {
    const q = normalizeQty(item, quantity, userInfo);
    if (q === item.quantity) return;
    dispatch({ type: 'CART_ADD_ITEM', payload: { ...item, quantity: q } });
  };
  const remove = (item) =>
    dispatch({ type: 'CART_REMOVE_ITEM', payload: item });

  return (
    <AnimatePresence>
      {cartDrawerOpen && (
        <>
          <motion.div
            className="rl-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.aside
            className="rl-drawer"
            dir="rtl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            role="dialog"
            aria-label="سلة التسوق"
          >
            <div className="rl-drawer-head">
              <strong>سلة التسوق</strong>
              <button className="rl-icon-btn" onClick={close} aria-label="إغلاق">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="rl-drawer-body">
              {cartItems.length === 0 ? (
                <p className="text-center text-muted mt-5">السلة فاضية</p>
              ) : (
                cartItems.map((item, idx) => (
                  <motion.div
                    className="rl-drawer-item"
                    key={item._id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.45, delay: 0.25 + idx * 0.08 }}
                  >
                    <img src={item.image} alt={item.name} />
                    <div className="flex-grow-1">
                      <div className="rl-drawer-name">{item.name}</div>
                      <div className="rl-drawer-sub">{item.category}</div>
                      <div className="rl-drawer-price">
                        {money(unitPrice(item, item.quantity, userInfo))}
                        {wholesaleApplies(item, userInfo) && <span className="rl-pill dark ms-1">جملة</span>}
                      </div>
                      <QtyStepper product={item} quantity={item.quantity} userInfo={userInfo} onChange={(q) => setQty(item, q)} />
                    </div>
                    <button className="rl-icon-btn" onClick={() => remove(item)} aria-label="حذف">
                      <i className="fas fa-times"></i>
                    </button>
                  </motion.div>
                ))
              )}
            </div>

            <div className="rl-drawer-foot">
              {savings > 0 && (
                <div className="d-flex justify-content-between mb-2 small" style={{ color: '#14803c', fontWeight: 700 }}>
                  <span>وفّرت بسعر الجملة</span>
                  <span>{money(savings)}</span>
                </div>
              )}
              <div className="d-flex justify-content-between mb-3">
                <span className="text-muted">الإجمالي</span>
                <strong>{money(total)}</strong>
              </div>
              <Link to="/cart" onClick={close} className="btn rl-btn-outline w-100 mb-2">
                عرض السلة كاملة
              </Link>
              <button
                className="btn rl-btn-black w-100"
                disabled={cartItems.length === 0}
                onClick={() => {
                  close();
                  navigate('/signin?redirect=/shipping');
                }}
              >
                إتمام الشراء
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
export default CartDrawer;
