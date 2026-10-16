import express from 'express';
import Product from '../models/productModel.js';
import data from '../data.js';
import User from '../models/userModel.js';

const seedRouter = express.Router();

// 🔒 الراوت ده بيمسح كل المنتجات والمستخدمين ويرجّع البيانات التجريبية.
seedRouter.get('/', async (req, res) => {
  // تم تعديل الشرط هنا لضمان قبول التشغيل بأي طريقة
  if (process.env.ALLOW_SEED !== 'true' && process.env.ALLOW_SEED !== true) {
    return res.status(403).send({ message: 'تحميل البيانات التجريبية معطّل' });
  }
  await Product.deleteMany({});
  const createdProducts = await Product.insertMany(data.products);
  await User.deleteMany({});
  const createdUsers = await User.insertMany(data.users);
  res.send({ message: 'تم تحميل البيانات التجريبية بنجاح! 🔥', createdProducts, createdUsers });
});

export default seedRouter;