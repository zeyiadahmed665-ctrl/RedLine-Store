import { useEffect, useMemo, useReducer, useState } from "react";
import axios from "axios";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Product from "../components/Product";
import { Helmet } from "react-helmet-async";
import LoadingBox from "../components/LoadingBox";
import MessageBox from "../components/MessageBox";
import { STORE_NAME } from "../config";
import PromoBar from "../components/PromoBar";
import HeroCarousel from "../components/HeroCarousel";
import ProductFilters from "../components/ProductFilters";
import Reveal from "../components/Reveal";
// import data from '../data';

const reducer = (state, action) => {
  switch (action.type) {
    case "FETCH_REQUEST":
      return { ...state, loading: true };
    case "FETCH_SUCCESS":
      return { ...state, products: action.payload, loading: false };
    case "FETCH_FAIL":
      return { ...state, loading: false, error: action.payload };
    default:
      return state;
  }
};

function HomeScreen() {
  const [{ loading, error, products }, dispatch] = useReducer(reducer, {
    products: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: "FETCH_REQUEST" });
      try {
        const result = await axios.get("/api/products");
        dispatch({ type: "FETCH_SUCCESS", payload: result.data });
      } catch (err) {
        dispatch({ type: "FETCH_FAIL", payload: err.message });
      }
    };
    fetchData();
  }, []);

  const [sort, setSort] = useState("newest");
  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);
  const bounds = useMemo(() => {
    if (!products.length) return [0, 1000];
    const prices = products.map((p) => p.price);
    return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))];
  }, [products]);
  const [f, setF] = useState({ categories: [], price: null, sizes: [], colors: [] });
  const filters = { ...f, price: f.price || bounds };

  const shown = useMemo(() => {
    const list = products.filter(
      (p) =>
        (!filters.categories.length || filters.categories.includes(p.category)) &&
        p.price >= filters.price[0] &&
        p.price <= filters.price[1] &&
        (!filters.sizes.length || (p.sizes || []).some((x) => filters.sizes.includes(x))) &&
        (!filters.colors.length || (p.colors || []).some((x) => filters.colors.includes(x)))
    );
    if (sort === "lowest") list.sort((a, b) => a.price - b.price);
    if (sort === "highest") list.sort((a, b) => b.price - a.price);
    if (sort === "toprated") list.sort((a, b) => b.rating - a.rating);
    return list;
    // eslint-disable-next-line
  }, [products, f, sort, bounds]);

  return (
    <div>
      <Helmet>
        <title>{STORE_NAME}</title>
      </Helmet>
      <PromoBar />
      <Reveal>
        <HeroCarousel products={products} />
      </Reveal>

      <Reveal className="d-flex justify-content-between align-items-center mt-4 mb-3">
        <h2 className="rl-section-title">وصل حديثاً</h2>
        <select className="form-select form-select-sm w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="newest">الأحدث</option>
          <option value="lowest">السعر: الأقل أولاً</option>
          <option value="highest">السعر: الأعلى أولاً</option>
          <option value="toprated">الأعلى تقييماً</option>
        </select>
      </Reveal>

      {loading ? (
        <LoadingBox />
      ) : error ? (
        <MessageBox variant="danger">{error}</MessageBox>
      ) : (
        <Row>
          <Col lg={3} className="mb-4">
            <Reveal>
              <ProductFilters categories={categories} bounds={bounds} f={filters} setF={setF} />
            </Reveal>
          </Col>
          <Col lg={9}>
            {shown.length === 0 ? (
              <MessageBox>مفيش منتجات مطابقة للفلاتر دي</MessageBox>
            ) : (
              <Row>
                {shown.map((product, idx) => (
                  <Col key={product.slug} xs={6} md={4} className="mb-4">
                    <Product product={product} index={idx}></Product>
                  </Col>
                ))}
              </Row>
            )}
          </Col>
        </Row>
      )}
    </div>
  );
}

export default HomeScreen;
