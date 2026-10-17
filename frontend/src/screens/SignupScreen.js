import Axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Form from 'react-bootstrap/Form';
import { Helmet } from 'react-helmet-async';
import { useContext, useEffect, useState } from 'react';
import { Store } from '../Store';
import { toast } from 'react-toastify';
import { getError } from '../utils';
import { PageHead, Panel } from '../components/ui';

export default function SignupScreen() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  const redirectInUrl = sp.get('redirect');
  const redirect = redirectInUrl ? redirectInUrl : '/';

  const [accountType, setAccountType] = useState(sp.get('type') === 'wholesale' ? 'wholesale' : 'retail');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { userInfo } = state;
  const submitHandler = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('كلمتا المرور غير متطابقتين');
      return;
    }
    try {
      const { data } = await Axios.post('/api/users/signup', {
        name,
        email,
        password,
        phone,
        accountType,
        businessName,
      });
      ctxDispatch({ type: 'USER_SIGNIN', payload: data });
      localStorage.setItem('userInfo', JSON.stringify(data));
      if (accountType === 'wholesale') {
        toast.info('تم إنشاء حسابك. طلب حساب التاجر قيد المراجعة وهنفعّل أسعار الجملة أول ما نوافق عليه.');
      }
      navigate(redirect || '/');
    } catch (err) {
      toast.error(getError(err));
    }
  };

  useEffect(() => {
    if (userInfo) {
      navigate(redirect);
    }
  }, [navigate, redirect, userInfo]);

  const types = [
    { value: 'retail', icon: 'fas fa-shopping-bag', title: 'عميل (قطاعي)', text: 'أشتري بالقطعة لنفسي' },
    { value: 'wholesale', icon: 'fas fa-industry', title: 'تاجر (جملة)', text: 'أشتري بالدستة والكميات الكبيرة لمحلي' },
  ];

  return (
    <div className="rl-narrow">
      <Helmet>
        <title>إنشاء حساب</title>
      </Helmet>
      <PageHead title="إنشاء حساب" sub="اختر نوع حسابك وكمّل بياناتك" />
      <Panel icon="fas fa-user-plus" title="بيانات الحساب">
        <Form onSubmit={submitHandler} className="rl-form">
          {types.map((t) => (
            <label key={t.value} htmlFor={`type-${t.value}`} className={`rl-choice ${accountType === t.value ? 'on' : ''}`}>
              <input
                type="radio"
                id={`type-${t.value}`}
                name="accountType"
                value={t.value}
                checked={accountType === t.value}
                onChange={(e) => setAccountType(e.target.value)}
              />
              <i className={`ico ${t.icon}`}></i>
              <span>
                <b>{t.title}</b>
                <small>{t.text}</small>
              </span>
            </label>
          ))}

          <Form.Group className="mb-3 mt-3" controlId="name">
            <Form.Label>الاسم</Form.Label>
            <Form.Control onChange={(e) => setName(e.target.value)} required />
          </Form.Group>

          <Form.Group className="mb-3" controlId="email">
            <Form.Label>البريد الإلكتروني</Form.Label>
            <Form.Control type="email" required onChange={(e) => setEmail(e.target.value)} />
          </Form.Group>

          {accountType === 'wholesale' && (
            <>
              <Form.Group className="mb-3" controlId="businessName">
                <Form.Label>اسم المحل / النشاط</Form.Label>
                <Form.Control value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
              </Form.Group>
              <Form.Group className="mb-3" controlId="phone">
                <Form.Label>رقم الموبايل</Form.Label>
                <Form.Control value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </Form.Group>
              <div className="rl-banner info mb-3">
                <i className="fas fa-info-circle"></i> حساب التاجر بيتفعّل بعد مراجعة بياناتك. لحد ما يتفعّل، هتتصفح وتشتري بسعر القطاعي.
              </div>
            </>
          )}

          <Form.Group className="mb-3" controlId="password">
            <Form.Label>كلمة المرور</Form.Label>
            <Form.Control type="password" required minLength={8} autoComplete="new-password" onChange={(e) => setPassword(e.target.value)} />
            <Form.Text muted>8 أحرف على الأقل، وتحتوي على حروف وأرقام.</Form.Text>
          </Form.Group>
          <Form.Group className="mb-3" controlId="confirmPassword">
            <Form.Label>تأكيد كلمة المرور</Form.Label>
            <Form.Control type="password" onChange={(e) => setConfirmPassword(e.target.value)} required />
          </Form.Group>
          <button type="submit" className="rl-btn-main w-100">
            إنشاء حساب
          </button>
          <div className="mt-3 small">
            عندك حساب بالفعل؟ <Link to={`/signin?redirect=${redirect}`}>تسجيل الدخول</Link>
          </div>
        </Form>
      </Panel>
    </div>
  );
}
