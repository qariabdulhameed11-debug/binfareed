// server/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path3 from "path";
import mongoose19 from "mongoose";

// server/config/env.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config();
var env = {
  PORT: parseInt(process.env.PORT || "5005", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5174",
  MONGODB_URI: process.env.MONGODB_URI || "mongodb+srv://sp2023it023_db_user:nPLkZUf2JJvl7Z3v@cluster0.fpuclkn.mongodb.net/binfareedstore?appName=Cluster0",
  JWT_SECRET: process.env.JWT_SECRET || "bOMYx--5brT5JwMtfgA7Go-a6-MJxNTYssJnaczG3mqalSy7SpLTByTkX5TSM28Z",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  COOKIE_SECURE: process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
  PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER || "safepay",
  PAYMENT_API_KEY: process.env.PAYMENT_API_KEY || "",
  PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET || "bfs_dev_webhook_secret_2026",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@binfareedstore.pk",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "3w?d*@vaYJG52$bHr4"
};
var DEFAULT_INSECURE_SECRET = "bfs_dev_jwt_secret_key_99887766554433221100_luxury_horology";
if (env.JWT_SECRET === DEFAULT_INSECURE_SECRET) {
  console.warn("[Security Warning]: Default JWT secret is in use. Set JWT_SECRET in production.");
}

// server/config/db.ts
import mongoose from "mongoose";
var memoryServer = null;
var isUsingMemoryServer = false;
async function connectDatabase() {
  try {
    let mongoUri = (env.MONGODB_URI || "").trim();
    if (mongoose.connection.readyState >= 1) {
      return { uri: mongoUri || "cached", isMemory: isUsingMemoryServer };
    }
    if (!mongoUri) {
      if (env.NODE_ENV === "production") {
        throw new Error("CRITICAL: MONGODB_URI environment variable is required in production.");
      }
      console.log("[DB] No MONGODB_URI configured. Starting embedded MongoDB server for local development/testing...");
      const { MongoMemoryServer } = await import("mongodb-memory-server");
      memoryServer = await MongoMemoryServer.create();
      mongoUri = memoryServer.getUri();
      isUsingMemoryServer = true;
    }
    mongoose.set("strictQuery", true);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5e3
    });
    console.log(`[DB] Connected to MongoDB (${isUsingMemoryServer ? "Embedded Memory Server" : "MongoDB Atlas / External Cluster"})`);
    return { uri: mongoUri, isMemory: isUsingMemoryServer };
  } catch (error) {
    console.error("[DB] Database connection error:", error);
    throw error;
  }
}

// server/middleware/security.ts
import rateLimit from "express-rate-limit";
function sanitizeObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj !== null && typeof obj === "object") {
    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith("$") || key.includes(".")) {
        continue;
      }
      cleaned[key] = sanitizeObject(value);
    }
    return cleaned;
  }
  return obj;
}
function sanitizeNoSqlInjection(req, _res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body);
  }
  if (req.params && typeof req.params === "object") {
    req.params = sanitizeObject(req.params);
  }
  next();
}
function csrfProtection(req, res, next) {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method) || req.path.includes("/webhooks/")) {
    return next();
  }
  const requestedWith = req.headers["x-requested-with"];
  const origin = req.headers.origin;
  if (requestedWith === "BinFareedStore-Client" || env.NODE_ENV === "test" || process.env.VITEST === "true") {
    return next();
  }
  if (origin) {
    const isVercel = origin.endsWith(".vercel.app");
    const allowedOrigins = [
      env.FRONTEND_URL,
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      "http://localhost:5000",
      "http://localhost:5005"
    ];
    if (isVercel || allowedOrigins.includes(origin)) {
      return next();
    }
    res.status(403).json({
      success: false,
      message: "CSRF check failed: untrusted request origin."
    });
    return;
  }
  next();
}
var authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 minutes
  max: env.NODE_ENV === "test" ? 1e3 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts from this IP. Please try again in 15 minutes."
  }
});
var apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // Strict in production; relaxed locally where the admin, the store and tests share one IP
  max: env.NODE_ENV === "production" ? 600 : 5e3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP. Please slow down."
  }
});

// server/middleware/errorHandler.ts
import { ZodError } from "zod";
var AppError = class _AppError extends Error {
  statusCode;
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, _AppError.prototype);
  }
};
function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
    return;
  }
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message
    }));
    res.status(400).json({
      success: false,
      message: errors[0]?.message || "Validation failed",
      errors
    });
    return;
  }
  const mongoErr = err;
  if (mongoErr && mongoErr.code === 11e3) {
    const field = mongoErr.keyValue ? Object.keys(mongoErr.keyValue)[0] : "field";
    res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}. Please use a unique value.`
    });
    return;
  }
  if (mongoErr && mongoErr.name === "CastError") {
    res.status(400).json({
      success: false,
      message: "Invalid resource identifier format."
    });
    return;
  }
  if (env.NODE_ENV !== "test") {
    console.error("[Server Error]:", err);
  }
  res.status(500).json({
    success: false,
    message: "An unexpected server error occurred. Please try again later."
  });
}

// server/routes/authRoutes.ts
import { Router } from "express";
import bcrypt2 from "bcryptjs";
import crypto2 from "crypto";
import { z } from "zod";

// server/models/User.ts
import mongoose2, { Schema } from "mongoose";
import bcrypt from "bcryptjs";
var SavedAddressSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, default: "Home" },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    streetAddress: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    province: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, default: "Pakistan" },
    isDefault: { type: Boolean, default: false }
  },
  { _id: true }
);
var UserSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    phone: { type: String, default: "", trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["customer", "admin"],
      default: "customer",
      index: true
    },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      index: true
    },
    tokenVersion: { type: Number, default: 0 },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    addresses: { type: [SavedAddressSchema], default: [] },
    wishlist: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    lastLoginAt: { type: Date }
  },
  { timestamps: true }
);
UserSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};
UserSchema.index(
  { role: 1 },
  { unique: true, partialFilterExpression: { role: "admin" }, name: "single_admin" }
);
var User = mongoose2.model("User", UserSchema);

// server/models/Order.ts
import mongoose3, { Schema as Schema2 } from "mongoose";
var OrderItemSchema = new Schema2(
  {
    product: { type: Schema2.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    brand: { type: String, required: true },
    sku: { type: String, required: true },
    variantSku: { type: String },
    variantName: { type: String },
    image: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    subtotal: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);
var ShippingAddressSchema = new Schema2(
  {
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    streetAddress: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    province: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, default: "Pakistan" },
    notes: { type: String, default: "" }
  },
  { _id: false }
);
var OrderStatusHistorySchema = new Schema2(
  {
    status: { type: String, required: true },
    paymentStatus: { type: String },
    note: { type: String, required: true },
    updatedBy: { type: String, default: "System" },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);
var WhatsAppLogSchema = new Schema2(
  {
    template: { type: String, required: true },
    message: { type: String, required: true, maxlength: 4e3 },
    phone: { type: String, required: true },
    sentBy: { type: String, default: "Admin" },
    sentAt: { type: Date, default: Date.now }
  },
  { _id: false }
);
var OrderSchema = new Schema2(
  {
    orderNumber: { type: String, required: true, unique: true, uppercase: true, index: true },
    requestNumber: { type: String, unique: true, sparse: true, uppercase: true },
    approvedAt: { type: Date },
    idempotencyKey: { type: String, unique: true, sparse: true, index: true },
    user: { type: Schema2.Types.ObjectId, ref: "User", default: null, index: true },
    isGuest: { type: Boolean, default: false },
    items: { type: [OrderItemSchema], required: true },
    shippingAddress: { type: ShippingAddressSchema, required: true },
    shippingMethod: { type: String, enum: ["standard", "express"], default: "standard" },
    subtotal: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    couponCode: { type: String, uppercase: true, trim: true },
    shippingCost: { type: Number, default: 0, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "PKR" },
    paymentMethod: {
      type: String,
      // online_card kept only so historical orders stay valid; new orders cannot use it
      enum: ["cod", "online_card", "bank_transfer", "jazzcash", "easypaisa", "online"],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
      index: true
    },
    paymentReference: { type: String },
    paidAt: { type: Date },
    fulfillmentStatus: {
      type: String,
      enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"],
      default: "pending",
      index: true
    },
    courierName: { type: String, default: "" },
    trackingNumber: { type: String, default: "" },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    cancelledAt: { type: Date },
    refundedAt: { type: Date },
    inventoryRestored: { type: Boolean, default: false },
    statusHistory: { type: [OrderStatusHistorySchema], default: [] },
    orderSource: { type: String, enum: ["website", "whatsapp"], default: "website", index: true },
    whatsappLog: { type: [WhatsAppLogSchema], default: [] }
  },
  { timestamps: true }
);
var Order = mongoose3.model("Order", OrderSchema);

// server/middleware/auth.ts
import jwt from "jsonwebtoken";
var AUTH_COOKIE_NAME = "bfs_auth_token";
function signAuthToken(user) {
  const payload = {
    userId: String(user._id),
    role: user.role,
    tokenVersion: user.tokenVersion || 0
  };
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN
  });
}
function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SECURE ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1e3,
    // 7 days
    path: "/"
  });
}
function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SECURE ? "none" : "lax",
    path: "/"
  });
}
function extractToken(req) {
  if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
    return req.cookies[AUTH_COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}
async function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      res.status(401).json({ success: false, message: "Authentication required. Please sign in." });
      return;
    }
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: "Session invalid. User no longer exists." });
      return;
    }
    if (user.status === "suspended") {
      clearAuthCookie(res);
      res.status(403).json({ success: false, message: "Your account has been suspended. Please contact support." });
      return;
    }
    if ((user.tokenVersion || 0) !== (decoded.tokenVersion || 0)) {
      clearAuthCookie(res);
      res.status(401).json({ success: false, message: "Session expired due to security update. Please sign in again." });
      return;
    }
    req.user = user;
    next();
  } catch {
    clearAuthCookie(res);
    res.status(401).json({ success: false, message: "Invalid or expired authentication session." });
  }
}
async function optionalAuth(req, _res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return next();
    }
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (user && user.status === "active" && (user.tokenVersion || 0) === (decoded.tokenVersion || 0)) {
      req.user = user;
    }
    next();
  } catch {
    next();
  }
}
function requireAdmin(req, res, next) {
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required." });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({
      success: false,
      message: "Forbidden: Administrator privileges are required to access this resource."
    });
    return;
  }
  next();
}

// server/utils/helpers.ts
import crypto from "crypto";

// server/models/AuditLog.ts
import mongoose4, { Schema as Schema3 } from "mongoose";
var AuditLogSchema = new Schema3(
  {
    actorId: { type: Schema3.Types.ObjectId, ref: "User", index: true },
    actorName: { type: String, required: true },
    actorEmail: { type: String, required: true },
    action: { type: String, required: true, index: true },
    entityType: {
      type: String,
      enum: ["product", "inventory", "order", "customer", "category", "collection", "coupon", "settings", "homepage", "auth"],
      required: true,
      index: true
    },
    entityId: { type: String },
    details: { type: String, required: true },
    ipAddress: { type: String }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
var AuditLog = mongoose4.model("AuditLog", AuditLogSchema);

// server/models/Coupon.ts
import mongoose5, { Schema as Schema4 } from "mongoose";
var CouponSchema = new Schema4(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    description: { type: String, default: "", trim: true },
    discountType: { type: String, enum: ["percentage", "fixed"], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderAmount: { type: Number, default: 0, min: 0 },
    maxDiscountAmount: { type: Number, default: null },
    startDate: { type: Date, default: Date.now },
    expiryDate: { type: Date, required: true },
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0, min: 0 },
    perCustomerLimit: { type: Number, default: 1, min: 1 },
    usedByUsers: [
      {
        userId: { type: Schema4.Types.ObjectId, ref: "User" },
        email: { type: String, lowercase: true },
        usedAt: { type: Date, default: Date.now }
      }
    ],
    applicableCategories: [{ type: Schema4.Types.ObjectId, ref: "Category" }],
    applicableProducts: [{ type: Schema4.Types.ObjectId, ref: "Product" }],
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);
var Coupon = mongoose5.model("Coupon", CouponSchema);

// server/utils/helpers.ts
function slugify(text) {
  return text.toString().toLowerCase().trim().replace(/['"]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
function generateSku(brand, model) {
  const b = brand.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() || "BFS";
  const m = model.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "WTCH";
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `${b}-${m}-${rand}`;
}
function generateOrderNumber() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(6);
  return `REQ-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}
var isApprovedOrderNumber = (n) => /^BFS-\d+$/.test(n);
var formatApprovedOrderNumber = (seq) => `BFS-${String(seq).padStart(3, "0")}`;
async function logAudit(params) {
  try {
    await AuditLog.create({
      actorId: params.user?._id,
      actorName: params.user?.name || "System",
      actorEmail: params.user?.email || "system@binfareedstore.pk",
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      details: params.details,
      ipAddress: params.ipAddress
    });
  } catch (err) {
    console.error("[AuditLog Error]:", err);
  }
}
async function evaluateCoupon(params) {
  const normalizedCode = params.code.trim().toUpperCase();
  if (!normalizedCode) {
    return { valid: false, message: "Please enter a coupon code.", discountAmount: 0 };
  }
  const coupon = await Coupon.findOne({ code: normalizedCode });
  if (!coupon || !coupon.isActive) {
    return { valid: false, message: "Invalid or inactive coupon code.", discountAmount: 0 };
  }
  const now = /* @__PURE__ */ new Date();
  if (coupon.startDate && now < coupon.startDate) {
    return { valid: false, message: "This promotional code is not active yet.", discountAmount: 0 };
  }
  if (now > coupon.expiryDate) {
    return { valid: false, message: "This coupon code has expired.", discountAmount: 0 };
  }
  if (coupon.usageLimit !== null && coupon.usageLimit !== void 0 && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, message: "This coupon has reached its maximum usage limit.", discountAmount: 0 };
  }
  if (params.subtotal < coupon.minOrderAmount) {
    return {
      valid: false,
      message: `Minimum order subtotal of Rs. ${coupon.minOrderAmount.toLocaleString()} is required for coupon ${coupon.code}.`,
      discountAmount: 0
    };
  }
  if (params.userId || params.userEmail) {
    const emailLower = params.userEmail?.toLowerCase();
    const customerUses = coupon.usedByUsers.filter(
      (u) => params.userId && u.userId && String(u.userId) === String(params.userId) || emailLower && u.email === emailLower
    ).length;
    if (customerUses >= (coupon.perCustomerLimit || 1)) {
      return {
        valid: false,
        message: "You have already reached the usage limit for this coupon code.",
        discountAmount: 0
      };
    }
  }
  let eligibleSubtotal = params.subtotal;
  const hasProductRestriction = coupon.applicableProducts && coupon.applicableProducts.length > 0;
  const hasCategoryRestriction = coupon.applicableCategories && coupon.applicableCategories.length > 0;
  if ((hasProductRestriction || hasCategoryRestriction) && params.items && params.items.length > 0) {
    const allowedProdIds = new Set(coupon.applicableProducts.map((id) => String(id)));
    const allowedCatIds = new Set(coupon.applicableCategories.map((id) => String(id)));
    const matchingItems = params.items.filter(
      (item) => hasProductRestriction && allowedProdIds.has(String(item.productId)) || hasCategoryRestriction && item.categoryId && allowedCatIds.has(String(item.categoryId))
    );
    if (matchingItems.length === 0) {
      return {
        valid: false,
        message: "This coupon does not apply to the items currently in your bag.",
        discountAmount: 0
      };
    }
    eligibleSubtotal = matchingItems.reduce((acc, item) => acc + item.lineTotal, 0);
  }
  let discountAmount = 0;
  if (coupon.discountType === "percentage") {
    discountAmount = Math.round(eligibleSubtotal * coupon.discountValue / 100);
    if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }
  } else {
    discountAmount = Math.min(coupon.discountValue, eligibleSubtotal);
  }
  discountAmount = Math.max(0, Math.min(discountAmount, params.subtotal));
  return {
    valid: true,
    message: `Coupon ${coupon.code} applied! You saved Rs. ${discountAmount.toLocaleString()}.`,
    discountAmount,
    coupon
  };
}

// server/routes/authRoutes.ts
var router = Router();
var registerSchema = z.object({
  name: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Please provide a valid email address"),
  phone: z.string().min(10, "Please enter a valid Pakistani or international phone number").max(20).optional().default(""),
  password: z.string().min(8, "Password must be at least 8 characters long").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[0-9]/, "Password must contain at least one number")
});
var loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required")
});
var addressSchema = z.object({
  label: z.string().min(1).max(40).default("Home"),
  fullName: z.string().min(2, "Recipient name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  streetAddress: z.string().min(5, "Complete street address is required"),
  city: z.string().min(2, "City is required"),
  province: z.string().min(2, "Province is required"),
  postalCode: z.string().min(4, "Postal code is required"),
  country: z.string().default("Pakistan"),
  isDefault: z.boolean().optional().default(false)
});
function formatUserResponse(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    addresses: user.addresses,
    wishlist: user.wishlist,
    createdAt: user.createdAt
  };
}
router.post(
  "/register",
  authRateLimiter,
  async (req, res, next) => {
    try {
      if (process.env.ALLOW_CUSTOMER_SIGNUP !== "true") {
        throw new AppError("Account registration is closed. You can order as a guest.", 403);
      }
      const data = registerSchema.parse(req.body);
      const existing = await User.findOne({ email: data.email.toLowerCase() });
      if (existing) {
        throw new AppError("An account with this email address already exists.", 409);
      }
      const passwordHash = await bcrypt2.hash(data.password, 12);
      const user = await User.create({
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        passwordHash,
        role: "customer",
        lastLoginAt: /* @__PURE__ */ new Date()
      });
      const token = signAuthToken(user);
      setAuthCookie(res, token);
      res.status(201).json({
        success: true,
        message: "Welcome to BinFareedStore. Your account has been created.",
        user: formatUserResponse(user)
      });
    } catch (err) {
      next(err);
    }
  }
);
router.post(
  "/login",
  authRateLimiter,
  async (req, res, next) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await User.findOne({ email: data.email.toLowerCase() }).select("+passwordHash");
      if (!user) {
        throw new AppError("Invalid email or password.", 401);
      }
      if (user.status === "suspended") {
        throw new AppError("Your account has been suspended. Please contact customer support.", 403);
      }
      const isMatch = await user.comparePassword(data.password);
      if (!isMatch) {
        throw new AppError("Invalid email or password.", 401);
      }
      user.lastLoginAt = /* @__PURE__ */ new Date();
      if (user.role === "admin") {
        user.tokenVersion = (user.tokenVersion || 0) + 1;
      }
      await user.save();
      const token = signAuthToken(user);
      setAuthCookie(res, token);
      if (user.role === "admin") {
        await logAudit({
          user,
          action: "ADMIN_LOGIN",
          entityType: "auth",
          details: `Administrator ${user.email} signed in`,
          ipAddress: req.ip
        });
      }
      res.json({
        success: true,
        message: `Welcome back, ${user.name}.`,
        user: formatUserResponse(user)
      });
    } catch (err) {
      next(err);
    }
  }
);
router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true, message: "Signed out successfully." });
});
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate(
      "wishlist",
      "name slug brand model price salePrice mainImage stock status specifications averageRating reviewCount"
    );
    if (!user) {
      throw new AppError("User not found.", 404);
    }
    res.json({
      success: true,
      user: formatUserResponse(user),
      wishlistItems: user.wishlist
    });
  } catch (err) {
    next(err);
  }
});
router.put("/profile", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      name: z.string().min(2).max(100),
      phone: z.string().min(7).max(20).optional().default("")
    });
    const data = schema.parse(req.body);
    const user = await User.findById(req.user._id);
    if (!user) throw new AppError("User not found.", 404);
    user.name = data.name;
    user.phone = data.phone;
    await user.save();
    res.json({
      success: true,
      message: "Profile updated successfully.",
      user: formatUserResponse(user)
    });
  } catch (err) {
    next(err);
  }
});
router.post("/addresses", requireAuth, async (req, res, next) => {
  try {
    const data = addressSchema.parse(req.body);
    const user = await User.findById(req.user._id);
    if (!user) throw new AppError("User not found.", 404);
    if (data.isDefault || user.addresses.length === 0) {
      user.addresses.forEach((a) => {
        a.isDefault = false;
      });
      data.isDefault = true;
    }
    user.addresses.push(data);
    await user.save();
    res.status(201).json({
      success: true,
      message: "Delivery address saved.",
      addresses: user.addresses
    });
  } catch (err) {
    next(err);
  }
});
router.put(
  "/addresses/:addressId",
  requireAuth,
  async (req, res, next) => {
    try {
      const data = addressSchema.partial().parse(req.body);
      const user = await User.findById(req.user._id);
      if (!user) throw new AppError("User not found.", 404);
      const addr = user.addresses.find((a) => String(a._id) === req.params.addressId);
      if (!addr) throw new AppError("Address not found.", 404);
      if (data.isDefault) {
        user.addresses.forEach((a) => {
          a.isDefault = false;
        });
      }
      Object.assign(addr, data);
      await user.save();
      res.json({
        success: true,
        message: "Address updated.",
        addresses: user.addresses
      });
    } catch (err) {
      next(err);
    }
  }
);
router.delete(
  "/addresses/:addressId",
  requireAuth,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) throw new AppError("User not found.", 404);
      user.addresses = user.addresses.filter((a) => String(a._id) !== req.params.addressId);
      if (user.addresses.length > 0 && !user.addresses.some((a) => a.isDefault)) {
        user.addresses[0].isDefault = true;
      }
      await user.save();
      res.json({
        success: true,
        message: "Address removed.",
        addresses: user.addresses
      });
    } catch (err) {
      next(err);
    }
  }
);
router.put("/password", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: z.string().min(8, "New password must be at least 8 characters").max(128, "New password is too long").regex(/[A-Z]/, "New password must contain an uppercase letter").regex(/[0-9]/, "New password must contain a number")
    });
    const { currentPassword, newPassword } = schema.parse(req.body);
    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!user) throw new AppError("User not found.", 404);
    if (user.role === "admin" && (newPassword.length < 12 || !/[a-z]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword))) {
      throw new AppError(
        "Admin password must be at least 12 characters and include upper and lower case letters, a number and a symbol.",
        400
      );
    }
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new AppError("Current password is incorrect.", 400);
    }
    user.passwordHash = await bcrypt2.hash(newPassword, 12);
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();
    const token = signAuthToken(user);
    setAuthCookie(res, token);
    res.json({
      success: true,
      message: "Password updated and other active sessions have been signed out."
    });
  } catch (err) {
    next(err);
  }
});
router.post(
  "/invalidate-sessions",
  requireAuth,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) throw new AppError("User not found.", 404);
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();
      const token = signAuthToken(user);
      setAuthCookie(res, token);
      res.json({
        success: true,
        message: "All other active device sessions have been invalidated."
      });
    } catch (err) {
      next(err);
    }
  }
);
router.post(
  "/forgot-password",
  authRateLimiter,
  async (req, res, next) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      const user = await User.findOne({ email: email.toLowerCase() }).select(
        "+resetPasswordToken +resetPasswordExpires"
      );
      let demoResetToken;
      if (user && user.status === "active") {
        const rawToken = crypto2.randomBytes(24).toString("hex");
        user.resetPasswordToken = crypto2.createHash("sha256").update(rawToken).digest("hex");
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1e3);
        await user.save();
        demoResetToken = rawToken;
      }
      res.json({
        success: true,
        message: "If an account exists with this email, password recovery instructions have been generated.",
        // Returned in non-production environments when SMTP is not configured so the flow can be tested end-to-end
        ...process.env.NODE_ENV !== "production" && demoResetToken ? { resetToken: demoResetToken } : {}
      });
    } catch (err) {
      next(err);
    }
  }
);
router.post(
  "/reset-password",
  authRateLimiter,
  async (req, res, next) => {
    try {
      const schema = z.object({
        token: z.string().min(10, "Valid reset token is required"),
        newPassword: z.string().min(8, "Password must be at least 8 characters").regex(/[A-Z]/, "Password must contain an uppercase letter").regex(/[0-9]/, "Password must contain a number")
      });
      const { token, newPassword } = schema.parse(req.body);
      const hashedToken = crypto2.createHash("sha256").update(token).digest("hex");
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: /* @__PURE__ */ new Date() }
      }).select("+passwordHash +resetPasswordToken +resetPasswordExpires");
      if (!user) {
        throw new AppError("Password reset token is invalid or has expired.", 400);
      }
      user.passwordHash = await bcrypt2.hash(newPassword, 12);
      user.resetPasswordToken = void 0;
      user.resetPasswordExpires = void 0;
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();
      const authToken = signAuthToken(user);
      setAuthCookie(res, authToken);
      res.json({
        success: true,
        message: "Your password has been reset successfully.",
        user: formatUserResponse(user)
      });
    } catch (err) {
      next(err);
    }
  }
);
router.post(
  "/wishlist/:productId",
  requireAuth,
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user) throw new AppError("User not found.", 404);
      const prodId = req.params.productId;
      const idx = user.wishlist.findIndex((id) => String(id) === prodId);
      let action = "added";
      if (idx > -1) {
        user.wishlist.splice(idx, 1);
        action = "removed";
      } else {
        user.wishlist.push(prodId);
      }
      await user.save();
      const populated = await User.findById(user._id).populate(
        "wishlist",
        "name slug brand model price salePrice mainImage stock status specifications averageRating reviewCount"
      );
      res.json({
        success: true,
        action,
        message: action === "added" ? "Added to your wishlist." : "Removed from your wishlist.",
        wishlist: user.wishlist,
        wishlistItems: populated?.wishlist || []
      });
    } catch (err) {
      next(err);
    }
  }
);
router.get(
  "/eligible-reviews",
  requireAuth,
  async (req, res, next) => {
    try {
      const deliveredOrders = await Order.find({
        user: req.user._id,
        fulfillmentStatus: { $in: ["delivered", "confirmed", "shipped"] }
      }).sort({ createdAt: -1 });
      const productMap = /* @__PURE__ */ new Map();
      for (const order of deliveredOrders) {
        for (const item of order.items) {
          const pid = String(item.product);
          if (!productMap.has(pid)) {
            productMap.set(pid, {
              productId: pid,
              name: item.name,
              slug: item.slug,
              image: item.image,
              orderNumber: order.orderNumber
            });
          }
        }
      }
      res.json({
        success: true,
        eligibleProducts: Array.from(productMap.values())
      });
    } catch (err) {
      next(err);
    }
  }
);
var authRoutes_default = router;

// server/routes/productRoutes.ts
import { Router as Router2 } from "express";
import mongoose10 from "mongoose";
import { z as z2 } from "zod";

// server/models/Product.ts
import mongoose6, { Schema as Schema5 } from "mongoose";
var ProductImageSchema = new Schema5(
  {
    url: { type: String, required: true },
    alt: { type: String, default: "" },
    isMain: { type: Boolean, default: false }
  },
  { _id: false }
);
var ProductVariantSchema = new Schema5(
  {
    sku: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    dialColor: { type: String, default: "" },
    strapMaterial: { type: String, default: "" },
    price: { type: Number },
    salePrice: { type: Number, default: null },
    stock: { type: Number, required: true, min: 0, default: 0 },
    image: { type: String, default: "" }
  },
  { _id: true }
);
var WatchSpecificationsSchema = new Schema5(
  {
    movement: { type: String, default: "Automatic", index: true },
    caseMaterial: { type: String, default: "316L Stainless Steel" },
    caseDiameter: { type: String, default: "41 mm" },
    caseThickness: { type: String, default: "11 mm" },
    strapMaterial: { type: String, default: "Italian Leather", index: true },
    strapWidth: { type: String, default: "20 mm" },
    dialColor: { type: String, default: "Obsidian Black", index: true },
    crystal: { type: String, default: "Sapphire Crystal" },
    waterResistance: { type: String, default: "10 ATM (100m)" },
    warranty: { type: String, default: "2-Year Official Warranty" },
    origin: { type: String, default: "Swiss Made" }
  },
  { _id: false }
);
var ProductSchema = new Schema5(
  {
    name: { type: String, required: true, trim: true, maxlength: 180, index: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    brand: { type: String, required: true, trim: true, index: true },
    model: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    category: { type: Schema5.Types.ObjectId, ref: "Category", index: true },
    collections: [{ type: Schema5.Types.ObjectId, ref: "Collection", index: true }],
    gender: {
      type: String,
      enum: ["Men", "Women", "Unisex"],
      default: "Men",
      index: true
    },
    price: { type: Number, required: true, min: 0, index: true },
    salePrice: { type: Number, default: null, min: 0 },
    costPrice: { type: Number, default: 0, min: 0 },
    shortDescription: { type: String, default: "", trim: true },
    description: { type: String, required: true },
    mainImage: { type: String, required: true },
    images: { type: [ProductImageSchema], default: [] },
    specifications: { type: WatchSpecificationsSchema, default: () => ({}) },
    variants: { type: [ProductVariantSchema], default: [] },
    stock: { type: Number, required: true, min: 0, default: 0, index: true },
    reservedStock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5, min: 0 },
    soldCount: { type: Number, default: 0, min: 0, index: true },
    status: {
      type: String,
      enum: ["published", "draft", "archived"],
      default: "published",
      index: true
    },
    featured: { type: Boolean, default: false, index: true },
    bestSeller: { type: Boolean, default: false, index: true },
    newArrival: { type: Boolean, default: false, index: true },
    tags: [{ type: String, trim: true }],
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" }
  },
  { timestamps: true }
);
ProductSchema.index({
  name: "text",
  brand: "text",
  model: "text",
  sku: "text",
  description: "text",
  tags: "text"
});
var Product = mongoose6.model("Product", ProductSchema);

// server/models/Category.ts
import mongoose7, { Schema as Schema6 } from "mongoose";
var CategorySchema = new Schema6(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: "", trim: true },
    image: { type: String, default: "" },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);
var Category = mongoose7.model("Category", CategorySchema);

// server/models/Collection.ts
import mongoose8, { Schema as Schema7 } from "mongoose";
var CollectionSchema = new Schema7(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    subtitle: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    image: { type: String, required: true },
    bannerImage: { type: String, default: "" },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    featured: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);
var Collection = mongoose8.model("Collection", CollectionSchema);

// server/models/Review.ts
import mongoose9, { Schema as Schema8 } from "mongoose";
var ReviewSchema = new Schema8(
  {
    product: { type: Schema8.Types.ObjectId, ref: "Product", required: true, index: true },
    user: { type: Schema8.Types.ObjectId, ref: "User", required: true, index: true },
    userName: { type: String, required: true, trim: true },
    order: { type: Schema8.Types.ObjectId, ref: "Order" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    comment: { type: String, required: true, trim: true, maxlength: 2e3 },
    verifiedPurchase: { type: Boolean, default: false, index: true },
    status: {
      type: String,
      enum: ["approved", "pending", "rejected"],
      default: "approved",
      index: true
    }
  },
  { timestamps: true }
);
ReviewSchema.index({ product: 1, user: 1 }, { unique: true });
var Review = mongoose9.model("Review", ReviewSchema);

// server/routes/productRoutes.ts
var router2 = Router2();
router2.get("/", async (req, res, next) => {
  try {
    const {
      q,
      brand,
      category,
      collection,
      gender,
      movement,
      strapMaterial,
      dialColor,
      minPrice,
      maxPrice,
      inStock,
      onSale,
      featured,
      bestSeller,
      newArrival,
      sort = "featured",
      page = "1",
      limit = "12"
    } = req.query;
    const filter = { status: "published" };
    if (q && q.trim()) {
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escaped, "i");
      filter.$or = [
        { name: regex },
        { brand: regex },
        { model: regex },
        { sku: regex },
        { shortDescription: regex },
        { tags: regex }
      ];
    }
    if (brand && brand.trim()) {
      const brands = brand.split(",").map((b) => b.trim()).filter(Boolean);
      if (brands.length > 0) {
        filter.brand = { $in: brands };
      }
    }
    if (category && category.trim()) {
      if (mongoose10.Types.ObjectId.isValid(category)) {
        filter.category = new mongoose10.Types.ObjectId(category);
      } else {
        const catDoc = await Category.findOne({ slug: category.toLowerCase().trim() });
        if (catDoc) {
          filter.category = catDoc._id;
        } else {
          filter._id = null;
        }
      }
    }
    if (collection && collection.trim()) {
      if (mongoose10.Types.ObjectId.isValid(collection)) {
        filter.collections = new mongoose10.Types.ObjectId(collection);
      } else {
        const colDoc = await Collection.findOne({ slug: collection.toLowerCase().trim() });
        if (colDoc) {
          filter.collections = colDoc._id;
        } else {
          filter._id = null;
        }
      }
    }
    if (gender && gender.trim()) {
      const genders = gender.split(",").map((g) => g.trim()).filter(Boolean);
      if (genders.length > 0) {
        filter.gender = { $in: genders };
      }
    }
    if (movement && movement.trim()) {
      const movements = movement.split(",").map((m) => m.trim()).filter(Boolean);
      if (movements.length > 0) {
        filter["specifications.movement"] = { $in: movements };
      }
    }
    if (strapMaterial && strapMaterial.trim()) {
      const straps = strapMaterial.split(",").map((s) => s.trim()).filter(Boolean);
      if (straps.length > 0) {
        filter["specifications.strapMaterial"] = { $in: straps };
      }
    }
    if (dialColor && dialColor.trim()) {
      const dials = dialColor.split(",").map((d) => d.trim()).filter(Boolean);
      if (dials.length > 0) {
        filter["specifications.dialColor"] = { $in: dials };
      }
    }
    if (minPrice || maxPrice) {
      const min = minPrice ? Number(minPrice) : 0;
      const max = maxPrice ? Number(maxPrice) : Number.MAX_SAFE_INTEGER;
      filter.$expr = {
        $and: [
          { $gte: [{ $ifNull: ["$salePrice", "$price"] }, min] },
          { $lte: [{ $ifNull: ["$salePrice", "$price"] }, max] }
        ]
      };
    }
    if (inStock === "true") {
      filter.stock = { $gt: 0 };
    }
    if (onSale === "true") {
      filter.salePrice = { $ne: null, $gt: 0 };
    }
    if (featured === "true") {
      filter.featured = true;
    }
    if (bestSeller === "true") {
      filter.bestSeller = true;
    }
    if (newArrival === "true") {
      filter.newArrival = true;
    }
    let sortOption = { featured: -1, createdAt: -1 };
    switch (sort) {
      case "price_asc":
        sortOption = { price: 1 };
        break;
      case "price_desc":
        sortOption = { price: -1 };
        break;
      case "newest":
        sortOption = { createdAt: -1 };
        break;
      case "popularity":
        sortOption = { soldCount: -1, bestSeller: -1 };
        break;
      case "rating":
        sortOption = { averageRating: -1, reviewCount: -1 };
        break;
      case "featured":
      default:
        sortOption = { featured: -1, bestSeller: -1, createdAt: -1 };
        break;
    }
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(48, Math.max(1, parseInt(limit, 10) || 12));
    const skip = (pageNum - 1) * limitNum;
    const [products, totalCount, allPublished] = await Promise.all([
      Product.find(filter).populate("category", "name slug").populate("collections", "name slug").sort(sortOption).skip(skip).limit(limitNum),
      Product.countDocuments(filter),
      Product.find({ status: "published" }).select(
        "brand gender price salePrice specifications.movement specifications.strapMaterial specifications.dialColor"
      )
    ]);
    const brandsSet = /* @__PURE__ */ new Set();
    const movementsSet = /* @__PURE__ */ new Set();
    const strapsSet = /* @__PURE__ */ new Set();
    const dialsSet = /* @__PURE__ */ new Set();
    let minCatalogPrice = Infinity;
    let maxCatalogPrice = 0;
    for (const p of allPublished) {
      if (p.brand) brandsSet.add(p.brand);
      if (p.specifications?.movement) movementsSet.add(p.specifications.movement);
      if (p.specifications?.strapMaterial) strapsSet.add(p.specifications.strapMaterial);
      if (p.specifications?.dialColor) dialsSet.add(p.specifications.dialColor);
      const effective = p.salePrice && p.salePrice > 0 ? p.salePrice : p.price;
      if (effective < minCatalogPrice) minCatalogPrice = effective;
      if (effective > maxCatalogPrice) maxCatalogPrice = effective;
    }
    res.json({
      success: true,
      products,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum) || 1
      },
      facets: {
        brands: Array.from(brandsSet).sort(),
        movements: Array.from(movementsSet).sort(),
        strapMaterials: Array.from(strapsSet).sort(),
        dialColors: Array.from(dialsSet).sort(),
        genders: ["Men", "Women", "Unisex"],
        priceRange: {
          min: minCatalogPrice === Infinity ? 0 : minCatalogPrice,
          max: maxCatalogPrice
        }
      }
    });
  } catch (err) {
    next(err);
  }
});
router2.get("/:slug", async (req, res, next) => {
  try {
    const slug = String(req.params.slug);
    let product = await Product.findOne({ slug: slug.toLowerCase(), status: "published" }).populate("category", "name slug description").populate("collections", "name slug subtitle");
    if (!product && mongoose10.Types.ObjectId.isValid(slug)) {
      product = await Product.findOne({ _id: slug, status: "published" }).populate("category", "name slug description").populate("collections", "name slug subtitle");
    }
    if (!product) {
      throw new AppError("Timepiece not found.", 404);
    }
    const [reviews, relatedProducts] = await Promise.all([
      Review.find({ product: product._id, status: "approved" }).sort({ createdAt: -1 }).limit(30),
      Product.find({
        _id: { $ne: product._id },
        status: "published",
        $or: [
          { category: product.category },
          { brand: product.brand },
          { gender: product.gender }
        ]
      }).select("name slug brand model sku price salePrice mainImage images stock specifications featured bestSeller newArrival averageRating reviewCount").limit(4)
    ]);
    res.json({
      success: true,
      product,
      reviews,
      relatedProducts
    });
  } catch (err) {
    next(err);
  }
});
router2.post(
  "/:productId/reviews",
  requireAuth,
  async (req, res, next) => {
    try {
      const reviewSchema = z2.object({
        rating: z2.number().int().min(1, "Rating must be between 1 and 5").max(5),
        title: z2.string().min(3, "Review headline is required").max(120),
        comment: z2.string().min(10, "Please write at least 10 characters in your review").max(2e3)
      });
      const data = reviewSchema.parse(req.body);
      const product = await Product.findById(req.params.productId);
      if (!product) {
        throw new AppError("Product not found.", 404);
      }
      const matchingOrder = await Order.findOne({
        user: req.user._id,
        "items.product": product._id,
        fulfillmentStatus: { $nin: ["cancelled", "refunded"] }
      });
      const existingReview = await Review.findOne({
        product: product._id,
        user: req.user._id
      });
      let review;
      if (existingReview) {
        existingReview.rating = data.rating;
        existingReview.title = data.title;
        existingReview.comment = data.comment;
        existingReview.verifiedPurchase = Boolean(matchingOrder);
        review = await existingReview.save();
      } else {
        review = await Review.create({
          product: product._id,
          user: req.user._id,
          userName: req.user.name,
          order: matchingOrder?._id,
          rating: data.rating,
          title: data.title,
          comment: data.comment,
          verifiedPurchase: Boolean(matchingOrder),
          status: "approved"
        });
      }
      const allReviews = await Review.find({ product: product._id, status: "approved" });
      const reviewCount = allReviews.length;
      const averageRating = reviewCount > 0 ? Number(
        (allReviews.reduce((acc, r) => acc + r.rating, 0) / reviewCount).toFixed(1)
      ) : 0;
      product.reviewCount = reviewCount;
      product.averageRating = averageRating;
      await product.save();
      res.status(201).json({
        success: true,
        message: "Thank you for sharing your review.",
        review,
        averageRating,
        reviewCount
      });
    } catch (err) {
      next(err);
    }
  }
);
var productRoutes_default = router2;

// server/routes/contentRoutes.ts
import { Router as Router3 } from "express";
import { z as z3 } from "zod";

// server/models/HomepageContent.ts
import mongoose11, { Schema as Schema9 } from "mongoose";
var HeroSlideSchema = new Schema9(
  {
    badgeText: { type: String, default: "EXCLUSIVE HOROLOGY" },
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    desktopImage: { type: String, required: true },
    mobileImage: { type: String, required: true },
    primaryCtaText: { type: String, default: "Shop Collection" },
    primaryCtaLink: { type: String, default: "/shop" },
    secondaryCtaText: { type: String, default: "Discover the Collection" },
    secondaryCtaLink: { type: String, default: "/collections" },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { _id: true }
);
var HomepageContentSchema = new Schema9(
  {
    key: { type: String, default: "default", unique: true },
    announcementBar: {
      isEnabled: { type: Boolean, default: true },
      rotateIntervalMs: { type: Number, default: 4500 },
      messages: [
        {
          text: { type: String, required: true },
          link: { type: String, default: "/shop" },
          isActive: { type: Boolean, default: true }
        }
      ]
    },
    carouselSettings: {
      autoRotate: { type: Boolean, default: true },
      intervalMs: { type: Number, default: 6e3 }
    },
    heroSlides: { type: [HeroSlideSchema], default: [] },
    promoBanner: {
      badgeText: { type: String, default: "LIMITED COLLECTOR EDITION" },
      title: { type: String, default: "The Sovereign Chronograph Series" },
      subtitle: { type: String, default: "Crafted in Surgical-Grade Steel & Sapphire Crystal" },
      description: {
        type: String,
        default: "Experience precision automatic engineering with complimentary insured express delivery and a 2-year official BinFareedStore warranty."
      },
      image: {
        type: String,
        default: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1600&q=85"
      },
      ctaText: { type: String, default: "Explore Limited Edition" },
      ctaLink: { type: String, default: "/shop?featured=true" },
      couponHighlight: { type: String, default: "ROYAL10" },
      isActive: { type: Boolean, default: true }
    },
    brandStory: {
      eyebrow: { type: String, default: "THE BINFAREED ATELIER" },
      heading: { type: String, default: "A Legacy of Timeless Craftsmanship & Horological Excellence" },
      leadParagraph: {
        type: String,
        default: "Founded with an uncompromising passion for fine watchmaking, BinFareedStore curates authenticated luxury, mechanical, and contemporary timepieces for discerning collectors across Pakistan."
      },
      bodyParagraph: {
        type: String,
        default: "Every watch in our vault undergoes a rigorous multi-point horological inspection covering movement accuracy, water-resistance integrity, crystal clarity, and bracelet finish before being sealed in our signature presentation box."
      },
      image: {
        type: String,
        default: "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?auto=format&fit=crop&w=1200&q=85"
      },
      highlights: {
        type: [
          {
            label: { type: String, default: "" },
            value: { type: String, default: "" },
            description: { type: String, default: "" }
          }
        ],
        default: [
          {
            label: "100% Authenticated",
            value: "Certified Quality",
            description: "Every timepiece is inspected by master watch technicians prior to dispatch."
          },
          {
            label: "Official Warranty",
            value: "2-Year Coverage",
            description: "Comprehensive movement and craftsmanship protection with dedicated service support."
          },
          {
            label: "Insured Delivery",
            value: "Nationwide Express",
            description: "Tamper-evident luxury packaging delivered securely to every city in Pakistan."
          }
        ]
      },
      ctaText: { type: String, default: "Explore Our Catalog" },
      ctaLink: { type: String, default: "/shop" }
    },
    sectionVisibility: {
      heroCarousel: { type: Boolean, default: true },
      featuredCollections: { type: Boolean, default: true },
      bestSellers: { type: Boolean, default: true },
      promoBanner: { type: Boolean, default: true },
      newArrivals: { type: Boolean, default: true },
      brandStory: { type: Boolean, default: true },
      customerReviews: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: true }
    }
  },
  { timestamps: true }
);
var HomepageContent = mongoose11.model("HomepageContent", HomepageContentSchema);

// server/models/StoreSettings.ts
import mongoose12, { Schema as Schema10 } from "mongoose";
var StoreSettingsSchema = new Schema10(
  {
    key: { type: String, default: "default", unique: true },
    storeName: { type: String, default: "BinFareedStore" },
    tagline: { type: String, default: "Fine Horology & Luxury Timepieces" },
    logoUrl: { type: String, default: "" },
    faviconUrl: { type: String, default: "" },
    currency: { type: String, default: "PKR" },
    currencySymbol: { type: String, default: "Rs." },
    timezone: { type: String, default: "Asia/Karachi" },
    standardShippingFee: { type: Number, default: 350, min: 0 },
    expressShippingFee: { type: Number, default: 750, min: 0 },
    freeShippingThreshold: { type: Number, default: 25e3, min: 0 },
    taxPercentage: { type: Number, default: 0, min: 0, max: 50 },
    allowGuestCheckout: { type: Boolean, default: true },
    enableCod: { type: Boolean, default: true },
    enableOnlinePayment: { type: Boolean, default: false },
    shipFrom: {
      name: { type: String, default: "", trim: true, maxlength: 80 },
      address: { type: String, default: "", trim: true, maxlength: 200 },
      city: { type: String, default: "", trim: true, maxlength: 60 },
      phone: { type: String, default: "", trim: true, maxlength: 30 }
    },
    // JazzCash / EasyPaisa: customer pays manually and sends a screenshot on WhatsApp
    mobileWallets: {
      jazzcash: {
        enabled: { type: Boolean, default: true },
        accountTitle: { type: String, default: "BinFareed Store", trim: true, maxlength: 80 },
        accountNumber: { type: String, default: "0301 7713866", trim: true, maxlength: 40 }
      },
      easypaisa: {
        enabled: { type: Boolean, default: true },
        accountTitle: { type: String, default: "BinFareed Store", trim: true, maxlength: 80 },
        accountNumber: { type: String, default: "0301 7713866", trim: true, maxlength: 40 }
      },
      instructions: {
        type: String,
        default: "Send the exact amount, then share the payment screenshot with your order number on WhatsApp. We confirm your order once payment is verified.",
        maxlength: 500
      }
    },
    enableBankTransfer: { type: Boolean, default: true },
    bankDetails: {
      type: String,
      default: "Meezan Bank Limited \u2014 Account Title: BinFareed Horology Pvt Ltd \u2014 IBAN: PK36MEZN0001234567890102"
    },
    contactEmail: { type: String, default: "concierge@binfareedstore.pk" },
    contactPhone: { type: String, default: "+92 301 7713866" },
    whatsappNumber: { type: String, default: "+92 301 7713866" },
    whatsappOrderingEnabled: { type: Boolean, default: true },
    // Placeholders: {name} {orderNumber} {total} {items} {city} {courier} {tracking} {storeName} {paymentMethod}
    whatsappTemplates: {
      orderPlaced: {
        type: String,
        default: "\u0627\u0644\u0633\u0644\u0627\u0645 \u0639\u0644\u06CC\u06A9\u0645 {name}!\n{storeName} \u0633\u06D2 \u0622\u0631\u0688\u0631 \u06A9\u0631\u0646\u06D2 \u06A9\u0627 \u0628\u06C1\u062A \u0634\u06A9\u0631\u06CC\u06C1\u06D4\n\n\u0622\u0631\u0688\u0631 \u0646\u0645\u0628\u0631: *{orderNumber}*\n{items}\n\u06A9\u0644 \u0631\u0642\u0645: *{total}* ({paymentMethod})\n\n\u0622\u0631\u0688\u0631 \u06A9\u06CC \u062A\u0635\u062F\u06CC\u0642 \u06A9\u06D2 \u0644\u06CC\u06D2 \u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 *YES* \u0644\u06A9\u06BE \u06A9\u0631 \u062C\u0648\u0627\u0628 \u062F\u06CC\u06BA\u06D4"
      },
      confirmed: {
        type: String,
        default: "\u0645\u062D\u062A\u0631\u0645 {name}\u060C \u0622\u067E \u06A9\u0627 \u0622\u0631\u0688\u0631 *{orderNumber}* \u06A9\u0646\u0641\u0631\u0645 \u06C1\u0648 \u06AF\u06CC\u0627 \u06C1\u06D2 \u2705\n\u06C1\u0645 \u0622\u067E \u06A9\u06CC \u06AF\u06BE\u0691\u06CC {city} \u0631\u0648\u0627\u0646\u06AF\u06CC \u06A9\u06D2 \u0644\u06CC\u06D2 \u062A\u06CC\u0627\u0631 \u06A9\u0631 \u0631\u06C1\u06D2 \u06C1\u06CC\u06BA\u06D4\n\u06A9\u0644 \u0631\u0642\u0645: {total}"
      },
      shipped: {
        type: String,
        default: "\u062E\u0648\u0634\u062E\u0628\u0631\u06CC {name}! \u{1F69A}\n\u0622\u067E \u06A9\u0627 \u0622\u0631\u0688\u0631 *{orderNumber}* \u0631\u0648\u0627\u0646\u06C1 \u06A9\u0631 \u062F\u06CC\u0627 \u06AF\u06CC\u0627 \u06C1\u06D2\u06D4\n\u06A9\u0648\u0631\u0626\u06CC\u0631: {courier}\n\u0679\u0631\u06CC\u06A9\u0646\u06AF \u0646\u0645\u0628\u0631: *{tracking}*"
      },
      delivered: {
        type: String,
        default: "\u0645\u062D\u062A\u0631\u0645 {name}\u060C \u0622\u067E \u06A9\u0627 \u0622\u0631\u0688\u0631 *{orderNumber}* \u0622\u067E \u062A\u06A9 \u067E\u06C1\u0646\u0686 \u06AF\u06CC\u0627 \u06C1\u06D2 \u231A\n\u0627\u0645\u06CC\u062F \u06C1\u06D2 \u0622\u067E \u06A9\u0648 \u0627\u067E\u0646\u06CC \u0646\u0626\u06CC \u06AF\u06BE\u0691\u06CC \u067E\u0633\u0646\u062F \u0622\u0626\u06CC \u06C1\u0648\u06AF\u06CC\u06D4\n{storeName} \u06A9\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0631\u0646\u06D2 \u06A9\u0627 \u0634\u06A9\u0631\u06CC\u06C1!"
      },
      cancelled: {
        type: String,
        default: "\u0645\u062D\u062A\u0631\u0645 {name}\u060C \u0622\u067E \u06A9\u0627 \u0622\u0631\u0688\u0631 *{orderNumber}* \u0645\u0646\u0633\u0648\u062E \u06A9\u0631 \u062F\u06CC\u0627 \u06AF\u06CC\u0627 \u06C1\u06D2\u06D4\n\u0627\u06AF\u0631 \u06CC\u06C1 \u063A\u0644\u0637\u06CC \u0633\u06D2 \u06C1\u0648\u0627 \u06C1\u06D2 \u062A\u0648 \u0628\u0631\u0627\u06C1\u0650 \u06A9\u0631\u0645 \u0627\u0633\u06CC \u0645\u06CC\u0633\u062C \u06A9\u0627 \u062C\u0648\u0627\u0628 \u062F\u06CC\u06BA\u060C \u06C1\u0645 \u0622\u067E \u06A9\u06CC \u0645\u062F\u062F \u06A9\u0631\u06CC\u06BA \u06AF\u06D2\u06D4"
      },
      processing: {
        type: String,
        default: "\u0645\u062D\u062A\u0631\u0645 {name}\u060C \u0622\u067E \u06A9\u0627 \u0622\u0631\u0688\u0631 *{orderNumber}* \u062A\u06CC\u0627\u0631 \u06A9\u06CC\u0627 \u062C\u0627 \u0631\u06C1\u0627 \u06C1\u06D2 \u{1F4E6}\n\u06C1\u0645 \u0622\u067E \u06A9\u06CC \u06AF\u06BE\u0691\u06CC \u06A9\u0648 \u0627\u062D\u062A\u06CC\u0627\u0637 \u0633\u06D2 \u0686\u06CC\u06A9 \u0627\u0648\u0631 \u067E\u06CC\u06A9 \u06A9\u0631 \u0631\u06C1\u06D2 \u06C1\u06CC\u06BA\u06D4 \u0631\u0648\u0627\u0646\u06AF\u06CC \u067E\u0631 \u0622\u067E \u06A9\u0648 \u0679\u0631\u06CC\u06A9\u0646\u06AF \u0646\u0645\u0628\u0631 \u0628\u06BE\u06CC\u062C \u062F\u06CC\u0627 \u062C\u0627\u0626\u06D2 \u06AF\u0627\u06D4"
      },
      paymentReceived: {
        type: String,
        default: "\u0645\u062D\u062A\u0631\u0645 {name}\u060C \u0622\u067E \u06A9\u06CC \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC *{total}* \u0645\u0648\u0635\u0648\u0644 \u06C1\u0648 \u06AF\u0626\u06CC \u06C1\u06D2 \u2705\n\u0622\u0631\u0688\u0631 *{orderNumber}* \u06A9\u0646\u0641\u0631\u0645 \u06C1\u06D2 \u0627\u0648\u0631 \u062C\u0644\u062F \u0631\u0648\u0627\u0646\u06C1 \u06A9\u0631 \u062F\u06CC\u0627 \u062C\u0627\u0626\u06D2 \u06AF\u0627\u06D4 \u0634\u06A9\u0631\u06CC\u06C1!"
      },
      refunded: {
        type: String,
        default: "\u0645\u062D\u062A\u0631\u0645 {name}\u060C \u0622\u0631\u0688\u0631 *{orderNumber}* \u06A9\u06CC \u0631\u0642\u0645 *{total}* \u0648\u0627\u067E\u0633 \u06A9\u0631 \u062F\u06CC \u06AF\u0626\u06CC \u06C1\u06D2\u06D4\n\u06A9\u0633\u06CC \u0628\u06BE\u06CC \u0633\u0648\u0627\u0644 \u06A9\u06D2 \u0644\u06CC\u06D2 \u0627\u0633\u06CC \u0686\u06CC\u0679 \u0645\u06CC\u06BA \u0631\u0627\u0628\u0637\u06C1 \u06A9\u0631\u06CC\u06BA\u06D4 {storeName}"
      },
      paymentReminder: {
        type: String,
        default: "\u0645\u062D\u062A\u0631\u0645 {name}\u060C \u0622\u0631\u0688\u0631 *{orderNumber}* \u06A9\u06CC \u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC *{total}* \u0627\u0628\u06BE\u06CC \u0628\u0627\u0642\u06CC \u06C1\u06D2\u06D4\n\u0627\u062F\u0627\u0626\u06CC\u06AF\u06CC \u06A9\u06D2 \u0628\u0639\u062F \u0627\u0633 \u06A9\u0627 \u0627\u0633\u06A9\u0631\u06CC\u0646 \u0634\u0627\u0679 \u0627\u0633\u06CC \u0686\u06CC\u0679 \u0645\u06CC\u06BA \u0628\u06BE\u06CC\u062C \u062F\u06CC\u06BA\u06D4 \u0634\u06A9\u0631\u06CC\u06C1!"
      }
    },
    showroomAddress: {
      type: String,
      default: "Suite 402, MM Alam Road Luxury Galleria, Gulberg III, Lahore, Pakistan"
    },
    socialLinks: {
      instagram: { type: String, default: "https://instagram.com/binfareedstore" },
      facebook: { type: String, default: "https://facebook.com/binfareedstore" },
      youtube: { type: String, default: "https://youtube.com/@binfareedstore" },
      tiktok: { type: String, default: "https://tiktok.com/@binfareedstore" }
    },
    policies: {
      shippingPolicy: {
        type: String,
        default: "All orders are dispatched in tamper-evident luxury packaging via insured courier partners (TCS / Leopards Overland). Standard delivery takes 2\u20134 business days nationwide across Pakistan; Express Insured Delivery arrives within 24\u201348 hours in major cities. Complimentary shipping is automatically applied on orders above Rs. 25,000."
      },
      returnPolicy: {
        type: String,
        default: "We offer a 7-day inspection and exchange guarantee from the date of delivery. Timepieces must remain unworn, with all protective factory films intact, original presentation box, warranty card, and tags included."
      },
      privacyPolicy: {
        type: String,
        default: "BinFareedStore respects your privacy. Customer contact, delivery, and order records are encrypted and strictly used for order fulfillment, warranty registration, and requested concierge communications."
      },
      termsOfService: {
        type: String,
        default: "All watches sold by BinFareedStore are covered by our official 2-year mechanical and movement warranty. Prices are listed in Pakistani Rupees (PKR) and validated on the server at checkout."
      }
    }
  },
  { timestamps: true }
);
var StoreSettings = mongoose12.model("StoreSettings", StoreSettingsSchema);

// server/models/NewsletterSubscriber.ts
import mongoose13, { Schema as Schema11 } from "mongoose";
var NewsletterSubscriberSchema = new Schema11({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  isActive: { type: Boolean, default: true },
  subscribedAt: { type: Date, default: Date.now }
});
var NewsletterSubscriber = mongoose13.model(
  "NewsletterSubscriber",
  NewsletterSubscriberSchema
);

// server/routes/contentRoutes.ts
var router3 = Router3();
router3.get("/storefront", async (_req, res, next) => {
  try {
    let [homepage, settings] = await Promise.all([
      HomepageContent.findOne({ key: "default" }),
      StoreSettings.findOne({ key: "default" })
    ]);
    if (!homepage) {
      homepage = await HomepageContent.create({ key: "default" });
    }
    if (!settings) {
      settings = await StoreSettings.create({ key: "default" });
    }
    const [categories, collections, bestSellers, newArrivals, verifiedReviews] = await Promise.all([
      Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }),
      Collection.find({ isActive: true }).sort({ displayOrder: 1, name: 1 }),
      Product.find({ status: "published", bestSeller: true }).populate("category", "name slug").sort({ soldCount: -1, createdAt: -1 }).limit(8),
      Product.find({ status: "published", newArrival: true }).populate("category", "name slug").sort({ createdAt: -1 }).limit(8),
      Review.find({ status: "approved", verifiedPurchase: true }).populate("product", "name slug brand mainImage").sort({ rating: -1, createdAt: -1 }).limit(6)
    ]);
    res.json({
      success: true,
      homepage,
      settings,
      categories,
      collections,
      bestSellers,
      newArrivals,
      verifiedReviews
    });
  } catch (err) {
    next(err);
  }
});
router3.get("/homepage", async (_req, res, next) => {
  try {
    let homepage = await HomepageContent.findOne({ key: "default" });
    if (!homepage) homepage = await HomepageContent.create({ key: "default" });
    res.json({ success: true, homepage });
  } catch (err) {
    next(err);
  }
});
router3.get("/settings", async (_req, res, next) => {
  try {
    let settings = await StoreSettings.findOne({ key: "default" });
    if (!settings) settings = await StoreSettings.create({ key: "default" });
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
});
router3.get("/categories", async (_req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
});
router3.get("/collections", async (_req, res, next) => {
  try {
    const collections = await Collection.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
    res.json({ success: true, collections });
  } catch (err) {
    next(err);
  }
});
router3.get("/collections/:slug", async (req, res, next) => {
  try {
    const collection = await Collection.findOne({
      slug: String(req.params.slug).toLowerCase(),
      isActive: true
    });
    if (!collection) {
      throw new AppError("Collection not found.", 404);
    }
    const products = await Product.find({
      status: "published",
      collections: collection._id
    }).populate("category", "name slug").sort({ featured: -1, createdAt: -1 });
    res.json({
      success: true,
      collection,
      products
    });
  } catch (err) {
    next(err);
  }
});
router3.post("/newsletter", async (req, res, next) => {
  try {
    const { email } = z3.object({
      email: z3.string().email("Please enter a valid email address")
    }).parse(req.body);
    const normalized = email.toLowerCase().trim();
    const existing = await NewsletterSubscriber.findOne({ email: normalized });
    if (existing) {
      existing.isActive = true;
      await existing.save();
      res.json({
        success: true,
        message: "You are subscribed to the BinFareedStore Private Collector Journal."
      });
      return;
    }
    await NewsletterSubscriber.create({ email: normalized, isActive: true });
    res.status(201).json({
      success: true,
      message: "Welcome to the BinFareedStore Private Collector Journal."
    });
  } catch (err) {
    next(err);
  }
});
async function handleSitemap(_req, res, next) {
  try {
    const baseUrl = env.FRONTEND_URL.replace(/\/$/, "");
    const [products, collections] = await Promise.all([
      Product.find({ status: "published" }).select("slug updatedAt"),
      Collection.find({ isActive: true }).select("slug updatedAt")
    ]);
    const staticPages = ["", "/shop", "/collections", "/track-order", "/shipping-returns", "/privacy-policy", "/terms"];
    const urls = [];
    for (const page of staticPages) {
      urls.push(`
  <url>
    <loc>${baseUrl}${page}</loc>
    <changefreq>daily</changefreq>
    <priority>${page === "" ? "1.0" : "0.8"}</priority>
  </url>`);
    }
    for (const col of collections) {
      urls.push(`
  <url>
    <loc>${baseUrl}/collections/${col.slug}</loc>
    <lastmod>${col.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }
    for (const prod of products) {
      urls.push(`
  <url>
    <loc>${baseUrl}/product/${prod.slug}</loc>
    <lastmod>${prod.updatedAt.toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`);
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}
</urlset>`;
    res.header("Content-Type", "application/xml");
    res.send(xml);
  } catch (err) {
    next(err);
  }
}
function handleRobots(_req, res) {
  const baseUrl = env.FRONTEND_URL.replace(/\/$/, "");
  const txt = `User-agent: *
Allow: /
Allow: /shop
Allow: /collections
Allow: /product/
Disallow: /admin
Disallow: /admin/
Disallow: /account
Disallow: /account/
Disallow: /checkout
Disallow: /cart
Disallow: /api/

Sitemap: ${baseUrl}/sitemap.xml
`;
  res.header("Content-Type", "text/plain");
  res.send(txt);
}
var contentRoutes_default = router3;

// server/routes/cartOrderRoutes.ts
import { Router as Router4 } from "express";
import crypto3 from "crypto";
import mongoose17 from "mongoose";
import { z as z4 } from "zod";

// server/utils/push.ts
import webpush from "web-push";

// server/models/PushSubscription.ts
import mongoose14, { Schema as Schema12 } from "mongoose";
var PushSubscriptionSchema = new Schema12(
  {
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true }
    },
    topics: { type: [String], enum: ["new-arrivals", "admin-orders"], default: ["new-arrivals"], index: true },
    user: { type: Schema12.Types.ObjectId, ref: "User", default: null },
    userAgent: { type: String, default: "", maxlength: 300 }
  },
  { timestamps: true }
);
var PushSubscription = mongoose14.model("PushSubscription", PushSubscriptionSchema);

// server/utils/push.ts
var PUBLIC = process.env.VAPID_PUBLIC_KEY || "";
var PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
var SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
var pushEnabled = Boolean(PUBLIC && PRIVATE);
var vapidPublicKey = PUBLIC;
if (pushEnabled) {
  webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE);
}
async function sendToTopic(topic, payload) {
  if (!pushEnabled) return { sent: 0, removed: 0 };
  let sent = 0;
  let removed = 0;
  try {
    const subs = await PushSubscription.find({ topics: topic }).lean();
    const body = JSON.stringify({ icon: "/brand/icon-192.png", badge: "/brand/favicon-32.png", ...payload });
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, body, { TTL: 60 * 60 * 24 });
          sent++;
        } catch (err) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            await PushSubscription.deleteOne({ _id: s._id });
            removed++;
          } else {
            console.warn("[push] send failed", err?.statusCode || err?.message);
          }
        }
      })
    );
  } catch (err) {
    console.warn("[push] topic send failed", err?.message);
  }
  return { sent, removed };
}

// server/models/Cart.ts
import mongoose15, { Schema as Schema13 } from "mongoose";
var CartItemSchema = new Schema13(
  {
    product: { type: Schema13.Types.ObjectId, ref: "Product", required: true },
    variantSku: { type: String },
    quantity: { type: Number, required: true, min: 1, max: 20 }
  },
  { _id: false }
);
var CartSchema = new Schema13(
  {
    user: { type: Schema13.Types.ObjectId, ref: "User", sparse: true, index: true },
    sessionId: { type: String, sparse: true, index: true },
    items: { type: [CartItemSchema], default: [] },
    couponCode: { type: String, uppercase: true, trim: true }
  },
  { timestamps: true }
);
var Cart = mongoose15.model("Cart", CartSchema);

// server/models/StockMovement.ts
import mongoose16, { Schema as Schema14 } from "mongoose";
var StockMovementSchema = new Schema14(
  {
    product: { type: Schema14.Types.ObjectId, ref: "Product", required: true, index: true },
    sku: { type: String, required: true, index: true },
    variantSku: { type: String },
    type: {
      type: String,
      enum: ["addition", "reduction", "order_placed", "order_cancelled", "manual_adjustment", "initial_seed"],
      required: true,
      index: true
    },
    quantityChange: { type: Number, required: true },
    previousStock: { type: Number, required: true, min: 0 },
    newStock: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true },
    orderId: { type: Schema14.Types.ObjectId, ref: "Order" },
    orderNumber: { type: String },
    performedBy: { type: Schema14.Types.ObjectId, ref: "User" },
    performedByName: { type: String, default: "System" }
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
var StockMovement = mongoose16.model("StockMovement", StockMovementSchema);

// server/routes/cartOrderRoutes.ts
var router4 = Router4();
var cartItemInputSchema = z4.object({
  productId: z4.string().min(1),
  variantSku: z4.string().optional(),
  quantity: z4.number().int().min(1).max(20)
});
var validateCartSchema = z4.object({
  items: z4.array(cartItemInputSchema),
  couponCode: z4.string().optional(),
  shippingMethod: z4.enum(["standard", "express"]).optional().default("standard"),
  email: z4.string().email().optional()
});
var createOrderSchema = z4.object({
  idempotencyKey: z4.string().min(6).max(120).optional(),
  items: z4.array(cartItemInputSchema).min(1, "Your shopping bag cannot be empty"),
  shippingAddress: z4.object({
    fullName: z4.string().min(2, "Full name is required"),
    email: z4.string().email("Valid email address is required"),
    phone: z4.string().transform((v) => v.replace(/[\s()-]/g, "")).refine(
      (v) => /^(\+92|0092|92|0)?3\d{9}$/.test(v),
      "Please enter a valid Pakistani mobile number (e.g., 0300 1234567 or +92 300 1234567)"
    ),
    streetAddress: z4.string().min(5, "Complete street delivery address is required"),
    city: z4.string().min(2, "City is required"),
    province: z4.string().min(2, "Province / Region is required"),
    postalCode: z4.string().min(4, "Postal code is required"),
    country: z4.string().default("Pakistan"),
    notes: z4.string().max(500).optional().default("")
  }),
  shippingMethod: z4.enum(["standard", "express"]).default("standard"),
  // 'online' = JazzCash / EasyPaisa transfer; customer sends the screenshot on WhatsApp
  paymentMethod: z4.enum(["cod", "bank_transfer", "online", "jazzcash", "easypaisa"]).default("cod"),
  couponCode: z4.string().optional(),
  orderSource: z4.enum(["website", "whatsapp"]).default("website")
});
router4.post(
  "/cart/validate",
  optionalAuth,
  async (req, res, next) => {
    try {
      const data = validateCartSchema.parse(req.body);
      let settings = await StoreSettings.findOne({ key: "default" });
      if (!settings) {
        settings = await StoreSettings.create({ key: "default" });
      }
      const validatedItems = [];
      let subtotal = 0;
      for (const reqItem of data.items) {
        if (!mongoose17.Types.ObjectId.isValid(reqItem.productId)) continue;
        const product = await Product.findOne({
          _id: reqItem.productId,
          status: "published"
        });
        if (!product) continue;
        let unitRegular = product.price;
        let unitSale = product.salePrice;
        let availableStock = product.stock;
        let image = product.mainImage;
        let sku = product.sku;
        let variantName;
        if (reqItem.variantSku && product.variants && product.variants.length > 0) {
          const v = product.variants.find((vr) => vr.sku === reqItem.variantSku);
          if (v) {
            if (v.price !== void 0 && v.price > 0) unitRegular = v.price;
            if (v.salePrice !== void 0) unitSale = v.salePrice;
            availableStock = v.stock;
            if (v.image) image = v.image;
            sku = v.sku;
            variantName = v.name;
          }
        }
        const effectivePrice = unitSale && unitSale > 0 && unitSale < unitRegular ? unitSale : unitRegular;
        const cappedQty = Math.min(reqItem.quantity, Math.max(0, availableStock));
        const lineSubtotal = effectivePrice * cappedQty;
        subtotal += lineSubtotal;
        validatedItems.push({
          productId: String(product._id),
          name: product.name,
          slug: product.slug,
          brand: product.brand,
          sku,
          variantSku: reqItem.variantSku,
          variantName,
          image,
          price: unitRegular,
          salePrice: unitSale,
          effectivePrice,
          requestedQuantity: reqItem.quantity,
          quantity: cappedQty,
          availableStock,
          subtotal: lineSubtotal,
          categoryId: product.category ? String(product.category) : void 0,
          stockWarning: availableStock === 0 ? "Currently out of stock" : reqItem.quantity > availableStock ? `Only ${availableStock} unit(s) available in stock` : void 0
        });
      }
      let discountAmount = 0;
      let couponMessage = "";
      let couponValid = false;
      if (data.couponCode && data.couponCode.trim() && subtotal > 0) {
        const couponEval = await evaluateCoupon({
          code: data.couponCode,
          subtotal,
          userId: req.user ? String(req.user._id) : void 0,
          userEmail: req.user?.email || data.email,
          items: validatedItems.map((i) => ({
            productId: i.productId,
            categoryId: i.categoryId,
            lineTotal: i.subtotal
          }))
        });
        couponValid = couponEval.valid;
        discountAmount = couponEval.discountAmount;
        couponMessage = couponEval.message;
      }
      const discountedSubtotal = Math.max(0, subtotal - discountAmount);
      let shippingCost = 0;
      if (subtotal > 0) {
        if (data.shippingMethod === "express") {
          shippingCost = settings.expressShippingFee;
        } else {
          shippingCost = discountedSubtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee;
        }
      }
      const taxAmount = settings.taxPercentage > 0 ? Math.round(discountedSubtotal * settings.taxPercentage / 100) : 0;
      const totalAmount = discountedSubtotal + shippingCost + taxAmount;
      if (req.user) {
        await Cart.findOneAndUpdate(
          { user: req.user._id },
          {
            user: req.user._id,
            items: validatedItems.filter((i) => i.quantity > 0).map((i) => ({
              product: new mongoose17.Types.ObjectId(i.productId),
              variantSku: i.variantSku,
              quantity: i.quantity
            })),
            couponCode: couponValid ? data.couponCode?.toUpperCase() : void 0
          },
          { upsert: true, new: true }
        );
      }
      res.json({
        success: true,
        items: validatedItems,
        summary: {
          subtotal,
          discountAmount,
          couponCode: couponValid ? data.couponCode?.trim().toUpperCase() : null,
          couponValid,
          couponMessage,
          shippingCost,
          freeShippingThreshold: settings.freeShippingThreshold,
          taxAmount,
          totalAmount,
          currency: settings.currency,
          currencySymbol: settings.currencySymbol
        }
      });
    } catch (err) {
      next(err);
    }
  }
);
router4.post(
  "/coupons/validate",
  optionalAuth,
  async (req, res, next) => {
    try {
      const schema = z4.object({
        code: z4.string().min(1, "Coupon code is required"),
        subtotal: z4.number().min(0),
        email: z4.string().email().optional()
      });
      const { code, subtotal, email } = schema.parse(req.body);
      const result = await evaluateCoupon({
        code,
        subtotal,
        userId: req.user ? String(req.user._id) : void 0,
        userEmail: req.user?.email || email
      });
      if (!result.valid) {
        res.status(400).json({
          success: false,
          valid: false,
          message: result.message,
          discountAmount: 0
        });
        return;
      }
      res.json({
        success: true,
        valid: true,
        code: result.coupon?.code,
        discountType: result.coupon?.discountType,
        discountValue: result.coupon?.discountValue,
        discountAmount: result.discountAmount,
        message: result.message
      });
    } catch (err) {
      next(err);
    }
  }
);
router4.post(
  "/orders",
  optionalAuth,
  async (req, res, next) => {
    const deductedRecords = [];
    try {
      const data = createOrderSchema.parse(req.body);
      if (data.idempotencyKey) {
        const existingOrder = await Order.findOne({ idempotencyKey: data.idempotencyKey });
        if (existingOrder) {
          res.status(200).json({
            success: true,
            duplicatePrevented: true,
            message: "Order already processed.",
            order: existingOrder
          });
          return;
        }
      }
      let settings = await StoreSettings.findOne({ key: "default" });
      if (!settings) {
        settings = await StoreSettings.create({ key: "default" });
      }
      if (!req.user && !settings.allowGuestCheckout) {
        throw new AppError("Please sign in to your account to complete checkout.", 401);
      }
      if (data.paymentMethod === "cod" && !settings.enableCod) {
        throw new AppError("Cash on Delivery is currently disabled.", 400);
      }
      if (data.paymentMethod === "bank_transfer" && !settings.enableBankTransfer) {
        throw new AppError("Bank transfer is currently disabled.", 400);
      }
      if (data.paymentMethod === "online" && !settings.mobileWallets?.jazzcash?.enabled && !settings.mobileWallets?.easypaisa?.enabled) {
        throw new AppError("Online payment is currently unavailable.", 400);
      }
      if ((data.paymentMethod === "jazzcash" || data.paymentMethod === "easypaisa") && !settings.mobileWallets?.[data.paymentMethod]?.enabled) {
        throw new AppError(`${data.paymentMethod === "jazzcash" ? "JazzCash" : "EasyPaisa"} is currently unavailable.`, 400);
      }
      const orderItems = [];
      let subtotal = 0;
      for (const item of data.items) {
        if (!mongoose17.Types.ObjectId.isValid(item.productId)) {
          throw new AppError("Invalid product identifier in cart.", 400);
        }
        let updatedProduct = null;
        let previousStock = 0;
        let newStock = 0;
        if (item.variantSku) {
          const beforeDoc = await Product.findOne({
            _id: item.productId,
            status: "published",
            "variants.sku": item.variantSku
          });
          if (!beforeDoc) {
            throw new AppError(`Timepiece variant ${item.variantSku} is no longer available.`, 400);
          }
          const targetVar = beforeDoc.variants.find((v) => v.sku === item.variantSku);
          if (!targetVar || targetVar.stock < item.quantity) {
            throw new AppError(
              `Insufficient stock for ${beforeDoc.name} (${targetVar?.name || item.variantSku}). Available: ${targetVar?.stock || 0}.`,
              400
            );
          }
          previousStock = targetVar.stock;
          updatedProduct = await Product.findOneAndUpdate(
            {
              _id: item.productId,
              status: "published",
              stock: { $gte: item.quantity },
              variants: { $elemMatch: { sku: item.variantSku, stock: { $gte: item.quantity } } }
            },
            {
              $inc: {
                stock: -item.quantity,
                soldCount: item.quantity,
                "variants.$.stock": -item.quantity
              }
            },
            { new: true }
          );
          if (!updatedProduct) {
            throw new AppError(
              `Insufficient stock for ${beforeDoc.name}. Another customer may have just purchased the remaining piece.`,
              409
            );
          }
          const afterVar = updatedProduct.variants.find((v) => v.sku === item.variantSku);
          newStock = afterVar ? afterVar.stock : previousStock - item.quantity;
        } else {
          const beforeDoc = await Product.findOne({
            _id: item.productId,
            status: "published"
          });
          if (!beforeDoc) {
            throw new AppError("One or more selected timepieces are no longer available.", 400);
          }
          if (beforeDoc.stock < item.quantity) {
            throw new AppError(
              `Insufficient stock for ${beforeDoc.name}. Only ${beforeDoc.stock} unit(s) available.`,
              400
            );
          }
          previousStock = beforeDoc.stock;
          updatedProduct = await Product.findOneAndUpdate(
            {
              _id: item.productId,
              status: "published",
              stock: { $gte: item.quantity }
            },
            {
              $inc: {
                stock: -item.quantity,
                soldCount: item.quantity
              }
            },
            { new: true }
          );
          if (!updatedProduct) {
            throw new AppError(
              `Insufficient stock for ${beforeDoc.name}. Another customer just purchased the last available unit.`,
              409
            );
          }
          newStock = updatedProduct.stock;
        }
        deductedRecords.push({
          productId: updatedProduct._id,
          variantSku: item.variantSku,
          quantity: item.quantity
        });
        let unitRegular = updatedProduct.price;
        let unitSale = updatedProduct.salePrice;
        let image = updatedProduct.mainImage;
        let sku = updatedProduct.sku;
        let variantName;
        if (item.variantSku) {
          const v = updatedProduct.variants.find((vr) => vr.sku === item.variantSku);
          if (v) {
            if (v.price !== void 0 && v.price > 0) unitRegular = v.price;
            if (v.salePrice !== void 0) unitSale = v.salePrice;
            if (v.image) image = v.image;
            sku = v.sku;
            variantName = v.name;
          }
        }
        const unitPrice = unitSale && unitSale > 0 && unitSale < unitRegular ? unitSale : unitRegular;
        const lineSubtotal = unitPrice * item.quantity;
        subtotal += lineSubtotal;
        orderItems.push({
          product: updatedProduct._id,
          name: updatedProduct.name,
          slug: updatedProduct.slug,
          brand: updatedProduct.brand,
          sku,
          variantSku: item.variantSku,
          variantName,
          image,
          unitPrice,
          quantity: item.quantity,
          subtotal: lineSubtotal,
          categoryId: updatedProduct.category ? String(updatedProduct.category) : void 0,
          previousStock,
          newStock
        });
      }
      let discountAmount = 0;
      let appliedCouponCode;
      if (data.couponCode && data.couponCode.trim()) {
        const couponResult = await evaluateCoupon({
          code: data.couponCode,
          subtotal,
          userId: req.user ? String(req.user._id) : void 0,
          userEmail: data.shippingAddress.email,
          items: orderItems.map((i) => ({
            productId: String(i.product),
            categoryId: i.categoryId,
            lineTotal: i.subtotal
          }))
        });
        if (!couponResult.valid) {
          throw new AppError(couponResult.message, 400);
        }
        discountAmount = couponResult.discountAmount;
        appliedCouponCode = couponResult.coupon?.code;
        if (couponResult.coupon) {
          couponResult.coupon.usedCount += 1;
          couponResult.coupon.usedByUsers.push({
            userId: req.user?._id,
            email: data.shippingAddress.email.toLowerCase(),
            usedAt: /* @__PURE__ */ new Date()
          });
          await couponResult.coupon.save();
        }
      }
      const discountedSubtotal = Math.max(0, subtotal - discountAmount);
      const shippingCost = data.shippingMethod === "express" ? settings.expressShippingFee : discountedSubtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingFee;
      const taxAmount = settings.taxPercentage > 0 ? Math.round(discountedSubtotal * settings.taxPercentage / 100) : 0;
      const totalAmount = discountedSubtotal + shippingCost + taxAmount;
      const orderNumber = generateOrderNumber();
      const order = await Order.create({
        orderNumber,
        requestNumber: orderNumber,
        idempotencyKey: data.idempotencyKey || void 0,
        user: req.user ? req.user._id : null,
        isGuest: !req.user,
        items: orderItems.map((i) => ({
          product: i.product,
          name: i.name,
          slug: i.slug,
          brand: i.brand,
          sku: i.sku,
          variantSku: i.variantSku,
          variantName: i.variantName,
          image: i.image,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          subtotal: i.subtotal
        })),
        shippingAddress: data.shippingAddress,
        shippingMethod: data.shippingMethod,
        subtotal,
        discountAmount,
        couponCode: appliedCouponCode,
        shippingCost,
        taxAmount,
        totalAmount,
        currency: settings.currency,
        paymentMethod: data.paymentMethod,
        paymentStatus: "pending",
        fulfillmentStatus: "pending",
        inventoryRestored: false,
        orderSource: data.orderSource,
        statusHistory: [
          {
            status: "pending",
            paymentStatus: "pending",
            note: `Order placed via ${data.paymentMethod === "cod" ? "Cash on Delivery" : data.paymentMethod === "online" ? "Online Payment \u2014 JazzCash / EasyPaisa (awaiting payment screenshot)" : data.paymentMethod === "jazzcash" ? "JazzCash (awaiting payment screenshot)" : data.paymentMethod === "easypaisa" ? "EasyPaisa (awaiting payment screenshot)" : "Direct Bank Transfer"}${data.orderSource === "whatsapp" ? " Customer chose to confirm via WhatsApp." : ""}`,
            updatedBy: data.shippingAddress.fullName,
            timestamp: /* @__PURE__ */ new Date()
          }
        ]
      });
      await Promise.all(
        orderItems.map(
          (i) => StockMovement.create({
            product: i.product,
            sku: i.sku,
            variantSku: i.variantSku,
            type: "order_placed",
            quantityChange: -i.quantity,
            previousStock: i.previousStock,
            newStock: i.newStock,
            reason: `Order ${order.orderNumber} placed by ${data.shippingAddress.fullName}`,
            orderId: order._id,
            orderNumber: order.orderNumber,
            performedBy: req.user?._id,
            performedByName: data.shippingAddress.fullName
          })
        )
      );
      void sendToTopic("admin-orders", {
        title: `New order ${order.orderNumber}`,
        body: `${data.shippingAddress.fullName} \u2022 ${data.shippingAddress.city} \u2022 Rs. ${Math.round(totalAmount).toLocaleString("en-PK")}`,
        url: "/admin",
        tag: "bfs-new-order"
      });
      if (req.user) {
        await Cart.findOneAndDelete({ user: req.user._id });
      }
      let paymentCheckoutSignature;
      res.status(201).json({
        success: true,
        message: `Order received. Reference ${order.orderNumber} \u2014 we will confirm it shortly.`,
        order,
        paymentCheckoutSignature
      });
    } catch (err) {
      if (deductedRecords.length > 0) {
        for (const rec of deductedRecords) {
          try {
            if (rec.variantSku) {
              await Product.findOneAndUpdate(
                { _id: rec.productId, "variants.sku": rec.variantSku },
                {
                  $inc: {
                    stock: rec.quantity,
                    soldCount: -rec.quantity,
                    "variants.$.stock": rec.quantity
                  }
                }
              );
            } else {
              await Product.findByIdAndUpdate(rec.productId, {
                $inc: { stock: rec.quantity, soldCount: -rec.quantity }
              });
            }
          } catch (rollbackErr) {
            console.error("[Stock Rollback Error]:", rollbackErr);
          }
        }
      }
      next(err);
    }
  }
);
router4.get("/orders/my-orders", requireAuth, async (req, res, next) => {
  try {
    const orders = await Order.find({
      $or: [{ user: req.user._id }, { "shippingAddress.email": req.user.email.toLowerCase() }]
    }).sort({ createdAt: -1 });
    res.json({
      success: true,
      orders
    });
  } catch (err) {
    next(err);
  }
});
router4.get(
  "/orders/track/:orderNumber",
  optionalAuth,
  async (req, res, next) => {
    try {
      const orderNumber = String(req.params.orderNumber).toUpperCase().trim();
      const order = await Order.findOne({ $or: [{ orderNumber }, { requestNumber: orderNumber }] }).select(
        "-whatsappLog"
      );
      if (!order) {
        throw new AppError(`No order found with reference number ${orderNumber}.`, 404);
      }
      res.json({
        success: true,
        order
      });
    } catch (err) {
      next(err);
    }
  }
);
router4.post(
  "/orders/webhooks/payment",
  async (req, res, next) => {
    try {
      const schema = z4.object({
        orderNumber: z4.string(),
        amount: z4.number(),
        paymentReference: z4.string(),
        signature: z4.string()
      });
      const { orderNumber, amount, paymentReference, signature } = schema.parse(req.body);
      const ref = orderNumber.toUpperCase();
      const order = await Order.findOne({ $or: [{ orderNumber: ref }, { requestNumber: ref }] });
      if (!order) {
        throw new AppError("Order not found.", 404);
      }
      const expectedSignature = crypto3.createHmac("sha256", env.PAYMENT_WEBHOOK_SECRET).update(`${order.requestNumber || order.orderNumber}:${order.totalAmount}`).digest("hex");
      if (signature !== expectedSignature || amount !== order.totalAmount) {
        throw new AppError("Webhook signature verification failed.", 401);
      }
      if (order.paymentStatus !== "paid") {
        order.paymentStatus = "paid";
        order.paymentReference = paymentReference;
        order.paidAt = /* @__PURE__ */ new Date();
        if (order.fulfillmentStatus === "pending") {
          order.fulfillmentStatus = "confirmed";
        }
        order.statusHistory.push({
          status: order.fulfillmentStatus,
          paymentStatus: "paid",
          note: `Online payment verified (Ref: ${paymentReference}).`,
          updatedBy: "Payment Gateway Webhook",
          timestamp: /* @__PURE__ */ new Date()
        });
        await order.save();
      }
      res.json({
        success: true,
        message: "Payment verified and recorded.",
        order
      });
    } catch (err) {
      next(err);
    }
  }
);
var cartOrderRoutes_default = router4;

// server/routes/adminRoutes.ts
import { Router as Router5 } from "express";
import path2 from "path";
import fs from "fs";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { z as z5 } from "zod";

// server/models/Counter.ts
import mongoose18, { Schema as Schema15 } from "mongoose";
var CounterSchema = new Schema15({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 }
});
var Counter = mongoose18.model("Counter", CounterSchema);
async function nextSequence(name) {
  const doc = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

// server/routes/adminRoutes.ts
var router5 = Router5();
router5.use(requireAuth, requireAdmin);
var uploadsDir = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME ? path2.join("/tmp", "uploads") : path2.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch {
  }
}
var storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path2.extname(file.originalname).toLowerCase();
    const safeName = `bfs-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, safeName);
  }
});
var upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  // 5MB max
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError("Only JPG, PNG, WebP, and AVIF images under 5MB are allowed.", 400));
    }
  }
});
router5.get("/overview", async (_req, res, next) => {
  try {
    const [
      allOrders,
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      recentOrders,
      bestSellingProducts,
      totalCustomers
    ] = await Promise.all([
      Order.find().select(
        "orderNumber totalAmount paymentStatus fulfillmentStatus createdAt items shippingAddress orderSource"
      ),
      Product.countDocuments({ status: { $ne: "archived" } }),
      Product.find({
        status: "published",
        $expr: {
          $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$lowStockThreshold"] }]
        }
      }).select("name slug sku brand mainImage stock lowStockThreshold price").sort({ stock: 1 }).limit(12),
      Product.find({ status: "published", stock: 0 }).select("name slug sku brand mainImage stock lowStockThreshold price").limit(12),
      Order.find().sort({ createdAt: -1 }).limit(8),
      Product.find({ status: "published" }).sort({ soldCount: -1, bestSeller: -1 }).select("name slug sku brand mainImage price salePrice stock soldCount").limit(6),
      User.countDocuments({ role: "customer" })
    ]);
    const pushSubscribers = await PushSubscription.countDocuments({ topics: "new-arrivals" });
    const startOfToday = /* @__PURE__ */ new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), 1);
    let todayOrders = 0;
    let todaySales = 0;
    let monthSales = 0;
    let monthOrders = 0;
    let unitsSold = 0;
    let whatsappOrders = 0;
    const statusCounts = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      refunded: 0
    };
    let paidRevenue = 0;
    let pendingRevenue = 0;
    let cancelledValue = 0;
    let pendingOrdersCount = 0;
    let completedOrdersCount = 0;
    let cancelledOrdersCount = 0;
    const dailyMap = /* @__PURE__ */ new Map();
    for (let i = 13; i >= 0; i--) {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap.set(key, { date: key, paidRevenue: 0, pendingRevenue: 0, orders: 0 });
    }
    for (const o of allOrders) {
      const isCancelledOrRefunded = o.fulfillmentStatus === "cancelled" || o.fulfillmentStatus === "refunded" || o.paymentStatus === "refunded";
      if (isCancelledOrRefunded) {
        cancelledValue += o.totalAmount;
        cancelledOrdersCount += 1;
      } else if (o.paymentStatus === "paid" || o.fulfillmentStatus === "delivered") {
        paidRevenue += o.totalAmount;
      } else {
        pendingRevenue += o.totalAmount;
      }
      if (["pending", "confirmed", "processing", "shipped"].includes(o.fulfillmentStatus)) {
        pendingOrdersCount += 1;
      }
      if (o.fulfillmentStatus === "delivered") {
        completedOrdersCount += 1;
      }
      statusCounts[o.fulfillmentStatus] = (statusCounts[o.fulfillmentStatus] || 0) + 1;
      if (o.orderSource === "whatsapp") whatsappOrders += 1;
      if (!isCancelledOrRefunded) {
        unitsSold += o.items.reduce((n, i) => n + i.quantity, 0);
        if (o.createdAt >= startOfToday) {
          todayOrders += 1;
          todaySales += o.totalAmount;
        }
        if (o.createdAt >= startOfMonth) {
          monthOrders += 1;
          monthSales += o.totalAmount;
        }
      }
      const dayKey = o.createdAt.toISOString().slice(0, 10);
      const dayEntry = dailyMap.get(dayKey);
      if (dayEntry && !isCancelledOrRefunded) {
        dayEntry.orders += 1;
        if (o.paymentStatus === "paid" || o.fulfillmentStatus === "delivered") {
          dayEntry.paidRevenue += o.totalAmount;
        } else {
          dayEntry.pendingRevenue += o.totalAmount;
        }
      }
    }
    res.json({
      success: true,
      metrics: {
        paidRevenue,
        pendingRevenue,
        cancelledValue,
        totalOrders: allOrders.length,
        pendingOrders: pendingOrdersCount,
        completedOrders: completedOrdersCount,
        cancelledOrders: cancelledOrdersCount,
        totalProducts,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        totalCustomers,
        todayOrders,
        todaySales,
        monthOrders,
        monthSales,
        unitsSold,
        whatsappOrders,
        pushSubscribers,
        averageOrderValue: allOrders.length - cancelledOrdersCount > 0 ? Math.round((paidRevenue + pendingRevenue) / (allOrders.length - cancelledOrdersCount)) : 0
      },
      statusCounts,
      salesTrend: Array.from(dailyMap.values()),
      recentOrders,
      bestSellingProducts,
      inventoryAlerts: {
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts
      }
    });
  } catch (err) {
    next(err);
  }
});
var productPayloadSchema = z5.object({
  name: z5.string().min(2, "Product name is required").max(180),
  slug: z5.string().optional(),
  brand: z5.string().min(1, "Brand is required"),
  model: z5.string().min(1, "Model reference is required"),
  sku: z5.string().optional(),
  category: z5.string().optional().nullable(),
  collections: z5.array(z5.string()).optional().default([]),
  gender: z5.enum(["Men", "Women", "Unisex"]).default("Men"),
  price: z5.number().min(1, "Price must be greater than 0"),
  salePrice: z5.number().nullable().optional().default(null),
  costPrice: z5.number().min(0).optional().default(0),
  shortDescription: z5.string().optional().default(""),
  description: z5.string().min(10, "Detailed product description is required"),
  mainImage: z5.string().min(1, "Main product image is required"),
  images: z5.array(
    z5.object({
      url: z5.string().min(1),
      alt: z5.string().optional().default(""),
      isMain: z5.boolean().optional().default(false)
    })
  ).optional().default([]),
  specifications: z5.object({
    movement: z5.string().default("Automatic"),
    caseMaterial: z5.string().default("316L Stainless Steel"),
    caseDiameter: z5.string().default("41 mm"),
    caseThickness: z5.string().default("11 mm"),
    strapMaterial: z5.string().default("Italian Leather"),
    strapWidth: z5.string().default("20 mm"),
    dialColor: z5.string().default("Obsidian Black"),
    crystal: z5.string().default("Sapphire Crystal"),
    waterResistance: z5.string().default("10 ATM (100m)"),
    warranty: z5.string().default("2-Year Official Warranty"),
    origin: z5.string().default("Swiss Made")
  }).optional(),
  variants: z5.array(
    z5.object({
      sku: z5.string().min(1),
      name: z5.string().min(1),
      dialColor: z5.string().optional().default(""),
      strapMaterial: z5.string().optional().default(""),
      price: z5.number().optional(),
      salePrice: z5.number().nullable().optional().default(null),
      stock: z5.number().int().min(0).default(0),
      image: z5.string().optional().default("")
    })
  ).optional().default([]),
  stock: z5.number().int().min(0, "Stock cannot be negative").default(0),
  lowStockThreshold: z5.number().int().min(0).default(5),
  status: z5.enum(["published", "draft", "archived"]).default("published"),
  featured: z5.boolean().default(false),
  bestSeller: z5.boolean().default(false),
  newArrival: z5.boolean().default(false),
  tags: z5.array(z5.string()).optional().default([]),
  metaTitle: z5.string().optional().default(""),
  metaDescription: z5.string().optional().default("")
});
router5.get("/products", async (req, res, next) => {
  try {
    const { q, status, category, stockStatus, page = "1", limit = "20" } = req.query;
    const filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }
    if (category && category !== "all") {
      filter.category = category;
    }
    if (stockStatus === "out_of_stock") {
      filter.stock = 0;
    } else if (stockStatus === "low_stock") {
      filter.$expr = {
        $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$lowStockThreshold"] }]
      };
    }
    if (q && q.trim()) {
      const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: regex }, { brand: regex }, { sku: regex }, { model: regex }];
    }
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const [products, total] = await Promise.all([
      Product.find(filter).populate("category", "name slug").populate("collections", "name slug").sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      Product.countDocuments(filter)
    ]);
    res.json({
      success: true,
      products,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (err) {
    next(err);
  }
});
router5.post("/products", async (req, res, next) => {
  try {
    const data = productPayloadSchema.parse(req.body);
    let slug = data.slug && data.slug.trim() ? slugify(data.slug) : slugify(`${data.brand}-${data.name}`);
    const existingSlug = await Product.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Math.floor(100 + Math.random() * 900)}`;
    }
    const sku = data.sku && data.sku.trim() ? data.sku.trim().toUpperCase() : generateSku(data.brand, data.model);
    const images = data.images.length > 0 ? data.images : [{ url: data.mainImage, alt: data.name, isMain: true }];
    const product = await Product.create({
      ...data,
      slug,
      sku,
      category: data.category || void 0,
      images
    });
    await StockMovement.create({
      product: product._id,
      sku: product.sku,
      type: "addition",
      quantityChange: product.stock,
      previousStock: 0,
      newStock: product.stock,
      reason: "Initial product creation inventory",
      performedBy: req.user._id,
      performedByName: req.user.name
    });
    await logAudit({
      user: req.user,
      action: "CREATE_PRODUCT",
      entityType: "product",
      entityId: String(product._id),
      details: `Created product "${product.name}" (SKU: ${product.sku}, Stock: ${product.stock})`,
      ipAddress: req.ip
    });
    res.status(201).json({
      success: true,
      message: "Product created successfully.",
      product
    });
  } catch (err) {
    next(err);
  }
});
router5.put("/products/:id", async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new AppError("Product not found.", 404);
    }
    const data = productPayloadSchema.partial().parse(req.body);
    const previousStock = product.stock;
    if (data.slug && data.slug.trim()) {
      data.slug = slugify(data.slug);
    }
    if (data.sku && data.sku.trim()) {
      data.sku = data.sku.trim().toUpperCase();
    }
    Object.assign(product, {
      ...data,
      category: data.category === null ? void 0 : data.category ?? product.category
    });
    await product.save();
    if (data.stock !== void 0 && data.stock !== previousStock) {
      const diff = data.stock - previousStock;
      await StockMovement.create({
        product: product._id,
        sku: product.sku,
        type: "manual_adjustment",
        quantityChange: diff,
        previousStock,
        newStock: data.stock,
        reason: "Updated via Product Editor",
        performedBy: req.user._id,
        performedByName: req.user.name
      });
    }
    await logAudit({
      user: req.user,
      action: "UPDATE_PRODUCT",
      entityType: "product",
      entityId: String(product._id),
      details: `Updated product "${product.name}" (SKU: ${product.sku})`,
      ipAddress: req.ip
    });
    res.json({
      success: true,
      message: "Product updated successfully.",
      product
    });
  } catch (err) {
    next(err);
  }
});
router5.delete("/products/:id", async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      throw new AppError("Product not found.", 404);
    }
    const permanent = req.query.permanent === "true";
    if (permanent) {
      await Product.findByIdAndDelete(product._id);
    } else {
      product.status = "archived";
      await product.save();
    }
    await logAudit({
      user: req.user,
      action: permanent ? "DELETE_PRODUCT" : "ARCHIVE_PRODUCT",
      entityType: "product",
      entityId: String(product._id),
      details: `${permanent ? "Deleted" : "Archived"} product "${product.name}" (SKU: ${product.sku})`,
      ipAddress: req.ip
    });
    res.json({
      success: true,
      message: permanent ? "Product permanently deleted." : "Product archived."
    });
  } catch (err) {
    next(err);
  }
});
router5.post("/products/bulk", async (req, res, next) => {
  try {
    const schema = z5.object({
      productIds: z5.array(z5.string()).min(1),
      action: z5.enum(["publish", "draft", "archive", "delete"])
    });
    const { productIds, action } = schema.parse(req.body);
    if (action === "delete") {
      await Product.deleteMany({ _id: { $in: productIds } });
    } else {
      const statusMap = {
        publish: "published",
        draft: "draft",
        archive: "archived"
      };
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { status: statusMap[action] } }
      );
    }
    await logAudit({
      user: req.user,
      action: `BULK_${action.toUpperCase()}_PRODUCTS`,
      entityType: "product",
      details: `Bulk action "${action}" applied to ${productIds.length} products`,
      ipAddress: req.ip
    });
    res.json({
      success: true,
      message: `Bulk action (${action}) completed for ${productIds.length} products.`
    });
  } catch (err) {
    next(err);
  }
});
router5.get("/inventory", async (req, res, next) => {
  try {
    const { q, status } = req.query;
    const filter = { status: { $ne: "archived" } };
    if (q && q.trim()) {
      const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: regex }, { sku: regex }, { brand: regex }, { model: regex }];
    }
    if (status === "out_of_stock") {
      filter.stock = 0;
    } else if (status === "low_stock") {
      filter.$expr = {
        $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$lowStockThreshold"] }]
      };
    } else if (status === "in_stock") {
      filter.$expr = { $gt: ["$stock", "$lowStockThreshold"] };
    }
    const [products, recentMovements] = await Promise.all([
      Product.find(filter).select(
        "name slug brand model sku mainImage price salePrice costPrice stock reservedStock lowStockThreshold soldCount variants status"
      ).sort({ stock: 1, name: 1 }),
      StockMovement.find().populate("product", "name sku mainImage").sort({ createdAt: -1 }).limit(60)
    ]);
    res.json({
      success: true,
      inventory: products,
      movements: recentMovements
    });
  } catch (err) {
    next(err);
  }
});
router5.post("/inventory/adjust", async (req, res, next) => {
  try {
    const schema = z5.object({
      productId: z5.string().min(1),
      variantSku: z5.string().optional(),
      adjustmentType: z5.enum(["addition", "reduction", "set_exact"]),
      quantity: z5.number().int().min(0, "Quantity must be a non-negative integer"),
      lowStockThreshold: z5.number().int().min(0).optional(),
      reason: z5.string().min(3, "Please provide a clear reason for this inventory adjustment")
    });
    const data = schema.parse(req.body);
    const product = await Product.findById(data.productId);
    if (!product) {
      throw new AppError("Product not found.", 404);
    }
    const previousStock = product.stock;
    let newStock = previousStock;
    if (data.adjustmentType === "addition") {
      if (data.quantity <= 0) {
        throw new AppError("Addition quantity must be greater than 0.", 400);
      }
      newStock = previousStock + data.quantity;
    } else if (data.adjustmentType === "reduction") {
      if (data.quantity <= 0) {
        throw new AppError("Reduction quantity must be greater than 0.", 400);
      }
      if (previousStock - data.quantity < 0) {
        throw new AppError(
          `Cannot reduce stock by ${data.quantity}. Current stock is ${previousStock} (negative stock is prohibited).`,
          400
        );
      }
      newStock = previousStock - data.quantity;
    } else {
      newStock = data.quantity;
    }
    const quantityChange = newStock - previousStock;
    product.stock = newStock;
    if (data.lowStockThreshold !== void 0) {
      product.lowStockThreshold = data.lowStockThreshold;
    }
    await product.save();
    const movement = await StockMovement.create({
      product: product._id,
      sku: product.sku,
      variantSku: data.variantSku,
      type: data.adjustmentType === "addition" ? "addition" : data.adjustmentType === "reduction" ? "reduction" : "manual_adjustment",
      quantityChange,
      previousStock,
      newStock,
      reason: data.reason,
      performedBy: req.user._id,
      performedByName: req.user.name
    });
    await logAudit({
      user: req.user,
      action: "INVENTORY_ADJUSTMENT",
      entityType: "inventory",
      entityId: String(product._id),
      details: `Adjusted stock for ${product.name} (${product.sku}): ${previousStock} -> ${newStock} (${quantityChange >= 0 ? `+${quantityChange}` : quantityChange}). Reason: ${data.reason}`,
      ipAddress: req.ip
    });
    res.json({
      success: true,
      message: `Stock updated from ${previousStock} to ${newStock}.`,
      product,
      movement
    });
  } catch (err) {
    next(err);
  }
});
router5.get("/orders", async (req, res, next) => {
  try {
    const {
      q,
      fulfillmentStatus,
      paymentStatus,
      orderSource,
      page = "1",
      limit = "20"
    } = req.query;
    const filter = {};
    if (fulfillmentStatus && fulfillmentStatus !== "all") {
      filter.fulfillmentStatus = fulfillmentStatus;
    }
    if (paymentStatus && paymentStatus !== "all") {
      filter.paymentStatus = paymentStatus;
    }
    if (orderSource === "website" || orderSource === "whatsapp") {
      filter.orderSource = orderSource;
    }
    if (q && q.trim()) {
      const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { orderNumber: regex },
        { requestNumber: regex },
        { "shippingAddress.fullName": regex },
        { "shippingAddress.email": regex },
        { "shippingAddress.phone": regex },
        { trackingNumber: regex }
      ];
    }
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum),
      Order.countDocuments(filter)
    ]);
    res.json({
      success: true,
      orders,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (err) {
    next(err);
  }
});
router5.get("/orders/:id", async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email phone");
    if (!order) {
      throw new AppError("Order not found.", 404);
    }
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
});
router5.put("/orders/:id/status", async (req, res, next) => {
  try {
    const schema = z5.object({
      fulfillmentStatus: z5.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]).optional(),
      paymentStatus: z5.enum(["pending", "paid", "failed", "refunded"]).optional(),
      courierName: z5.string().optional(),
      trackingNumber: z5.string().optional(),
      note: z5.string().optional()
    });
    const data = schema.parse(req.body);
    const order = await Order.findById(req.params.id);
    if (!order) {
      throw new AppError("Order not found.", 404);
    }
    const prevFulfillment = order.fulfillmentStatus;
    const prevPayment = order.paymentStatus;
    if ((prevFulfillment === "cancelled" || prevFulfillment === "refunded") && data.fulfillmentStatus && data.fulfillmentStatus !== prevFulfillment && data.fulfillmentStatus !== "refunded") {
      throw new AppError(
        `Order ${order.orderNumber} is already ${prevFulfillment} and cannot be reopened.`,
        400
      );
    }
    if (data.courierName !== void 0) order.courierName = data.courierName;
    if (data.trackingNumber !== void 0) order.trackingNumber = data.trackingNumber;
    const targetFulfillment = data.fulfillmentStatus || order.fulfillmentStatus;
    let targetPayment = data.paymentStatus || order.paymentStatus;
    if (targetFulfillment === "delivered" && targetPayment === "pending") {
      targetPayment = "paid";
      order.paidAt = /* @__PURE__ */ new Date();
    }
    if (targetFulfillment === "shipped" && !order.shippedAt) {
      order.shippedAt = /* @__PURE__ */ new Date();
    }
    if (targetFulfillment === "delivered" && !order.deliveredAt) {
      order.deliveredAt = /* @__PURE__ */ new Date();
    }
    if (targetFulfillment === "cancelled" && !order.cancelledAt) {
      order.cancelledAt = /* @__PURE__ */ new Date();
    }
    if (targetFulfillment === "refunded" || targetPayment === "refunded") {
      targetPayment = "refunded";
      order.refundedAt = /* @__PURE__ */ new Date();
    }
    if (targetPayment === "paid" && !order.paidAt) {
      order.paidAt = /* @__PURE__ */ new Date();
    }
    if ((targetFulfillment === "cancelled" || targetFulfillment === "refunded") && !order.inventoryRestored) {
      for (const item of order.items) {
        const prod = await Product.findById(item.product);
        if (prod) {
          const prevStock = prod.stock;
          prod.stock += item.quantity;
          prod.soldCount = Math.max(0, (prod.soldCount || 0) - item.quantity);
          if (item.variantSku && prod.variants && prod.variants.length > 0) {
            const v = prod.variants.find((vr) => vr.sku === item.variantSku);
            if (v) {
              v.stock += item.quantity;
            }
          }
          await prod.save();
          await StockMovement.create({
            product: prod._id,
            sku: item.sku,
            variantSku: item.variantSku,
            type: "order_cancelled",
            quantityChange: item.quantity,
            previousStock: prevStock,
            newStock: prod.stock,
            reason: `Stock restored from ${targetFulfillment} order ${order.orderNumber}`,
            orderId: order._id,
            orderNumber: order.orderNumber,
            performedBy: req.user._id,
            performedByName: req.user.name
          });
        }
      }
      order.inventoryRestored = true;
    }
    let approvedNumberNote = "";
    const approving = ["confirmed", "processing", "shipped", "delivered"].includes(targetFulfillment);
    if (approving && !isApprovedOrderNumber(order.orderNumber)) {
      if (!order.requestNumber) order.requestNumber = order.orderNumber;
      order.orderNumber = formatApprovedOrderNumber(await nextSequence("approvedOrder"));
      order.approvedAt = /* @__PURE__ */ new Date();
      approvedNumberNote = ` Approved as ${order.orderNumber} (ref ${order.requestNumber}).`;
    }
    order.fulfillmentStatus = targetFulfillment;
    order.paymentStatus = targetPayment;
    const statusNote = (data.note || `Status updated: Fulfillment [${prevFulfillment} -> ${targetFulfillment}], Payment [${prevPayment} -> ${targetPayment}]${order.trackingNumber ? ` (Tracking: ${order.courierName || "Courier"} #${order.trackingNumber})` : ""}`) + approvedNumberNote;
    order.statusHistory.push({
      status: targetFulfillment,
      paymentStatus: targetPayment,
      note: statusNote,
      updatedBy: req.user.name,
      timestamp: /* @__PURE__ */ new Date()
    });
    await order.save();
    await logAudit({
      user: req.user,
      action: "UPDATE_ORDER_STATUS",
      entityType: "order",
      entityId: String(order._id),
      details: `Order ${order.orderNumber}: ${statusNote}`,
      ipAddress: req.ip
    });
    res.json({
      success: true,
      message: `Order ${order.orderNumber} updated.`,
      order
    });
  } catch (err) {
    next(err);
  }
});
var WHATSAPP_TEMPLATES = [
  "orderPlaced",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "paymentReminder",
  "processing",
  "paymentReceived",
  "refunded",
  "custom"
];
router5.post("/orders/:id/whatsapp-log", async (req, res, next) => {
  try {
    const data = z5.object({
      template: z5.enum(WHATSAPP_TEMPLATES),
      message: z5.string().min(1).max(4e3),
      phone: z5.string().min(6).max(30)
    }).parse(req.body);
    const entry = {
      ...data,
      sentBy: req.user.name,
      sentAt: /* @__PURE__ */ new Date()
    };
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { $push: { whatsappLog: entry } },
      { new: true }
    );
    if (!order) {
      throw new AppError("Order not found.", 404);
    }
    await logAudit({
      user: req.user,
      action: "WHATSAPP_MESSAGE_SENT",
      entityType: "order",
      entityId: String(order._id),
      details: `WhatsApp "${data.template}" message opened for order ${order.orderNumber} (${data.phone})`,
      ipAddress: req.ip
    });
    res.json({ success: true, order });
  } catch (err) {
    next(err);
  }
});
router5.get("/whatsapp/overview", async (_req, res, next) => {
  try {
    const startOfToday = /* @__PURE__ */ new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const notSent = (template) => ({ "whatsappLog.template": { $ne: template } });
    const [
      needsConfirmation,
      needsShippingUpdate,
      needsDeliveryNote,
      paymentPending,
      whatsappOrders,
      totalOrders,
      sentTodayAgg,
      recentAgg
    ] = await Promise.all([
      Order.find({ fulfillmentStatus: "pending", ...notSent("orderPlaced") }).sort({ createdAt: -1 }).limit(50),
      Order.find({ fulfillmentStatus: "shipped", ...notSent("shipped") }).sort({ shippedAt: -1 }).limit(50),
      Order.find({ fulfillmentStatus: "delivered", ...notSent("delivered") }).sort({ deliveredAt: -1 }).limit(50),
      Order.find({
        paymentStatus: "pending",
        paymentMethod: "bank_transfer",
        fulfillmentStatus: { $nin: ["cancelled", "refunded"] },
        ...notSent("paymentReminder")
      }).sort({ createdAt: -1 }).limit(50),
      Order.countDocuments({ orderSource: "whatsapp" }),
      Order.countDocuments({}),
      Order.aggregate([
        { $unwind: "$whatsappLog" },
        { $match: { "whatsappLog.sentAt": { $gte: startOfToday } } },
        { $count: "count" }
      ]),
      Order.aggregate([
        { $unwind: "$whatsappLog" },
        { $sort: { "whatsappLog.sentAt": -1 } },
        { $limit: 30 },
        {
          $project: {
            _id: 0,
            orderId: "$_id",
            orderNumber: 1,
            customerName: "$shippingAddress.fullName",
            template: "$whatsappLog.template",
            message: "$whatsappLog.message",
            phone: "$whatsappLog.phone",
            sentBy: "$whatsappLog.sentBy",
            sentAt: "$whatsappLog.sentAt"
          }
        }
      ])
    ]);
    res.json({
      success: true,
      stats: {
        sentToday: sentTodayAgg[0]?.count || 0,
        whatsappOrders,
        totalOrders,
        pendingActions: needsConfirmation.length + needsShippingUpdate.length + needsDeliveryNote.length + paymentPending.length
      },
      queues: {
        orderPlaced: needsConfirmation,
        shipped: needsShippingUpdate,
        delivered: needsDeliveryNote,
        paymentReminder: paymentPending
      },
      recentMessages: recentAgg
    });
  } catch (err) {
    next(err);
  }
});
router5.get("/push/stats", async (_req, res, next) => {
  try {
    const [newArrivalSubscribers, adminDevices] = await Promise.all([
      PushSubscription.countDocuments({ topics: "new-arrivals" }),
      PushSubscription.countDocuments({ topics: "admin-orders" })
    ]);
    res.json({ success: true, enabled: pushEnabled, newArrivalSubscribers, adminDevices });
  } catch (err) {
    next(err);
  }
});
router5.post("/push/new-arrival/:productId", async (req, res, next) => {
  try {
    if (!pushEnabled) throw new AppError("Notifications are not configured on this server.", 503);
    const product = await Product.findById(req.params.productId);
    if (!product) throw new AppError("Product not found.", 404);
    if (product.status !== "published") throw new AppError("Publish the watch before announcing it.", 400);
    const price = product.salePrice && product.salePrice < product.price ? product.salePrice : product.price;
    const result = await sendToTopic("new-arrivals", {
      title: `New arrival: ${product.name}`,
      body: `${product.brand} \u2022 Rs. ${Math.round(price).toLocaleString("en-PK")} \u2014 tap to view`,
      url: `/product/${product.slug}`,
      image: product.mainImage,
      tag: `bfs-new-arrival-${product._id}`
    });
    await logAudit({
      user: req.user,
      action: "PUSH_NEW_ARRIVAL",
      entityType: "product",
      entityId: String(product._id),
      details: `Announced "${product.name}" to ${result.sent} subscriber device(s)`,
      ipAddress: req.ip
    });
    res.json({ success: true, message: `Sent to ${result.sent} device(s).`, ...result });
  } catch (err) {
    next(err);
  }
});
router5.get("/customers", async (req, res, next) => {
  try {
    const { q, status } = req.query;
    const filter = {};
    if (status && status !== "all") {
      filter.status = status;
    }
    if (q && q.trim()) {
      const regex = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
    }
    const users = await User.find(filter).sort({ createdAt: -1 });
    const orders = await Order.find({
      fulfillmentStatus: { $nin: ["cancelled", "refunded"] }
    }).select("user shippingAddress.email totalAmount createdAt");
    const spendByUser = /* @__PURE__ */ new Map();
    for (const o of orders) {
      const key = o.user ? String(o.user) : o.shippingAddress.email.toLowerCase();
      const entry = spendByUser.get(key) || { count: 0, totalSpend: 0 };
      entry.count += 1;
      entry.totalSpend += o.totalAmount;
      spendByUser.set(key, entry);
    }
    const customers = users.map((u) => {
      const byId = spendByUser.get(String(u._id));
      const byEmail = spendByUser.get(u.email.toLowerCase());
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        role: u.role,
        status: u.status,
        addresses: u.addresses,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        orderCount: byId?.count || byEmail?.count || 0,
        totalSpend: byId?.totalSpend || byEmail?.totalSpend || 0
      };
    });
    res.json({ success: true, customers });
  } catch (err) {
    next(err);
  }
});
router5.put("/customers/:id/status", async (req, res, next) => {
  try {
    const { status } = z5.object({ status: z5.enum(["active", "suspended"]) }).parse(req.body);
    const customer = await User.findById(req.params.id);
    if (!customer) {
      throw new AppError("Customer not found.", 404);
    }
    if (String(customer._id) === String(req.user._id)) {
      throw new AppError("You cannot suspend your own administrator account.", 400);
    }
    customer.status = status;
    if (status === "suspended") {
      customer.tokenVersion = (customer.tokenVersion || 0) + 1;
    }
    await customer.save();
    await logAudit({
      user: req.user,
      action: "UPDATE_CUSTOMER_STATUS",
      entityType: "customer",
      entityId: String(customer._id),
      details: `Set account status of ${customer.email} to ${status}`,
      ipAddress: req.ip
    });
    res.json({
      success: true,
      message: `Customer account ${status === "active" ? "activated" : "suspended"}.`,
      customer
    });
  } catch (err) {
    next(err);
  }
});
var categorySchema = z5.object({
  name: z5.string().min(2).max(100),
  slug: z5.string().optional(),
  description: z5.string().optional().default(""),
  image: z5.string().optional().default(""),
  metaTitle: z5.string().optional().default(""),
  metaDescription: z5.string().optional().default(""),
  displayOrder: z5.number().int().optional().default(0),
  isActive: z5.boolean().optional().default(true)
});
router5.get("/categories", async (_req, res, next) => {
  try {
    const categories = await Category.find().sort({ displayOrder: 1, name: 1 });
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
});
router5.post("/categories", async (req, res, next) => {
  try {
    const data = categorySchema.parse(req.body);
    const slug = data.slug && data.slug.trim() ? slugify(data.slug) : slugify(data.name);
    const category = await Category.create({ ...data, slug });
    await logAudit({
      user: req.user,
      action: "CREATE_CATEGORY",
      entityType: "category",
      entityId: String(category._id),
      details: `Created category "${category.name}"`,
      ipAddress: req.ip
    });
    res.status(201).json({ success: true, message: "Category created.", category });
  } catch (err) {
    next(err);
  }
});
router5.put("/categories/:id", async (req, res, next) => {
  try {
    const data = categorySchema.partial().parse(req.body);
    if (data.slug) data.slug = slugify(data.slug);
    const category = await Category.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!category) throw new AppError("Category not found.", 404);
    res.json({ success: true, message: "Category updated.", category });
  } catch (err) {
    next(err);
  }
});
router5.delete("/categories/:id", async (req, res, next) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Category deleted." });
  } catch (err) {
    next(err);
  }
});
var collectionSchema = z5.object({
  name: z5.string().min(2).max(100),
  slug: z5.string().optional(),
  subtitle: z5.string().optional().default(""),
  description: z5.string().optional().default(""),
  image: z5.string().min(1, "Collection cover image is required"),
  bannerImage: z5.string().optional().default(""),
  metaTitle: z5.string().optional().default(""),
  metaDescription: z5.string().optional().default(""),
  featured: z5.boolean().optional().default(true),
  displayOrder: z5.number().int().optional().default(0),
  isActive: z5.boolean().optional().default(true)
});
router5.get("/collections", async (_req, res, next) => {
  try {
    const collections = await Collection.find().sort({ displayOrder: 1, name: 1 });
    res.json({ success: true, collections });
  } catch (err) {
    next(err);
  }
});
router5.post("/collections", async (req, res, next) => {
  try {
    const data = collectionSchema.parse(req.body);
    const slug = data.slug && data.slug.trim() ? slugify(data.slug) : slugify(data.name);
    const collection = await Collection.create({ ...data, slug });
    await logAudit({
      user: req.user,
      action: "CREATE_COLLECTION",
      entityType: "collection",
      entityId: String(collection._id),
      details: `Created collection "${collection.name}"`,
      ipAddress: req.ip
    });
    res.status(201).json({ success: true, message: "Collection created.", collection });
  } catch (err) {
    next(err);
  }
});
router5.put("/collections/:id", async (req, res, next) => {
  try {
    const data = collectionSchema.partial().parse(req.body);
    if (data.slug) data.slug = slugify(data.slug);
    const collection = await Collection.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!collection) throw new AppError("Collection not found.", 404);
    res.json({ success: true, message: "Collection updated.", collection });
  } catch (err) {
    next(err);
  }
});
router5.delete("/collections/:id", async (req, res, next) => {
  try {
    await Collection.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Collection deleted." });
  } catch (err) {
    next(err);
  }
});
router5.get("/homepage", async (_req, res, next) => {
  try {
    let homepage = await HomepageContent.findOne({ key: "default" });
    if (!homepage) {
      homepage = await HomepageContent.create({ key: "default" });
    }
    res.json({ success: true, homepage });
  } catch (err) {
    next(err);
  }
});
router5.put("/homepage", async (req, res, next) => {
  try {
    let homepage = await HomepageContent.findOne({ key: "default" });
    if (!homepage) {
      homepage = new HomepageContent({ key: "default" });
    }
    const { announcementBar, carouselSettings, heroSlides, promoBanner, brandStory, sectionVisibility } = req.body;
    if (announcementBar) homepage.announcementBar = announcementBar;
    if (carouselSettings) homepage.carouselSettings = carouselSettings;
    if (Array.isArray(heroSlides)) homepage.heroSlides = heroSlides;
    if (promoBanner) homepage.promoBanner = promoBanner;
    if (brandStory) homepage.brandStory = brandStory;
    if (sectionVisibility) homepage.sectionVisibility = sectionVisibility;
    await homepage.save();
    await logAudit({
      user: req.user,
      action: "UPDATE_HOMEPAGE_CMS",
      entityType: "homepage",
      details: "Updated homepage hero carousel, announcement bar, and promotional sections",
      ipAddress: req.ip
    });
    res.json({
      success: true,
      message: "Homepage content published immediately to the storefront.",
      homepage
    });
  } catch (err) {
    next(err);
  }
});
var couponSchema = z5.object({
  code: z5.string().min(3, "Coupon code must be at least 3 characters").max(30),
  description: z5.string().optional().default(""),
  discountType: z5.enum(["percentage", "fixed"]),
  discountValue: z5.number().min(1, "Discount value must be greater than 0"),
  minOrderAmount: z5.number().min(0).default(0),
  maxDiscountAmount: z5.number().nullable().optional().default(null),
  startDate: z5.string().or(z5.date()).optional(),
  expiryDate: z5.string().or(z5.date()),
  usageLimit: z5.number().int().nullable().optional().default(null),
  perCustomerLimit: z5.number().int().min(1).default(1),
  isActive: z5.boolean().default(true)
});
router5.get("/coupons", async (_req, res, next) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ success: true, coupons });
  } catch (err) {
    next(err);
  }
});
router5.post("/coupons", async (req, res, next) => {
  try {
    const data = couponSchema.parse(req.body);
    const coupon = await Coupon.create({
      ...data,
      code: data.code.toUpperCase().trim(),
      startDate: data.startDate ? new Date(data.startDate) : /* @__PURE__ */ new Date(),
      expiryDate: new Date(data.expiryDate)
    });
    await logAudit({
      user: req.user,
      action: "CREATE_COUPON",
      entityType: "coupon",
      entityId: String(coupon._id),
      details: `Created coupon ${coupon.code} (${coupon.discountValue}${coupon.discountType === "percentage" ? "%" : " PKR"})`,
      ipAddress: req.ip
    });
    res.status(201).json({ success: true, message: "Coupon created.", coupon });
  } catch (err) {
    next(err);
  }
});
router5.put("/coupons/:id", async (req, res, next) => {
  try {
    const data = couponSchema.partial().parse(req.body);
    const updatePayload = { ...data };
    if (data.code) updatePayload.code = data.code.toUpperCase().trim();
    if (data.expiryDate) updatePayload.expiryDate = new Date(data.expiryDate);
    if (data.startDate) updatePayload.startDate = new Date(data.startDate);
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
    if (!coupon) throw new AppError("Coupon not found.", 404);
    res.json({ success: true, message: "Coupon updated.", coupon });
  } catch (err) {
    next(err);
  }
});
router5.delete("/coupons/:id", async (req, res, next) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Coupon deleted." });
  } catch (err) {
    next(err);
  }
});
router5.get("/reports", async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    }
    const [orders, products, coupons] = await Promise.all([
      Order.find(dateFilter).sort({ createdAt: -1 }),
      Product.find({ status: { $ne: "archived" } }),
      Coupon.find()
    ]);
    const statusBreakdown = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      refunded: 0
    };
    let totalPaidSales = 0;
    let totalPendingSales = 0;
    let totalDiscountsGiven = 0;
    for (const o of orders) {
      statusBreakdown[o.fulfillmentStatus] = (statusBreakdown[o.fulfillmentStatus] || 0) + 1;
      if (o.fulfillmentStatus !== "cancelled" && o.fulfillmentStatus !== "refunded") {
        totalDiscountsGiven += o.discountAmount || 0;
        if (o.paymentStatus === "paid" || o.fulfillmentStatus === "delivered") {
          totalPaidSales += o.totalAmount;
        } else {
          totalPendingSales += o.totalAmount;
        }
      }
    }
    let totalUnitsInStock = 0;
    let totalInventoryCostValuation = 0;
    let totalInventoryRetailValuation = 0;
    for (const p of products) {
      totalUnitsInStock += p.stock;
      const effectiveRetail = p.salePrice && p.salePrice > 0 ? p.salePrice : p.price;
      totalInventoryRetailValuation += p.stock * effectiveRetail;
      totalInventoryCostValuation += p.stock * (p.costPrice || Math.round(effectiveRetail * 0.62));
    }
    const topProducts = [...products].sort((a, b) => b.soldCount - a.soldCount).slice(0, 10).map((p) => ({
      _id: p._id,
      name: p.name,
      sku: p.sku,
      brand: p.brand,
      soldCount: p.soldCount,
      stock: p.stock,
      price: p.salePrice || p.price,
      estimatedRevenue: p.soldCount * (p.salePrice || p.price)
    }));
    res.json({
      success: true,
      salesSummary: {
        totalOrdersInPeriod: orders.length,
        totalPaidSales,
        totalPendingSales,
        totalDiscountsGiven,
        statusBreakdown
      },
      inventoryValuation: {
        totalSkus: products.length,
        totalUnitsInStock,
        totalInventoryCostValuation,
        totalInventoryRetailValuation,
        projectedGrossMargin: totalInventoryRetailValuation - totalInventoryCostValuation
      },
      topProducts,
      couponUsage: coupons.map((c) => ({
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue,
        usedCount: c.usedCount,
        usageLimit: c.usageLimit,
        isActive: c.isActive,
        expiryDate: c.expiryDate
      }))
    });
  } catch (err) {
    next(err);
  }
});
router5.get("/reports/export/:type", async (req, res, next) => {
  try {
    const { type } = req.params;
    const escapeCsv = (val) => {
      const str = String(val ?? "").replace(/"/g, '""');
      return `"${str}"`;
    };
    let csvRows = [];
    let filename = `binfareedstore-${type}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
    if (type === "orders") {
      const orders = await Order.find().sort({ createdAt: -1 });
      csvRows.push(
        ["Order Number", "Date", "Customer Name", "Email", "Phone", "City", "Province", "Subtotal (PKR)", "Discount (PKR)", "Shipping (PKR)", "Total (PKR)", "Payment Method", "Payment Status", "Fulfillment Status", "Tracking Number"].map(escapeCsv).join(",")
      );
      for (const o of orders) {
        csvRows.push(
          [
            o.orderNumber,
            o.createdAt.toISOString(),
            o.shippingAddress.fullName,
            o.shippingAddress.email,
            o.shippingAddress.phone,
            o.shippingAddress.city,
            o.shippingAddress.province,
            o.subtotal,
            o.discountAmount,
            o.shippingCost,
            o.totalAmount,
            o.paymentMethod,
            o.paymentStatus,
            o.fulfillmentStatus,
            o.trackingNumber || ""
          ].map(escapeCsv).join(",")
        );
      }
    } else if (type === "inventory" || type === "products") {
      const products = await Product.find().sort({ sku: 1 });
      csvRows.push(
        ["SKU", "Name", "Brand", "Model", "Gender", "Status", "Stock", "Low Stock Threshold", "Sold Count", "Cost Price (PKR)", "Retail Price (PKR)", "Sale Price (PKR)", "Retail Stock Value (PKR)"].map(escapeCsv).join(",")
      );
      for (const p of products) {
        const effective = p.salePrice && p.salePrice > 0 ? p.salePrice : p.price;
        csvRows.push(
          [
            p.sku,
            p.name,
            p.brand,
            p.model,
            p.gender,
            p.status,
            p.stock,
            p.lowStockThreshold,
            p.soldCount,
            p.costPrice,
            p.price,
            p.salePrice ?? "",
            p.stock * effective
          ].map(escapeCsv).join(",")
        );
      }
    } else {
      throw new AppError("Unsupported export report type.", 400);
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csvRows.join("\n"));
  } catch (err) {
    next(err);
  }
});
router5.get("/settings", async (_req, res, next) => {
  try {
    let settings = await StoreSettings.findOne({ key: "default" });
    if (!settings) {
      settings = await StoreSettings.create({ key: "default" });
    }
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
});
router5.put("/settings", async (req, res, next) => {
  try {
    let settings = await StoreSettings.findOne({ key: "default" });
    if (!settings) {
      settings = new StoreSettings({ key: "default" });
    }
    Object.assign(settings, req.body);
    await settings.save();
    await logAudit({
      user: req.user,
      action: "UPDATE_STORE_SETTINGS",
      entityType: "settings",
      details: "Updated store configuration, shipping rules, and payment settings",
      ipAddress: req.ip
    });
    res.json({
      success: true,
      message: "Store settings saved.",
      settings
    });
  } catch (err) {
    next(err);
  }
});
router5.post(
  "/upload",
  upload.single("image"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new AppError("No image file provided.", 400);
      }
      if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
        cloudinary.config({
          cloud_name: env.CLOUDINARY_CLOUD_NAME,
          api_key: env.CLOUDINARY_API_KEY,
          api_secret: env.CLOUDINARY_API_SECRET
        });
        const uploaded = await cloudinary.uploader.upload(req.file.path, {
          folder: "binfareedstore",
          transformation: [{ quality: "auto", fetch_format: "auto" }]
        });
        fs.unlink(req.file.path, () => {
        });
        res.status(201).json({
          success: true,
          url: uploaded.secure_url,
          provider: "cloudinary"
        });
        return;
      }
      const localUrl = `/uploads/${req.file.filename}`;
      res.status(201).json({
        success: true,
        url: localUrl,
        provider: "local"
      });
    } catch (err) {
      next(err);
    }
  }
);
router5.get("/audit-logs", async (_req, res, next) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
});
router5.get("/reviews", async (_req, res, next) => {
  try {
    const reviews = await Review.find().populate("product", "name slug sku mainImage").sort({ createdAt: -1 });
    res.json({ success: true, reviews });
  } catch (err) {
    next(err);
  }
});
var adminRoutes_default = router5;

// server/routes/pushRoutes.ts
import { Router as Router6 } from "express";
import rateLimit2 from "express-rate-limit";
import { z as z6 } from "zod";
var router6 = Router6();
var subscribeLimiter = rateLimit2({ windowMs: 15 * 60 * 1e3, max: 20, standardHeaders: true, legacyHeaders: false });
var subscriptionSchema = z6.object({
  endpoint: z6.string().url().max(1e3).startsWith("https://"),
  keys: z6.object({
    p256dh: z6.string().min(10).max(200),
    auth: z6.string().min(8).max(100)
  })
});
router6.get("/public-key", (_req, res) => {
  res.json({ success: true, enabled: pushEnabled, publicKey: vapidPublicKey });
});
router6.post("/subscribe", subscribeLimiter, optionalAuth, async (req, res, next) => {
  try {
    if (!pushEnabled) throw new AppError("Notifications are not configured on this server.", 503);
    const { subscription, topic } = z6.object({ subscription: subscriptionSchema, topic: z6.enum(["new-arrivals", "admin-orders"]) }).parse(req.body);
    if (topic === "admin-orders" && req.user?.role !== "admin") {
      throw new AppError("Only the store admin can receive order alerts.", 403);
    }
    await PushSubscription.findOneAndUpdate(
      { endpoint: subscription.endpoint },
      {
        $set: {
          keys: subscription.keys,
          userAgent: String(req.headers["user-agent"] || "").slice(0, 300),
          ...topic === "admin-orders" ? { user: req.user._id } : {}
        },
        $addToSet: { topics: topic }
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, message: "Notifications turned on." });
  } catch (err) {
    next(err);
  }
});
router6.post("/unsubscribe", subscribeLimiter, async (req, res, next) => {
  try {
    const { endpoint, topic } = z6.object({ endpoint: z6.string().url().max(1e3), topic: z6.enum(["new-arrivals", "admin-orders"]) }).parse(req.body);
    const sub = await PushSubscription.findOneAndUpdate({ endpoint }, { $pull: { topics: topic } }, { new: true });
    if (sub && sub.topics.length === 0) await sub.deleteOne();
    res.json({ success: true, message: "Notifications turned off." });
  } catch (err) {
    next(err);
  }
});
var pushRoutes_default = router6;

// server/app.ts
var app = express();
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(
  cors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) return callback(null, true);
      const isVercel = requestOrigin.endsWith(".vercel.app");
      const isLocal = requestOrigin.includes("localhost") || requestOrigin.includes("127.0.0.1");
      if (isVercel || isLocal || env.FRONTEND_URL && requestOrigin === env.FRONTEND_URL) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  })
);
app.use((req, _res, next) => {
  const matched = req.headers["x-matched-path"] || req.headers["x-invoke-path"];
  if (matched && (req.url === "/api" || req.url === "/" || req.url === "/api/index")) {
    const queryIdx = req.url.indexOf("?");
    const queryString = queryIdx !== -1 ? req.url.slice(queryIdx) : "";
    req.url = matched + queryString;
  }
  next();
});
app.get(["/api/health", "/health"], (_req, res) => {
  res.json({
    success: true,
    service: "BinFareedStore API",
    status: "operational",
    dbState: mongoose19.connection.readyState,
    dbConnected: mongoose19.connection.readyState >= 1,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
var isDbConnected = false;
app.use(async (_req, _res, next) => {
  if (!isDbConnected || mongoose19.connection.readyState === 0) {
    try {
      await connectDatabase();
      isDbConnected = true;
    } catch (err) {
      console.error("[DB Auto-Connect Error]:", err);
    }
  }
  next();
});
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(cookieParser());
app.use(sanitizeNoSqlInjection);
app.use(csrfProtection);
app.use(["/api", "/"], apiRateLimiter);
app.use("/uploads", express.static(path3.resolve(process.cwd(), "uploads")));
app.get(["/sitemap.xml", "/api/sitemap.xml"], handleSitemap);
app.get(["/robots.txt", "/api/robots.txt"], handleRobots);
app.use(["/api/auth", "/auth"], authRoutes_default);
app.use(["/api/products", "/products"], productRoutes_default);
app.use(["/api/content", "/content"], contentRoutes_default);
app.use(["/api/push", "/push"], pushRoutes_default);
app.use(["/api/admin", "/admin"], adminRoutes_default);
app.use(["/api", "/"], cartOrderRoutes_default);
app.use(["/api/*", "/auth/*", "/products/*", "/content/*", "/push/*"], (_req, res) => {
  res.status(404).json({
    success: false,
    message: "API endpoint not found."
  });
});
app.use(errorHandler);
var app_default = app;
export {
  app_default as default
};
