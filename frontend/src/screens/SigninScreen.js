import Axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Form from 'react-bootstrap/Form';
import { Helmet } from 'react-helmet-async';
import { useContext, useEffect, useState } from 'react';
import { Store } from '../Store';
import { toast } from 'react-toastify';
import { getError } from '../utils';
import { PageHead, Panel } from '../components/ui';

export default function SigninScreen() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const redirectInUrl = new URLSearchParams(search).get('redirect');
  const redirect = redirectInUrl ? redirectInUrl : '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { userInfo } = state;
  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      const { data } = await Axios.post('/api/users/signin', {
        email,
        password,
      });
      ctxDispatch({ type: 'USER_SIGNIN', payload: data });
      localStorage.setItem('userInfo', JSON.stringify(data));
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

  return (
    <div className="rl-narrow">
      <Helmet>
        <title>تسجيل الدخول</title>
      </Helmet>
      <PageHead title="تسجيل الدخول" sub="العملاء والتجار من نفس المكان — الأسعار بتتحدد حسب حسابك" />
      <Panel icon="fas fa-user-lock" title="أهلاً بعودتك">
        <Form onSubmit={submitHandler} className="rl-form">
          <Form.Group className="mb-3" controlId="email">
            <Form.Label>البريد الإلكتروني</Form.Label>
            <Form.Control type="email" required onChange={(e) => setEmail(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3" controlId="password">
            <Form.Label>كلمة المرور</Form.Label>
            <Form.Control type="password" required onChange={(e) => setPassword(e.target.value)} />
          </Form.Group>
          <button type="submit" className="rl-btn-main w-100">
            تسجيل الدخول
          </button>
          <div className="mt-3 small">
            عميل جديد؟ <Link to={`/signup?redirect=${redirect}`}>أنشئ حسابك</Link>
            {' · '}
            تاجر؟ <Link to={`/signup?type=wholesale&redirect=${redirect}`}>سجّل كتاجر</Link>
          </div>
          <div className="mt-2 small">
            نسيت كلمة المرور؟ <Link to={`/forget-password`}>إعادة تعيين كلمة المرور</Link>
          </div>
        </Form>
      </Panel>
    </div>
  );
}
