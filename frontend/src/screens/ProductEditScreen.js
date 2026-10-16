import React, { useContext, useEffect, useReducer, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axios from 'axios';
import { Store } from '../Store';
import { getError } from '../utils';
import ListGroup from 'react-bootstrap/ListGroup';
import Form from 'react-bootstrap/Form';
import { Helmet } from 'react-helmet-async';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import Button from 'react-bootstrap/Button';
import AdminNav from '../components/AdminNav';
import { PageHead, Panel } from '../components/ui';

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
    case 'UPLOAD_REQUEST':
      return { ...state, loadingUpload: true, errorUpload: '' };
    case 'UPLOAD_SUCCESS':
      return {
        ...state,
        loadingUpload: false,
        errorUpload: '',
      };
    case 'UPLOAD_FAIL':
      return { ...state, loadingUpload: false, errorUpload: action.payload };

    default:
      return state;
  }
};
export default function ProductEditScreen() {
  const navigate = useNavigate();
  const params = useParams(); // /product/:id
  const { id: productId } = params;

  const { state } = useContext(Store);
  const { userInfo } = state;
  const [{ loading, error, loadingUpdate, loadingUpload }, dispatch] =
    useReducer(reducer, {
      loading: true,
      error: '',
    });

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [images, setImages] = useState([]);
  const [category, setCategory] = useState('');
  const [countInStock, setCountInStock] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');
  // 🏭 حقول الجملة
  const [wholesalePrice, setWholesalePrice] = useState('0');
  const [wholesaleMinQty, setWholesaleMinQty] = useState('12');
  const [packSize, setPackSize] = useState('12');
  const [tiers, setTiers] = useState([]); // [{ minQty, price }]

  useEffect(() => {
    const fetchData = async () => {
      try {
        dispatch({ type: 'FETCH_REQUEST' });
        const { data } = await axios.get(`/api/products/${productId}`);
        setName(data.name);
        setSlug(data.slug);
        setPrice(data.price);
        setImage(data.image);
        setImages(data.images);
        setCategory(data.category);
        setCountInStock(data.countInStock);
        setBrand(data.brand);
        setDescription(data.description);
        setWholesalePrice(String(data.wholesalePrice || 0));
        setWholesaleMinQty(String(data.wholesaleMinQty || 12));
        setPackSize(String(data.packSize || 12));
        setTiers((data.priceTiers || []).map((t) => ({ minQty: String(t.minQty), price: String(t.price) })));
        dispatch({ type: 'FETCH_SUCCESS' });
      } catch (err) {
        dispatch({
          type: 'FETCH_FAIL',
          payload: getError(err),
        });
      }
    };
    fetchData();
  }, [productId]);

  const submitHandler = async (e) => {
    e.preventDefault();
    try {
      dispatch({ type: 'UPDATE_REQUEST' });
      await axios.put(
        `/api/products/${productId}`,
        {
          _id: productId,
          name,
          slug,
          price,
          image,
          images,
          category,
          brand,
          countInStock,
          description,
          wholesalePrice: Number(wholesalePrice) || 0,
          wholesaleMinQty: Number(wholesaleMinQty) || 1,
          packSize: Number(packSize) || 1,
          priceTiers: tiers.map((t) => ({ minQty: Number(t.minQty), price: Number(t.price) })),
        },
        {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        }
      );
      dispatch({
        type: 'UPDATE_SUCCESS',
      });
      toast.success('تم تحديث المنتج بنجاح');
      navigate('/admin/products');
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: 'UPDATE_FAIL' });
    }
  };
  const uploadFileHandler = async (e, forImages) => {
    const file = e.target.files[0];
    const bodyFormData = new FormData();
    bodyFormData.append('file', file);
    try {
      dispatch({ type: 'UPLOAD_REQUEST' });
      const { data } = await axios.post('/api/upload', bodyFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          authorization: `Bearer ${userInfo.token}`,
        },
      });
      dispatch({ type: 'UPLOAD_SUCCESS' });

      if (forImages) {
        setImages([...images, data.secure_url]);
      } else {
        setImage(data.secure_url);
      }
      toast.success('تم رفع الصورة بنجاح. اضغط تحديث لتطبيقها');
    } catch (err) {
      toast.error(getError(err));
      dispatch({ type: 'UPLOAD_FAIL', payload: getError(err) });
    }
  };
  const setTier = (i, key, value) => setTiers(tiers.map((t, idx) => (idx === i ? { ...t, [key]: value } : t)));
  const deleteFileHandler = async (fileName) => {
    setImages(images.filter((x) => x !== fileName));
    toast.success('تم حذف الصورة بنجاح. اضغط تحديث لتطبيق الحذف');
  };
  return (
    <div>
      <Helmet>
        <title>تعديل المنتج {productId}</title>
      </Helmet>
      <AdminNav />
      <div className="rl-narrow" style={{ maxWidth: 760 }}>
        <PageHead title="تعديل المنتج" sub={productId} />

        {loading ? (
          <LoadingBox></LoadingBox>
        ) : error ? (
          <MessageBox variant="danger">{error}</MessageBox>
        ) : (
          <Form onSubmit={submitHandler} className="rl-form">
            <Panel icon="fas fa-tshirt" title="بيانات المنتج">
          <Form.Group className="mb-3" controlId="name">
            <Form.Label>الاسم</Form.Label>
            <Form.Control
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="slug">
            <Form.Label>الاسم في الرابط (Slug)</Form.Label>
            <Form.Control
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="price">
            <Form.Label>سعر القطاعي</Form.Label>
            <Form.Control
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="image">
            <Form.Label>ملف الصورة</Form.Label>
            <Form.Control
              value={image}
              onChange={(e) => setImage(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="imageFile">
            <Form.Label>رفع صورة</Form.Label>
            <Form.Control type="file" onChange={uploadFileHandler} />
            {loadingUpload && <LoadingBox></LoadingBox>}
          </Form.Group>

          <Form.Group className="mb-3" controlId="additionalImage">
            <Form.Label>صور إضافية</Form.Label>
            {images.length === 0 && <MessageBox>لا توجد صور</MessageBox>}
            <ListGroup variant="flush">
              {images.map((x) => (
                <ListGroup.Item key={x}>
                  {x}
                  <Button variant="light" onClick={() => deleteFileHandler(x)}>
                    <i className="fa fa-times-circle"></i>
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Form.Group>
          <Form.Group className="mb-3" controlId="additionalImageFile">
            <Form.Label>رفع صورة إضافية</Form.Label>
            <Form.Control
              type="file"
              onChange={(e) => uploadFileHandler(e, true)}
            />
            {loadingUpload && <LoadingBox></LoadingBox>}
          </Form.Group>

          <Form.Group className="mb-3" controlId="category">
            <Form.Label>القسم</Form.Label>
            <Form.Control
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="brand">
            <Form.Label>الماركة</Form.Label>
            <Form.Control
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="countInStock">
            <Form.Label>الكمية المتاحة</Form.Label>
            <Form.Control
              value={countInStock}
              onChange={(e) => setCountInStock(e.target.value)}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3" controlId="description">
            <Form.Label>الوصف</Form.Label>
            <Form.Control
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </Form.Group>
            </Panel>

            <Panel icon="fas fa-industry" title="أسعار الجملة (للتجار المعتمدين)" delay={0.05}>
              <p className="small text-muted">
                سعر الجملة = 0 معناه إن المنتج مش متاح للجملة. التاجر بيشوف السعر ده بدل سعر القطاعي، والكمية عنده بتزيد بحجم الباكيت.
              </p>
              <div className="row">
                <Form.Group className="mb-3 col-sm-4" controlId="wholesalePrice">
                  <Form.Label>سعر القطعة بالجملة</Form.Label>
                  <Form.Control type="number" min="0" value={wholesalePrice} onChange={(e) => setWholesalePrice(e.target.value)} />
                </Form.Group>
                <Form.Group className="mb-3 col-sm-4" controlId="wholesaleMinQty">
                  <Form.Label>أقل كمية للتاجر</Form.Label>
                  <Form.Control type="number" min="1" value={wholesaleMinQty} onChange={(e) => setWholesaleMinQty(e.target.value)} />
                </Form.Group>
                <Form.Group className="mb-3 col-sm-4" controlId="packSize">
                  <Form.Label>حجم الباكيت (12 = دستة)</Form.Label>
                  <Form.Control type="number" min="1" value={packSize} onChange={(e) => setPackSize(e.target.value)} />
                </Form.Group>
              </div>

              <Form.Label>شرائح الكميات الكبيرة (اختياري)</Form.Label>
              {tiers.length === 0 && <div className="small text-muted mb-2">مفيش شرائح — سعر الجملة ثابت لكل الكميات.</div>}
              {tiers.map((t, i) => (
                <div className="d-flex gap-2 align-items-center mb-2" key={i}>
                  <span className="small">من</span>
                  <Form.Control type="number" min="1" style={{ maxWidth: 110 }} value={t.minQty} onChange={(e) => setTier(i, 'minQty', e.target.value)} placeholder="الكمية" />
                  <span className="small">قطعة، السعر</span>
                  <Form.Control type="number" min="0" style={{ maxWidth: 120 }} value={t.price} onChange={(e) => setTier(i, 'price', e.target.value)} placeholder="سعر القطعة" />
                  <button type="button" className="rl-btn-ghost danger" onClick={() => setTiers(tiers.filter((_, idx) => idx !== i))}>
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              ))}
              <button type="button" className="rl-btn-ghost" onClick={() => setTiers([...tiers, { minQty: '', price: '' }])}>
                <i className="fas fa-plus"></i> إضافة شريحة
              </button>
            </Panel>

            <button disabled={loadingUpdate} type="submit" className="rl-btn-main w-100">
              حفظ التعديلات
            </button>
            {loadingUpdate && <LoadingBox></LoadingBox>}
          </Form>
        )}
      </div>
    </div>
  );
}
