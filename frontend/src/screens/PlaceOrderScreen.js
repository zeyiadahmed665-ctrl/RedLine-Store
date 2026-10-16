import Axios from 'axios';
import React, { useContext, useEffect, useReducer } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { toast } from 'react-toastify';
import { getError } from '../utils';
import { Store } from '../Store';
import CheckoutSteps from '../components/CheckoutSteps';
import LoadingBox from '../components/LoadingBox';
import { PageHead, Panel, Pill } from '../components/ui';
import { money, paymentLabel, FREE_SHIPPING_THRESHOLD } from '../config';
import { calcTotals, unitPrice, wholesaleApplies } from '../pricing';

const reducer = (state, action) => {
  switch (action.type) {
    case 'CREATE_REQUEST':
      return { ...state, loading: true };
    case 'CREATE_SUCCESS':
      return { ...state, loading: false };
    case 'CREATE_FAIL':
      return { ...state, loading: false };
    default:
      return state;
  }
};

export default function PlaceOrderScreen() {
  const navigate = useNavigate();

  const [{ loading }, dispatch] = useReducer(reducer, {
    loading: false,
  });

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { cart, userInfo } = state;

  // الأسعار هنا للعرض بس — السيرفر بيحسب السعر النهائي بنفسه (قطاعي أو جملة) عند تأكيد الطلب
  const totals = calcTotals(cart.cartItems, userInfo);

  const placeOrderHandler = async () => {
    try {
      dispatch({ type: 'CREATE_REQUEST' });

      const { data } = await Axios.post(
        '/api/orders',
        {
          orderItems: cart.cartItems.map((x) => ({ _id: x._id, quantity: x.quantity })),
          shippingAddress: cart.shippingAddress,
          paymentMethod: cart.paymentMethod,
        },
        {
          headers: {
            authorization: `Bearer ${userInfo.token}`,
          },
        }
      );
      ctxDispatch({ type: 'CART_CLEAR' });
      dispatch({ type: 'CREATE_SUCCESS' });
      localStorage.removeItem('cartItems');
      navigate(`/order/${data.order._id}`);
    } catch (err) {
      dispatch({ type: 'CREATE_FAIL' });
      toast.error(getError(err));
    }
  };

  useEffect(() => {
    if (!cart.paymentMethod) {
      navigate('/payment');
    }
  }, [cart, navigate]);

  const toFree = Math.max(0, FREE_SHIPPING_THRESHOLD - totals.itemsPrice);

  return (
    <div>
      <CheckoutSteps step1 step2 step3 step4></CheckoutSteps>
      <Helmet>
        <title>مراجعة الطلب</title>
      </Helmet>
      <PageHead title="مراجعة الطلب" sub="راجع بياناتك قبل التأكيد">
        {userInfo && userInfo.isWholesale && (
          <Pill type="gold">
            <i className="fas fa-industry"></i> طلب جملة
          </Pill>
        )}
      </PageHead>
      <Row>
        <Col lg={8}>
          <Panel
            icon="fas fa-truck"
            title="الشحن"
            edit={<Link to="/shipping">تعديل</Link>}
          >
            <div className="rl-kv">
              <span>الاسم</span>
              <b>{cart.shippingAddress.fullName}</b>
            </div>
            <div className="rl-kv">
              <span>العنوان</span>
              <b>
                {cart.shippingAddress.address}، {cart.shippingAddress.city}، {cart.shippingAddress.postalCode}،{' '}
                {cart.shippingAddress.country}
              </b>
            </div>
          </Panel>

          <Panel icon="fas fa-credit-card" title="الدفع" edit={<Link to="/payment">تعديل</Link>} delay={0.05}>
            <div className="rl-kv">
              <span>الطريقة</span>
              <b>{paymentLabel(cart.paymentMethod)}</b>
            </div>
          </Panel>

          <Panel icon="fas fa-tshirt" title="المنتجات" edit={<Link to="/cart">تعديل</Link>} delay={0.1}>
            {cart.cartItems.map((item) => {
              const unit = unitPrice(item, item.quantity, userInfo);
              return (
                <div className="rl-line" key={item._id}>
                  <img src={item.image} alt={item.name} />
                  <Link to={`/product/${item.slug}`} className="rl-line-name">
                    {item.name}
                    {wholesaleApplies(item, userInfo) && <span className="rl-pill dark ms-2">جملة</span>}
                  </Link>
                  <span className="rl-line-qty">
                    {item.quantity} × {money(unit)}
                  </span>
                  <span className="rl-line-total">{money(unit * item.quantity)}</span>
                </div>
              );
            })}
          </Panel>
        </Col>
        <Col lg={4}>
          <div className="rl-sticky">
            <Panel icon="fas fa-receipt" title="ملخص الطلب" delay={0.1}>
              <div className="rl-kv">
                <span>المنتجات</span>
                <span>{money(totals.itemsPrice)}</span>
              </div>
              {totals.savings > 0 && (
                <div className="rl-kv" style={{ color: '#14803c', fontWeight: 700 }}>
                  <span>وفّرت بسعر الجملة</span>
                  <span>{money(totals.savings)}</span>
                </div>
              )}
              <div className="rl-kv">
                <span>الشحن</span>
                <span>{totals.shippingPrice === 0 ? 'مجاني' : money(totals.shippingPrice)}</span>
              </div>
              <div className="rl-kv">
                <span>الضريبة</span>
                <span>{money(totals.taxPrice)}</span>
              </div>
              <div className="rl-kv total">
                <span>إجمالي الطلب</span>
                <span>{money(totals.totalPrice)}</span>
              </div>
              {totals.shippingPrice > 0 && toFree > 0 && (
                <small className="text-muted d-block mt-2">زوّد {money(toFree)} والشحن يبقى مجاني 🚚</small>
              )}
              <button
                type="button"
                className="rl-btn-main w-100 mt-3"
                onClick={placeOrderHandler}
                disabled={cart.cartItems.length === 0 || loading}
              >
                تأكيد الطلب
              </button>
              {loading && <LoadingBox></LoadingBox>}
            </Panel>
          </div>
        </Col>
      </Row>
    </div>
  );
}
