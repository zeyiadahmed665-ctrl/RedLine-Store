import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Product from '../models/productModel.js';
import { isAuth, isAdmin, optionalAuth } from '../utils.js';
import { shapeProduct } from '../pricing.js';
import { asText, escapeRegex } from '../validators.js';

const productRouter = express.Router();

// =====================================================================
// 🛣️ راوتس المنتجات (API). كلها بتبدأ بـ  /api/products
//   GET    /api/products          يجيب كل المنتجات (الصفحة الرئيسية)
//   POST   /api/products          أدمن: يعمل منتج تجريبي جديد
//   PUT    /api/products/:id      أدمن: يعدّل منتج
//   DELETE /api/products/:id      أدمن: يمسح منتج
//   GET    /api/products/slug/:slug   منتج واحد بالـ slug (صفحة المنتج)
//   GET    /api/products/search   بحث وفلترة
// isAuth = لازم يكون مسجل دخول | isAdmin = لازم يكون أدمن
// ⚠️ في الوضع المؤقت (MONGODB_URI=memory) أي منتج تضيفه من لوحة الأدمن
//    بيضيع لما توقف الـ backend. للمنتجات الدايمة ضيفها في backend/data.js
// =====================================================================

// يجيب كل المنتجات
// 🏭 optionalAuth: التاجر المعتمد والأدمن بس بيشوفوا حقول الجملة (wholesalePrice وغيرها)،
//    الباقي بيشوف المنتج بسعر القطاعي وعلامة hasWholesale بس.
productRouter.get(
  '/',
  optionalAuth,
  expressAsyncHandler(async (req, res) => {
    // ⚡ من غير التقييمات (reviews) ومع lean(): الرد أصغر وأسرع في الصفحة الرئيسية
    const products = await Product.find().select('-reviews').lean();
    res.send(products.map((p) => shapeProduct(p, req.user)));
  })
);

productRouter.post(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const newProduct = new Product({
      name: 'اسم المنتج ' + Date.now(),
      slug: 'sample-name-' + Date.now(),
      image: '/images/p1.jpg',
      price: 0,
      category: 'قسم جديد',
      brand: 'RedLine',
      countInStock: 0,
      rating: 0,
      numReviews: 0,
      description: 'وصف المنتج',
      wholesalePrice: 0,
    });
    const product = await newProduct.save();
    res.send({ message: 'تم إنشاء المنتج', product });
  })
);

productRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (product) {
      product.name = req.body.name;
      product.slug = req.body.slug;
      product.price = req.body.price;
      product.image = req.body.image;
      product.images = req.body.images;
      product.category = req.body.category;
      product.brand = req.body.brand;
      product.countInStock = req.body.countInStock;
      product.description = req.body.description;
      // 🏭 حقول الجملة (اختيارية: لو مبعتهاش القيم القديمة بتفضل زي ما هي)
      if (req.body.wholesalePrice !== undefined) {
        product.wholesalePrice = Math.max(0, Number(req.body.wholesalePrice) || 0);
      }
      if (req.body.wholesaleMinQty !== undefined) {
        product.wholesaleMinQty = Math.max(1, Math.floor(Number(req.body.wholesaleMinQty)) || 1);
      }
      if (req.body.packSize !== undefined) {
        product.packSize = Math.max(1, Math.floor(Number(req.body.packSize)) || 1);
      }
      if (Array.isArray(req.body.priceTiers)) {
        product.priceTiers = req.body.priceTiers
          .map((t) => ({ minQty: Math.floor(Number(t.minQty)), price: Number(t.price) }))
          .filter((t) => t.minQty > 0 && t.price > 0)
          .sort((a, b) => a.minQty - b.minQty);
      }
      await product.save();
      res.send({ message: 'تم تحديث المنتج' });
    } else {
      res.status(404).send({ message: 'المنتج غير موجود' });
    }
  })
);

productRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
      await product.remove();
      res.send({ message: 'تم حذف المنتج' });
    } else {
      res.status(404).send({ message: 'المنتج غير موجود' });
    }
  })
);

productRouter.post(
  '/:id/reviews',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    // ⭐ التقييم رقم صحيح من 1 لـ 5 بس
    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).send({ message: 'التقييم لازم يكون من 1 لـ 5' });
    }
    const comment = asText(req.body.comment);
    if (!comment) {
      return res.status(400).send({ message: 'اكتب تعليقًا من فضلك' });
    }
    if (comment.length > 1000) {
      return res.status(400).send({ message: 'التعليق طويل جدًا (الحد الأقصى 1000 حرف)' });
    }

    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (product) {
      // منع التكرار بحساب المستخدم (مش بالاسم، لأن أكتر من عميل ممكن يشاركوا نفس الاسم)
      if (product.reviews.find((x) => x.user && String(x.user) === String(req.user._id))) {
        return res
          .status(400)
          .send({ message: 'لقد قيّمت هذا المنتج من قبل' });
      }

      const review = {
        user: req.user._id,
        name: req.user.name,
        rating,
        comment,
      };
      product.reviews.push(review);
      product.numReviews = product.reviews.length;
      product.rating =
        product.reviews.reduce((a, c) => c.rating + a, 0) /
        product.reviews.length;
      const updatedProduct = await product.save();
      res.status(201).send({
        message: 'تم إضافة تقييمك',
        review: updatedProduct.reviews[updatedProduct.reviews.length - 1],
        numReviews: product.numReviews,
        rating: product.rating,
      });
    } else {
      res.status(404).send({ message: 'المنتج غير موجود' });
    }
  })
);

// 📄 حجم الصفحة الافتراضي (كان 3). الحد الأقصى بيمنع طلب آلاف المنتجات في استعلام واحد
const PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 60;
const pagination = (query) => {
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(Number(query.pageSize)) || PAGE_SIZE)
  );
  const page = Math.max(1, Math.floor(Number(query.page)) || 1);
  return { pageSize, page };
};

productRouter.get(
  '/admin',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { query } = req;
    const { page, pageSize } = pagination(query);

    const products = await Product.find()
      .skip(pageSize * (page - 1))
      .limit(pageSize);
    const countProducts = await Product.countDocuments();
    res.send({
      products,
      countProducts,
      page,
      pages: Math.ceil(countProducts / pageSize),
    });
  })
);

productRouter.get(
  '/search',
  optionalAuth,
  expressAsyncHandler(async (req, res) => {
    const { query } = req;
    const { page, pageSize } = pagination(query);
    // كل المدخلات بتتحوّل لنص (مفيش object يتحقن في الاستعلام)
    const category = asText(query.category);
    const price = asText(query.price);
    const rating = asText(query.rating);
    const order = asText(query.order);
    const searchQuery = asText(query.query).slice(0, 100);

    const queryFilter =
      searchQuery && searchQuery !== 'all'
        ? {
            name: {
              $regex: escapeRegex(searchQuery), // 🧼 كلام العميل بيتنضّف قبل الـ regex
              $options: 'i',
            },
          }
        : {};
    const categoryFilter = category && category !== 'all' ? { category } : {};
    const ratingFilter =
      rating && rating !== 'all' && Number.isFinite(Number(rating))
        ? {
            rating: {
              $gte: Number(rating),
            },
          }
        : {};
    const [priceMin, priceMax] = price.split('-').map(Number);
    const priceFilter =
      price && price !== 'all' && Number.isFinite(priceMin) && Number.isFinite(priceMax)
        ? {
            // 1-50
            price: { $gte: priceMin, $lte: priceMax },
          }
        : {};
    const sortOrder =
      order === 'featured'
        ? { featured: -1 }
        : order === 'lowest'
        ? { price: 1 }
        : order === 'highest'
        ? { price: -1 }
        : order === 'toprated'
        ? { rating: -1 }
        : order === 'newest'
        ? { createdAt: -1 }
        : { _id: -1 };

    const products = await Product.find({
      ...queryFilter,
      ...categoryFilter,
      ...priceFilter,
      ...ratingFilter,
    })
      .sort(sortOrder)
      .skip(pageSize * (page - 1))
      .limit(pageSize);

    const countProducts = await Product.countDocuments({
      ...queryFilter,
      ...categoryFilter,
      ...priceFilter,
      ...ratingFilter,
    });
    res.send({
      products: products.map((p) => shapeProduct(p, req.user)),
      countProducts,
      page,
      pages: Math.ceil(countProducts / pageSize),
    });
  })
);

productRouter.get(
  '/categories',
  expressAsyncHandler(async (req, res) => {
    const categories = await Product.find().distinct('category');
    res.send(categories);
  })
);

productRouter.get(
  '/slug/:slug',
  optionalAuth,
  expressAsyncHandler(async (req, res) => {
    const product = await Product.findOne({ slug: asText(req.params.slug) });
    if (product) {
      res.send(shapeProduct(product, req.user));
    } else {
      res.status(404).send({ message: 'المنتج غير موجود' });
    }
  })
);
productRouter.get(
  '/:id',
  optionalAuth,
  expressAsyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.send(shapeProduct(product, req.user));
    } else {
      res.status(404).send({ message: 'المنتج غير موجود' });
    }
  })
);

export default productRouter;
