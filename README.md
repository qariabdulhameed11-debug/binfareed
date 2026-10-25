# BinFareedStore — Fine Horology & Luxury Timepieces
## Complete Full-Stack Watch E-Commerce Platform with Admin Executive Console

BinFareedStore is a modern, production-quality watch e-commerce platform specializing in premium timepieces, luxury mechanical calibres, and stylish everyday watches. Engineered with an uncompromising standard of horological refinement, the platform delivers a high-end international shopping experience comparable to leading Swiss maisons, paired with reliable inventory management, server-side price integrity, and a powerful role-based administrative dashboard.

---

## 1. Key Highlights & Features

### Luxury Storefront & UI/UX Experience
- **Luxury Visual Identity**: Built on a palette of Matte Black (`#0D0D0D`), Ivory White (`#FAF8F5`), Charcoal Grey (`#1A1A1E`), and Champagne Gold (`#C5A059`). Elegant serif headings (*Cormorant Garamond*) paired with clean modern sans-serif body typography (*Plus Jakarta Sans*) and monospace pricing/SKU accents (*JetBrains Mono*).
- **Rotating Announcement Bar**: Configurable promotional offers, new arrivals, and privilege announcements with rotating intervals.
- **Hero Carousel with LCP Optimization**:
  - Full-width hero carousel featuring multiple promotional slides with separate desktop and mobile image support.
  - Automatic slide rotation with configurable interval timing.
  - Automatic pause on user hover or interaction.
  - Manual navigation arrows, pagination progress indicators, and mobile touch/swipe gestures.
  - **LCP Fetch Priority Optimization**: Employs `fetchpriority="high"` on the initial candidate slide, and `fetchpriority="low" loading="lazy"` on background slides in accordance with modern web best practices.
- **Featured Collections**: Curated collections (*Men's Watches*, *Women's Watches*, *Luxury Watches*, *Minimalist Watches*, *Sports Watches*, *New Arrivals*) with subtle image zoom and hover reveals.
- **Best Sellers & New Arrivals**: Real-time product feeds queried from MongoDB Atlas, complete with quick view, wishlist, and add-to-bag actions.
- **Editorial Brand Story**: Highlight cards illustrating BinFareedStore's multi-point horological inspection and 2-year official warranty.
- **Genuine Verified Reviews**: Displays reviews associated strictly with verified purchases from the database (never hardcoded or fabricated).
- **Newsletter Subscription**: Zod-validated collector journal subscription.

### Shop & Product Catalog
- **Multi-Faceted Database Filtering**: Real-time query filtering by price range, brand/maison, category, collection, gender (*Men*, *Women*, *Unisex*), movement (*Automatic*, *Chronograph*, *Quartz*, *Mechanical Hand-Wind*, *Solar*), strap material, dial color, and availability (*In Stock*, *On Sale*, *Best Seller*, *New Arrival*).
- **Dynamic Sorting & Pagination**: Sort by featured curation, newest arrivals, popularity (sold count), price ascending/descending, and customer rating.
- **Active Filter Chips**: One-click removal and "Clear All Filters" controls.
- **Mobile Filter Drawer**: Responsive touch-friendly filter sidebar for small screens.

### Comprehensive Product Details Page
- **High-Resolution Gallery & Lightbox Zoom**: Large interactive product gallery with full-screen zoom lightbox for inspecting watch dial finishing, hands, and case beveling.
- **Technical Horological Specifications Table**: Movement calibre, case material, case diameter, case thickness, strap material, strap width, dial color, crystal type, water resistance, warranty, and country of origin.
- **Configurable Variants**: Dynamic edition and strap selection with SKU, stock, and price override support.
- **Inventory Enforcement**: Quantity selection is strictly capped at available vault inventory to prevent overselling.
- **Buy Now & Add to Bag**: Instant checkout shortcut or slide-over drawer addition.
- **Customer Review Submission**: Verified buyer badge automatically granted when the customer has an eligible completed order.
- **SEO Schema.org Markup**: Dynamic `Schema.org/Product` JSON-LD structured data and Open Graph tags.

### Shopping Bag, Checkout & Order Lifecycle
- **Server-Side Price & Stock Integrity**: Prices, promotional discounts, and inventory balances are validated authoritatively on the Express server.
- **Slide-Over Bag Drawer & Full Bag Page**: Free shipping progress indicator, quantity adjustments, and coupon code application.
- **Pakistan-Ready Checkout**:
  - Pakistani mobile number validation (`03xx xxxxxxx` or `+92 3xx xxxxxxx`).
  - Province selection (*Punjab*, *Sindh*, *Islamabad Capital Territory*, *Khyber Pakhtunkhwa*, *Balochistan*, *Gilgit-Baltistan*, *Azad Jammu & Kashmir*), City, Street Address, Postal Code.
  - Payment methods: **Cash on Delivery (COD)**, **Online Card Payment** (SafePay / Visa / Mastercard webhook-ready integration without storing raw card details), and **Direct Bank / IBFT Transfer**.
  - **Duplicate Order Protection**: Server-enforced `idempotencyKey` prevents double charges or duplicate orders on network retries.
  - **Overselling Prevention**: Atomic conditional inventory deductions ensure stock can never drop below zero during concurrent checkout spikes.
- **Order Confirmation & Printable Invoice**: Itemized receipt, fulfillment status, and browser print-ready invoice.
- **Public Order Tracking**: Lookup any order by its reference number (`BFS-XXXXXX-XXXX`) to inspect real-time courier partner tracking and chronological fulfillment milestones.

### Customer Account Portal
- Customer registration and login with secure HTTP-only cookies.
- Profile management and address book (add, edit, delete, set default).
- Order history with chronological status timeline.
- Wishlist management.
- Security controls: Password change and "Revoke Other Device Sessions" via `tokenVersion` session invalidation.

### Complete Administrative Dashboard (`/admin`)
- **Server-Enforced Role-Based Access Control**: Admin routes and APIs strictly require `role === 'admin'`.
- **Overview & KPIs**: Paid revenue clearly distinguished from pending or cancelled orders, total order count, inventory alerts (low-stock and out-of-stock), 14-day sales trend visualization, and top-selling watches.
- **Product Management**: Full CRUD, slug/SKU auto-generation, multi-image upload manager, watch specifications editor, variant configurator, merchandising flags, live preview, and bulk actions (*Publish*, *Draft*, *Archive*, *Delete*).
- **Auditable Inventory Ledger**: Real-time stock counts, low-stock threshold alerts, manual stock adjustments (*Addition*, *Reduction*, *Set Exact*) with mandatory audit reasons, and an immutable `StockMovement` history log.
- **Order Management & Invoicing**: Strict state transitions (*pending* → *confirmed* → *processing* → *shipped* → *delivered* → *cancelled* / *refunded*), courier tracking recording, and single-execution inventory restoration protection when orders are cancelled or refunded.
- **Customer Management**: Customer profiles, order volume, total spend, and account activation/suspension toggles.
- **Catalog Management**: Category and Collection CRUD with cover images, descriptions, and display ordering.
- **Homepage & Carousel CMS**: Full visual editor for hero slides, announcement bar messages, and promotional banners without touching code.
- **Coupons & Promotions**: Percentage or fixed PKR discounts, start/expiry dates, minimum order amounts, max discount caps, and usage limits.
- **Reports & Downloadable CSV Exports**: Financial and inventory cost/retail valuation reports with downloadable CSV exports for orders, inventory, and products.
- **Store Configuration**: Editable currency, shipping rates, free shipping thresholds, payment method toggles, showroom contact details, and policies.
- **Security Audit Logs**: Chronological log of administrative actions.

---

## 2. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite 6, TypeScript |
| **Styling** | Tailwind CSS v4, Custom CSS luxury variables |
| **Animations** | Framer Motion (respecting `prefers-reduced-motion`) |
| **Icons** | Lucide React |
| **Routing** | React Router v7 with route-level code splitting (`React.lazy` + `Suspense`) |
| **Form Validation** | Zod (on both client and server) |
| **Backend** | Node.js, Express.js, TypeScript (`tsx` in dev, `tsc` in production) |
| **Database** | MongoDB Atlas with Mongoose (with embedded `mongodb-memory-server` fallback for zero-config local dev & automated testing) |
| **Authentication** | JWT stored in secure HTTP-only cookies (`bfs_auth_token`), server-side `tokenVersion` session validation |
| **Image Storage** | Cloudinary integration with local disk upload fallback |
| **Testing** | Vitest, Supertest |

---

## 3. Project Architecture (Unified Full-Stack Structure)

```
binfareedstore/
├── package.json               # Single unified dependencies & workspace scripts
├── tsconfig.json              # Unified TypeScript configuration
├── tsconfig.server.json       # Standalone server build config
├── vite.config.ts             # Vite frontend configuration with /api proxy
├── vercel.json                # Vercel deployment configuration (rewrites to /api & /index.html)
├── index.html                 # HTML shell, fonts, meta tags
├── .env                       # Local environment variables
├── .env.example               # Template environment configuration
│
├── api/                       # Vercel Serverless Function entry point
│   └── index.ts               # Serverless handler forwarding requests to Express
│
├── server/                    # Node.js & Express REST Backend
│   ├── server.ts              # Local standalone server entry point & DB bootstrap
│   ├── app.ts                 # Express application & middleware setup
│   ├── config/                # DB connection & environment configuration
│   ├── models/                # Mongoose schemas (User, Product, Order, etc.)
│   ├── middleware/            # Auth, RBAC, CSRF, NoSQL sanitization, Rate limiters, Error handling
│   ├── routes/                # Modular API routes (auth, products, content, orders, admin)
│   ├── seed/                  # Realistic luxury watch seed data & CLI runner
│   ├── utils/                 # Helpers (slugify, SKU, orderNumber, audit logger, coupon evaluator)
│   └── __tests__/             # Vitest & Supertest automated integration tests
│
├── src/                       # React + Vite TypeScript Frontend
│   ├── main.tsx               # React entry point
│   ├── App.tsx                # Routes, layout shell, drawers, code-splitting
│   ├── index.css              # Tailwind CSS v4 & luxury theme variables
│   ├── types/                 # TypeScript interfaces
│   ├── lib/                   # Typed API client & formatting helpers
│   ├── context/               # StoreContext (Auth, Cart, Wishlist, Notifications)
│   ├── components/            # Reusable UI components (Navbar, HeroCarousel, ProductCard, etc.)
│   └── pages/                 # Storefront and Admin pages
│
├── public/                    # Static assets, PWA icons, audio, manifest
├── uploads/                   # Local uploads directory (fallback)
└── docs/                      # Database & API Documentation
    ├── API.md
    └── DATABASE.md
```

---

## 4. Getting Started & Local Installation

### Prerequisites
- Node.js (v18 or higher recommended; developed on Node v22/v24)
- npm (v9+)

### Installation
Run a single command at root:

```bash
npm install
```

---

## 5. Environment Configuration

Copy `.env.example` to `.env`:

```env
PORT=5005
NODE_ENV=development
FRONTEND_URL=http://localhost:5174

# MongoDB Atlas Connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/binfareedstore?retryWrites=true&w=majority

# Authentication Secret
JWT_SECRET=<random 64+ character string>
JWT_EXPIRES_IN=7d
COOKIE_SECURE=false

# Cloudinary Image Storage (Required on Vercel Serverless)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Payment Gateway Configuration
PAYMENT_PROVIDER=safepay
PAYMENT_API_KEY=
PAYMENT_WEBHOOK_SECRET=<random string>

# Default Administrator Account
ADMIN_EMAIL=admin@binfareedstore.pk
ADMIN_PASSWORD=<your strong password>
```

---

## 6. Seed Accounts & Credentials

The seed script automatically populates the following demonstration accounts:

| Role | Email | Password | Access |
|---|---|---|---|
| **Chief Horologist (Admin)** | `admin@binfareedstore.pk` | set via `ADMIN_PASSWORD` in `.env` | Full Admin Console (`/admin`) & Storefront |

*Tip: The Sign In page (`/login`) includes quick one-click buttons to automatically fill either account for rapid testing.*

### Active Promotional Codes
- `ROYAL10` — 10% privilege discount on orders above Rs. 20,000 (Max discount Rs. 10,000).
- `WELCOME2500` — Flat Rs. 2,500 off on first timepiece orders above Rs. 25,000.
- `COLLECTOR15` — 15% VIP collector discount on orders above Rs. 75,000.

---

## 7. Running the Application in Development

To start both the Express backend and the Vite frontend simultaneously with a single command:

```bash
npm run dev
```

Alternatively, you can run them individually:
- Frontend only: `npm run dev:client`
- Backend only: `npm run dev:server`

Navigate to `http://localhost:5174` in your browser. All `/api` requests are automatically proxied to the backend server running on port `5005`.

---

## 8. Database Seeding & Resetting

To manually re-seed or reset the database catalog with 12 luxury watches, 6 collections, categories, sample orders, and verified customer reviews:

```bash
npm run seed
```

---

## 9. Automated Testing

To run the automated Vitest and Supertest suite:

```bash
npm run test
```

---

## 10. 1-Click Vercel Deployment (Unified Frontend & Backend)

Because the project is unified:
1. Push your code to GitHub.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"** -> import your GitHub repository.
3. Keep default settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./` (Default root)
   - **Build Command**: `npm run build` (or `vite build`)
   - **Output Directory**: `dist`
4. In **Environment Variables**, add:
   - `NODE_ENV=production`
   - `MONGODB_URI` (Your MongoDB Atlas connection string)
   - `JWT_SECRET` (A strong 64+ character random secret)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD`
   - `PAYMENT_PROVIDER`, `PAYMENT_API_KEY`, `PAYMENT_WEBHOOK_SECRET`
5. Click **Deploy**!
   - Vercel automatically deploys your React frontend from `dist`.
   - Vercel automatically creates a Serverless Function from `api/index.ts` handling all `/api/*` endpoints.
   - Frontend and Backend run on the **same domain**, so there are **zero CORS issues**!
