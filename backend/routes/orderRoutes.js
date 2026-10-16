import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import Product from '../models/productModel.js';
import { isAuth, isAdmin, sendMail, payOrderEmailTemplate } from '../utils.js';
import { paysWholesale, minQtyFor, unitPriceFor, round2 } from '../pricing.js';
import { TAX_RATE, SHIPPING_FEE, FREE_SHIPPING_THRESHOLD } from '../config.js';

const orderRouter = express.Router();

orderRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 }).populate('user', 'name email');
    res.send(orders);
  })
);

// 🧾 إنشاء طلب — السيرفر بيحسب كل الأسعار بنفسه من القاعدة (قطاعي أو جملة حسب حساب العميل)،
//    فمحدش يقدر يغيّر السعر من المتصفح. وبيتأكد من المخزون ومن الحد الأدنى للجملة.
orderRouter.post(
  '/',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const items = Array.isArray(req.body.orderItems) ? req.body.orderItems : [];
    if (items.length === 0) {
      return res.status(400).send({ message: 'السلة فارغة' });
    }
    // الدور الحقيقي من القاعدة مش من التوكن (ممكن يكون اتغيّر بعد تسجيل الدخول)
    const buyer = await User.findById(req.user._id).select('role isAdmin');
    if (!buyer) return res.status(401).send({ message: 'المستخدم غير موجود' });

    const products = await Product.find({ _id: { $in: items.map((x) => x._id) } });
    const byId = new Map(products.map((p) => [String(p._id), p]));

    const orderItems = [];
    for (const x of items) {
      const product = byId.get(String(x._id));
      const quantity = Math.floor(Number(x.quantity));
      if (!product) {
        return res.status(404).send({ message: 'أحد المنتجات لم يعد موجودًا' });
      }
      if (!(quantity >= 1)) {
        return res.status(400).send({ message: `كمية غير صحيحة للمنتج: ${product.name}` });
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

    const itemsPrice = round2(orderItems.reduce((a, c) => a + c.price * c.quantity, 0));
    const shippingPrice = itemsPrice > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const taxPrice = round2(TAX_RATE * itemsPrice);
    const totalPrice = round2(itemsPrice + shippingPrice + taxPrice);

    const newOrder = new Order({
      orderItems,
      orderType: paysWholesale(buyer) ? 'wholesale' : 'retail',
      shippingAddress: req.body.shippingAddress,
      paymentMethod: req.body.paymentMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      user: req.user._id,
    });

    const order = await newOrder.save();
    res.status(201).send({ message: 'تم إنشاء الطلب بنجاح', order });
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
    // 🏭 جملة vs قطاعي: عدد وقيمة الطلبات لكل نوع + عدد التجار والطلبات المعلّقة
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
    const pendingWholesale = await User.countDocuments({ wholesaleRequest: true });
    const dailyOrders = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
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
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.send(orders);
  })
);

orderRouter.get(
  '/:id',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      // 🔒 صاحب الطلب أو الأدمن بس يقدر يشوف الطلب
      if (String(order.user) !== String(req.user._id) && !req.user.isAdmin) {
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
  isAdmin, // 🔒 كان أي مستخدم مسجّل يقدر يعمل Deliver لأي طلب
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
      // 💵 الدفع عند الاستلام: الفلوس بتتحصّل وقت التسليم فالطلب بيتعلّم "مدفوع" هنا
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

orderRouter.put(
  '/:id/pay',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id).populate(
      'user',
      'email name'
    );
    if (order) {
      // 🔒 صاحب الطلب بس (أو الأدمن) يقدر يسجّل الدفع
      if (String(order.user._id) !== String(req.user._id) && !req.user.isAdmin) {
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
        to: `${order.user.name} <${order.user.email}>`,
        subject: `طلب جديد رقم ${order._id}`,
        html: payOrderEmailTemplate(order),
      });

      res.send({ message: 'تم تسجيل الدفع', order: updatedOrder });
    } else {
      res.status(404).send({ message: 'الطلب غير موجود' });
    }
  })
);

orderRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (order) {
      await order.remove();
      res.send({ message: 'تم حذف الطلب' });
    } else {
      res.status(404).send({ message: 'الطلب غير موجود' });
    }
  })
);

export default orderRouter;
