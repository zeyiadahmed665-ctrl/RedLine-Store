import React, { useContext, useEffect, useReducer } from 'react';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import { PageHead, Pill, Tr, Empty } from '../components/ui';
import { Store } from '../Store';
import { getError } from '../utils';
import { money } from '../config';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return { ...state, orders: action.payload, loading: false };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

export default function OrderHistoryScreen() {
  const { state } = useContext(Store);
  const { userInfo } = state;
  const navigate = useNavigate();

  const [{ loading, error, orders }, dispatch] = useReducer(reducer, {
    loading: true,
    error: '',
  });
  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: 'FETCH_REQUEST' });
      try {
        const { data } = await axios.get(`/api/orders/mine`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (error) {
        dispatch({
          type: 'FETCH_FAIL',
          payload: getError(error),
        });
      }
    };
    fetchData();
  }, [userInfo]);
  return (
    <div>
      <Helmet>
        <title>طلباتي</title>
      </Helmet>

      <PageHead title="طلباتي" sub={orders ? `${orders.length} طلب` : undefined} />
      {loading ? (
        <LoadingBox></LoadingBox>
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : orders.length === 0 ? (
        <div className="rl-tablewrap">
          <Empty icon="fas fa-receipt">
            لسه مفيش طلبات. <Link to="/">ابدأ التسوق</Link>
          </Empty>
        </div>
      ) : (
        <div className="rl-tablewrap">
          <table className="rl-table">
            <thead>
              <tr>
                <th>الرقم</th>
                <th>التاريخ</th>
                <th>النوع</th>
                <th>الإجمالي</th>
                <th>الدفع</th>
                <th>التسليم</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, i) => (
                <Tr key={order._id} i={i}>
                  <td className="mono">{order._id}</td>
                  <td>{order.createdAt.substring(0, 10)}</td>
                  <td>{order.orderType === 'wholesale' ? <Pill type="gold">جملة</Pill> : <Pill type="grey">قطاعي</Pill>}</td>
                  <td>
                    <b>{money(order.totalPrice)}</b>
                  </td>
                  <td>{order.isPaid ? <Pill type="ok">{order.paidAt.substring(0, 10)}</Pill> : <Pill type="no">لا</Pill>}</td>
                  <td>{order.isDelivered ? <Pill type="ok">{order.deliveredAt.substring(0, 10)}</Pill> : <Pill type="wait">لا</Pill>}</td>
                  <td>
                    <button type="button" className="rl-btn-ghost" onClick={() => navigate(`/order/${order._id}`)}>
                      التفاصيل
                    </button>
                  </td>
                </Tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
