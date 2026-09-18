import React, { useEffect, useRef } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import BladeScene from './BladeScene';
import {
  InboxIcon,
  StarIcon,
  PinIcon,
  BookIcon,
  LinkIcon,
  GridIcon,
  CircleUsersIcon,
  EdgeMark,
} from './icons';
import './knifeLife.css';

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap';

function useGoogleFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONT_HREF}"]`)) return;
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = FONT_HREF;
    document.head.append(preconnect1, preconnect2, stylesheet);
  }, []);
}

const FEATURES = [
  { icon: InboxIcon, temper: 'straw', name: 'Unified Inbox', desc: 'SMS, email, live chat, and calls — every conversation with one customer, in one thread.' },
  { icon: StarIcon, temper: 'bronze', name: 'Review Automation', desc: 'Every finished set quietly turns into a five-star ask, at exactly the right moment.' },
  { icon: GridIcon, temper: 'violet', name: 'Reviews Dashboard', desc: 'See your reputation across every listing at a glance, not spread across ten tabs.' },
  { icon: PinIcon, temper: 'blue', name: 'Online Listings', desc: 'Your business, correct and consistent, everywhere a customer might search for it.' },
  { icon: BookIcon, temper: 'straw', name: 'Template Library', desc: 'Proven scripts and campaigns from top-selling reps, ready to send in one click.' },
  { icon: LinkIcon, temper: 'bronze', name: 'Rep Portal Integration', desc: 'Connected straight to your Cutco Rep Portal — no re-typing, no double entry.' },
];

// Placeholder quotes for the concept layout — swap for real rep testimonials before launch.
const TESTIMONIALS = [
  { quote: 'I stopped losing referrals to a messy notes app. Now the follow-up happens whether I remember to or not.', name: 'Danielle R.', role: 'Independent Rep, 6 years' },
  { quote: 'The review requests alone paid for the system in the first month. My listings finally look like one business.', name: 'Marcus T.', role: 'District Manager' },
  { quote: 'Everything routes through the Rep Portal now. I spend evenings with my kids instead of copying contacts.', name: 'Priya K.', role: 'Independent Rep, 3 years' },
];

function Nav() {
  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-6 md:px-12">
      <div className="flex items-center gap-2 text-[var(--linen)]">
        <EdgeMark className="text-[var(--bronze-bright)]" />
        <span className="akl-eyebrow !text-[var(--linen)] tracking-[0.2em]">Automated Knife Life</span>
      </div>
      <nav className="hidden items-center gap-8 text-sm text-[var(--linen-dim)] md:flex">
        <a href="#sharpening" className="transition-colors hover:text-[var(--bronze-bright)]">Platform</a>
        <a href="#features" className="transition-colors hover:text-[var(--bronze-bright)]">Features</a>
        <a href="#circle" className="transition-colors hover:text-[var(--bronze-bright)]">Community</a>
        <a href="#pricing" className="transition-colors hover:text-[var(--bronze-bright)]">Pricing</a>
      </nav>
      <a href="#pricing" className="akl-btn-primary rounded-full px-5 py-2.5 text-sm transition-colors">
        Get Your Edge
      </a>
    </header>
  );
}

function Reveal({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Hero() {
  return (
    <section className="relative z-10 flex min-h-screen flex-col justify-center px-6 md:px-12">
      <div className="max-w-2xl">
        <Reveal>
          <p className="akl-eyebrow mb-6">Marketing automation — built for Cutco reps</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="akl-display text-5xl leading-[1.05] text-[var(--linen)] md:text-7xl">
            Every rep has
            <br />
            an edge.
            <br />
            <span className="text-[var(--bronze-bright)]">We keep it sharp.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-8 max-w-lg text-lg leading-relaxed text-[var(--linen-dim)]">
            One system for texts, calls, email, and reviews — so your book of business
            keeps growing while you&apos;re in the field, not chained to a screen.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="mt-10 flex flex-wrap items-center gap-6">
            <a href="#pricing" className="akl-btn-primary rounded-full px-7 py-4 text-base transition-colors">
              Get Your Edge
            </a>
            <a
              href="#sharpening"
              className="group flex items-center gap-2 text-sm font-medium text-[var(--linen)]"
            >
              See how it works
              <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
            </a>
          </div>
        </Reveal>
      </div>
      <div className="absolute bottom-10 left-6 flex items-center gap-3 text-[var(--linen-dim)] md:left-12">
        <span className="akl-hairline w-10" />
        <span className="akl-eyebrow !text-[var(--linen-dim)]">Scroll to sharpen</span>
      </div>
    </section>
  );
}

function ProblemSection() {
  const pains = [
    'Follow-ups fall through the cracks between demos.',
    'Referrals go cold without a review or a reminder.',
    'Fifteen apps for one conversation with one customer.',
  ];
  return (
    <section className="akl-cut relative z-10 bg-[var(--steel)]/90 px-6 py-28 md:px-12 md:py-36">
      <div className="mx-auto max-w-2xl">
        <Reveal>
          <p className="akl-eyebrow mb-6">01 — The Dull Edge</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="akl-display text-4xl leading-tight text-[var(--linen)] md:text-5xl">
            A blade only cuts if you keep it sharp.
          </h2>
        </Reveal>
        <div className="mt-12 divide-y divide-[rgba(243,238,227,0.12)] border-y border-[rgba(243,238,227,0.12)]">
          {pains.map((pain, i) => (
            <Reveal key={pain} delay={0.1 + i * 0.06}>
              <p className="py-6 text-xl leading-relaxed text-[var(--linen-dim)] md:text-2xl">{pain}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function SolutionSection() {
  return (
    <section id="sharpening" className="akl-cut relative z-10 bg-[var(--steel)]/92 px-6 py-28 md:px-12 md:py-36">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <p className="akl-eyebrow mb-6">02 — The Sharpening</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="akl-display max-w-xl text-4xl leading-tight text-[var(--linen)] md:text-5xl">
            Six passes. One sharper business.
          </h2>
        </Reveal>
        <div id="features" className="mt-16 grid grid-cols-1 gap-x-10 gap-y-12 md:grid-cols-2">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.name} delay={0.05 * i}>
                <div className="flex gap-5">
                  <Icon className="mt-1 shrink-0 text-[var(--bronze-bright)]" />
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-[var(--linen)]">{f.name}</h3>
                      <span className="akl-temper" style={{ color: `var(--temper-${f.temper})` }}>
                        {f.temper}
                      </span>
                    </div>
                    <p className="text-[var(--linen-dim)]">{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.2}>
          <div className="mt-20 flex flex-col items-start gap-6 border-t border-[rgba(243,238,227,0.12)] pt-14 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-5">
              <CircleUsersIcon className="mt-1 shrink-0 text-[var(--bronze-bright)]" />
              <div>
                <h3 className="text-lg font-semibold text-[var(--linen)]">Exclusive Automation Community</h3>
                <p className="mt-2 max-w-md text-[var(--linen-dim)]">
                  A private circle of reps sharpening their systems together — swapping what
                  actually works, not theory.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function TestimonialSection() {
  return (
    <section id="circle" className="akl-cut akl-light relative z-10 px-6 py-28 md:px-12 md:py-36">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <p className="akl-eyebrow !text-[var(--bronze)] mb-6">03 — The Sharpened Circle</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="akl-display max-w-xl text-4xl leading-tight md:text-5xl">
            Reps who found their edge.
          </h2>
        </Reveal>
        <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={0.08 * i}>
              <div className="flex h-full flex-col justify-between border border-[rgba(20,21,26,0.12)] p-7">
                <p className="akl-display text-lg leading-snug text-[var(--steel)]">&ldquo;{t.quote}&rdquo;</p>
                <div className="mt-8">
                  <p className="text-sm font-semibold text-[var(--steel)]">{t.name}</p>
                  <p className="font-mono text-xs uppercase tracking-wide text-[var(--bronze)]">{t.role}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const included = [
    'Unified Inbox — SMS, email, live chat, calls',
    'Review Automation + Reviews Dashboard',
    'Online Listings management',
    'Template Library',
    'Rep Portal Integration',
    'Exclusive Automation Community',
  ];
  return (
    <section id="pricing" className="akl-cut relative z-10 bg-[var(--steel)]/98 px-6 py-28 md:px-12 md:py-36">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <p className="akl-eyebrow mb-6">04 — Get Your Edge</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="akl-display max-w-2xl text-4xl leading-tight text-[var(--linen)] md:text-5xl">
            One system. Fifteen seats. Every rep sharper.
          </h2>
        </Reveal>

        <Reveal delay={0.16}>
          <div className="mt-14 flex flex-col gap-12 border border-[rgba(243,238,227,0.15)] p-8 md:flex-row md:items-center md:justify-between md:p-12">
            <div>
              <p className="font-mono text-6xl font-medium text-[var(--linen)] md:text-7xl">
                $299<span className="text-2xl text-[var(--linen-dim)]">/mo</span>
              </p>
              <p className="mt-3 text-[var(--linen-dim)]">Up to 15 users &middot; Unlimited contacts</p>
            </div>
            <ul className="grid grid-cols-1 gap-3 text-sm text-[var(--linen-dim)] sm:grid-cols-2">
              {included.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1 text-[var(--bronze-bright)]">&mdash;</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="mt-12 flex flex-wrap items-center gap-6">
            <a href="#" className="akl-btn-primary rounded-full px-8 py-4 text-base transition-colors">
              Start Sharpening
            </a>
            <a href="#" className="text-sm font-medium text-[var(--linen)] underline underline-offset-4">
              Book a walkthrough
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-[rgba(243,238,227,0.1)] bg-[var(--steel)] px-6 py-10 md:px-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-sm text-[var(--linen-dim)] md:flex-row">
        <div className="flex items-center gap-2">
          <EdgeMark className="text-[var(--bronze)]" width={18} height={18} />
          <span>Automated Knife Life</span>
        </div>
        <p>A product of Edge Digital Marketing Systems</p>
        <p>&copy; {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
}

export default function AutomatedKnifeLife() {
  useGoogleFonts();
  const containerRef = useRef(null);
  const progressRef = useRef(0);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    progressRef.current = v;
  });

  return (
    <div ref={containerRef} className="akl relative min-h-screen">
      <div className="akl-grain" />
      <BladeScene progressRef={progressRef} className="fixed inset-0 z-0" />
      <Nav />
      <Hero />
      <ProblemSection />
      <SolutionSection />
      <TestimonialSection />
      <PricingSection />
      <Footer />
    </div>
  );
}
