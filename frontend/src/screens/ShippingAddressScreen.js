import React, { useContext, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { useNavigate } from 'react-router-dom';
import { Store } from '../Store';
import CheckoutSteps from '../components/CheckoutSteps';
import { PageHead, Panel, Pill } from '../components/ui';

export default function ShippingAddressScreen() {
  const navigate = useNavigate();
  const { state, dispatch: ctxDispatch } = useContext(Store);
  const {
    fullBox,
    userInfo,
    cart: { shippingAddress },
  } = state;
  const [fullName, setFullName] = useState(shippingAddress.fullName || '');
  const [address, setAddress] = useState(shippingAddress.address || '');
  const [city, setCity] = useState(shippingAddress.city || '');
  const [postalCode, setPostalCode] = useState(shippingAddress.postalCode || '');
  useEffect(() => {
    if (!userInfo) {
      navigate('/signin?redirect=/shipping');
    }
  }, [userInfo, navigate]);
  const [country, setCountry] = useState(shippingAddress.country || 'مصر');
  const submitHandler = (e) => {
    e.preventDefault();
    const payload = {
      fullName,
      address,
      city,
      postalCode,
      country,
      location: shippingAddress.location,
    };
    ctxDispatch({ type: 'SAVE_SHIPPING_ADDRESS', payload });
    localStorage.setItem('shippingAddress', JSON.stringify(payload));
    navigate('/payment');
  };

  useEffect(() => {
    ctxDispatch({ type: 'SET_FULLBOX_OFF' });
  }, [ctxDispatch, fullBox]);

  const hasLocation = shippingAddress.location && shippingAddress.location.lat;

  return (
    <div>
      <Helmet>
        <title>عنوان الشحن</title>
      </Helmet>

      <CheckoutSteps step1 step2></CheckoutSteps>
      <div className="rl-narrow">
        <PageHead title="عنوان الشحن" sub="فين نوصّل طلبك؟" />
        <Panel icon="fas fa-map-marker-alt" title="بيانات التوصيل">
          <Form onSubmit={submitHandler} className="rl-form">
            <Form.Group className="mb-3" controlId="fullName">
              <Form.Label>الاسم بالكامل</Form.Label>
              <Form.Control value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-3" controlId="address">
              <Form.Label>العنوان</Form.Label>
              <Form.Control value={address} onChange={(e) => setAddress(e.target.value)} required />
            </Form.Group>
            <Row>
              <Col sm={6}>
                <Form.Group className="mb-3" controlId="city">
                  <Form.Label>المدينة</Form.Label>
                  <Form.Control value={city} onChange={(e) => setCity(e.target.value)} required />
                </Form.Group>
              </Col>
              <Col sm={6}>
                <Form.Group className="mb-3" controlId="postalCode">
                  <Form.Label>الرمز البريدي (اختياري)</Form.Label>
                  <Form.Control value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3" controlId="country">
              <Form.Label>الدولة (اختياري)</Form.Label>
              <Form.Control value={country} onChange={(e) => setCountry(e.target.value)} />
            </Form.Group>

            <div className="mb-4 d-flex align-items-center gap-2 flex-wrap">
              <button id="chooseOnMap" type="button" className="rl-btn-ghost" onClick={() => navigate('/map')}>
                <i className="fas fa-location-arrow"></i> اختر الموقع على الخريطة
              </button>
              {hasLocation ? (
                <Pill type="ok">
                  <i className="fas fa-check"></i> تم تحديد الموقع
                </Pill>
              ) : (
                <Pill type="grey">لم يتم تحديد الموقع</Pill>
              )}
            </div>

            <button className="rl-btn-main w-100" type="submit">
              متابعة للدفع
            </button>
          </Form>
        </Panel>
      </div>
    </div>
  );
}
