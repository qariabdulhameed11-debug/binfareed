import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnouncementMessage {
  _id?: mongoose.Types.ObjectId;
  text: string;
  link?: string;
  isActive: boolean;
}

export interface IHeroSlide {
  _id?: mongoose.Types.ObjectId;
  badgeText: string;
  title: string;
  subtitle: string;
  desktopImage: string;
  mobileImage: string;
  primaryCtaText: string;
  primaryCtaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface IPromoBanner {
  badgeText: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  ctaText: string;
  ctaLink: string;
  couponHighlight?: string;
  isActive: boolean;
}

export interface IBrandStory {
  eyebrow: string;
  heading: string;
  leadParagraph: string;
  bodyParagraph: string;
  image: string;
  highlights: { label: string; value: string; description: string }[];
  ctaText: string;
  ctaLink: string;
}

export interface IHomepageContent extends Document {
  key: string;
  announcementBar: {
    isEnabled: boolean;
    rotateIntervalMs: number;
    messages: IAnnouncementMessage[];
  };
  carouselSettings: {
    autoRotate: boolean;
    intervalMs: number;
  };
  heroSlides: IHeroSlide[];
  promoBanner: IPromoBanner;
  brandStory: IBrandStory;
  sectionVisibility: {
    heroCarousel: boolean;
    featuredCollections: boolean;
    bestSellers: boolean;
    promoBanner: boolean;
    newArrivals: boolean;
    brandStory: boolean;
    customerReviews: boolean;
    newsletter: boolean;
  };
  updatedAt: Date;
}

const HeroSlideSchema = new Schema<IHeroSlide>(
  {
    badgeText: { type: String, default: 'EXCLUSIVE HOROLOGY' },
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    desktopImage: { type: String, required: true },
    mobileImage: { type: String, required: true },
    primaryCtaText: { type: String, default: 'Shop Collection' },
    primaryCtaLink: { type: String, default: '/shop' },
    secondaryCtaText: { type: String, default: 'Discover the Collection' },
    secondaryCtaLink: { type: String, default: '/collections' },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const HomepageContentSchema = new Schema<IHomepageContent>(
  {
    key: { type: String, default: 'default', unique: true },
    announcementBar: {
      isEnabled: { type: Boolean, default: true },
      rotateIntervalMs: { type: Number, default: 4500 },
      messages: [
        {
          text: { type: String, required: true },
          link: { type: String, default: '/shop' },
          isActive: { type: Boolean, default: true },
        },
      ],
    },
    carouselSettings: {
      autoRotate: { type: Boolean, default: true },
      intervalMs: { type: Number, default: 6000 },
    },
    heroSlides: { type: [HeroSlideSchema], default: [] },
    promoBanner: {
      badgeText: { type: String, default: 'LIMITED COLLECTOR EDITION' },
      title: { type: String, default: 'The Sovereign Chronograph Series' },
      subtitle: { type: String, default: 'Crafted in Surgical-Grade Steel & Sapphire Crystal' },
      description: {
        type: String,
        default:
          'Experience precision automatic engineering with complimentary insured express delivery and a 2-year official BinFareedStore warranty.',
      },
      image: {
        type: String,
        default: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1600&q=85',
      },
      ctaText: { type: String, default: 'Explore Limited Edition' },
      ctaLink: { type: String, default: '/shop?featured=true' },
      couponHighlight: { type: String, default: 'ROYAL10' },
      isActive: { type: Boolean, default: true },
    },
    brandStory: {
      eyebrow: { type: String, default: 'THE BINFAREED ATELIER' },
      heading: { type: String, default: 'A Legacy of Timeless Craftsmanship & Horological Excellence' },
      leadParagraph: {
        type: String,
        default:
          'Founded with an uncompromising passion for fine watchmaking, BinFareedStore curates authenticated luxury, mechanical, and contemporary timepieces for discerning collectors across Pakistan.',
      },
      bodyParagraph: {
        type: String,
        default:
          'Every watch in our vault undergoes a rigorous multi-point horological inspection covering movement accuracy, water-resistance integrity, crystal clarity, and bracelet finish before being sealed in our signature presentation box.',
      },
      image: {
        type: String,
        default: 'https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?auto=format&fit=crop&w=1200&q=85',
      },
      highlights: {
        type: [
          {
            label: { type: String, default: '' },
            value: { type: String, default: '' },
            description: { type: String, default: '' },
          },
        ],
        default: [
          {
            label: '100% Authenticated',
            value: 'Certified Quality',
            description: 'Every timepiece is inspected by master watch technicians prior to dispatch.',
          },
          {
            label: 'Official Warranty',
            value: '2-Year Coverage',
            description: 'Comprehensive movement and craftsmanship protection with dedicated service support.',
          },
          {
            label: 'Insured Delivery',
            value: 'Nationwide Express',
            description: 'Tamper-evident luxury packaging delivered securely to every city in Pakistan.',
          },
        ],
      },
      ctaText: { type: String, default: 'Explore Our Catalog' },
      ctaLink: { type: String, default: '/shop' },
    },
    sectionVisibility: {
      heroCarousel: { type: Boolean, default: true },
      featuredCollections: { type: Boolean, default: true },
      bestSellers: { type: Boolean, default: true },
      promoBanner: { type: Boolean, default: true },
      newArrivals: { type: Boolean, default: true },
      brandStory: { type: Boolean, default: true },
      customerReviews: { type: Boolean, default: true },
      newsletter: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const HomepageContent = mongoose.model<IHomepageContent>('HomepageContent', HomepageContentSchema);
