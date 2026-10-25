import mongoose, { Schema, Document } from 'mongoose';

export interface IStoreSettings extends Document {
  key: string;
  storeName: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  standardShippingFee: number;
  expressShippingFee: number;
  freeShippingThreshold: number;
  taxPercentage: number;
  allowGuestCheckout: boolean;
  enableCod: boolean;
  enableOnlinePayment: boolean;
  /** Sender block printed on shipping slips (falls back to store name/address/phone). */
  shipFrom: { name: string; address: string; city: string; phone: string };
  mobileWallets: {
    jazzcash: { enabled: boolean; accountTitle: string; accountNumber: string };
    easypaisa: { enabled: boolean; accountTitle: string; accountNumber: string };
    instructions: string;
  };
  enableBankTransfer: boolean;
  bankDetails: string;
  contactEmail: string;
  contactPhone: string;
  whatsappNumber: string;
  whatsappOrderingEnabled: boolean;
  whatsappTemplates: {
    orderPlaced: string;
    confirmed: string;
    shipped: string;
    delivered: string;
    cancelled: string;
    paymentReminder: string;
    processing: string;
    paymentReceived: string;
    refunded: string;
  };
  showroomAddress: string;
  socialLinks: {
    instagram: string;
    facebook: string;
    youtube: string;
    tiktok: string;
  };
  policies: {
    shippingPolicy: string;
    returnPolicy: string;
    privacyPolicy: string;
    termsOfService: string;
  };
  updatedAt: Date;
}

const StoreSettingsSchema = new Schema<IStoreSettings>(
  {
    key: { type: String, default: 'default', unique: true },
    storeName: { type: String, default: 'BinFareedStore' },
    tagline: { type: String, default: 'Fine Horology & Luxury Timepieces' },
    logoUrl: { type: String, default: '' },
    faviconUrl: { type: String, default: '' },
    currency: { type: String, default: 'PKR' },
    currencySymbol: { type: String, default: 'Rs.' },
    timezone: { type: String, default: 'Asia/Karachi' },
    standardShippingFee: { type: Number, default: 350, min: 0 },
    expressShippingFee: { type: Number, default: 750, min: 0 },
    freeShippingThreshold: { type: Number, default: 25000, min: 0 },
    taxPercentage: { type: Number, default: 0, min: 0, max: 50 },
    allowGuestCheckout: { type: Boolean, default: true },
    enableCod: { type: Boolean, default: true },
    enableOnlinePayment: { type: Boolean, default: false },
    shipFrom: {
      name: { type: String, default: '', trim: true, maxlength: 80 },
      address: { type: String, default: '', trim: true, maxlength: 200 },
      city: { type: String, default: '', trim: true, maxlength: 60 },
      phone: { type: String, default: '', trim: true, maxlength: 30 },
    },
    // JazzCash / EasyPaisa: customer pays manually and sends a screenshot on WhatsApp
    mobileWallets: {
      jazzcash: {
        enabled: { type: Boolean, default: true },
        accountTitle: { type: String, default: 'BinFareed Store', trim: true, maxlength: 80 },
        accountNumber: { type: String, default: '0301 7713866', trim: true, maxlength: 40 },
      },
      easypaisa: {
        enabled: { type: Boolean, default: true },
        accountTitle: { type: String, default: 'BinFareed Store', trim: true, maxlength: 80 },
        accountNumber: { type: String, default: '0301 7713866', trim: true, maxlength: 40 },
      },
      instructions: {
        type: String,
        default: 'Send the exact amount, then share the payment screenshot with your order number on WhatsApp. We confirm your order once payment is verified.',
        maxlength: 500,
      },
    },
    enableBankTransfer: { type: Boolean, default: true },
    bankDetails: {
      type: String,
      default: 'Meezan Bank Limited — Account Title: BinFareed Horology Pvt Ltd — IBAN: PK36MEZN0001234567890102',
    },
    contactEmail: { type: String, default: 'concierge@binfareedstore.pk' },
    contactPhone: { type: String, default: '+92 301 7713866' },
    whatsappNumber: { type: String, default: '+92 301 7713866' },
    whatsappOrderingEnabled: { type: Boolean, default: true },
    // Placeholders: {name} {orderNumber} {total} {items} {city} {courier} {tracking} {storeName} {paymentMethod}
    whatsappTemplates: {
      orderPlaced: {
        type: String,
        default: 'السلام علیکم {name}!\n{storeName} سے آرڈر کرنے کا بہت شکریہ۔\n\nآرڈر نمبر: *{orderNumber}*\n{items}\nکل رقم: *{total}* ({paymentMethod})\n\nآرڈر کی تصدیق کے لیے براہِ کرم *YES* لکھ کر جواب دیں۔',
      },
      confirmed: {
        type: String,
        default: 'محترم {name}، آپ کا آرڈر *{orderNumber}* کنفرم ہو گیا ہے ✅\nہم آپ کی گھڑی {city} روانگی کے لیے تیار کر رہے ہیں۔\nکل رقم: {total}',
      },
      shipped: {
        type: String,
        default: 'خوشخبری {name}! 🚚\nآپ کا آرڈر *{orderNumber}* روانہ کر دیا گیا ہے۔\nکورئیر: {courier}\nٹریکنگ نمبر: *{tracking}*',
      },
      delivered: {
        type: String,
        default: 'محترم {name}، آپ کا آرڈر *{orderNumber}* آپ تک پہنچ گیا ہے ⌚\nامید ہے آپ کو اپنی نئی گھڑی پسند آئی ہوگی۔\n{storeName} کا انتخاب کرنے کا شکریہ!',
      },
      cancelled: {
        type: String,
        default: 'محترم {name}، آپ کا آرڈر *{orderNumber}* منسوخ کر دیا گیا ہے۔\nاگر یہ غلطی سے ہوا ہے تو براہِ کرم اسی میسج کا جواب دیں، ہم آپ کی مدد کریں گے۔',
      },
      processing: {
        type: String,
        default: 'محترم {name}، آپ کا آرڈر *{orderNumber}* تیار کیا جا رہا ہے 📦\nہم آپ کی گھڑی کو احتیاط سے چیک اور پیک کر رہے ہیں۔ روانگی پر آپ کو ٹریکنگ نمبر بھیج دیا جائے گا۔',
      },
      paymentReceived: {
        type: String,
        default: 'محترم {name}، آپ کی ادائیگی *{total}* موصول ہو گئی ہے ✅\nآرڈر *{orderNumber}* کنفرم ہے اور جلد روانہ کر دیا جائے گا۔ شکریہ!',
      },
      refunded: {
        type: String,
        default: 'محترم {name}، آرڈر *{orderNumber}* کی رقم *{total}* واپس کر دی گئی ہے۔\nکسی بھی سوال کے لیے اسی چیٹ میں رابطہ کریں۔ {storeName}',
      },
      paymentReminder: {
        type: String,
        default: 'محترم {name}، آرڈر *{orderNumber}* کی ادائیگی *{total}* ابھی باقی ہے۔\nادائیگی کے بعد اس کا اسکرین شاٹ اسی چیٹ میں بھیج دیں۔ شکریہ!',
      },
    },
    showroomAddress: {
      type: String,
      default: 'Suite 402, MM Alam Road Luxury Galleria, Gulberg III, Lahore, Pakistan',
    },
    socialLinks: {
      instagram: { type: String, default: 'https://instagram.com/binfareedstore' },
      facebook: { type: String, default: 'https://facebook.com/binfareedstore' },
      youtube: { type: String, default: 'https://youtube.com/@binfareedstore' },
      tiktok: { type: String, default: 'https://tiktok.com/@binfareedstore' },
    },
    policies: {
      shippingPolicy: {
        type: String,
        default:
          'All orders are dispatched in tamper-evident luxury packaging via insured courier partners (TCS / Leopards Overland). Standard delivery takes 2–4 business days nationwide across Pakistan; Express Insured Delivery arrives within 24–48 hours in major cities. Complimentary shipping is automatically applied on orders above Rs. 25,000.',
      },
      returnPolicy: {
        type: String,
        default:
          'We offer a 7-day inspection and exchange guarantee from the date of delivery. Timepieces must remain unworn, with all protective factory films intact, original presentation box, warranty card, and tags included.',
      },
      privacyPolicy: {
        type: String,
        default:
          'BinFareedStore respects your privacy. Customer contact, delivery, and order records are encrypted and strictly used for order fulfillment, warranty registration, and requested concierge communications.',
      },
      termsOfService: {
        type: String,
        default:
          'All watches sold by BinFareedStore are covered by our official 2-year mechanical and movement warranty. Prices are listed in Pakistani Rupees (PKR) and validated on the server at checkout.',
      },
    },
  },
  { timestamps: true }
);

export const StoreSettings = mongoose.model<IStoreSettings>('StoreSettings', StoreSettingsSchema);
