import jwt from 'jsonwebtoken';
import mg from 'mailgun-js';
import User from './models/userModel.js';
import { roleOf } from './pricing.js';

export const baseUrl = () =>
  process.env.BASE_URL
    ? process.env.BASE_URL
    : process.env.NODE_ENV !== 'production'
    ? 'http://localhost:3000'
    : 'https://yourdomain.com';

export const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      isAdmin: roleOf(user) === 'admin',
      role: roleOf(user),
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '30d',
    }
  );
};

// 📦 شكل بيانات المستخدم اللي بترجع للمتصفح بعد تسجيل الدخول/التحديث
export const userPayload = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  isAdmin: roleOf(user) === 'admin',
  role: roleOf(user),
  isWholesale: roleOf(user) === 'wholesale',
  wholesaleRequest: Boolean(user.wholesaleRequest),
  businessName: user.businessName || '',
  phone: user.phone || '',
  token: generateToken(user),
});

// 👀 تسجيل دخول اختياري: لو فيه توكن صالح بنحدد دور العميل من القاعدة (عشان موافقة الأدمن تظهر فوراً)،
// ولو مفيش توكن أو باظ بنكمّل كزائر عادي من غير أي خطأ.
export const optionalAuth = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) return next();
  const token = authorization.slice(7, authorization.length);
  jwt.verify(token, process.env.JWT_SECRET, async (err, decode) => {
    if (err) return next();
    try {
      const fresh = await User.findById(decode._id).select('role isAdmin').lean();
      if (fresh) req.user = { ...decode, role: roleOf(fresh), isAdmin: roleOf(fresh) === 'admin' };
    } catch (e) {
      /* نكمّل كزائر */
    }
    next();
  });
};

export const isAuth = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    const token = authorization.slice(7, authorization.length); // Bearer XXXXXX
    jwt.verify(token, process.env.JWT_SECRET, (err, decode) => {
      if (err) {
        res.status(401).send({ message: 'الجلسة غير صالحة، سجّل الدخول مرة أخرى' });
      } else {
        req.user = decode;
        next();
      }
    });
  } else {
    res.status(401).send({ message: 'سجّل الدخول أولًا' });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(401).send({ message: 'غير مسموح: هذه الصفحة للإدارة فقط' });
  }
};

export const mailgun = () =>
  mg({
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMIAN,
  });

// ✉️ إرسال إيميل بأمان: لو Mailgun مش متظبط (مفيش مفاتيح) بيتخطى الإرسال ويكتب في الـ console بدل ما السيرفر يرجّع خطأ 500.
// اسم المرسل من MAIL_FROM في backend/.env (مثال: MAIL_FROM=اسم المتجر <no-reply@yourdomain.com>)
export const sendMail = ({ to, subject, html }) => {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMIAN) {
    console.log(`[mail skipped - Mailgun not configured] to=${to} subject="${subject}"`);
    return;
  }
  const from =
    process.env.MAIL_FROM || `RedLine <no-reply@${process.env.MAILGUN_DOMIAN}>`;
  mailgun()
    .messages()
    .send({ from, to, subject, html }, (error, body) => {
      if (error) console.log(error);
      else console.log(body);
    });
};

const paymentLabel = (m) => (m === 'Cash on Delivery' ? 'الدفع عند الاستلام' : m);
const EMAIL_CURRENCY = 'ج.م'; // غيّرها لو غيّرت CURRENCY في frontend/src/config.js

export const payOrderEmailTemplate = (order) => {
  const money = (v) => `${Number(v).toFixed(2)} ${EMAIL_CURRENCY}`;
  return `<div dir="rtl" style="text-align:right;font-family:Tahoma,Arial,sans-serif">
  <h1>شكرًا لتسوقك معنا</h1>
  <p>أهلًا ${order.user.name}،</p>
  <p>انتهينا من تجهيز طلبك.</p>
  <h2>[طلب رقم ${order._id}] (${order.createdAt.toString().substring(0, 10)})</h2>
  <table dir="rtl" style="width:100%">
  <thead>
  <tr>
  <td><strong>المنتج</strong></td>
  <td><strong>الكمية</strong></td>
  <td><strong>السعر</strong></td>
  </tr>
  </thead>
  <tbody>
  ${order.orderItems
    .map(
      (item) => `
    <tr>
    <td>${item.name}</td>
    <td>${item.quantity}</td>
    <td>${money(item.price)}</td>
    </tr>
  `
    )
    .join('\n')}
  </tbody>
  <tfoot>
  <tr>
  <td colspan="2">إجمالي المنتجات:</td>
  <td>${money(order.itemsPrice)}</td>
  </tr>
  <tr>
  <td colspan="2">الشحن:</td>
  <td>${money(order.shippingPrice)}</td>
  </tr>
  <tr>
  <td colspan="2"><strong>الإجمالي:</strong></td>
  <td><strong>${money(order.totalPrice)}</strong></td>
  </tr>
  <tr>
  <td colspan="2">طريقة الدفع:</td>
  <td>${paymentLabel(order.paymentMethod)}</td>
  </tr>
  </tfoot>
  </table>

  <h2>عنوان الشحن</h2>
  <p>
  ${order.shippingAddress.fullName}،<br/>
  ${order.shippingAddress.address}،<br/>
  ${order.shippingAddress.city}،<br/>
  ${order.shippingAddress.country}،<br/>
  ${order.shippingAddress.postalCode}<br/>
  </p>
  <hr/>
  <p>
  شكرًا لتسوقك معنا.
  </p>
  </div>
  `;
};
