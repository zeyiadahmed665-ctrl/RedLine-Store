
import "./env.js";
import express from "express";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import mongoose from "mongoose";
import dotenv from "dotenv";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import seedRouter from "./routes/seedRoutes.js";
import productRouter from "./routes/productRoutes.js";
import userRouter from "./routes/userRoutes.js";
import orderRouter from "./routes/orderRoutes.js";
import uploadRouter from "./routes/uploadRoutes.js";

dotenv.config();

// Connect to MongoDB
async function connectDb() {
  let uri = process.env.MONGODB_URI;
  const useMemory = !uri || uri === "memory";

  if (useMemory && process.env.NODE_ENV === "production") {
    throw new Error("MONGODB_URI is required in production");
  }

  if (useMemory) {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create();
    uri = mongod.getUri("amazona");

    console.log(
      "Using temporary in-memory MongoDB (data resets on restart)"
    );
  }

  await mongoose.connect(uri);

  console.log("Connected database:", mongoose.connection.name);
  console.log("Connected host:", mongoose.connection.host);
  console.log(
    "Products collection:",
    mongoose.connection.collection("products").collectionName
  );

  if (useMemory) {
    const Product = (await import("./models/productModel.js")).default;
    const User = (await import("./models/userModel.js")).default;
    const dataModule = await import("./data.js");
    const data = dataModule.default;

    await Promise.all([
      Product.insertMany(data.products),
      User.insertMany(data.users),
    ]);

    console.log("Sample products and users loaded");
    // 🔐 الباسوردات التجريبية عشوائية (مفيش 123456) — بتتطبع هنا للتطوير بس
    console.log("Dev accounts (temporary passwords):");
    data.users.forEach((u) =>
      console.log(`  ${u.email}  /  ${dataModule.devPasswords[u.role] || "(see ADMIN_PASSWORD)"}`)
    );
  } else {
    await ensureAdmin();
  }
}

// 👑 لو القاعدة الحقيقية مفيهاش أدمن خالص: بنعمل واحد من ADMIN_EMAIL / ADMIN_PASSWORD
//    (لأن الـ seed ممنوع في production، ده الطريق الوحيد للأدمن الأول)
async function ensureAdmin() {
  const User = (await import("./models/userModel.js")).default;
  const hasAdmin = await User.exists({ $or: [{ role: "admin" }, { isAdmin: true }] });
  if (hasAdmin) return;
  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || password.length < 8) {
    console.warn(
      "WARNING: no admin user exists. Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ chars) and restart to create one."
    );
    return;
  }
  await User.create({
    name: "الأدمن",
    email,
    password: bcrypt.hashSync(password),
    isAdmin: true,
    role: "admin",
  });
  console.log("Admin account created for", email);
}

connectDb().catch((err) => {
  console.error("DB error:", err.message);
  // في production مينفعش السيرفر يفضل شغّال من غير قاعدة بيانات: بنوقفه عشان المنصة تعيد تشغيله/تنبّهك
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
});

if (!process.env.JWT_SECRET) {
  console.log("WARNING: JWT_SECRET is not set, login will not work");
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

const app = express();

// Koyeb/Vercel بيشغّلوا السيرفر ورا proxy: لازم عشان الـ rate limit يشوف الـ IP الحقيقي
app.set("trust proxy", 1);

// 🛡️ هيدرز الأمان. الـ CSP مقفول هنا لأن الواجهة بتحمّل PayPal وGoogle Maps وصور من برّه،
//    فلو فعّلته لازم تضبط القائمة البيضاء بتاعتها بدقة.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin) {
    if (allowedOrigins.length === 0) {
      res.setHeader("Access-Control-Allow-Origin", "*");
    } else if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(compression());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.get("/api/keys/paypal", (req, res) => {
  res.send(process.env.PAYPAL_CLIENT_ID || "sb");
});

app.get("/api/keys/google", (req, res) => {
  res.send({ key: process.env.GOOGLE_API_KEY || "" });
});

app.use("/api/upload", uploadRouter);
app.use("/api/seed", seedRouter);
app.use("/api/products", productRouter);
app.use("/api/users", userRouter);
app.use("/api/orders", orderRouter);

// Health check
// بيعكس حالة قاعدة البيانات فعلاً: 200 لو متصلة، 503 لو لأ (عشان المنصة تعرف إن فيه مشكلة)
app.get("/api/health", (req, res) => {
  const dbConnected = mongoose.connection.readyState === 1;
  res.status(dbConnected ? 200 : 503).send({
    status: dbConnected ? "ok" : "database unavailable",
    database: dbConnected ? "connected" : "disconnected",
  });
});

// Serve frontend build if available
const serverDir = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.join(serverDir, "../frontend/build");

if (fs.existsSync(buildDir)) {
  app.use(
    express.static(buildDir, {
      maxAge: "30d",
      setHeaders: (res, filePath) => {
        if (filePath.endsWith("index.html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    })
  );

  app.get("*", (req, res) => {
    res.sendFile(path.join(buildDir, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    res.send({
      message: "RedLine Store API is running successfully!",
    });
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  const status = err.statusCode || err.status || 500;
  // في production مفيش رسايل داخلية (أسماء حقول/مكتبات/مسارات) بترجع للمستخدم
  const message =
    process.env.NODE_ENV !== "production"
      ? err.message
      : status < 500
      ? "الطلب غير صالح"
      : "حصل خطأ في السيرفر، حاول مرة أخرى";
  res.status(status).send({ message });
});

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
