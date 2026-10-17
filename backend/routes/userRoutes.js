
import express from 'express';
import bcrypt from 'bcryptjs';
import expressAsyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import User from '../models/userModel.js';
import {
  isAuth,
  isAdmin,
  userPayload,
  baseUrl,
  sendMail,
  escapeHtml,
  mailAddress,
} from '../utils.js';
import { roleOf } from '../pricing.js';
import {
  asText,
  normalizeEmail,
  isValidEmail,
  passwordError,
  nameError,
} from '../validators.js';

const userRouter = express.Router();

// 🛡️ حد المحاولات (حماية من تخمين الباسورد وإغراق الإيميلات)
const limiter = (max, windowMinutes, message) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
  });

const signinLimiter = limiter(10, 15, 'محاولات كتير، حاول تاني بعد شوية');
const signupLimiter = limiter(10, 60, 'محاولات تسجيل كتير، حاول تاني بعد شوية');
const resetLimiter = limiter(5, 60, 'طلبات كتير، حاول تاني بعد شوية');

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// عدد الأدمنز الحاليين (بالدور مش بالإيميل)
const adminCount = () =>
  User.countDocuments({ $or: [{ role: 'admin' }, { isAdmin: true }] });

userRouter.get(
  '/',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const users = await User.find({}).select('-password -resetToken');
    res.send(users);
  })
);

// 🙋 بياناتي الحالية
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
    const user = await User.findById(req.params.id).select(
      '-password -resetToken'
    );

    if (user) {
      res.send(user);
    } else {
      res.status(404).send({ message: 'المستخدم غير موجود' });
    }
  })
);

// 🙋 تعديل بيانات الحساب الشخصي
userRouter.put(
  '/profile',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);

    if (user) {
      const newEmail = normalizeEmail(req.body.email);
      const emailChanged =
        newEmail && newEmail !== String(user.email).toLowerCase();

      if (emailChanged && !isValidEmail(newEmail)) {
        return res.status(400).send({
          message: 'شكل البريد الإلكتروني غير صحيح',
        });
      }

      const newName = asText(req.body.name);

      if (newName && nameError(newName)) {
        return res.status(400).send({
          message: nameError(newName),
        });
      }

      if (req.body.password) {
        const pwErr = passwordError(req.body.password);

        if (pwErr) {
          return res.status(400).send({ message: pwErr });
        }
      }

      // تغيير الإيميل أو الباسورد يتطلب كلمة المرور الحالية
      if (emailChanged || req.body.password) {
        if (
          typeof req.body.currentPassword !== 'string' ||
          !bcrypt.compareSync(req.body.currentPassword, user.password)
        ) {
          return res.status(400).send({
            message: 'كلمة المرور الحالية غير صحيحة',
          });
        }
      }

      if (emailChanged) {
        const taken = await User.findOne({
          email: newEmail,
          _id: { $ne: user._id },
        });

        if (taken) {
          return res.status(400).send({
            message: 'البريد الإلكتروني مستخدم بالفعل',
          });
        }

        user.email = newEmail;
      }

      if (newName) user.name = newName;

      if (req.body.phone !== undefined) {
        user.phone = asText(req.body.phone).slice(0, 30);
      }

      if (req.body.businessName !== undefined) {
        user.businessName = asText(req.body.businessName).slice(0, 100);
      }

      // العميل العادي يقدر يطلب تفعيل حساب تاجر
      if (req.body.requestWholesale && roleOf(user) === 'user') {
        user.wholesaleRequest = true;
      }

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

// 🔑 استعادة كلمة المرور
const FORGET_REPLY = {
  message: 'لو الإيميل ده مسجّل عندنا، هنبعتلك رابط إعادة تعيين كلمة المرور.',
};

userRouter.post(
  '/forget-password',
  resetLimiter,
  expressAsyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body.email);

    if (!email || !isValidEmail(email)) {
      return res.send(FORGET_REPLY);
    }

    const user = await User.findOne({ email });

    if (user) {
      const token = jwt.sign(
        { _id: user._id, purpose: 'reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      user.resetToken = hashToken(token);
      await user.save();

      const link = `${baseUrl()}/reset-password/${encodeURIComponent(token)}`;

      sendMail({
        to: mailAddress(user.name, user.email),
        subject: 'إعادة تعيين كلمة المرور',
        html: `<div dir="rtl" style="text-align:right">
          <p>اضغط على الرابط التالي لإعادة تعيين كلمة المرور (صالح لمدة ساعة):</p>
          <a href="${escapeHtml(link)}">إعادة تعيين كلمة المرور</a>
          <p>لو مطلبتش ده، تجاهل الرسالة.</p>
        </div>`,
      });
    }

    res.send(FORGET_REPLY);
  })
);

userRouter.post(
  '/reset-password',
  resetLimiter,
  expressAsyncHandler(async (req, res) => {
    const token = typeof req.body.token === 'string' ? req.body.token : '';
    const pwErr = passwordError(req.body.password);

    if (pwErr) {
      return res.status(400).send({ message: pwErr });
    }

    const invalid = () =>
      res.status(400).send({
        message: 'رابط إعادة التعيين غير صالح أو انتهت صلاحيته',
      });

    let decode;

    try {
      decode = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) {
      return invalid();
    }

    if (!decode || decode.purpose !== 'reset') {
      return invalid();
    }

    const user = await User.findOne({
      _id: decode._id,
      resetToken: hashToken(token),
    });

    if (!user) {
      return invalid();
    }

    user.password = bcrypt.hashSync(req.body.password, 8);
    user.resetToken = undefined;

    await user.save();

    res.send({ message: 'تم تغيير كلمة المرور بنجاح' });
  })
);

// 👨‍💼 تعديل بيانات مستخدم بواسطة الأدمن
userRouter.put(
  '/:id',
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (user) {
      const newName = asText(req.body.name);

      if (newName) {
        if (nameError(newName)) {
          return res.status(400).send({ message: nameError(newName) });
        }

        user.name = newName;
      }

      const newEmail = normalizeEmail(req.body.email);

      if (newEmail && newEmail !== String(user.email).toLowerCase()) {
        if (!isValidEmail(newEmail)) {
          return res.status(400).send({
            message: 'شكل البريد الإلكتروني غير صحيح',
          });
        }

        const taken = await User.findOne({
          email: newEmail,
          _id: { $ne: user._id },
        });

        if (taken) {
          return res.status(400).send({
            message: 'البريد الإلكتروني مستخدم بالفعل',
          });
        }

        user.email = newEmail;
      }

      // الدور: user / wholesale / admin
      const wanted = ['user', 'wholesale', 'admin'].includes(req.body.role)
        ? req.body.role
        : req.body.isAdmin
          ? 'admin'
          : roleOf(user) === 'admin'
            ? 'user'
            : roleOf(user);

      if (String(user._id) === String(req.user._id) && wanted !== 'admin') {
        return res.status(400).send({
          message: 'مينفعش تشيل صلاحية الأدمن من حسابك أنت',
        });
      }

      // حماية آخر أدمن
      if (
        roleOf(user) === 'admin' &&
        wanted !== 'admin' &&
        (await adminCount()) <= 1
      ) {
        return res.status(400).send({
          message: 'لا يمكن إزالة صلاحية آخر أدمن في المتجر',
        });
      }

      user.role = wanted;
      user.isAdmin = wanted === 'admin';
      user.wholesaleRequest = false;

      if (req.body.businessName !== undefined) {
        user.businessName = asText(req.body.businessName).slice(0, 100);
      }

      if (req.body.phone !== undefined) {
        user.phone = asText(req.body.phone).slice(0, 30);
      }

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
      if (roleOf(user) === 'admin' && (await adminCount()) <= 1) {
        res.status(400).send({
          message: 'لا يمكن حذف آخر أدمن في المتجر',
        });
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
  signinLimiter,
  expressAsyncHandler(async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password =
      typeof req.body.password === 'string' ? req.body.password : '';

    // دعم الإيميلات القديمة المحفوظة بحروف كبيرة
    const raw = asText(req.body.email);

    const user = email
      ? await User.findOne({ email: { $in: [raw, email] } })
      : null;

    if (user && password && bcrypt.compareSync(password, user.password)) {
      res.send(userPayload(user));
      return;
    }

    res.status(401).send({
      message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    });
  })
);

userRouter.post(
  '/signup',
  signupLimiter,
  expressAsyncHandler(async (req, res) => {
    const name = asText(req.body.name);
    const email = normalizeEmail(req.body.email);

    const nErr = nameError(name);

    if (nErr) {
      return res.status(400).send({ message: nErr });
    }

    if (!isValidEmail(email)) {
      return res.status(400).send({
        message: 'شكل البريد الإلكتروني غير صحيح',
      });
    }

    const pwErr = passwordError(req.body.password);

    if (pwErr) {
      return res.status(400).send({ message: pwErr });
    }

    if (await User.findOne({ email })) {
      return res.status(400).send({
        message: 'البريد الإلكتروني مستخدم بالفعل',
      });
    }

    // الحساب التاجر ينتظر موافقة الأدمن
    const wantsWholesale = req.body.accountType === 'wholesale';

    const newUser = new User({
      name,
      email,
      password: bcrypt.hashSync(req.body.password),
      wholesaleRequest: wantsWholesale,
      businessName: wantsWholesale
        ? asText(req.body.businessName).slice(0, 100)
        : '',
      phone: asText(req.body.phone).slice(0, 30),
    });

    const user = await newUser.save();
    res.send(userPayload(user));
  })
);

export default userRouter;
