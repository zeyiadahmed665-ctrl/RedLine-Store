import axios from 'axios';
import React, { useContext, useEffect, useReducer, useState } from 'react';
import Form from 'react-bootstrap/Form';
import { Helmet } from 'react-helmet-async';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import AdminNav from '../components/AdminNav';
import { PageHead, Panel } from '../components/ui';
import { Store } from '../Store';
import { getError } from '../utils';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return { ...state, loading: false };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    case 'UPDATE_REQUEST':
      return { ...state, loadingUpdate: true };
    case 'UPDATE_SUCCESS':
      return { ...state, loadingUpdate: false };
    case 'UPDATE_FAIL':
      return { ...state, loadingUpdate: false };
    default:
      return state;
  }
};

const ROLES = [
  { value: 'user', title: 'عميل قطاعي', text: 'بيشوف ويشتري بالسعر العادي' },
  { value: 'wholesale', title: 'تاجر جملة معتمد', text: 'أسعار الجملة + شرائح الكميات + الشراء بالدستة' },
  { value: 'admin', title: 'أدمن', text: 'صلاحيات الإدارة الكاملة' },
];

export default function UserEditScreen() {
  const [{ loading, error, loadingUpdate }, dispatch] = useReducer(reducer, {
    loading: true,
    error: '',
  });

  const { state } = useContext(Store);
  const { userInfo } = state;

  const params = useParams();
  const { id: userId } = params;
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const { data } = await axios.get(`/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        setName(data.name);
        setEmail(data.email);
        setRole(data.isAdmin || data.role === 'admin' ? 'admin' : data.role === 'wholesale' ? 'wholesale' : 'user');
        setBusinessName(data.businessName || '');
        setPhone(data.phone || '');
        setPending(Boolean(data.wholesaleRequest));
        dispatch({ type: 'FETCH_SUCCESS' });
      } catch (err) {
        dispatch({
          type: 'FETCH_FAIL',
          payload: getError(err),
        });
      }
    };
    fetchData();
  }, [userId, userInfo]);

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: 'UPDATE_REQUEST' });
      await axios.put(
        `/api/users/${userId}`,
        { _id: userId, name, email, role, businessName, phone },
        {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        }
      );
      dispatch({
        type: 'UPDATE_SUCCESS',
      });
      toast.success('تم تحديث البيانات بنجاح');
      navigate('/admin/users');
    } catch (error) {
      toast.error(getError(error));
      dispatch({ type: 'UPDATE_FAIL' });
    }
  };
  return (
    <div>
      <Helmet>
        <title>تعديل المستخدم {userId}</title>
      </Helmet>
      <AdminNav />
      <div className="rl-narrow">
        <PageHead title="تعديل المستخدم" sub={userId} />

        {loading ? (
          <LoadingBox></LoadingBox>
        ) : error ? (
          <MessageBox variant="danger">{error}</MessageBox>
        ) : (
          <Panel icon="fas fa-user-edit" title="بيانات الحساب">
            {pending && (
              <div className="rl-banner info mb-3">
                <i className="fas fa-user-clock"></i> العميل ده قدّم طلب حساب تاجر. اختر «تاجر جملة معتمد» واحفظ للموافقة، أو اتركه «عميل قطاعي» للرفض.
              </div>
            )}
            <Form onSubmit={submitHandler} className="rl-form">
              <Form.Group className="mb-3" controlId="name">
                <Form.Label>الاسم</Form.Label>
                <Form.Control value={name} onChange={(e) => setName(e.target.value)} required />
              </Form.Group>
              <Form.Group className="mb-3" controlId="email">
                <Form.Label>البريد الإلكتروني</Form.Label>
                <Form.Control value={email} type="email" onChange={(e) => setEmail(e.target.value)} required />
              </Form.Group>
              <Form.Group className="mb-3" controlId="businessName">
                <Form.Label>اسم النشاط / المحل</Form.Label>
                <Form.Control value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              </Form.Group>
              <Form.Group className="mb-3" controlId="phone">
                <Form.Label>رقم الموبايل</Form.Label>
                <Form.Control value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Form.Group>

              <Form.Label>الدور</Form.Label>
              {ROLES.map((r) => (
                <label key={r.value} htmlFor={`role-${r.value}`} className={`rl-choice ${role === r.value ? 'on' : ''}`}>
                  <input
                    type="radio"
                    id={`role-${r.value}`}
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={(e) => setRole(e.target.value)}
                  />
                  <span>
                    <b>{r.title}</b>
                    <small>{r.text}</small>
                  </span>
                </label>
              ))}

              <button disabled={loadingUpdate} type="submit" className="rl-btn-main w-100 mt-2">
                حفظ التعديلات
              </button>
              {loadingUpdate && <LoadingBox></LoadingBox>}
            </Form>
          </Panel>
        )}
      </div>
    </div>
  );
}
