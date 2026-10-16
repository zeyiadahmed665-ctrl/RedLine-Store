import { useContext, useEffect, useRef } from 'react';
import axios from 'axios';
import { Store } from '../Store';
import { normalizeQty } from '../pricing';

// 🔄 مزامنة الجلسة (مفيش شكل ظاهر):
//  1) أول ما الموقع يفتح، بنسأل السيرفر عن دور العميل الحالي — فلو الأدمن وافق على حساب التاجر
//     الأسعار تتحول لجملة من غير ما العميل يعمل تسجيل خروج ودخول.
//  2) لما الدور يتغير (دخول/خروج/موافقة)، بنحدّث أسعار ومخزون المنتجات اللي في السلة.
export default function SessionSync() {
  const { state, dispatch } = useContext(Store);
  const { userInfo, cart } = state;
  const cartRef = useRef(cart.cartItems);
  cartRef.current = cart.cartItems;

  const token = userInfo && userInfo.token;
  const isWholesale = Boolean(userInfo && userInfo.isWholesale);

  // 1) تحديث بيانات المستخدم من السيرفر
  useEffect(() => {
    if (!token) return;
    let off = false;
    axios
      .get('/api/users/me')
      .then(({ data }) => {
        if (off) return;
        const changed =
          data.isWholesale !== isWholesale ||
          data.role !== userInfo.role ||
          data.isAdmin !== Boolean(userInfo.isAdmin) ||
          data.wholesaleRequest !== Boolean(userInfo.wholesaleRequest) ||
          data.name !== userInfo.name;
        if (changed) {
          dispatch({ type: 'USER_SIGNIN', payload: data });
          localStorage.setItem('userInfo', JSON.stringify(data));
        }
      })
      .catch(() => {});
    return () => {
      off = true;
    };
    // eslint-disable-next-line
  }, [token]);

  // 2) تحديث منتجات السلة عند تغيّر الدور
  useEffect(() => {
    const items = cartRef.current;
    if (!items.length) return;
    let off = false;
    Promise.allSettled(items.map((i) => axios.get(`/api/products/${i._id}`))).then((res) => {
      if (off) return;
      const fresh = {};
      const quantities = {};
      res.forEach((r, idx) => {
        if (r.status !== 'fulfilled') return;
        const p = r.value.data;
        fresh[p._id] = p;
        quantities[p._id] = normalizeQty(p, items[idx].quantity, userInfo);
      });
      dispatch({ type: 'CART_REFRESH', payload: fresh, quantities });
    });
    return () => {
      off = true;
    };
    // eslint-disable-next-line
  }, [token, isWholesale]);

  return null;
}
