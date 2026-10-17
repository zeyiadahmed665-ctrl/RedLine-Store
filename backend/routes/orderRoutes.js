
import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';
import { isAuth, isAdmin, sendMail, payOrderEmailTemplate, mailAddress } from '../utils.js';
import { asText } from '../validators.js';
import { paysWholesale, minQtyFor, unitPriceFor, round2 } from '../pricing.js';
import {
  TAX_RATE,
  SHIPPING_FEE,
  FREE_SHIPPING_THRESHOLD,
  POINTS_PER_100,
  POINT_VALUE,
  MAX_POINTS_DISCOUNT_RATE,
} from '../config.js';

const orderRouter = express.Router();

// خصم المخزون بشكل آمن
const deductStock = async (orderItems) => {
  const done = [];

  for (const it of orderItems) {
    const r = await Product.updateOne(
      { _id: it.product, countInStock: { $gte: it.quantity } },
      { $inc: { countInStock: -it.quantity } }
    );

    if (r.modifiedCount !== 1) {
      await restoreStock(done);
      return it;
    }

    done.push(it);
  }

  return null;
};

const restoreStock = async (orderItems) => {
  for (const it of orderItems) {
    await Product.updateOne(
      { _id: it.product },
      { $inc: { countInStock: it.quantity } }
    );
  }
};

// تنظيف عنوان الشحن
const cleanShippingAddress = (raw) => {
  const a = raw && typeof raw === 'object' ? raw : {};
  const fullName = asText(a.fullName).slice(0, 100);
  const address = asText(a.address).slice(0, 300);
  const city = asText(a.city).slice(0, 100);

  if (!fullName || !address || !city) return null;

  const out = {
    fullName,
    address,
    city,
    postalCode: asText(a.postalCode).slice(0, 20),
    country: asText(a.country).slice(0, 60) || 'مصر',
  };

  if (a.location && typeof a.location === 'object') {
    const { lat, lng } = a.location;

    out.location = {
      lat: Number.isFinite(Number(lat)) ? Number(lat) : undefined,
      lng: Number.isFinite(Number(lng)) ? Number(lng) : undefined,
      address: asText(a.location.address).slice(0, 300),
      name: asText(a.location.name).slice(0, 200),
      vicinity: asText(a.location.vicinity).slice(0, 300),
      googleAddressId: asText(a.location.googleAddressId).slice(0, 200),
    };
  }

  return out;
};

orderRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('user', 'name email');

    res.send(orders);
  })
);

// إنشاء طلب جديد
orderRouter.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const items = Array.isArray(req.body.orderItems)
      ? req.body.orderItems
      : [];

    if (items.length === 0) {
      return res.status(400).send({ message: 'السلة فارغة' });
    }

    const shippingAddress = cleanShippingAddress(req.body.shippingAddress);

    if (!shippingAddress) {
      return res.status(400).send({
        message: 'من فضلك اكتب الاسم والعنوان والمدينة',
      });
    }

    const paymentMethod = asText(req.body.paymentMethod);

    if (!paymentMethod) {
      return res.status(400).send({ message: 'اختر طريقة الدفع' });
    }

    const buyer = await User.findById(req.user._id).select('role isAdmin');

    if (!buyer) {
      return res.status(401).send({ message: 'المستخدم غير موجود' });
    }

    const products = await Product.find({
      _id: { $in: items.map((x) => x._id) },
    });

    const byId = new Map(products.map((p) => [String(p._id), p]));
    const orderItems = [];

    for (const x of items) {
      const product = byId.get(String(x._id));
      const quantity = Math.floor(Number(x.quantity));

      if (!product) {
        return res.status(404).send({
          message: 'أحد المنتجات لم يعد موجودًا',
        });
      }

      if (!(quantity >= 1)) {
        return res.status(400).send({
          message: `كمية غير صحيحة للمنتج: ${product.name}`,
        });
      }

      const min = minQtyFor(product, buyer);

      if (quantity < min) {
        return res.status(400).send({
          message: `الحد الأدنى لطلب "${product.name}" بسعر الجملة هو ${min} قطعة`,
        });
      }

      if (product.countInStock < quantity) {
        return res.status(400).send({
          message: `الكمية المتاحة من "${product.name}" هي ${product.countInStock} فقط`,
        });
      }

      orderItems.push({
        slug: product.slug,
        name: product.name,
        quantity,
        image: product.image,
        price: unitPriceFor(product, quantity, buyer),
        product: product._id,
      });
    }

    const itemsPrice = round2(
      orderItems.reduce((a, c) => a + c.price * c.quantity, 0)
    );
    const shippingPrice =
      itemsPrice > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const taxPrice = round2(TAX_RATE * itemsPrice);
    const totalPrice = round2(itemsPrice + shippingPrice + taxPrice);

    // خصم المخزون بشكل آمن
    const outOfStock = await deductStock(orderItems);

    if (outOfStock) {
      return res.status(400).send({
        message: `الكمية المطلوبة من "${outOfStock.name}" لم تعد متاحة`,
      });
    }

    // استبدال نقاط الولاء
    let pointsUsed = 0;
    let pointsDiscount = 0;
    const requested = Math.floor(Number(req.body.pointsToUse) || 0);

    if (requested > 0 && !paysWholesale(buyer)) {
      const maxByOrder = Math.floor(
        (itemsPrice * MAX_POINTS_DISCOUNT_RATE) / POINT_VALUE
      );
      const wanted = Math.min(requested, maxByOrder);

      if (wanted > 0) {
        const deducted = await User.findOneAndUpdate(
          { _id: req.user._id, loyaltyPoints: { $gte: wanted } },
          { $inc: { loyaltyPoints: -wanted } }
        );

        if (!deducted) {
          await restoreStock(orderItems);

          return res.status(400).send({
            message: 'رصيد النقاط غير كافي',
          });
        }

        pointsUsed = wanted;
        pointsDiscount = round2(wanted * POINT_VALUE);
      }
    }

    const finalTotal = round2(Math.max(0, totalPrice - pointsDiscount));

    const newOrder = new Order({
      orderItems,
      orderType: paysWholesale(buyer) ? 'wholesale' : 'retail',
      pointsUsed,
      pointsDiscount,
      shippingAddress,
      paymentMethod,
      stockDeducted: true,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice: finalTotal,
      user: req.user._id,
    });

    let order;

    try {
      order = await newOrder.save();
    } catch (e) {
      await restoreStock(orderItems);

      if (pointsUsed > 0) {
        await User.updateOne(
          { _id: req.user._id },
          { $inc: { loyaltyPoints: pointsUsed } }
        );
      }

      throw e;
    }

    res.status(201).send({
      message: 'تم إنشاء الطلب بنجاح',
      order,
    });
  })
);

orderRouter.get(
  '/summary',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.aggregate([
      {
        $group: {
          _id: null,
          numOrders: { $sum: 1 },
          totalSales: { $sum: '$totalPrice' },
        },
      },
    ]);

    const users = await User.aggregate([
      {
        $group: {
          _id: null,
          numUsers: { $sum: 1 },
        },
      },
    ]);

    const ordersByType = await Order.aggregate([
      {
        $group: {
          _id: { $ifNull: ['$orderType', 'retail'] },
          numOrders: { $sum: 1 },
          totalSales: { $sum: '$totalPrice' },
        },
      },
    ]);

    const wholesaleUsers = await User.countDocuments({ role: 'wholesale' });
    const pendingWholesale = await User.countDocuments({
      wholesaleRequest: true,
    });

    const dailyOrders = await Order.aggregate([
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          orders: { $sum: 1 },
          sales: { $sum: '$totalPrice' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const productCategories = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
        },
      },
    ]);

    res.send({
      users,
      orders,
      dailyOrders,
      productCategories,
      ordersByType,
      wholesaleUsers,
      pendingWholesale,
    });
  })
);

orderRouter.get(
  '/mine',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.send(orders);
  })
);

orderRouter.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      if (
        String(order.user) !== String(req.user._id) &&
        !req.user.isAdmin
      ) {
        return res.status(403).send({ message: 'غير مسموح' });
      }

      res.send(order);
    } else {
      res.status(404).send({ message: 'الطلب غير موجود' });
    }
  })
);

orderRouter.put(
  '/:id/deliver',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);

    if (order) {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      order.status = 'delivered';

      if (!order.pointsAwarded && order.orderType !== 'wholesale') {
        const earned = Math.floor(order.itemsPrice / 100) * POINTS_PER_100;

        if (earned > 0) {
          await User.updateOne(
            { _id: order.user },
            { $inc: { loyaltyPoints: earned } }
          );
          order.pointsEarned = earned;
        }

        order.pointsAwarded = true;
      }

      if (order.paymentMethod === 'Cash on Delivery' && !order.isPaid) {
        order.isPaid = true;
        order.paidAt = Date.now();
      }

      await order.save();
      res.send({ message: 'تم تسليم الطلب' });
    } else {
      res.status(404).send({ message: 'الطلب غير موجود' });
    }
  })
);

// تحديث مرحلة الطلب
orderRouter.put(
  '/:id/status',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { status } = req.body;

    if (!['processing', 'shipped'].includes(status)) {
      return res.status(400).send({ message: 'مرحلة غير صحيحة' });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).send({ message: 'الطلب غير موجود' });
    }

    if (order.isDelivered) {
      return res.status(400).send({ message: 'الطلب اتسلّم بالفعل' });
    }

    order.status = status;
    await order.save();

    res.send({ message: 'تم تحديث حالة الطلب', status });
  })
);

orderRouter.put(
  '/:id/pay',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'email name'
    );

    if (order) {
      if (
        String(order.user._id) !== String(req.user._id) &&
        !req.user.isAdmin
      ) {
        return res.status(403).send({ message: 'غير مسموح' });
      }

      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentResult = {
        id: req.body.id,
        status: req.body.status,
        update_time: req.body.update_time,
        email_address: req.body.email_address,
      };

      const updatedOrder = await order.save();

      sendMail({
        to: mailAddress(order.user.name, order.user.email),
        subject: `طلب جديد رقم ${order._id}`,
        html: payOrderEmailTemplate(order),
      });

      res.send({ message: 'تم تسجيل الدفع', order: updatedOrder });
    } else {
      res.status(404).send({ message: 'الطلب غير موجود' });
    }
  })
);

// حذف طلب واسترجاع المخزون والنقاط عند الإلغاء قبل التسليم
orderRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).send({ message: 'الطلب غير موجود' });
    }

    if (!order.isDelivered) {
      if (order.stockDeducted) {
        await restoreStock(order.orderItems);
      }

      if (order.pointsUsed > 0) {
        await User.updateOne(
          { _id: order.user },
          { $inc: { loyaltyPoints: order.pointsUsed } }
        );
      }
    }

    res.send({ message: 'تم حذف الطلب' });
  })
);

export default orderRouter;
