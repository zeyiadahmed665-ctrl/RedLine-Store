import axios from 'axios';
import React, { useContext, useEffect, useReducer, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import AdminNav from '../components/AdminNav';
import { PageHead, Pill, Tr, Empty } from '../components/ui';
import { Store } from '../Store';
import { getError } from '../utils';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        users: action.payload,
        loading: false,
      };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    case 'DELETE_REQUEST':
      return { ...state, loadingDelete: true, successDelete: false };
    case 'DELETE_SUCCESS':
      return {
        ...state,
        loadingDelete: false,
        successDelete: true,
      };
    case 'DELETE_FAIL':
      return { ...state, loadingDelete: false };
    case 'DELETE_RESET':
      return { ...state, loadingDelete: false, successDelete: false };
    default:
      return state;
  }
};

const roleOf = (u) => (u.isAdmin || u.role === 'admin' ? 'admin' : u.role === 'wholesale' ? 'wholesale' : 'user');

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'pending', label: 'طلبات التجار' },
  { key: 'wholesale', label: 'التجار' },
];

export default function UserListScreen() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const [filter, setFilter] = useState(new URLSearchParams(search).get('filter') || 'all');
  const [reload, setReload] = useState(0);
  const [{ loading, error, users, loadingDelete, successDelete }, dispatch] = useReducer(reducer, {
    loading: true,
    error: '',
  });

  const { state } = useContext(Store);
  const { userInfo } = state;

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const { data } = await axios.get(`/api/users`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (err) {
        dispatch({
          type: 'FETCH_FAIL',
          payload: getError(err),
        });
      }
    };
    if (successDelete) {
      dispatch({ type: 'DELETE_RESET' });
    } else {
      fetchData();
    }
  }, [userInfo, successDelete, reload]);

  const deleteHandler = async (user) => {
    if (window.confirm('هل أنت متأكد من الحذف؟')) {
      try {
        dispatch({ type: 'DELETE_REQUEST' });
        await axios.delete(`/api/users/${user._id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        toast.success('تم حذف المستخدم بنجاح');
        dispatch({ type: 'DELETE_SUCCESS' });
      } catch (error) {
        toast.error(getError(error));
        dispatch({
          type: 'DELETE_FAIL',
        });
      }
    }
  };

  // ✅ موافقة / ❌ رفض سريع على طلب حساب تاجر
  const decide = async (user, role) => {
    try {
      await axios.put(
        `/api/users/${user._id}`,
        { role },
        { headers: { Authorization: `Bearer ${userInfo.token}` } }
      );
      toast.success(role === 'wholesale' ? 'تم اعتماد حساب التاجر' : 'تم رفض الطلب');
      setReload((n) => n + 1);
    } catch (err) {
      toast.error(getError(err));
    }
  };

  const pendingCount = (users || []).filter((u) => u.wholesaleRequest).length;
  const shown = (users || []).filter((u) =>
    filter === 'pending' ? u.wholesaleRequest : filter === 'wholesale' ? roleOf(u) === 'wholesale' : true
  );

  return (
    <div>
      <Helmet>
        <title>المستخدمون</title>
      </Helmet>
      <AdminNav />
      <PageHead title="المستخدمون" sub={users ? `${shown.length} مستخدم` : undefined}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className="rl-btn-ghost"
            style={filter === f.key ? { background: '#111', color: '#fff', borderColor: '#111' } : undefined}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key === 'pending' && pendingCount > 0 && <span className="dot ms-1 rl-pill gold">{pendingCount}</span>}
          </button>
        ))}
      </PageHead>

      {loadingDelete && <LoadingBox></LoadingBox>}
      {loading ? (
        <LoadingBox></LoadingBox>
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <div className="rl-tablewrap">
          {shown.length === 0 ? (
            <Empty icon="fas fa-users">لا يوجد مستخدمون في هذا القسم</Empty>
          ) : (
            <table className="rl-table">
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>البريد الإلكتروني</th>
                  <th>النشاط / الموبايل</th>
                  <th>الدور</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((user, i) => {
                  const role = roleOf(user);
                  return (
                    <Tr key={user._id} i={i}>
                      <td>
                        <b>{user.name}</b>
                      </td>
                      <td>{user.email}</td>
                      <td className="small text-muted">
                        {user.businessName || '—'}
                        {user.phone ? ` · ${user.phone}` : ''}
                      </td>
                      <td>
                        {role === 'admin' ? (
                          <Pill type="dark">أدمن</Pill>
                        ) : role === 'wholesale' ? (
                          <Pill type="gold">تاجر جملة</Pill>
                        ) : user.wholesaleRequest ? (
                          <Pill type="wait">طلب تاجر</Pill>
                        ) : (
                          <Pill type="grey">قطاعي</Pill>
                        )}
                      </td>
                      <td>
                        <div className="rl-actions">
                          {user.wholesaleRequest && (
                            <>
                              <button type="button" className="rl-btn-main" style={{ padding: '.3rem .8rem', fontSize: '.85rem' }} onClick={() => decide(user, 'wholesale')}>
                                اعتماد
                              </button>
                              <button type="button" className="rl-btn-ghost danger" onClick={() => decide(user, 'user')}>
                                رفض
                              </button>
                            </>
                          )}
                          <button type="button" className="rl-btn-ghost" onClick={() => navigate(`/admin/user/${user._id}`)}>
                            تعديل
                          </button>
                          <button type="button" className="rl-btn-ghost danger" onClick={() => deleteHandler(user)}>
                            حذف
                          </button>
                        </div>
                      </td>
                    </Tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
