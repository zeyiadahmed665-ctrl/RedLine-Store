import React, { useContext, useEffect, useReducer } from 'react';
import Chart from 'react-google-charts';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Store } from '../Store';
import { getError } from '../utils';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import AdminNav from '../components/AdminNav';
import { PageHead, Panel, CountUp } from '../components/ui';
import Reveal from '../components/Reveal';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { money } from '../config';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        summary: action.payload,
        loading: false,
      };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

// كارت إحصائية: رقم بيعدّ من صفر + أيقونة
function Stat({ icon, label, children, dark, delay = 0 }) {
  return (
    <Reveal delay={delay} className="h-100">
      <div className={`rl-stat ${dark ? 'dark' : ''}`}>
        <i className={`ico ${icon}`}></i>
        <div className="num">{children}</div>
        <div className="lbl">{label}</div>
      </div>
    </Reveal>
  );
}

export default function DashboardScreen() {
  const [{ loading, summary, error }, dispatch] = useReducer(reducer, {
    loading: true,
    error: '',
  });
  const { state } = useContext(Store);
  const { userInfo } = state;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get('/api/orders/summary', {
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
    fetchData();
  }, [userInfo]);

  const typeOf = (t) => (summary && summary.ordersByType.find((x) => x._id === t)) || { numOrders: 0, totalSales: 0 };

  return (
    <div>
      <Helmet>
        <title>لوحة التحكم</title>
      </Helmet>
      <AdminNav />
      <PageHead title="لوحة التحكم" sub="نظرة سريعة على المتجر" />
      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <>
          {summary.pendingWholesale > 0 && (
            <Reveal>
              <div className="rl-banner info mb-3">
                <i className="fas fa-user-clock"></i>
                عندك {summary.pendingWholesale} طلب حساب تاجر بانتظار المراجعة.
                <Link to="/admin/users?filter=pending" className="ms-auto fw-bold">
                  راجعها الآن
                </Link>
              </div>
            </Reveal>
          )}
          <Row className="g-3 mb-3">
            <Col sm={6} lg={3}>
              <Stat icon="fas fa-users" label="المستخدمون">
                <CountUp value={summary.users && summary.users[0] ? summary.users[0].numUsers : 0} />
              </Stat>
            </Col>
            <Col sm={6} lg={3}>
              <Stat icon="fas fa-receipt" label="الطلبات" delay={0.07}>
                <CountUp value={summary.orders && summary.orders[0] ? summary.orders[0].numOrders : 0} />
              </Stat>
            </Col>
            <Col sm={6} lg={3}>
              <Stat icon="fas fa-coins" label="إجمالي المبيعات" dark delay={0.14}>
                <CountUp
                  value={summary.orders && summary.orders[0] ? summary.orders[0].totalSales : 0}
                  format={(v) => money(v)}
                />
              </Stat>
            </Col>
            <Col sm={6} lg={3}>
              <Stat icon="fas fa-industry" label="التجار المعتمدون" delay={0.21}>
                <CountUp value={summary.wholesaleUsers || 0} />
              </Stat>
            </Col>
          </Row>

          <Row className="g-3">
            <Col md={6}>
              <Stat icon="fas fa-shopping-bag" label={`مبيعات القطاعي (${typeOf('retail').numOrders} طلب)`}>
                <CountUp value={typeOf('retail').totalSales} format={(v) => money(v)} />
              </Stat>
            </Col>
            <Col md={6}>
              <Stat icon="fas fa-boxes" label={`مبيعات الجملة (${typeOf('wholesale').numOrders} طلب)`} delay={0.07}>
                <CountUp value={typeOf('wholesale').totalSales} format={(v) => money(v)} />
              </Stat>
            </Col>
          </Row>

          <div className="mt-3">
            <Panel title="المبيعات" icon="fas fa-chart-area">
              {summary.dailyOrders.length === 0 ? (
                <MessageBox>لا توجد مبيعات</MessageBox>
              ) : (
                <Chart
                  width="100%"
                  height="360px"
                  chartType="AreaChart"
                  loader={<div>جاري تحميل الرسم...</div>}
                  data={[['التاريخ', 'المبيعات'], ...summary.dailyOrders.map((x) => [x._id, x.sales])]}
                  options={{ colors: ['#d71920'], legend: { position: 'none' } }}
                ></Chart>
              )}
            </Panel>
            <Panel title="الأقسام" icon="fas fa-chart-pie" delay={0.05}>
              {summary.productCategories.length === 0 ? (
                <MessageBox>لا توجد أقسام</MessageBox>
              ) : (
                <Chart
                  width="100%"
                  height="360px"
                  chartType="PieChart"
                  loader={<div>جاري تحميل الرسم...</div>}
                  data={[['القسم', 'المنتجات'], ...summary.productCategories.map((x) => [x._id, x.count])]}
                  options={{ colors: ['#d71920', '#111111', '#ffb400', '#ff7a00', '#888888'] }}
                ></Chart>
              )}
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
