import React, { useContext, useEffect, useReducer } from 'react';
import axios from 'axios';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import { Store } from '../Store';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import AdminNav from '../components/AdminNav';
import { PageHead, Pill, Tr, Empty } from '../components/ui';
import { getError } from '../utils';
import { money } from '../config';

const reducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_REQUEST':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        products: action.payload.products,
        page: action.payload.page,
        pages: action.payload.pages,
        loading: false,
      };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    case 'CREATE_REQUEST':
      return { ...state, loadingCreate: true };
    case 'CREATE_SUCCESS':
      return {
        ...state,
        loadingCreate: false,
      };
    case 'CREATE_FAIL':
      return { ...state, loadingCreate: false };

    case 'DELETE_REQUEST':
      return { ...state, loadingDelete: true, successDelete: false };
    case 'DELETE_SUCCESS':
      return {
        ...state,
        loadingDelete: false,
        successDelete: true,
      };
    case 'DELETE_FAIL':
      return { ...state, loadingDelete: false, successDelete: false };

    case 'DELETE_RESET':
      return { ...state, loadingDelete: false, successDelete: false };
    default:
      return state;
  }
};

export default function ProductListScreen() {
  const [{ loading, error, products, pages, loadingCreate, loadingDelete, successDelete }, dispatch] = useReducer(
    reducer,
    {
      loading: true,
      error: '',
    }
  );

  const navigate = useNavigate();
  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  const page = sp.get('page') || 1;

  const { state } = useContext(Store);
  const { userInfo } = state;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await axios.get(`/api/products/admin?page=${page}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });

        dispatch({ type: 'FETCH_SUCCESS', payload: data });
      } catch (err) {
        dispatch({ type: 'FETCH_FAIL', payload: getError(err) });
      }
    };

    if (successDelete) {
      dispatch({ type: 'DELETE_RESET' });
    } else {
      fetchData();
    }
  }, [page, userInfo, successDelete]);

  const createHandler = async () => {
    if (window.confirm('هل تريد إضافة منتج جديد؟')) {
      try {
        dispatch({ type: 'CREATE_REQUEST' });
        const { data } = await axios.post(
          '/api/products',
          {},
          {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          }
        );
        toast.success('تم إنشاء المنتج بنجاح');
        dispatch({ type: 'CREATE_SUCCESS' });
        navigate(`/admin/product/${data.product._id}`);
      } catch (err) {
        toast.error(getError(err));
        dispatch({
          type: 'CREATE_FAIL',
        });
      }
    }
  };

  const deleteHandler = async (product) => {
    if (window.confirm('هل أنت متأكد من الحذف؟')) {
      try {
        await axios.delete(`/api/products/${product._id}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        toast.success('تم حذف المنتج بنجاح');
        dispatch({ type: 'DELETE_SUCCESS' });
      } catch (err) {
        toast.error(getError(err));
        dispatch({
          type: 'DELETE_FAIL',
        });
      }
    }
  };

  return (
    <div>
      <Helmet>
        <title>المنتجات</title>
      </Helmet>
      <AdminNav />
      <PageHead title="المنتجات" sub="إدارة المنتجات وأسعار القطاعي والجملة">
        <button type="button" className="rl-btn-main" onClick={createHandler}>
          <i className="fas fa-plus"></i> إضافة منتج
        </button>
      </PageHead>

      {loadingCreate && <LoadingBox></LoadingBox>}
      {loadingDelete && <LoadingBox></LoadingBox>}

      {loading ? (
        <LoadingBox></LoadingBox>
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <>
          <div className="rl-tablewrap">
            {products.length === 0 ? (
              <Empty icon="fas fa-tshirt">لا توجد منتجات</Empty>
            ) : (
              <table className="rl-table">
                <thead>
                  <tr>
                    <th></th>
                    <th>الاسم</th>
                    <th>سعر القطاعي</th>
                    <th>سعر الجملة</th>
                    <th>القسم</th>
                    <th>المخزون</th>
                    <th>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, i) => (
                    <Tr key={product._id} i={i}>
                      <td>
                        <img src={product.image} alt="" style={{ width: 40, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                      </td>
                      <td>
                        <b>{product.name}</b>
                        <div className="mono">{product._id}</div>
                      </td>
                      <td>{money(product.price)}</td>
                      <td>
                        {Number(product.wholesalePrice) > 0 ? (
                          <Pill type="gold">{money(product.wholesalePrice)}</Pill>
                        ) : (
                          <Pill type="grey">بدون جملة</Pill>
                        )}
                      </td>
                      <td>{product.category}</td>
                      <td>{product.countInStock === 0 ? <Pill type="no">نفد</Pill> : product.countInStock}</td>
                      <td>
                        <div className="rl-actions">
                          <button type="button" className="rl-btn-ghost" onClick={() => navigate(`/admin/product/${product._id}`)}>
                            تعديل
                          </button>
                          <button type="button" className="rl-btn-ghost danger" onClick={() => deleteHandler(product)}>
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
          <div className="d-flex gap-1 mt-3 justify-content-center">
            {[...Array(pages).keys()].map((x) => (
              <Link
                className="rl-btn-ghost"
                style={x + 1 === Number(page) ? { background: '#111', color: '#fff', borderColor: '#111' } : undefined}
                key={x + 1}
                to={`/admin/products?page=${x + 1}`}
              >
                {x + 1}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
