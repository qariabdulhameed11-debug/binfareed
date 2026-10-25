import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { LiveWatchDial } from './LiveWatchDial';

const SPECS = [
  { value: '28,800', label: 'Vibrations / Hour' },
  { value: '72h', label: 'Power Reserve' },
  { value: '−2/+4', label: 'Seconds / Day' },
  { value: '100m', label: 'Water Resistance' },
];

const MARQUEE = [
  'Swiss Automatic Calibres',
  'Sapphire Crystal',
  'Certified Authentic',
  'Hand-Finished Côtes de Genève',
  'Insured Delivery',
  'Official Warranty',
];

export const MaisonShowcase: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // Pointer-driven 3D tilt of the watch
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 120, damping: 18 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 120, damping: 18 });

  // Scroll parallax for the giant background numeral
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const numeralY = useTransform(scrollYProgress, [0, 1], [80, -80]);

  const onPointerMove = (e: React.PointerEvent) => {
    if (prefersReducedMotion) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  const onPointerLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <section
      ref={ref}
      className="relative overflow-hidden bg-[#08090B] text-[#FAF8F5] grain"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {/* Ambient light */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-[radial-gradient(circle,rgba(197,160,89,0.18),transparent_60%)]" />
      <motion.span
        aria-hidden
        style={{ y: prefersReducedMotion ? 0 : numeralY }}
        className="pointer-events-none select-none absolute right-[-4%] top-6 font-serif-luxury text-[38vw] lg:text-[26vw] leading-none text-transparent [-webkit-text-stroke:1px_rgba(197,160,89,0.12)]"
      >
        XII
      </motion.span>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        <div className="lg:col-span-6 space-y-8 order-2 lg:order-1">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4">
              <span className="h-px w-12 bg-gradient-to-r from-transparent to-[#C5A059]" />
              <span className="text-[11px] uppercase tracking-[0.4em] text-[#DFBD78] font-semibold">
                The Maison
              </span>
            </div>
            <h2 className="font-serif-luxury text-5xl sm:text-6xl lg:text-7xl font-medium leading-[0.95] tracking-tight">
              Time, <em className="text-gold-gradient not-italic font-semibold">mastered</em>
              <br />
              <span className="italic font-normal text-[#FAF8F5]/80">to the eighth beat.</span>
            </h2>
            <p className="text-base sm:text-lg text-[#FAF8F5]/65 leading-relaxed max-w-lg font-light">
              Every timepiece we offer is examined by hand — calibre, crystal, gaskets and
              provenance — before it earns a place in our vault. What you see ticking here is the
              current time, rendered as faithfully as the watches we keep.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-px bg-[#C5A059]/15 border border-[#C5A059]/15 rounded-sm overflow-hidden">
            {SPECS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.1 }}
                className="bg-[#08090B] p-6"
              >
                <p className="font-serif-luxury text-3xl sm:text-4xl text-gold-gradient font-semibold">
                  {s.value}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.28em] text-[#FAF8F5]/50">
                  {s.label}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <Link to="/shop" className="btn-lux-gold group">
              <span>Shop Now</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-500 group-hover:translate-x-1" />
            </Link>
            <Link to="/collections" className="btn-lux-ghost">
              Our Collections
            </Link>
          </div>
        </div>

        <div className="lg:col-span-6 order-1 lg:order-2 flex justify-center [perspective:1200px]">
          <motion.div
            style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="absolute inset-[8%] rounded-full bg-[#C5A059]/25 blur-3xl" />
            <div className="absolute inset-[-6%] rounded-full border border-[#C5A059]/15 animate-[spin_120s_linear_infinite]" />
            <div className="absolute inset-[-12%] rounded-full border border-dashed border-[#C5A059]/10 animate-[spin_200s_linear_infinite_reverse]" />
            <LiveWatchDial className="relative w-[min(78vw,460px)] h-auto drop-shadow-[0_40px_60px_rgba(0,0,0,0.7)]" />
          </motion.div>
        </div>
      </div>

      {/* Marquee */}
      <div className="relative border-y border-[#C5A059]/15 py-5 overflow-hidden">
        <div className="flex w-max marquee-track">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0" aria-hidden={dup === 1}>
              {MARQUEE.map((m) => (
                <span
                  key={m}
                  className="flex items-center gap-10 pr-10 font-serif-luxury italic text-xl sm:text-2xl text-[#FAF8F5]/70 whitespace-nowrap"
                >
                  {m}
                  <span className="text-[#C5A059] not-italic text-sm">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
