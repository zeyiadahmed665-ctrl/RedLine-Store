import axios from 'axios';
import { useContext, useEffect, useReducer, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import ListGroup from 'react-bootstrap/ListGroup';
import Form from 'react-bootstrap/Form';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';
import Rating from '../components/Rating';
import { Helmet } from 'react-helmet-async';
import LoadingBox from '../components/LoadingBox';
import MessageBox from '../components/MessageBox';
import { getError } from '../utils';
import { Store } from '../Store';
import FloatingLabel from 'react-bootstrap/FloatingLabel';
import { toast } from 'react-toastify';
import { money, packName } from '../config';
import { wholesaleApplies, minQty, qtyStep, unitPrice, normalizeQty } from '../pricing';
import QtyStepper, { PackButtons } from '../components/QtyStepper';

const reducer = (state, action) => {
  switch (action.type) {
    case 'REFRESH_PRODUCT':
      return { ...state, product: action.payload };
    case 'CREATE_REQUEST':
      return { ...state, loadingCreateReview: true };
    case 'CREATE_SUCCESS':
      return { ...state, loadingCreateReview: false };
    case 'CREATE_FAIL':
      return { ...state, loadingCreateReview: false };
    case 'FETCH_REQUEST':
      return { ...state, loading: true };
    case 'FETCH_SUCCESS':
      return { ...state, product: action.payload, loading: false };
    case 'FETCH_FAIL':
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

function ProductScreen() {
  let reviewsRef = useRef();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [qty, setQty] = useState(1); // 🏭 كمية التاجر (بالدستة/الباكيت)

  const navigate = useNavigate();
  const params = useParams();
  const { slug } = params;

  const [{ loading, error, product, loadingCreateReview }, dispatch] =
    useReducer(reducer, {
      product: [],
      loading: true,
      error: '',
    });
  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: 'FETCH_REQUEST' });
      try {
        const result = await axios.get(`/api/products/slug/${slug}`);
        dispatch({ type: 'FETCH_SUCCESS', payload: result.data });
      } catch (err) {
        dispatch({ type: 'FETCH_FAIL', payload: getError(err) });
      }
    };
    fetchData();
  }, [slug]);

  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { cart, userInfo } = state;
  const wholesale = wholesaleApplies(product, userInfo);
  const min = minQty(product, userInfo);
  const step = qtyStep(product, userInfo);
  const currentUnit = unitPrice(product, wholesale ? qty : 1, userInfo);

  // أول ما المنتج يتحمّل (أو الحساب يتغيّر) الكمية تبدأ من أقل طلب (للتاجر دستة، للباقي 1)
  useEffect(() => {
    if (product && product._id) {
      const exist = cart.cartItems.find((x) => x._id === product._id);
      setQty(normalizeQty(product, exist ? exist.quantity : min, userInfo));
    }
    // eslint-disable-next-line
  }, [product._id, wholesale]);

  const addToCartHandler = async () => {
    const existItem = cart.cartItems.find((x) => x._id === product._id);
    // التاجر: الكمية اللي اختارها بالظبط — القطاعي: +1 على اللي في السلة
    const quantity = wholesale ? qty : existItem ? existItem.quantity + 1 : 1;
    const { data } = await axios.get(`/api/products/${product._id}`);
    if (data.countInStock < quantity) {
      window.alert('عذرًا، الكمية المطلوبة غير متوفرة حاليًا');
      return;
    }
    ctxDispatch({
      type: 'CART_ADD_ITEM',
      payload: { ...product, quantity },
    });
    navigate('/cart');
  };

  const submitHandler = async (e) => {
    e.preventDefault();
    if (!comment || !rating) {
      toast.error('من فضلك اكتب تعليقًا واختر التقييم');
      return;
    }
    try {
      const { data } = await axios.post(
        `/api/products/${product._id}/reviews`,
        { rating, comment, name: userInfo.name },
        {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        }
      );

      dispatch({
        type: 'CREATE_SUCCESS',
      });
      toast.success('تم إرسال تقييمك بنجاح');
      product.reviews.unshift(data.review);
      product.numReviews = data.numReviews;
      product.rating = data.rating;
      dispatch({ type: 'REFRESH_PRODUCT', payload: product });
      window.scrollTo({
        behavior: 'smooth',
        top: reviewsRef.current.offsetTop,
      });
    } catch (error) {
      toast.error(getError(error));
      dispatch({ type: 'CREATE_FAIL' });
    }
  };
  return loading ? (
    <LoadingBox />
  ) : error ? (
    <MessageBox variant="danger">{error}</MessageBox>
  ) : (
    <div>
      <Row>
        <Col md={6}>
          <img
            className="img-large"
            src={selectedImage || product.image}
            alt={product.name}
          ></img>
        </Col>
        <Col md={3}>
          <ListGroup variant="flush">
            <ListGroup.Item>
              <Helmet>
                <title>{product.name}</title>
              </Helmet>
              <h1>{product.name}</h1>
            </ListGroup.Item>
            <ListGroup.Item>
              <Rating
                rating={product.rating}
                numReviews={product.numReviews}
              ></Rating>
            </ListGroup.Item>
            <ListGroup.Item>
              السعر :{' '}
              {wholesale ? (
                <>
                  <span className="rl-whprice">{money(currentUnit)}</span>
                  <span className="rl-strike">{money(product.price)}</span>{' '}
                  <span className="rl-pill dark">سعر الجملة</span>
                </>
              ) : (
                money(product.price)
              )}
            </ListGroup.Item>
            <ListGroup.Item>
              <Row xs={1} md={2} className="g-2">
                {[product.image, ...product.images].map((x) => (
                  <Col key={x}>
                    <Card>
                      <Button
                        className="thumbnail"
                        type="button"
                        variant="light"
                        onClick={() => setSelectedImage(x)}
                      >
                        <Card.Img variant="top" src={x} alt="product" />
                      </Button>
                    </Card>
                  </Col>
                ))}
              </Row>
            </ListGroup.Item>
            <ListGroup.Item>
              الوصف:
              <p>{product.description}</p>
            </ListGroup.Item>
          </ListGroup>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <Row>
                    <Col>السعر:</Col>
                    <Col>{money(currentUnit)}</Col>
                  </Row>
                </ListGroup.Item>
                <ListGroup.Item>
                  <Row>
                    <Col>الحالة:</Col>
                    <Col>
                      {product.countInStock > 0 ? (
                        <Badge bg="success">متوفر</Badge>
                      ) : (
                        <Badge bg="danger">غير متوفر</Badge>
                      )}
                    </Col>
                  </Row>
                </ListGroup.Item>

                {wholesale && product.countInStock >= min && (
                  <ListGroup.Item>
                    <div className="small fw-bold mb-2">
                      الكمية (أقل طلب {min} · {packName(step)} = {step})
                    </div>
                    <QtyStepper big product={product} quantity={qty} userInfo={userInfo} onChange={(q) => setQty(normalizeQty(product, q, userInfo))} />
                    <PackButtons product={product} quantity={qty} userInfo={userInfo} onChange={(q) => setQty(normalizeQty(product, q, userInfo))} />
                    {[{ minQty: min, price: product.wholesalePrice }, ...(product.priceTiers || [])].length > 1 && (
                      <table className="rl-tiers mt-3">
                        <thead>
                          <tr>
                            <th>الكمية</th>
                            <th>سعر القطعة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[{ minQty: min, price: product.wholesalePrice }, ...(product.priceTiers || [])].map((t, i, arr) => (
                            <tr key={t.minQty} className={qty >= t.minQty && (!arr[i + 1] || qty < arr[i + 1].minQty) ? 'cur' : ''}>
                              <td>{arr[i + 1] ? `${t.minQty} – ${arr[i + 1].minQty - 1}` : `${t.minQty}+`}</td>
                              <td>{money(t.price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    <div className="fw-bold mt-2">الإجمالي: {money(currentUnit * qty)}</div>
                  </ListGroup.Item>
                )}
                {!wholesale && product.hasWholesale && (
                  <ListGroup.Item>
                    <Link to="/wholesale" className="rl-wh-hint">
                      <i className="fas fa-industry"></i> متاح بسعر الجملة للتجار — اعرف أكتر
                    </Link>
                  </ListGroup.Item>
                )}
                {product.countInStock > 0 && (!wholesale || product.countInStock >= min) && (
                  <ListGroup.Item>
                    <div className="d-grid">
                      <Button onClick={addToCartHandler} variant="primary">
                        أضف للسلة
                      </Button>
                    </div>
                  </ListGroup.Item>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <div className="my-3">
        <h2 ref={reviewsRef}>التقييمات</h2>
        <div className="mb-3">
          {product.reviews.length === 0 && (
            <MessageBox>لا توجد تقييمات بعد</MessageBox>
          )}
        </div>
        <ListGroup>
          {product.reviews.map((review) => (
            <ListGroup.Item key={review._id}>
              <strong>{review.name}</strong>
              <Rating rating={review.rating} caption=" "></Rating>
              <p>{review.createdAt.substring(0, 10)}</p>
              <p>{review.comment}</p>
            </ListGroup.Item>
          ))}
        </ListGroup>
        <div className="my-3">
          {userInfo ? (
            <form onSubmit={submitHandler}>
              <h2>اكتب تقييمك</h2>
              <Form.Group className="mb-3" controlId="rating">
                <Form.Label>التقييم</Form.Label>
                <Form.Select
                  aria-label="التقييم"
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                >
                  <option value="">اختر...</option>
                  <option value="1">1- سيئ</option>
                  <option value="2">2- مقبول</option>
                  <option value="3">3- جيد</option>
                  <option value="4">4- جيد جدًا</option>
                  <option value="5">5- ممتاز</option>
                </Form.Select>
              </Form.Group>
              <FloatingLabel
                controlId="floatingTextarea"
                label="التعليق"
                className="mb-3"
              >
                <Form.Control
                  as="textarea"
                  placeholder="اكتب تعليقك هنا"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </FloatingLabel>

              <div className="mb-3">
                <Button disabled={loadingCreateReview} type="submit">
                  إرسال
                </Button>
                {loadingCreateReview && <LoadingBox></LoadingBox>}
              </div>
            </form>
          ) : (
            <MessageBox>
              من فضلك{' '}
              <Link to={`/signin?redirect=/product/${product.slug}`}>
                تسجيل الدخول
              </Link>{' '}
              لكتابة تقييم
            </MessageBox>
          )}
        </div>
      </div>
    </div>
  );
}
export default ProductScreen;
