import React, { useContext, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import CheckoutSteps from '../components/CheckoutSteps';
import { PageHead, Panel } from '../components/ui';
import { Store } from '../Store';
import { PAYMENT_PAYPAL, PAYMENT_COD } from '../config';

const OPTIONS = [
  { value: PAYMENT_COD, id: 'CashOnDelivery', icon: 'fas fa-money-bill-wave', title: 'الدفع عند الاستلام', text: 'ادفع نقدًا لما طلبك يوصلك' },
  { value: PAYMENT_PAYPAL, id: 'PayPal', icon: 'fab fa-paypal', title: 'PayPal', text: 'ادفع أونلاين بأمان بالبطاقة أو حساب باي بال' },
];

export default function PaymentMethodScreen() {
  const navigate = useNavigate();
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const {
    cart: { shippingAddress, paymentMethod },
  } = state;

  const [paymentMethodName, setPaymentMethod] = useState(paymentMethod || PAYMENT_COD);

  useEffect(() => {
    if (!shippingAddress.address) {
      navigate('/shipping');
    }
  }, [shippingAddress, navigate]);
  const submitHandler = (e) => {
    e.preventDefault();
    ctxDispatch({ type: 'SAVE_PAYMENT_METHOD', payload: paymentMethodName });
    localStorage.setItem('paymentMethod', paymentMethodName);
    navigate('/placeorder');
  };
  return (
    <div>
      <CheckoutSteps step1 step2 step3></CheckoutSteps>
      <div className="rl-narrow">
        <Helmet>
          <title>طريقة الدفع</title>
        </Helmet>
        <PageHead title="طريقة الدفع" sub="اختر الطريقة المناسبة لك" />
        <Panel icon="fas fa-credit-card" title="الدفع">
          <form onSubmit={submitHandler}>
            {OPTIONS.map((o) => (
              <label key={o.id} htmlFor={o.id} className={`rl-choice ${paymentMethodName === o.value ? 'on' : ''}`}>
                <input
                  type="radio"
                  id={o.id}
                  name="paymentMethod"
                  value={o.value}
                  checked={paymentMethodName === o.value}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                />
                <i className={`ico ${o.icon}`}></i>
                <span>
                  <b>{o.title}</b>
                  <small>{o.text}</small>
                </span>
              </label>
            ))}
            <button type="submit" className="rl-btn-main w-100 mt-2">
              متابعة لمراجعة الطلب
            </button>
          </form>
        </Panel>
      </div>
    </div>
  );
}
