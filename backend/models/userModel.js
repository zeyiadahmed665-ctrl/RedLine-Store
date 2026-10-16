import mongoose from 'mongoose';

// =====================================================================
// 👤 المستخدم — الأدوار (role): user = عميل قطاعي | wholesale = تاجر معتمد | admin = إدارة
//   isAdmin لسه موجود للتوافق مع الحسابات القديمة (بيتظبط تلقائياً مع role)
//   wholesaleRequest = true معناها العميل قدّم طلب حساب تاجر وبانتظار موافقة الأدمن
// =====================================================================
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetToken: { type: String },
    isAdmin: { type: Boolean, default: false, required: true },
    role: { type: String, enum: ['user', 'wholesale', 'admin'], default: 'user' },
    wholesaleRequest: { type: Boolean, default: false },
    businessName: { type: String, default: '' },
    phone: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);
export default User;
