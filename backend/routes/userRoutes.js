import express from 'express';
import bcrypt from 'bcryptjs';
import expressAsyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { isAuth, isAdmin, userPayload, baseUrl, sendMail } from '../utils.js';
import { roleOf } from '../pricing.js';

const userRouter = express.Router();

userRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const users = await User.find({}).select('-password -resetToken');
    res.send(users);
  })
);

// 🙋 بياناتي الحالية (الدور بيتحدّث فوراً لما الأدمن يوافق على حساب التاجر)
userRouter.get(
  '/me',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
      res.send(userPayload(user));
    } else {
      res.status(404).send({ message: 'المستخدم غير موجود' });
    }
  })
);

userRouter.get(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password -resetToken');
    if (user) {
      res.send(user);
    } else {
      res.status(404).send({ message: 'المستخدم غير موجود' });
    }
  })
);

userRouter.put(
  '/profile',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    if (user) {
      const newEmail = req.body.email && req.body.email.trim().toLowerCase();
      const emailChanged = newEmail && newEmail !== String(user.email).toLowerCase();
      // 🔒 تغيير الإيميل أو الباسورد لازم كلمة المرور الحالية
      if (emailChanged || req.body.password) {
        if (!req.body.currentPassword || !bcrypt.compareSync(req.body.currentPassword, user.password)) {
          return res.status(401).send({ message: 'كلمة المرور الحالية غير صحيحة' });
        }
      }
      if (emailChanged) {
        const taken = await User.findOne({ email: newEmail, _id: { $ne: user._id } });
        if (taken) return res.status(400).send({ message: 'البريد الإلكتروني مستخدم بالفعل' });
        user.email = newEmail;
      }
      user.name = req.body.name || user.name;
      if (req.body.phone !== undefined) user.phone = req.body.phone;
      if (req.body.businessName !== undefined) user.businessName = req.body.businessName;
      // 🏭 العميل العادي يقدر يطلب تفعيل حساب تاجر (والأدمن هو اللي يوافق)
      if (req.body.requestWholesale && roleOf(user) === 'user') user.wholesaleRequest = true;
      if (req.body.password) {
        user.password = bcrypt.hashSync(req.body.password, 8);
      }

      const updatedUser = await user.save();
      res.send(userPayload(updatedUser));
    } else {
      res.status(404).send({ message: 'المستخدم غير موجود' });
    }
  })
);

userRouter.post(
  '/forget-password',
  expressAsyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });

    if (user) {
      const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
        expiresIn: '3h',
      });
      user.resetToken = token;
      await user.save();

      //reset link
      console.log(`${baseUrl()}/reset-password/${token}`);

      sendMail({
        to: `${user.name} <${user.email}>`,
        subject: `إعادة تعيين كلمة المرور`,
        html: `<div dir="rtl" style="text-align:right"> 
             <p>اضغط على الرابط التالي لإعادة تعيين كلمة المرور:</p> 
             <a href="${baseUrl()}/reset-password/${token}">إعادة تعيين كلمة المرور</a>
             </div>`,
      });
      res.send({ message: 'أرسلنا رابط إعادة تعيين كلمة المرور على بريدك الإلكتروني.' });
    } else {
      res.status(404).send({ message: 'المستخدم غير موجود' });
    }
  })
);

userRouter.post(
  '/reset-password',
  expressAsyncHandler(async (req, res) => {
    jwt.verify(req.body.token, process.env.JWT_SECRET, async (err, decode) => {
      if (err) {
        res.status(401).send({ message: 'الجلسة غير صالحة، سجّل الدخول مرة أخرى' });
      } else {
        const user = await User.findOne({ resetToken: req.body.token });
        if (user) {
          if (req.body.password) {
            user.password = bcrypt.hashSync(req.body.password, 8);
            await user.save();
            res.send({
              message: 'تم تغيير كلمة المرور بنجاح',
            });
          }
        } else {
          res.status(404).send({ message: 'المستخدم غير موجود' });
        }
      }
    });
  })
);

userRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      // 🎭 الدور: user / wholesale / admin (و isAdmin القديم لسه مدعوم)
      const wanted = ['user', 'wholesale', 'admin'].includes(req.body.role)
        ? req.body.role
        : req.body.isAdmin
        ? 'admin'
        : roleOf(user) === 'admin'
        ? 'user'
        : roleOf(user);
      if (String(user._id) === String(req.user._id) && wanted !== 'admin') {
        return res.status(400).send({ message: 'مينفعش تشيل صلاحية الأدمن من حسابك أنت' });
      }
      user.role = wanted;
      user.isAdmin = wanted === 'admin';
      // أي قرار من الأدمن (موافقة أو رفض) بيقفل طلب التاجر المعلّق
      user.wholesaleRequest = false;
      if (req.body.businessName !== undefined) user.businessName = req.body.businessName;
      if (req.body.phone !== undefined) user.phone = req.body.phone;
      const updatedUser = await user.save();
      res.send({
        message: 'تم تحديث بيانات المستخدم',
        user: { ...userPayload(updatedUser), token: undefined },
      });
    } else {
      res.status(404).send({ message: 'المستخدم غير موجود' });
    }
  })
);

userRouter.delete(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (user) {
      if (user.email === 'admin@example.com') {
        res.status(400).send({ message: 'لا يمكن حذف حساب الأدمن' });
        return;
      }
      await user.remove();
      res.send({ message: 'تم حذف المستخدم' });
    } else {
      res.status(404).send({ message: 'المستخدم غير موجود' });
    }
  })
);
userRouter.post(
  '/signin',
  expressAsyncHandler(async (req, res) => {
    const raw = String(req.body.email || '').trim();
    const user = await User.findOne({ email: { $in: [raw, raw.toLowerCase()] } });
    if (user) {
      if (bcrypt.compareSync(req.body.password, user.password)) {
        res.send(userPayload(user));
        return;
      }
    }
    res.status(401).send({ message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
  })
);

userRouter.post(
  '/signup',
  expressAsyncHandler(async (req, res) => {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (await User.findOne({ email })) {
      return res.status(400).send({ message: 'البريد الإلكتروني مستخدم بالفعل' });
    }
    // 🏭 لو سجّل كتاجر: الحساب بيبدأ عادي، وبيتحط في قايمة انتظار موافقة الأدمن
    const wantsWholesale = req.body.accountType === 'wholesale';
    const newUser = new User({
      name: req.body.name,
      email,
      password: bcrypt.hashSync(req.body.password),
      wholesaleRequest: wantsWholesale,
      businessName: wantsWholesale ? req.body.businessName || '' : '',
      phone: req.body.phone || '',
    });
    const user = await newUser.save();
    res.send(userPayload(user));
  })
);

export default userRouter;
