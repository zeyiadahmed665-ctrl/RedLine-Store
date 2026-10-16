import React from 'react';
import axios from 'axios';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import 'bootstrap/dist/css/bootstrap.rtl.min.css'; // نسخة Bootstrap للعربي (RTL)
import './index.css';
import './redline.css';
import './redline-pages.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { StoreProvider } from './Store';

// رابط الباك إند (Koyeb). على Vercel حطه في Environment Variables باسم REACT_APP_API_URL
// محلياً سيبه فاضي وهيشتغل على الـ proxy اللي في package.json
axios.defaults.baseURL = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');
// بيتخطى صفحة التحذير بتاعة ngrok (النسخة المجانية) اللي بتكسر الـ CORS
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';

// 🔑 بيبعت توكن المستخدم مع كل طلب تلقائياً — عشان التاجر المعتمد يشوف أسعار الجملة في كل الصفحات
axios.interceptors.request.use((config) => {
  try {
    const u = JSON.parse(localStorage.getItem('userInfo') || 'null');
    if (u && u.token && !config.headers.get('Authorization')) {
      config.headers.set('Authorization', `Bearer ${u.token}`);
    }
  } catch (e) {
    /* تجاهل */
  }
  return config;
});

const root = createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <StoreProvider>
      <HelmetProvider>
        <PayPalScriptProvider deferLoading={true}>
          <App />
        </PayPalScriptProvider>
      </HelmetProvider>
    </StoreProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
