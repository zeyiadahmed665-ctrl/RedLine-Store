import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // صاحب التقييم (لمنع التكرار)
    name: { type: String, required: true },
    comment: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
  },
  {
    timestamps: true,
  }
);

// =====================================================================
// 🧱 شكل المنتج في قاعدة البيانات (Schema)
// كل سطر تحت = حقل (Field) في المنتج.
//   type: نوع البيانات   |  required: لازم يتحط   |  unique: ما يتكررش
//
// ➕ لو عايز تضيف حقل جديد للمنتج (مثلاً color):
//   1) هنا أضف سطر:         color: { type: String },
//   2) في backend/data.js أضف  color: 'Red'  في المنتجات.
//   3) في frontend/src/components/Product.js اعرضه:  {product.color}
//   4) لو عايز تعدله من لوحة الأدمن: أضف  product.color = req.body.color;
//      في backend/routes/productRoutes.js (راوت PUT)، وحقل إدخال في
//      frontend/src/screens/ProductEditScreen.js
// =====================================================================
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true },
    image: { type: String, required: true },
    images: [String],
    brand: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    countInStock: { type: Number, required: true },
    // 🏭 أسعار الجملة (بتظهر للتاجر المعتمد بس). wholesalePrice = 0 يعني مفيش جملة للمنتج ده
    wholesalePrice: { type: Number, default: 0 },
    wholesaleMinQty: { type: Number, default: 12 }, // أقل كمية للتاجر (12 = دستة)
    packSize: { type: Number, default: 12 }, // حجم الباكيت/الدستة: الكمية بتزيد بمضاعفاته
    priceTiers: [
      // شرائح الكميات الكبيرة: من minQty قطعة فأكتر السعر يبقى price للقطعة
      { minQty: { type: Number, required: true }, price: { type: Number, required: true }, _id: false },
    ],
    sizes: [String], // المقاسات المتاحة: ['S','M','L','XL']
    colors: [String], // الألوان المتاحة: ['black','red','white','blue']
    rating: { type: Number, required: true },
    numReviews: { type: Number, required: true },
    reviews: [reviewSchema],
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model('Product', productSchema);
export default Product;
