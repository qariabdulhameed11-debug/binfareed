import type { Order, StoreSettings, WhatsAppTemplateKey, WhatsAppTemplates } from '../types';
import { formatPrice } from './api';

export const DEFAULT_TEMPLATES: WhatsAppTemplates = {
  processing:
    'محترم {name}، آپ کا آرڈر *{orderNumber}* تیار کیا جا رہا ہے 📦\nہم آپ کی گھڑی کو احتیاط سے چیک اور پیک کر رہے ہیں۔ روانگی پر آپ کو ٹریکنگ نمبر بھیج دیا جائے گا۔',
  paymentReceived:
    'محترم {name}، آپ کی ادائیگی *{total}* موصول ہو گئی ہے ✅\nآرڈر *{orderNumber}* کنفرم ہے اور جلد روانہ کر دیا جائے گا۔ شکریہ!',
  refunded:
    'محترم {name}، آرڈر *{orderNumber}* کی رقم *{total}* واپس کر دی گئی ہے۔\nکسی بھی سوال کے لیے اسی چیٹ میں رابطہ کریں۔ {storeName}',
  orderPlaced:
    'السلام علیکم {name}!\n{storeName} سے آرڈر کرنے کا بہت شکریہ۔\n\nآرڈر نمبر: *{orderNumber}*\n{items}\nکل رقم: *{total}* ({paymentMethod})\n\nآرڈر کی تصدیق کے لیے براہِ کرم *YES* لکھ کر جواب دیں۔',
  confirmed:
    'محترم {name}، آپ کا آرڈر *{orderNumber}* کنفرم ہو گیا ہے ✅\nہم آپ کی گھڑی {city} روانگی کے لیے تیار کر رہے ہیں۔\nکل رقم: {total}',
  shipped:
    'خوشخبری {name}! 🚚\nآپ کا آرڈر *{orderNumber}* روانہ کر دیا گیا ہے۔\nکورئیر: {courier}\nٹریکنگ نمبر: *{tracking}*',
  delivered:
    'محترم {name}، آپ کا آرڈر *{orderNumber}* آپ تک پہنچ گیا ہے ⌚\nامید ہے آپ کو اپنی نئی گھڑی پسند آئی ہوگی۔\n{storeName} کا انتخاب کرنے کا شکریہ!',
  cancelled:
    'محترم {name}، آپ کا آرڈر *{orderNumber}* منسوخ کر دیا گیا ہے۔\nاگر یہ غلطی سے ہوا ہے تو براہِ کرم اسی میسج کا جواب دیں، ہم آپ کی مدد کریں گے۔',
  paymentReminder:
    'محترم {name}، آرڈر *{orderNumber}* کی ادائیگی *{total}* ابھی باقی ہے۔\nادائیگی کے بعد اس کا اسکرین شاٹ اسی چیٹ میں بھیج دیں۔ شکریہ!',
};

export const TEMPLATE_META: Record<WhatsAppTemplateKey, { label: string; hint: string }> = {
  orderPlaced: { label: 'Order Confirmation', hint: 'Ask a new customer to confirm their order' },
  confirmed: { label: 'Order Confirmed', hint: 'After the customer replies YES' },
  processing: { label: 'Preparing Order', hint: 'Order is being checked and packed' },
  shipped: { label: 'Shipped + Tracking', hint: 'Includes courier and tracking number' },
  delivered: { label: 'Delivered / Thank You', hint: 'After delivery is complete' },
  cancelled: { label: 'Cancelled', hint: 'Let the customer know the order was cancelled' },
  paymentReminder: { label: 'Payment Reminder', hint: 'For pending online / bank payments' },
  paymentReceived: { label: 'Payment Received', hint: 'After you verify the payment screenshot' },
  refunded: { label: 'Refunded', hint: 'Money returned to the customer' },
};

export const PLACEHOLDERS = [
  '{name}',
  '{orderNumber}',
  '{total}',
  '{items}',
  '{city}',
  '{courier}',
  '{tracking}',
  '{paymentMethod}',
  '{storeName}',
];

const PAYMENT_LABEL: Record<string, string> = {
  cod: 'Cash on Delivery',
  bank_transfer: 'Bank Transfer',
  online_card: 'Card Payment',
  online: 'Online Payment (JazzCash / EasyPaisa)',
  jazzcash: 'JazzCash',
  easypaisa: 'EasyPaisa',
};

/** Converts Pakistani numbers (0300…, +92 300…, 0092…) to wa.me format: 923001234567. */
export function toWhatsAppNumber(phone: string): string {
  let d = (phone || '').replace(/\D/g, '');
  if (d.startsWith('0092')) d = d.slice(2);
  else if (d.startsWith('0')) d = `92${d.slice(1)}`;
  else if (d.length === 10 && d.startsWith('3')) d = `92${d}`;
  return d;
}

export function waLink(phone: string, message: string): string {
  return `https://wa.me/${toWhatsAppNumber(phone)}?text=${encodeURIComponent(message)}`;
}

export function getTemplates(settings: StoreSettings | null | undefined): WhatsAppTemplates {
  return { ...DEFAULT_TEMPLATES, ...(settings?.whatsappTemplates || {}) };
}

/** Fills {placeholders} in a template with this order's details. */
export function renderTemplate(
  template: string,
  order: Order,
  settings: StoreSettings | null | undefined
): string {
  const symbol = settings?.currencySymbol || 'Rs.';
  const items = order.items
    .map((i) => `• ${i.name} × ${i.quantity} — ${formatPrice(i.subtotal, symbol)}`)
    .join('\n');
  const values: Record<string, string> = {
    name: order.shippingAddress.fullName.split(' ')[0] || order.shippingAddress.fullName,
    orderNumber: order.orderNumber,
    total: formatPrice(order.totalAmount, symbol),
    items,
    city: order.shippingAddress.city,
    courier: order.courierName || 'Leopards',
    tracking: order.trackingNumber || '(جلد بھیج دیا جائے گا)',
    paymentMethod: PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod,
    storeName: settings?.storeName || 'BinFareedStore',
  };
  return template.replace(/\{(\w+)\}/g, (m, key) => values[key] ?? m);
}

/** The template that fits an order's current state, for one-click suggestions. */
export function suggestedTemplate(order: Order): WhatsAppTemplateKey {
  const sent = new Set((order.whatsappLog || []).map((l) => l.template));
  switch (order.fulfillmentStatus) {
    case 'pending':
      return sent.has('orderPlaced') ? 'confirmed' : 'orderPlaced';
    case 'confirmed':
      return order.paymentStatus === 'paid' && order.paymentMethod !== 'cod' && !sent.has('paymentReceived')
        ? 'paymentReceived'
        : 'confirmed';
    case 'processing':
      return 'processing';
    case 'shipped':
      return 'shipped';
    case 'delivered':
      return 'delivered';
    case 'refunded':
      return 'refunded';
    default:
      return 'cancelled';
  }
}

/** Customer → store message after placing a WhatsApp order. */
export function customerOrderMessage(order: Order, settings: StoreSettings | null | undefined): string {
  const symbol = settings?.currencySymbol || 'Rs.';
  const a = order.shippingAddress;
  return [
    `السلام علیکم ${settings?.storeName || 'BinFareed Store'}!`,
    'میں اپنے آرڈر کی تصدیق کرنا چاہتا/چاہتی ہوں۔',
    '',
    `آرڈر نمبر: *${order.orderNumber}*`,
    ...order.items.map((i) => `• ${i.name} × ${i.quantity} — ${formatPrice(i.subtotal, symbol)}`),
    `کل رقم: *${formatPrice(order.totalAmount, symbol)}* (${PAYMENT_LABEL[order.paymentMethod] || order.paymentMethod})`,
    '',
    `نام: ${a.fullName}`,
    `فون: ${a.phone}`,
    `پتا: ${a.streetAddress}, ${a.city}`,
  ].join('\n');
}
