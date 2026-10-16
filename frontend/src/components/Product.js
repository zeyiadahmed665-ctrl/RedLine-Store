import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Reveal from './Reveal';
import axios from 'axios';
import { useContext } from 'react';
import { Store } from '../Store';
import { money, packName } from '../config';
import { wholesaleApplies, minQty, qtyStep, unitPrice } from '../pricing';

// 🃏 كارت المنتج: تكبير خفيف + ظل عند الهوفر، وزر "إضافة سريعة" بنبض بيفتح السلة الجانبية
function Product(props) {
  const { product, index = 0 } = props;
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const {
    cart: { cartItems },
    userInfo,
  } = state;
  // 🏭 للتاجر المعتمد: السعر بالجملة، والإضافة بتبدأ من الحد الأدنى (دستة) وتزيد بحجم الباكيت
  const wholesale = wholesaleApplies(product, userInfo);
  const min = minQty(product, userInfo);
  const step = qtyStep(product, userInfo);

  const addToCartHandler = async (item) => {
    const existItem = cartItems.find((x) => x._id === product._id);
    const quantity = existItem ? existItem.quantity + step : min;
    const { data } = await axios.get(`/api/products/${item._id}`);
    if (data.countInStock < quantity) {
      window.alert(
        wholesale && data.countInStock > 0
          ? `المتاح من المنتج ${data.countInStock} قطعة فقط، وده أقل من أقل طلب للجملة`
          : 'عذرًا، المنتج غير متوفر حاليًا'
      );
      return;
    }
    ctxDispatch({ type: 'CART_ADD_ITEM', payload: { ...item, quantity } });
    ctxDispatch({ type: 'CART_DRAWER_OPEN' });
  };

  const low = product.countInStock > 0 && product.countInStock <= 10;

  return (
    <Reveal className="h-100" delay={(index % 3) * 0.08}>
    <div className="rl-card">
      <Link to={`/product/${product.slug}`} className="rl-card-img">
        <img src={product.image} alt={product.name} loading="lazy" />
      </Link>
      <div className="rl-card-body">
        <div className="d-flex justify-content-between small text-muted">
          <span>{product.brand}</span>
          <span>{product.category}</span>
        </div>
        <Link to={`/product/${product.slug}`} className="rl-card-title">
          {product.name}
        </Link>
        <div className="d-flex justify-content-between align-items-center">
          {wholesale ? (
            <span>
              <strong className="rl-whprice">{money(unitPrice(product, min, userInfo))}</strong>
              <span className="rl-strike">{money(product.price)}</span>
            </span>
          ) : (
            <strong>{money(product.price)}</strong>
          )}
          <span className="small">
            <i className="fas fa-star" style={{ color: '#ffc000' }}></i> {Number(product.rating).toFixed(1)}
          </span>
        </div>
        {wholesale && (
          <small className="text-muted">
            <span className="rl-pill dark">سعر الجملة</span> أقل طلب {min} قطعة
          </small>
        )}
        {!wholesale && product.hasWholesale && (
          <Link to="/wholesale" className="rl-wh-hint">
            <i className="fas fa-industry"></i> سعر خاص للتجار والكميات
          </Link>
        )}
        {low && !wholesale && (
          <div>
            <small className="text-danger fw-bold">باقي {product.countInStock} قطع فقط</small>
            <div className="rl-bar">
              <motion.i
                initial={{ width: 0 }}
                whileInView={{ width: `${product.countInStock * 10}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, ease: [0.2, 0.7, 0.2, 1] }}
              />
            </div>
          </div>
        )}
        {product.countInStock === 0 ? (
          <button className="rl-quick" disabled>
            غير متوفر
          </button>
        ) : (
          <button className="rl-quick rl-pulse" onClick={() => addToCartHandler(product)}>
            {wholesale
              ? min === step
                ? `إضافة ${packName(step)} (${min} قطعة)`
                : `إضافة ${min} قطعة`
              : 'إضافة سريعة للسلة'}
          </button>
        )}
      </div>
    </div>
    </Reveal>
  );
}
export default Product;
