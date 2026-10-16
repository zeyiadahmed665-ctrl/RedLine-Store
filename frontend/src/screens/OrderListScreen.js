import axios from 'axios';
import React, { useContext, useEffect, useReducer, useState } from 'react';
import { toast } from 'react-toastify';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import AdminNav from '../components/AdminNav';
import { PageHead, Pill, Tr, Empty } from '../components/ui';
import { Store } from '../Store';
import { getError } from '../utils';
import { money } from '../config';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        orders: action.payload,
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

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'wholesale', label: 'جملة' },
  { key: 'retail', label: 'قطاعي' },
];

export default function OrderListScreen() {
  const navigate = useNavigate();
  const { state } = useContext(Store);
  const { userInfo } = state;
  const [filter, setFilter] = useState('all');
  const [{ loading, error, orders, loadingDelete, successDelete }, dispatch] = useReducer(reducer, {
    loading: true,
    error: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const { data } = await axios.get(`/api/orders`, {
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
  }, [userInfo, successDelete]);

  const deleteHandler = async (order) => {
    if (window.confirm('هل أنت متأكد من الحذف؟')) {
      try {
        dispatch({ type: 'DELETE_REQUEST' });
        await axios.delete(`/api/orders/${order._id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        toast.success('تم حذف الطلب بنجاح');
        dispatch({ type: 'DELETE_SUCCESS' });
      } catch (err) {
        toast.error(getError(err));
        dispatch({
          type: 'DELETE_FAIL',
        });
      }
    }
  };

  const shown = (orders || []).filter((o) => filter === 'all' || (o.orderType || 'retail') === filter);

  return (
    <div>
      <Helmet>
        <title>الطلبات</title>
      </Helmet>
      <AdminNav />
      <PageHead title="الطلبات" sub={orders ? `${shown.length} طلب` : undefined}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`rl-btn-ghost ${filter === f.key ? 'fw-bold' : ''}`}
            style={filter === f.key ? { background: '#111', color: '#fff', borderColor: '#111' } : undefined}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
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
            <Empty icon="fas fa-receipt">لا توجد طلبات</Empty>
          ) : (
            <table className="rl-table">
              <thead>
                <tr>
                  <th>الرقم</th>
                  <th>المستخدم</th>
                  <th>التاريخ</th>
                  <th>النوع</th>
                  <th>الإجمالي</th>
                  <th>الدفع</th>
                  <th>التسليم</th>
                  <th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((order, i) => (
                  <Tr key={order._id} i={i}>
                    <td className="mono">{order._id}</td>
                    <td>{order.user ? order.user.name : 'مستخدم محذوف'}</td>
                    <td>{order.createdAt.substring(0, 10)}</td>
                    <td>{order.orderType === 'wholesale' ? <Pill type="gold">جملة</Pill> : <Pill type="grey">قطاعي</Pill>}</td>
                    <td>
                      <b>{money(order.totalPrice)}</b>
                    </td>
                    <td>{order.isPaid ? <Pill type="ok">{order.paidAt.substring(0, 10)}</Pill> : <Pill type="no">لا</Pill>}</td>
                    <td>{order.isDelivered ? <Pill type="ok">{order.deliveredAt.substring(0, 10)}</Pill> : <Pill type="wait">لا</Pill>}</td>
                    <td>
                      <div className="rl-actions">
                        <button type="button" className="rl-btn-ghost" onClick={() => navigate(`/order/${order._id}`)}>
                          التفاصيل
                        </button>
                        <button type="button" className="rl-btn-ghost danger" onClick={() => deleteHandler(order)}>
                          حذف
                        </button>
                      </div>
                    </td>
                  </Tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
