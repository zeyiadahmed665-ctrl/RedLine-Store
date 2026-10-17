import './env.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// 🔐 مفيش باسورد ثابت معروف (123456 اتلغى). الحسابات التجريبية بتاخد باسورد عشوائي جديد
//    كل مرة بيتحمّل فيها الـ seed، وبيتطبع في الـ console (للتطوير بس).
//    الأدمن بياخد باسورده من ADMIN_PASSWORD في backend/.env لو متحط.
const randomPassword = () => crypto.randomBytes(9).toString('base64url');
export const devPasswords = {
  admin: process.env.ADMIN_PASSWORD || randomPassword(),
  user: randomPassword(),
  wholesale: randomPassword(),
};

const data = {
  // 👤 المستخدمين: الأدمن بياخد إيميله وباسورده من backend/.env (ADMIN_EMAIL / ADMIN_PASSWORD).
  users: [
    {
      name: 'الأدمن',
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: bcrypt.hashSync(devPasswords.admin),
      isAdmin: true,
      role: 'admin',
    },
    {
      name: 'عميل تجريبي',
      email: 'user@example.com',
      password: bcrypt.hashSync(devPasswords.user),
      isAdmin: false,
      role: 'user',
    },
    // 🏭 حساب تاجر معتمد تجريبي: wholesale@example.com (الباسورد بيتطبع في الـ console وقت التشغيل)
    {
      name: 'تاجر تجريبي',
      email: 'wholesale@example.com',
      password: bcrypt.hashSync(devPasswords.wholesale),
      isAdmin: false,
      role: 'wholesale',
      businessName: 'محلات النور للملابس',
      phone: '01000000000',
    },
  ],
  // =====================================================================
  // 📦 إزاي تضيف منتج جديد (الطريقة الأضمن والدايمة)
  // ---------------------------------------------------------------------
  // 1) انسخ أي منتج من اللي تحت (من { لحد },) والصقه آخر القائمة.
  // 2) غيّر القيم. لازم كل الحقول دي تكون موجودة:
  //      name         اسم المنتج (لازم يكون مختلف عن أي منتج تاني)
  //      slug         اسم للرابط، حروف إنجليزي صغيرة وشرطات (مختلف برضه)
  //      category     التصنيف (قمصان / بناطيل ...). التصنيف الجديد بيظهر لوحده
  //      image        مسار الصورة. مثال: '/images/p5.jpg'
  //      price        السعر (رقم من غير علامات)
  //      countInStock الكمية المتاحة. لو 0 بيظهر "غير متوفر"
  //      brand        الماركة
  //      rating       التقييم من 0 لـ 5
  //      numReviews   عدد التقييمات
  //      description  وصف المنتج
  // 3) احفظ الملف. nodemon هيعيد تشغيل الـ backend لوحده،
  //    والمنتجات بتتحمل تاني تلقائي (لأن القاعدة المؤقتة بتتبني من جديد).
  //
  // 🖼️ إزاي تضيف صورة:
  //   حط ملف الصورة جوه الفولدر  frontend/public/images/
  //   وبعدين اكتب في image:  '/images/اسم-الصورة.jpg'
  //   (اسم الملف بالظبط، وبالحروف الصغيرة/الكبيرة زي ما هو)
  //   مقاس مناسب: حوالي 679 × 829 بيكسل.
  //
  // ➕ قالب جاهز تنسخه:
  //   {
  //     name: 'اسم المنتج',
  //     slug: 'product-slug',
  //     category: 'قمصان',
  //     image: '/images/p5.jpg',
  //     price: 99,
  //     countInStock: 5,
  //     brand: 'RedLine',
  //     rating: 4,
  //     numReviews: 3,
  //     description: 'وصف المنتج',
  //   },
  // =====================================================================
  products: [
    {
      name: 'تيشيرت رجالي سليم فيت',
      slug: 'slim-fit-shirt',
      category: 'قمصان',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['black','red'],
      image: '/images/p1.jpg', // 679px × 829px
      price: 350,
      countInStock: 240,
      brand: 'RedLine',
      rating: 4.5,
      numReviews: 10,
      description: 'تيشيرت قطن عالي الجودة، مريح وخفيف',
      wholesalePrice: 240, // سعر الجملة للقطعة
      wholesaleMinQty: 12, // أقل طلب للتاجر = دستة
      packSize: 12,
      priceTiers: [{ minQty: 36, price: 225 }, { minQty: 72, price: 210 }],
    },
    {
      name: 'قميص كاجوال أنيق',
      slug: 'casual-shirt',
      category: 'قمصان',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['black','white'],
      image: '/images/p2.jpg',
      price: 450,
      countInStock: 0,
      brand: 'RedLine',
      rating: 4.0,
      numReviews: 10,
      description: 'قميص بقصّة عصرية وخامة ممتازة',
      wholesalePrice: 320, // سعر الجملة للقطعة
      wholesaleMinQty: 12, // أقل طلب للتاجر = دستة
      packSize: 12,
      priceTiers: [{ minQty: 36, price: 300 }, { minQty: 72, price: 285 }],
    },
    {
      name: 'بنطلون جينز سليم',
      slug: 'slim-jeans',
      category: 'بناطيل',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['blue','black'],
      image: '/images/p3.jpg',
      price: 650,
      countInStock: 360,
      brand: 'RedLine',
      rating: 4.5,
      numReviews: 14,
      description: 'بنطلون جينز مريح بقصّة سليم',
      wholesalePrice: 450, // سعر الجملة للقطعة
      wholesaleMinQty: 12, // أقل طلب للتاجر = دستة
      packSize: 12,
      priceTiers: [{ minQty: 36, price: 425 }, { minQty: 72, price: 400 }],
    },
    {
      name: 'بنطلون كاجوال مريح',
      slug: 'casual-pants',
      category: 'بناطيل',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['black','red','white'],
      image: '/images/p4.jpg',
      price: 750,
      countInStock: 120,
      brand: 'RedLine',
      rating: 4.5,
      numReviews: 10,
      description: 'بنطلون كاجوال مناسب للاستخدام اليومي',
      wholesalePrice: 520, // سعر الجملة للقطعة
      wholesaleMinQty: 12, // أقل طلب للتاجر = دستة
      packSize: 12,
      priceTiers: [{ minQty: 36, price: 490 }, { minQty: 72, price: 460 }],
    },
  ],
};
export default data;
