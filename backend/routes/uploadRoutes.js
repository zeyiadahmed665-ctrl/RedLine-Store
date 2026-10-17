import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import { isAdmin, isAuth } from '../utils.js';

// 🖼️ حد الحجم 5MB، وأنواع الصور المسموحة بس (jpg / png / webp / gif)
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const upload = multer({
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return cb(null, true);
    const err = new Error('نوع الملف غير مسموح — ارفع صورة (JPG أو PNG أو WEBP أو GIF) فقط');
    err.statusCode = 400;
    cb(err);
  },
});

// الـ mimetype بيجي من المتصفح (ممكن يتزوّر)، فبنتأكد كمان من أول بايتات الملف نفسه
const looksLikeImage = (buf) => {
  if (!buf || buf.length < 12) return false;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isPng = buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isGif = buf.slice(0, 4).toString('ascii') === 'GIF8';
  const isWebp = buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP';
  return isJpeg || isPng || isGif || isWebp;
};

const uploadRouter = express.Router();

const singleFile = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'حجم الصورة كبير — الحد الأقصى 5 ميجا'
          : 'تعذّر رفع الملف';
      return res.status(400).send({ message });
    }
    return res.status(err.statusCode || 400).send({ message: err.message });
  });
};

uploadRouter.post('/', isAuth, isAdmin, singleFile, async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).send({ message: 'اختر صورة للرفع' });
    }
    if (!looksLikeImage(req.file.buffer)) {
      return res.status(400).send({ message: 'الملف ده مش صورة صالحة' });
    }
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'image', allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
        (error, result) => (result ? resolve(result) : reject(error))
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });
    res.send(result);
  } catch (e) {
    next(e);
  }
});

export default uploadRouter;
