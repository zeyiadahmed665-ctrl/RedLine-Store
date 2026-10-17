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
  loyaltyPoints: user.loyaltyPoints || 0,
  token: generateToken(user),
});

// 🔑 توكن الجلسة بس: توكن استعادة كلمة المرور (purpose: 'reset') ممنوع يتقبل كتوكن دخول
const readSessionToken = (req) => {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) return null;
  try {
    const decode = jwt.verify(authorization.slice(7), process.env.JWT_SECRET);
    if (!decode || decode.purpose) return null;
    return decode;
  } catch (e) {
    return null;
  }
};

// 👀 تسجيل دخول اختياري: لو فيه توكن صالح بنحدد دور العميل من القاعدة (عشان موافقة الأدمن تظهر فوراً)،
// ولو مفيش توكن أو باظ بنكمّل كزائر عادي من غير أي خطأ.
export const optionalAuth = async (req, res, next) => {
  const decode = readSessionToken(req);
  if (!decode) return next();
  try {
    const fresh = await User.findById(decode._id).select('role isAdmin').lean();
    if (fresh) req.user = { ...decode, role: roleOf(fresh), isAdmin: roleOf(fresh) === 'admin' };
  } catch (e) {
    /* نكمّل كزائر */
  }
  next();
};

// 🔒 isAuth بيتأكد من القاعدة في كل طلب: لو المستخدم اتمسح أو صلاحيته اتغيرت، التغيير بيسري فوراً
// (من غير ما نستنى انتهاء التوكن)
export const isAuth = async (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send({ message: 'سجّل الدخول أولًا' });
  }
  const decode = readSessionToken(req);
  if (!decode) {
    return res.status(401).send({ message: 'الجلسة غير صالحة، سجّل الدخول مرة أخرى' });
  }
  try {
    const fresh = await User.findById(decode._id).select('name email role isAdmin').lean();
    if (!fresh) {
      return res.status(401).send({ message: 'الحساب لم يعد موجودًا، سجّل الدخول مرة أخرى' });
    }
    req.user = {
      _id: String(fresh._id),
      name: fresh.name,
      email: fresh.email,
      role: roleOf(fresh),
      isAdmin: roleOf(fresh) === 'admin',
    };
    next();
  } catch (e) {
    next(e);
  }
};

// 403 (ممنوع) مش 401: المستخدم مسجّل دخول فعلاً بس مالوش صلاحية، فمينفعش الواجهة تفتكر إن الجلسة انتهت
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).send({ message: 'غير مسموح: هذه الصفحة للإدارة فقط' });
  }
};

// 🧼 تنظيف أي نص بيتحط جوه HTML (الإيميلات) عشان محدش يحقن كود بإسمه أو بإسم منتج
export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

// ✉️ عنوان المستلم "الاسم <الإيميل>" من غير أي أحرف تقدر تكسر الهيدر أو تحقن مستلمين تانيين
export const mailAddress = (name, email) => {
  const safeName = String(name || '').replace(/[\r\n<>",;]/g, ' ').trim();
  const safeEmail = String(email || '').replace(/[\r\n<>",;\s]/g, '');
  return safeName ? `${safeName} <${safeEmail}>` : safeEmail;
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
    // مش بنكتب المستلم أو المحتوى في اللوج (ممكن يكون فيه روابط حساسة)
    console.log(`[mail skipped - Mailgun not configured] subject="${subject}"`);
    return;
  }
  const from =
    process.env.MAIL_FROM || `RedLine <no-reply@${process.env.MAILGUN_DOMIAN}>`;
  mailgun()
    .messages()
    .send({ from, to, subject, html }, (error) => {
      if (error) console.log('Mail error:', error.message || error);
    });
};

const paymentLabel = (m) => (m === 'Cash on Delivery' ? 'الدفع عند الاستلام' : m);
const EMAIL_CURRENCY = 'ج.م'; // غيّرها لو غيّرت CURRENCY في frontend/src/config.js

export const payOrderEmailTemplate = (order) => {
  const money = (v) => `${Number(v).toFixed(2)} ${EMAIL_CURRENCY}`;
  const e = escapeHtml;
  const a = order.shippingAddress || {};
  return `<div dir="rtl" style="text-align:right;font-family:Tahoma,Arial,sans-serif">
  <h1>شكرًا لتسوقك معنا</h1>
  <p>أهلًا ${e(order.user.name)}،</p>
  <p>انتهينا من تجهيز طلبك.</p>
  <h2>[طلب رقم ${e(order._id)}] (${e(order.createdAt.toISOString().substring(0, 10))})</h2>
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
    <td>${e(item.name)}</td>
    <td>${e(item.quantity)}</td>
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
  <td>${e(paymentLabel(order.paymentMethod))}</td>
  </tr>
  </tfoot>
  </table>

  <h2>عنوان الشحن</h2>
  <p>
  ${[a.fullName, a.address, a.city, a.country, a.postalCode]
    .filter(Boolean)
    .map(e)
    .join('،<br/>\n  ')}
  </p>
  <hr/>
  <p>
  شكرًا لتسوقك معنا.
  </p>
  </div>
  `;
};
