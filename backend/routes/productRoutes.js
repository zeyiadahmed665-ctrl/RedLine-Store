import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Product from '../models/productModel.js';
import { isAuth, isAdmin, optionalAuth } from '../utils.js';
import { shapeProduct } from '../pricing.js';

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
productRouter.get('/', optionalAuth, async (req, res) => {
  // ⚡ من غير التقييمات (reviews) ومع lean(): الرد أصغر وأسرع في الصفحة الرئيسية
  const products = await Product.find().select('-reviews').lean();
  res.send(products.map((p) => shapeProduct(p, req.user)));
});

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
    const productId = req.params.id;
    const product = await Product.findById(productId);
    if (product) {
      if (product.reviews.find((x) => x.name === req.user.name)) {
        return res
          .status(400)
          .send({ message: 'لقد قيّمت هذا المنتج من قبل' });
      }

      const review = {
        name: req.user.name,
        rating: Number(req.body.rating),
        comment: req.body.comment,
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

const PAGE_SIZE = 3;

productRouter.get(
  '/admin',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { query } = req;
    const page = query.page || 1;
    const pageSize = query.pageSize || PAGE_SIZE;

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
    const pageSize = query.pageSize || PAGE_SIZE;
    const page = query.page || 1;
    const category = query.category || '';
    const price = query.price || '';
    const rating = query.rating || '';
    const order = query.order || '';
    const searchQuery = query.query || '';

    const queryFilter =
      searchQuery && searchQuery !== 'all'
        ? {
            name: {
              $regex: searchQuery,
              $options: 'i',
            },
          }
        : {};
    const categoryFilter = category && category !== 'all' ? { category } : {};
    const ratingFilter =
      rating && rating !== 'all'
        ? {
            rating: {
              $gte: Number(rating),
            },
          }
        : {};
    const priceFilter =
      price && price !== 'all'
        ? {
            // 1-50
            price: {
              $gte: Number(price.split('-')[0]),
              $lte: Number(price.split('-')[1]),
            },
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

productRouter.get('/slug/:slug', optionalAuth, async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug });
  if (product) {
    res.send(shapeProduct(product, req.user));
  } else {
    res.status(404).send({ message: 'المنتج غير موجود' });
  }
});
productRouter.get('/:id', optionalAuth, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (product) {
    res.send(shapeProduct(product, req.user));
  } else {
    res.status(404).send({ message: 'المنتج غير موجود' });
  }
});

export default productRouter;
