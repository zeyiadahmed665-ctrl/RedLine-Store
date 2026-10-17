// =====================================================================
// ✅ فحص المدخلات (رسايل بالعربي). أي قيمة بتيجي من المتصفح بنحوّلها لنص الأول،
//    عشان محدش يبعت object بدل نص ويحقن شروط في استعلامات القاعدة (NoSQL injection).
// =====================================================================
export const asText = (v) => (typeof v === 'string' ? v.trim() : '');

const EMAIL_RE = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]{2,}$/;

export const normalizeEmail = (v) => asText(v).toLowerCase();

export const isValidEmail = (email) => email.length <= 254 && EMAIL_RE.test(email);

export const PASSWORD_MIN = 8;

// بيرجّع رسالة الخطأ، أو null لو تمام
export const passwordError = (password) => {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN) {
    return `كلمة المرور لازم تكون ${PASSWORD_MIN} أحرف على الأقل`;
  }
  if (password.length > 72) {
    return 'كلمة المرور طويلة جدًا (الحد الأقصى 72 حرف)';
  }
  if (!/[A-Za-z\u0600-\u06FF]/.test(password) || !/\d/.test(password)) {
    return 'كلمة المرور لازم تحتوي على حروف وأرقام';
  }
  return null;
};

export const nameError = (name) => {
  if (name.length < 2) return 'الاسم لازم يكون حرفين على الأقل';
  if (name.length > 60) return 'الاسم طويل جدًا (الحد الأقصى 60 حرف)';
  return null;
};

// تهريب أي نص قبل ما يدخل في regex (البحث)
export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
