
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import HomeScreen from './screens/HomeScreen';
import Nav from 'react-bootstrap/Nav';
import NavDropdown from 'react-bootstrap/NavDropdown';
import Container from 'react-bootstrap/Container';
import { LinkContainer } from 'react-router-bootstrap';
import { lazy, Suspense, useContext, useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import { Store } from './Store';
import { getError } from './utils';
import axios from 'axios';
import SearchBox from './components/SearchBox';
import CartDrawer from './components/CartDrawer';
import LoadingBox from './components/LoadingBox';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import SectionTabs from './components/SectionTabs';
import SessionSync from './components/SessionSync';
import { STORE_NAME, ROLE_LABELS } from './config';

// تحميل الصفحات عند الطلب
const ProductScreen = lazy(() => import('./screens/ProductScreen'));
const CartScreen = lazy(() => import('./screens/CartScreen'));
const SigninScreen = lazy(() => import('./screens/SigninScreen'));
const ShippingAddressScreen = lazy(() => import('./screens/ShippingAddressScreen'));
const SignupScreen = lazy(() => import('./screens/SignupScreen'));
const PaymentMethodScreen = lazy(() => import('./screens/PaymentMethodScreen'));
const PlaceOrderScreen = lazy(() => import('./screens/PlaceOrderScreen'));
const OrderScreen = lazy(() => import('./screens/OrderScreen'));
const OrderHistoryScreen = lazy(() => import('./screens/OrderHistoryScreen'));
const ProfileScreen = lazy(() => import('./screens/ProfileScreen'));
const SearchScreen = lazy(() => import('./screens/SearchScreen'));
const DashboardScreen = lazy(() => import('./screens/DashboardScreen'));
const ProductListScreen = lazy(() => import('./screens/ProductListScreen'));
const ProductEditScreen = lazy(() => import('./screens/ProductEditScreen'));
const OrderListScreen = lazy(() => import('./screens/OrderListScreen'));
const UserListScreen = lazy(() => import('./screens/UserListScreen'));
const UserEditScreen = lazy(() => import('./screens/UserEditScreen'));
const WholesaleScreen = lazy(() => import('./screens/WholesaleScreen'));
const MapScreen = lazy(() => import('./screens/MapScreen'));
const ForgetPasswordScreen = lazy(() => import('./screens/ForgetPasswordScreen'));
const ResetPasswordScreen = lazy(() => import('./screens/ResetPasswordScreen'));

function App() {
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const { fullBox, cart, userInfo } = state;

  const signoutHandler = () => {
    ctxDispatch({ type: 'USER_SIGNOUT' });
    localStorage.removeItem('userInfo');
    localStorage.removeItem('shippingAddress');
    localStorage.removeItem('paymentMethod');
    localStorage.removeItem('cartItems');
    window.location.href = '/signin';
  };

  const [sidebarIsOpen, setSidebarIsOpen] = useState(false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (!sidebarIsOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setSidebarIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [sidebarIsOpen]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get('/api/products/categories');
        setCategories(data);
      } catch (err) {
        toast.error(getError(err));
      }
    };

    fetchCategories();
  }, []);

  return (
    <BrowserRouter>
      <SessionSync />

      <MotionConfig reducedMotion="user">
        <div
          className={
            fullBox
              ? 'site-container d-flex flex-column full-box'
              : 'site-container d-flex flex-column'
          }
        >
          <ToastContainer position="bottom-center" limit={1} rtl />

          <header className="rl-header">
            <Container dir="ltr" className="rl-header-inner">
              <Link to="/" className="rl-brand">
                <img
                  src="/images/logo.png"
                  alt={STORE_NAME}
                  className="rl-logo"
                />
              </Link>

              <nav className="rl-nav d-none d-lg-flex" dir="rtl">
                {categories.slice(0, 3).map((c) => (
                  <Link
                    key={c}
                    to={`/search?category=${encodeURIComponent(c)}`}
                  >
                    {c}
                  </Link>
                ))}

                <Link to="/search?order=newest">وصل حديثاً</Link>

                <Link
                  to="/search?order=lowest"
                  className="rl-sale-link"
                >
                  تخفيضات
                </Link>

                <Link to="/search?order=toprated">
                  الأكثر مبيعاً
                </Link>
              </nav>

              <div className="rl-header-tools" dir="rtl">
                <div className="d-none d-md-block">
                  <SearchBox />
                </div>

                {userInfo ? (
                  <NavDropdown
                    title={userInfo.name}
                    id="basic-nav-dropdown"
                    align="end"
                  >
                    <NavDropdown.ItemText className="small text-muted">
                      {ROLE_LABELS[userInfo.role] || ROLE_LABELS.user}
                      {userInfo.wholesaleRequest && !userInfo.isWholesale
                        ? ' — طلب التاجر قيد المراجعة'
                        : ''}
                    </NavDropdown.ItemText>

                    <NavDropdown.Divider />

                    <LinkContainer to="/profile">
                      <NavDropdown.Item>
                        الملف الشخصي
                      </NavDropdown.Item>
                    </LinkContainer>

                    <LinkContainer to="/orderhistory">
                      <NavDropdown.Item>
                        طلباتي
                      </NavDropdown.Item>
                    </LinkContainer>

                    {userInfo.isAdmin && (
                      <>
                        <NavDropdown.Divider />

                        <LinkContainer to="/admin/dashboard">
                          <NavDropdown.Item>
                            لوحة التحكم
                          </NavDropdown.Item>
                        </LinkContainer>

                        <LinkContainer to="/admin/products">
                          <NavDropdown.Item>
                            المنتجات
                          </NavDropdown.Item>
                        </LinkContainer>

                        <LinkContainer to="/admin/orders">
                          <NavDropdown.Item>
                            الطلبات
                          </NavDropdown.Item>
                        </LinkContainer>

                        <LinkContainer to="/admin/users">
                          <NavDropdown.Item>
                            المستخدمون
                          </NavDropdown.Item>
                        </LinkContainer>
                      </>
                    )}

                    <NavDropdown.Divider />

                    <Link
                      className="dropdown-item"
                      to="#signout"
                      onClick={signoutHandler}
                    >
                      تسجيل الخروج
                    </Link>
                  </NavDropdown>
                ) : (
                  <Link className="rl-account" to="/signin">
                    <i className="far fa-user"></i>
                    <span className="d-none d-sm-inline">
                      حسابي
                    </span>
                  </Link>
                )}

                <button
                  className="rl-cart-btn"
                  onClick={() =>
                    ctxDispatch({ type: 'CART_DRAWER_OPEN' })
                  }
                >
                  السلة

                  {cart.cartItems.length > 0 && (
                    <span
                      className="rl-cart-badge"
                      key={cart.cartItems.reduce(
                        (a, c) => a + c.quantity,
                        0
                      )}
                    >
                      {cart.cartItems.reduce(
                        (a, c) => a + c.quantity,
                        0
                      )}
                    </span>
                  )}
                </button>

                <button
                  className="rl-icon-btn d-lg-none"
                  aria-label="الأقسام"
                  aria-expanded={sidebarIsOpen}
                  onClick={() => setSidebarIsOpen(!sidebarIsOpen)}
                >
                  <i className="fas fa-bars"></i>
                </button>
              </div>
            </Container>
          </header>

          <CartDrawer />

          <div
            className={sidebarIsOpen ? 'side-overlay show' : 'side-overlay'}
            onClick={() => setSidebarIsOpen(false)}
            aria-hidden="true"
          />

          <div
            aria-hidden={!sidebarIsOpen}
            className={
              sidebarIsOpen
                ? 'active-nav side-navbar d-flex justify-content-between flex-wrap flex-column'
                : 'side-navbar d-flex justify-content-between flex-wrap flex-column'
            }
          >
            <Nav className="flex-column text-white w-100 p-2">
              <Nav.Item>
                <strong>الأقسام</strong>
              </Nav.Item>

              {categories.map((category) => (
                <Nav.Item key={category}>
                  <LinkContainer
                    to={{
                      pathname: '/search',
                      search: `category=${encodeURIComponent(category)}`,
                    }}
                    onClick={() => setSidebarIsOpen(false)}
                  >
                    <Nav.Link>{category}</Nav.Link>
                  </LinkContainer>
                </Nav.Item>
              ))}
            </Nav>
          </div>

          <main>
            <Container className="mt-3">
              <SectionTabs />

              <Suspense fallback={<LoadingBox />}>
                <Routes>
                  <Route
                    path="/product/:slug"
                    element={<ProductScreen />}
                  />

                  <Route
                    path="/cart"
                    element={<CartScreen />}
                  />

                  <Route
                    path="/wholesale"
                    element={<WholesaleScreen />}
                  />

                  <Route
                    path="/search"
                    element={<SearchScreen />}
                  />

                  <Route
                    path="/signin"
                    element={<SigninScreen />}
                  />

                  <Route
                    path="/signup"
                    element={<SignupScreen />}
                  />

                  <Route
                    path="/forget-password"
                    element={<ForgetPasswordScreen />}
                  />

                  <Route
                    path="/reset-password/:token"
                    element={<ResetPasswordScreen />}
                  />

                  <Route
                    path="/profile"
                    element={
                      <ProtectedRoute>
                        <ProfileScreen />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/map"
                    element={
                      <ProtectedRoute>
                        <MapScreen />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/placeorder"
                    element={<PlaceOrderScreen />}
                  />

                  <Route
                    path="/order/:id"
                    element={
                      <ProtectedRoute>
                        <OrderScreen />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/orderhistory"
                    element={
                      <ProtectedRoute>
                        <OrderHistoryScreen />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/shipping"
                    element={<ShippingAddressScreen />}
                  />

                  <Route
                    path="/payment"
                    element={<PaymentMethodScreen />}
                  />

                  {/* Admin Routes */}
                  <Route
                    path="/admin/dashboard"
                    element={
                      <AdminRoute>
                        <DashboardScreen />
                      </AdminRoute>
                    }
                  />

                  <Route
                    path="/admin/orders"
                    element={
                      <AdminRoute>
                        <OrderListScreen />
                      </AdminRoute>
                    }
                  />

                  <Route
                    path="/admin/users"
                    element={
                      <AdminRoute>
                        <UserListScreen />
                      </AdminRoute>
                    }
                  />

                  <Route
                    path="/admin/products"
                    element={
                      <AdminRoute>
                        <ProductListScreen />
                      </AdminRoute>
                    }
                  />

                  <Route
                    path="/admin/product/:id"
                    element={
                      <AdminRoute>
                        <ProductEditScreen />
                      </AdminRoute>
                    }
                  />

                  <Route
                    path="/admin/user/:id"
                    element={
                      <AdminRoute>
                        <UserEditScreen />
                      </AdminRoute>
                    }
                  />

                  <Route
                    path="/"
                    element={<HomeScreen />}
                  />
                </Routes>
              </Suspense>
            </Container>
          </main>

          <footer>
            <div className="text-center py-3 footer-text">
              جميع الحقوق محفوظة © {new Date().getFullYear()}{' '}
              <span className="rl-glow-red">{STORE_NAME}</span>
            </div>
          </footer>
        </div>
      </MotionConfig>
    </BrowserRouter>
  );
}

export default App;
