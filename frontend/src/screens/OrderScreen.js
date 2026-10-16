import axios from 'axios';
import React, { useContext, useEffect, useReducer } from 'react';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { Link } from 'react-router-dom';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import { PageHead, Panel, Pill } from '../components/ui';
import { Store } from '../Store';
import { getError } from '../utils';
import { toast } from 'react-toastify';
import {
  money,
  paymentLabel,
  formatDate,
  PAYMENT_PAYPAL,
  PAYMENT_COD,
} from '../config';

function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true, error: '' };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false, order: action.payload, error: '' };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    case 'PAY_REQUEST':
      return { ...state, loadingPay: true };
    case 'PAY_SUCCESS':
      return { ...state, loadingPay: false, successPay: true };
    case 'PAY_FAIL':
      return { ...state, loadingPay: false };
    case 'PAY_RESET':
      return { ...state, loadingPay: false, successPay: false };

    case 'DELIVER_REQUEST':
      return { ...state, loadingDeliver: true };
    case 'DELIVER_SUCCESS':
      return { ...state, loadingDeliver: false, successDeliver: true };
    case 'DELIVER_FAIL':
      return { ...state, loadingDeliver: false };
    case 'DELIVER_RESET':
      return {
        ...state,
        loadingDeliver: false,
        successDeliver: false,
      };
    default:
      return state;
  }
}
export default function OrderScreen() {
  const { state } = useContext(Store);
  const { userInfo } = state;

  const params = useParams();
  const { id: orderId } = params;
  const navigate = useNavigate();

  const [
    {
      loading,
      error,
      order,
      successPay,
      loadingPay,
      loadingDeliver,
      successDeliver,
    },
    dispatch,
  ] = useReducer(reducer, {
    loading: true,
    order: {},
    error: '',
    successPay: false,
    loadingPay: false,
  });

  const [{ isPending }, paypalDispatch] = usePayPalScriptReducer();

  function createOrder(data, actions) {
    return actions.order
      .create({
        purchase_units: [
          {
            amount: { value: order.totalPrice },
          },
        ],
      })
      .then((orderID) => {
        return orderID;
      });
  }

  function onApprove(data, actions) {
    return actions.order.capture().then(async function (details) {
      try {
        dispatch({ type: 'PAY_REQUEST' });
        const { data } = await axios.put(
          `/api/orders/${order._id}/pay`,
          details,
          {
            headers: { authorization: `Bearer ${userInfo.token}` },
          }
        );
        dispatch({ type: 'PAY_SUCCESS', payload: data });
        toast.success('تم تسجيل الدفع');
      } catch (err) {
        dispatch({ type: 'PAY_FAIL', payload: getError(err) });
        toast.error(getError(err));
      }
    });
  }
  function onError(err) {
    toast.error(getError(err));
  }

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const { data } = await axios.get(`/api/orders/${orderId}`, {
          headers: { authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'FETCH_FAIL', payload: getError(err) });
      }
    };

    if (!userInfo) {
      return navigate('/signin');
    }
    if (
      !order._id ||
      successPay ||
      successDeliver ||
      (order._id && order._id !== orderId)
    ) {
      fetchOrder();
      if (successPay) {
        dispatch({ type: 'PAY_RESET' });
      }
      if (successDeliver) {
        dispatch({ type: 'DELIVER_RESET' });
      }
    } else if (order.paymentMethod === PAYMENT_PAYPAL && !order.isPaid) {
      const loadPaypalScript = async () => {
        const { data: clientId } = await axios.get('/api/keys/paypal', {
          headers: { authorization: `Bearer ${userInfo.token}` },
        });
        paypalDispatch({
          type: 'resetOptions',
          value: {
            'client-id': clientId,
            currency: 'USD',
          },
        });
        paypalDispatch({ type: 'setLoadingStatus', value: 'pending' });
      };
      loadPaypalScript();
    }
  }, [
    order,
    userInfo,
    orderId,
    navigate,
    paypalDispatch,
    successPay,
    successDeliver,
  ]);

  async function deliverOrderHandler() {
    try {
      dispatch({ type: 'DELIVER_REQUEST' });
      const { data } = await axios.put(
        `/api/orders/${order._id}/deliver`,
        {},
        {
          headers: { authorization: `Bearer ${userInfo.token}` },
        }
      );
      dispatch({ type: 'DELIVER_SUCCESS', payload: data });
      toast.success('تم تسليم الطلب');
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: 'DELIVER_FAIL' });
    }
  }

  return loading ? (
    <LoadingBox></LoadingBox>
  ) : error ? (
    <MessageBox variant="danger">{error}</MessageBox>
  ) : (
    <div>
      <Helmet>
        <title>طلب رقم {orderId}</title>
      </Helmet>
      <PageHead title="تفاصيل الطلب" sub={`رقم ${orderId}`}>
        {order.orderType === 'wholesale' && (
          <Pill type="gold">
            <i className="fas fa-industry"></i> طلب جملة
          </Pill>
        )}
        <Pill type={order.isPaid ? 'ok' : 'no'}>{order.isPaid ? 'مدفوع' : 'غير مدفوع'}</Pill>
        <Pill type={order.isDelivered ? 'ok' : 'wait'}>{order.isDelivered ? 'تم التسليم' : 'قيد التجهيز'}</Pill>
      </PageHead>
      <Row>
        <Col lg={8}>
          <Panel icon="fas fa-truck" title="الشحن">
            <div className="rl-kv">
              <span>الاسم</span>
              <b>{order.shippingAddress.fullName}</b>
            </div>
            <div className="rl-kv">
              <span>العنوان</span>
              <b>
                {order.shippingAddress.address}، {order.shippingAddress.city}، {order.shippingAddress.postalCode}،{' '}
                {order.shippingAddress.country}
                {order.shippingAddress.location && order.shippingAddress.location.lat && (
                  <>
                    {' '}
                    <a
                      target="_new"
                      href={`https://maps.google.com?q=${order.shippingAddress.location.lat},${order.shippingAddress.location.lng}`}
                    >
                      عرض على الخريطة
                    </a>
                  </>
                )}
              </b>
            </div>
            {order.isDelivered ? (
              <div className="rl-banner ok">
                <i className="fas fa-check-circle"></i> تم التسليم في {formatDate(order.deliveredAt)}
              </div>
            ) : (
              <div className="rl-banner no">
                <i className="fas fa-box"></i> لم يتم التسليم بعد
              </div>
            )}
          </Panel>

          <Panel icon="fas fa-credit-card" title="الدفع" delay={0.05}>
            <div className="rl-kv">
              <span>الطريقة</span>
              <b>{paymentLabel(order.paymentMethod)}</b>
            </div>
            {order.isPaid ? (
              <div className="rl-banner ok">
                <i className="fas fa-check-circle"></i> تم الدفع في {formatDate(order.paidAt)}
              </div>
            ) : (
              <div className="rl-banner no">
                <i className="fas fa-clock"></i> لم يتم الدفع بعد
              </div>
            )}
          </Panel>

          <Panel icon="fas fa-tshirt" title="المنتجات" delay={0.1}>
            {order.orderItems.map((item) => (
              <div className="rl-line" key={item._id}>
                <img src={item.image} alt={item.name} />
                <Link to={`/product/${item.slug}`} className="rl-line-name">
                  {item.name}
                </Link>
                <span className="rl-line-qty">
                  {item.quantity} × {money(item.price)}
                </span>
                <span className="rl-line-total">{money(item.price * item.quantity)}</span>
              </div>
            ))}
          </Panel>
        </Col>
        <Col lg={4}>
          <div className="rl-sticky">
            <Panel icon="fas fa-receipt" title="ملخص الطلب" delay={0.1}>
              <div className="rl-kv">
                <span>المنتجات</span>
                <span>{money(order.itemsPrice)}</span>
              </div>
              <div className="rl-kv">
                <span>الشحن</span>
                <span>{order.shippingPrice === 0 ? 'مجاني' : money(order.shippingPrice)}</span>
              </div>
              <div className="rl-kv">
                <span>الضريبة</span>
                <span>{money(order.taxPrice)}</span>
              </div>
              <div className="rl-kv total">
                <span>إجمالي الطلب</span>
                <span>{money(order.totalPrice)}</span>
              </div>

              {!order.isPaid && order.paymentMethod === PAYMENT_COD && (
                <div className="rl-banner info">
                  <i className="fas fa-hand-holding-usd"></i> ادفع نقدًا عند استلام طلبك.
                </div>
              )}
              {!order.isPaid && order.paymentMethod === PAYMENT_PAYPAL && (
                <div className="mt-3">
                  {isPending ? (
                    <LoadingBox />
                  ) : (
                    <div>
                      <PayPalButtons createOrder={createOrder} onApprove={onApprove} onError={onError}></PayPalButtons>
                    </div>
                  )}
                  {loadingPay && <LoadingBox></LoadingBox>}
                </div>
              )}
              {userInfo.isAdmin && (order.isPaid || order.paymentMethod === PAYMENT_COD) && !order.isDelivered && (
                <div className="mt-3">
                  {loadingDeliver && <LoadingBox></LoadingBox>}
                  <button type="button" className="rl-btn-main w-100" onClick={deliverOrderHandler}>
                    <i className="fas fa-check"></i> تأكيد التسليم
                  </button>
                </div>
              )}
            </Panel>
          </div>
        </Col>
      </Row>
    </div>
  );
}
