
import "./env.js";
import express from "express";
import compression from "compression";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import mongoose from "mongoose";
import dotenv from "dotenv";
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
    const data = (await import("./data.js")).default;

    await Promise.all([
      Product.insertMany(data.products),
      User.insertMany(data.users),
    ]);

    console.log("Sample products and users loaded");
  }
}

connectDb().catch((err) => {
  console.error("DB error:", err.message);
});

if (!process.env.JWT_SECRET) {
  console.log("WARNING: JWT_SECRET is not set, login will not work");
}

const app = express();

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
      "Content-Type, Authorization, ngrok-skip-browser-warning"
    );
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.get("/api/health", (req, res) => {
  res.send({ status: "Server is running successfully!" });
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
  res.status(500).send({ message: err.message });
});

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
