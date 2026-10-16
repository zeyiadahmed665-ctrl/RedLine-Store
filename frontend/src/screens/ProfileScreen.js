import React, { useContext, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Form from 'react-bootstrap/Form';
import { Store } from '../Store';
import { toast } from 'react-toastify';
import { getError } from '../utils';
import axios from 'axios';
import { PageHead, Panel, Pill } from '../components/ui';
import { ROLE_LABELS } from '../config';

export default function ProfileScreen() {
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { userInfo } = state;
  const [name, setName] = useState(userInfo.name);
  const [email, setEmail] = useState(userInfo.email);
  const [phone, setPhone] = useState(userInfo.phone || '');
  const [businessName, setBusinessName] = useState(userInfo.businessName || '');
  const [password, setPassword] = useState('');

  const save = async (extra = {}) => {
    try {
      const { data } = await axios.put(
        '/api/users/profile',
        {
          name,
          email,
          password,
          phone,
          businessName,
          ...extra,
        },
        {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        }
      );
      ctxDispatch({ type: 'USER_SIGNIN', payload: data });
      localStorage.setItem('userInfo', JSON.stringify(data));
      toast.success('تم تحديث البيانات بنجاح');
    } catch (err) {
      toast.error(getError(err));
    }
  };

  const submitHandler = (e) => {
    e.preventDefault();
    save();
  };

  const canRequest = userInfo.role === 'user' && !userInfo.wholesaleRequest;

  return (
    <div className="rl-narrow">
      <Helmet>
        <title>الملف الشخصي</title>
      </Helmet>
      <PageHead title="الملف الشخصي">
        <Pill type={userInfo.isWholesale ? 'gold' : userInfo.isAdmin ? 'dark' : 'grey'}>
          {ROLE_LABELS[userInfo.role] || ROLE_LABELS.user}
        </Pill>
      </PageHead>
      <Panel icon="fas fa-user" title="بياناتي">
        <form onSubmit={submitHandler} className="rl-form">
          <Form.Group className="mb-3" controlId="name">
            <Form.Label>الاسم</Form.Label>
            <Form.Control value={name} onChange={(e) => setName(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mb-3" controlId="email">
            <Form.Label>البريد الإلكتروني</Form.Label>
            <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Form.Group>
          <Form.Group className="mb-3" controlId="phone">
            <Form.Label>رقم الموبايل</Form.Label>
            <Form.Control value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3" controlId="businessName">
            <Form.Label>اسم المحل / النشاط (للتجار)</Form.Label>
            <Form.Control value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </Form.Group>
          <Form.Group className="mb-3" controlId="password">
            <Form.Label>كلمة المرور الجديدة (اتركها فاضية لو مش عايز تغيّرها)</Form.Label>
            <Form.Control type="password" onChange={(e) => setPassword(e.target.value)} />
          </Form.Group>
          <button type="submit" className="rl-btn-main w-100">
            حفظ
          </button>
        </form>
      </Panel>

      {!userInfo.isAdmin && (
        <Panel icon="fas fa-industry" title="حساب التاجر (جملة)" delay={0.05}>
          {userInfo.isWholesale ? (
            <div className="rl-banner ok">
              <i className="fas fa-check-circle"></i> حسابك تاجر معتمد — أسعار الجملة مفعّلة.
            </div>
          ) : userInfo.wholesaleRequest ? (
            <div className="rl-banner info">
              <i className="fas fa-hourglass-half"></i> طلبك قيد المراجعة. هنفعّل أسعار الجملة أول ما نوافق عليه.
            </div>
          ) : (
            <>
              <p className="small text-muted">لو عندك محل وبتشتري بكميات كبيرة، اطلب تفعيل حساب تاجر عشان تشوف أسعار الجملة.</p>
              {canRequest && (
                <button type="button" className="rl-btn-ghost" onClick={() => save({ requestWholesale: true })}>
                  <i className="fas fa-paper-plane"></i> اطلب تفعيل حساب تاجر
                </button>
              )}
            </>
          )}
        </Panel>
      )}
    </div>
  );
}
