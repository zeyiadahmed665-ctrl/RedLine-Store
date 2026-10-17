import express from 'express';
import Product from '../models/productModel.js';
import data from '../data.js';
import User from '../models/userModel.js';

const seedRouter = express.Router();

// 🔒 الراوت ده بيمسح كل المنتجات والمستخدمين ويرجّع البيانات التجريبية.
//    مرفوض تمامًا في production (حتى لو ALLOW_SEED=true)، ومفتوح للتطوير بس لما ALLOW_SEED=true.
seedRouter.get('/', async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).send({ message: 'تحميل البيانات التجريبية غير متاح في بيئة الإنتاج' });
    }
    if (process.env.ALLOW_SEED !== 'true') {
      return res.status(403).send({ message: 'تحميل البيانات التجريبية معطّل' });
    }
    await Product.deleteMany({});
    const createdProducts = await Product.insertMany(data.products);
    await User.deleteMany({});
    const createdUsers = await User.insertMany(data.users);
    res.send({
      message: 'تم تحميل البيانات التجريبية بنجاح! 🔥',
      createdProducts,
      // من غير الباسوردات المشفّرة
      createdUsers: createdUsers.map((u) => ({ _id: u._id, name: u.name, email: u.email, role: u.role })),
    });
  } catch (e) {
    next(e);
  }
});

export default seedRouter;
