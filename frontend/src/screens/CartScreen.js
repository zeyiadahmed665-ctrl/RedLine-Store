import { useContext } from 'react';
import { Store } from '../Store';
import { Helmet } from 'react-helmet-async';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { money, packName } from '../config';
import { calcTotals, unitPrice, wholesaleApplies, minQty, qtyStep, normalizeQty } from '../pricing';
import { PageHead, Panel, Empty, Pill } from '../components/ui';
import QtyStepper, { PackButtons } from '../components/QtyStepper';
import { AnimatePresence, motion } from 'framer-motion';

// 🛒 سلة التسوق — للقطاعي بالقطعة، وللتاجر بالدستة/الباكيت مع أزرار كميات جاهزة وسعر الشريحة
export default function CartScreen() {
  const navigate = useNavigate();
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const {
    cart: { cartItems },
    userInfo,
  } = state;

  const updateCartHandler = async (item, wanted) => {
    const quantity = normalizeQty(item, wanted, userInfo);
    if (quantity === item.quantity) return;
    const { data } = await axios.get(`/api/products/${item._id}`);
    if (data.countInStock < quantity) {
      window.alert('عذرًا، الكمية المطلوبة غير متوفرة حاليًا');
      return;
    }
    ctxDispatch({ type: 'CART_ADD_ITEM', payload: { ...item, quantity } });
  };
  const removeItemHandler = (item) => ctxDispatch({ type: 'CART_REMOVE_ITEM', payload: item });
  const checkoutHandler = () => navigate('/signin?redirect=/shipping');

  const t = calcTotals(cartItems, userInfo);

  return (
    <div>
      <Helmet>
        <title>سلة التسوق</title>
      </Helmet>
      <PageHead title="سلة التسوق" sub={cartItems.length ? `${t.count} قطعة في السلة` : undefined}>
        {userInfo && userInfo.isWholesale && (
          <Pill type="gold">
            <i className="fas fa-industry"></i> أسعار الجملة مفعّلة
          </Pill>
        )}
      </PageHead>
      <Row>
        <Col lg={8}>
          {cartItems.length === 0 ? (
            <Panel>
              <Empty icon="fas fa-shopping-bag">
                السلة فارغة. <Link to="/">تسوّق الآن</Link>
              </Empty>
            </Panel>
          ) : (
            <Panel>
              <AnimatePresence initial={false}>
                {cartItems.map((item) => {
                  const wholesale = wholesaleApplies(item, userInfo);
                  const unit = unitPrice(item, item.quantity, userInfo);
                  return (
                    <motion.div
                      key={item._id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40 }}
                      transition={{ duration: 0.3 }}
                      className="rl-line"
                      style={{ alignItems: 'flex-start' }}
                    >
                      <img src={item.image} alt={item.name} />
                      <div className="flex-grow-1">
                        <Link to={`/product/${item.slug}`} className="rl-line-name">
                          {item.name}
                        </Link>
                        <div className="small text-muted mb-1">
                          {wholesale ? (
                            <>
                              <span className="rl-pill dark">جملة</span> أقل طلب {minQty(item, userInfo)} قطعة · الزيادة بالـ
                              {packName(qtyStep(item, userInfo))} ({qtyStep(item, userInfo)})
                            </>
                          ) : (
                            item.category
                          )}
                        </div>
                        <div className="d-flex align-items-center flex-wrap gap-3">
                          <QtyStepper
                            big
                            product={item}
                            quantity={item.quantity}
                            userInfo={userInfo}
                            onChange={(q) => updateCartHandler(item, q)}
                          />
                          <span className="small">
                            {money(unit)} × {item.quantity}
                            {wholesale && Number(item.price) > unit && <span className="rl-strike">{money(item.price)}</span>}
                          </span>
                        </div>
                        <PackButtons
                          product={item}
                          quantity={item.quantity}
                          userInfo={userInfo}
                          onChange={(q) => updateCartHandler(item, q)}
                        />
                      </div>
                      <div className="text-end">
                        <div className="rl-line-total">{money(unit * item.quantity)}</div>
                        <button className="rl-btn-ghost danger mt-2" onClick={() => removeItemHandler(item)}>
                          <i className="fas fa-trash"></i> حذف
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </Panel>
          )}
        </Col>
        <Col lg={4}>
          <div className="rl-sticky">
            <Panel title="ملخص السلة" icon="fas fa-receipt" delay={0.1}>
              <div className="rl-kv">
                <span>عدد القطع</span>
                <span>{t.count}</span>
              </div>
              {t.savings > 0 && (
                <div className="rl-kv" style={{ color: '#14803c', fontWeight: 700 }}>
                  <span>وفّرت بسعر الجملة</span>
                  <span>{money(t.savings)}</span>
                </div>
              )}
              <div className="rl-kv total">
                <span>إجمالي المنتجات</span>
                <span>{money(t.itemsPrice)}</span>
              </div>
              <small className="text-muted d-block mt-2">الشحن والضريبة بيتحسبوا في خطوة مراجعة الطلب.</small>
              <button
                type="button"
                className="rl-btn-main w-100 mt-3"
                onClick={checkoutHandler}
                disabled={cartItems.length === 0}
              >
                إتمام الشراء
              </button>
            </Panel>
          </div>
        </Col>
      </Row>
    </div>
  );
}
