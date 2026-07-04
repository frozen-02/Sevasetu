import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CheckCircle, Heart, Shield, Zap, Users, Package,
  TrendingUp, Star, ChevronRight, Globe, Award, Clock,
} from 'lucide-react';
import { cn } from '../utils/index.js';

// ─── Animated Counter ────────────────────────────────────────────────
const Counter = ({ end, suffix = '', prefix = '', duration = 2 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let startTime;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, end, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
};

// ─── Section wrapper with animation ──────────────────────────────────
const FadeIn = ({ children, delay = 0, className = '' }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// ─── Data ─────────────────────────────────────────────────────────────
const STATS = [
  { label: 'Donations Posted', value: 12847, suffix: '+', icon: '📦' },
  { label: 'People Helped', value: 50000, suffix: '+', icon: '🙏' },
  { label: 'Successful Matches', value: 8934, suffix: '+', icon: '🤝' },
  { label: 'NGO Partners', value: 340, suffix: '+', icon: '🏛️' },
];

const FEATURES = [
  {
    icon: Zap,
    gradient: 'from-yellow-500 to-orange-500',
    title: 'AI-Powered Matching',
    description: 'Our intelligent algorithm matches donations to the most suitable receivers using 5-factor weighted scoring for optimal impact.',
  },
  {
    icon: Shield,
    gradient: 'from-green-500 to-teal-500',
    title: 'Verified NGOs',
    description: 'All NGOs and receivers go through a strict verification process to ensure your donations reach genuine beneficiaries.',
  },
  {
    icon: TrendingUp,
    gradient: 'from-blue-500 to-indigo-500',
    title: 'Real-time Analytics',
    description: 'Track your impact with live dashboards, donation trends, and beautiful analytics visualizations.',
  },
  {
    icon: Heart,
    gradient: 'from-pink-500 to-rose-500',
    title: 'Sentiment Analysis',
    description: 'AI-powered feedback analysis ensures quality interactions and transparent, trustworthy ratings across the platform.',
  },
  {
    icon: Globe,
    gradient: 'from-purple-500 to-indigo-500',
    title: 'Pan-India Coverage',
    description: 'Connect with donors and receivers across all 29 states. Location-based matching prioritizes nearby connections.',
  },
  {
    icon: Clock,
    gradient: 'from-teal-500 to-cyan-500',
    title: 'Real-time Notifications',
    description: 'Socket.IO powered instant updates keep you informed about every step — from approval to delivery.',
  },
];

const PROCESS_STEPS = {
  donor: [
    { step: '01', title: 'Register & Verify', desc: 'Create your donor account and verify your email to get started.' },
    { step: '02', title: 'Post Your Donation', desc: 'List items with photos, description, condition, and location.' },
    { step: '03', title: 'Get Matched', desc: 'Our AI engine finds the best receivers for your donation automatically.' },
    { step: '04', title: 'Track Impact', desc: 'See how your donation is used and receive heartfelt feedback.' },
  ],
  receiver: [
    { step: '01', title: 'Register as Receiver', desc: 'Sign up as an NGO or individual receiver and complete verification.' },
    { step: '02', title: 'Browse Donations', desc: 'Search and filter thousands of available donations by category and location.' },
    { step: '03', title: 'Request Items', desc: 'Submit requests with your needs, urgency level, and beneficiary details.' },
    { step: '04', title: 'Receive & Confirm', desc: 'Get matched, coordinate pickup, and confirm delivery through the platform.' },
  ],
};

const TESTIMONIALS = [
  {
    name: 'Priya Sharma',
    role: 'Donor',
    org: 'Mumbai',
    avatar: '👩‍💼',
    rating: 5,
    text: 'SEVASETU made it incredibly easy to donate my old electronics. Within 2 days, they were matched with a school in Pune. Seeing the impact is priceless!',
  },
  {
    name: 'Rajesh Kumar',
    role: 'NGO Director',
    org: 'Helping Hands Foundation',
    avatar: '👨‍🏫',
    rating: 5,
    text: 'As an NGO, we struggle to find donors consistently. SEVASETU has transformed how we receive support — the smart matching system is incredibly accurate.',
  },
  {
    name: 'Anita Singh',
    role: 'Receiver',
    org: 'Delhi',
    avatar: '👩‍🍳',
    rating: 5,
    text: 'I received a complete set of textbooks for my children through SEVASETU. The process was transparent and the platform so easy to use. God bless the team!',
  },
  {
    name: 'Dr. Vikram Nair',
    role: 'Hospital Admin',
    org: 'Kerala Medical Trust',
    avatar: '👨‍⚕️',
    rating: 5,
    text: 'We received critical medical equipment that we couldn\'t afford to buy. SEVASETU bridged the gap between generous donors and our patients beautifully.',
  },
];

const NGO_PARTNERS = ['Red Cross India', 'CRY Foundation', 'Smile Foundation', 'HelpAge India', 'Teach For India', 'Akshaya Patra'];

// ─── MAIN LANDING PAGE ────────────────────────────────────────────────
const Landing = () => {
  const [activeRole, setActiveRole] = useState('donor');

  return (
    <main className="min-h-screen bg-gray-950 overflow-x-hidden">
      {/* ─── HERO SECTION ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-primary-950/20 to-gray-950" />
        <div className="absolute inset-0">
          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
        </div>

        {/* Animated orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-primary-600/15 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 rounded-full bg-accent-600/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-teal-600/10 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary-400/40"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 20}%`,
              animation: `float ${4 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}

        <div className="relative z-10 container-main text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-600/10 border border-primary-500/20 text-primary-400 text-sm font-medium mb-8">
              <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
              AI-Powered NGO Platform — Now Live in India
            </div>

            {/* Heading */}
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black mb-6 font-display leading-tight">
              <span className="text-white">Connect.</span>{' '}
              <span className="gradient-text">Donate.</span>{' '}
              <span className="text-white">Impact.</span>
            </h1>

            <p className="text-xl sm:text-2xl text-gray-400 max-w-3xl mx-auto mb-10 leading-relaxed">
              SEVASETU bridges generous donors with verified NGOs and receivers across India.
              <span className="text-gray-300"> Every donation creates a ripple of change.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <Link
                to="/signup"
                className="group relative inline-flex items-center gap-2 px-8 py-4 font-bold text-white rounded-2xl
                           bg-gradient-to-r from-primary-600 to-accent-600
                           hover:shadow-glow-lg hover:scale-[1.03] transition-all duration-300 text-lg"
              >
                Start Donating
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 px-8 py-4 font-bold text-gray-200 rounded-2xl
                           border border-gray-700 hover:border-gray-500 hover:bg-white/5
                           transition-all duration-300 text-lg"
              >
                Find Donations <ChevronRight size={20} />
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {['👩', '👨', '👩‍🦱', '👨‍🦲', '👩‍🦳'].map((emoji, i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gray-800 border-2 border-gray-950 flex items-center justify-center text-sm">
                      {emoji}
                    </div>
                  ))}
                </div>
                <span>50,000+ people helped</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} className="fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-1">4.9/5 from 2,000+ reviews</span>
              </div>
            </div>
          </motion.div>

          {/* Hero visual - floating card mockup */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-20 relative"
          >
            <div className="relative mx-auto max-w-4xl">
              {/* Main card */}
              <div className="glass rounded-3xl p-6 border border-white/10 shadow-card-hover">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex gap-1.5">
                    {['bg-red-500', 'bg-yellow-500', 'bg-green-500'].map((c) => (
                      <div key={c} className={`w-3 h-3 rounded-full ${c}`} />
                    ))}
                  </div>
                  <div className="flex-1 h-6 bg-gray-800/60 rounded-lg mx-4 flex items-center px-3">
                    <span className="text-xs text-gray-500">sevasetu.in/donor/dashboard</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Total Donations', value: '24', color: 'from-primary-600/30 to-primary-800/20', icon: '📦' },
                    { label: 'Matched', value: '18', color: 'from-green-600/30 to-green-800/20', icon: '🤝' },
                    { label: 'Delivered', value: '15', color: 'from-teal-600/30 to-teal-800/20', icon: '✅' },
                    { label: 'Impact Score', value: '890', color: 'from-yellow-600/30 to-yellow-800/20', icon: '⭐' },
                  ].map((stat) => (
                    <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-4 border border-white/5`}>
                      <div className="text-2xl mb-1">{stat.icon}</div>
                      <div className="text-2xl font-bold text-white">{stat.value}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>
                {/* Fake chart bars */}
                <div className="flex items-end gap-2 h-24">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 100].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t-lg bg-gradient-to-t from-primary-700/60 to-primary-500/40"
                      style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>

              {/* Floating badges */}
              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -left-4 sm:-left-12 top-12 glass rounded-2xl p-3 border border-white/10 text-left hidden sm:block"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎯</span>
                  <div>
                    <p className="text-xs text-gray-400">Match Found!</p>
                    <p className="text-sm font-bold text-white">Score: 94%</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [5, -5, 5] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                className="absolute -right-4 sm:-right-12 bottom-12 glass rounded-2xl p-3 border border-white/10 text-left hidden sm:block"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <p className="text-xs text-gray-400">Delivered!</p>
                    <p className="text-sm font-bold text-white">50 beneficiaries</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── STATS SECTION ──────────────────────────────────────────────── */}
      <section className="py-20 relative" id="impact">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-900/10 via-transparent to-accent-900/10" />
        <div className="container-main relative">
          <FadeIn>
            <p className="text-center text-sm font-semibold text-primary-400 uppercase tracking-widest mb-4">
              Our Impact
            </p>
            <h2 className="text-4xl sm:text-5xl font-black text-center text-white mb-4">
              Numbers That <span className="gradient-text">Matter</span>
            </h2>
            <p className="text-center text-gray-400 max-w-xl mx-auto mb-16">
              Every statistic represents a life touched, a need fulfilled, and generosity in action.
            </p>
          </FadeIn>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <FadeIn key={stat.label} delay={i * 0.1}>
                <div className="glass-card text-center group">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{stat.icon}</div>
                  <div className="text-4xl sm:text-5xl font-black gradient-text mb-2">
                    <Counter end={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-gray-400 text-sm font-medium">{stat.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES SECTION ──────────────────────────────────────────── */}
      <section className="py-24 relative" id="features">
        <div className="container-main">
          <FadeIn className="text-center mb-16">
            <p className="text-sm font-semibold text-teal-400 uppercase tracking-widest mb-4">Features</p>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-4">
              Built for <span className="gradient-text-teal">Real Impact</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Every feature is designed with one goal: making donation matching efficient, transparent, and impactful.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <FadeIn key={feature.title} delay={i * 0.07}>
                  <div className="glass-card group h-full">
                    <div className={cn(
                      'w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-gradient-to-br',
                      feature.gradient
                    )}>
                      <Icon size={22} className="text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:gradient-text transition-all">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── PROCESS SECTION ───────────────────────────────────────────── */}
      <section className="py-24 relative" id="process">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary-950/10 to-transparent" />
        <div className="container-main relative">
          <FadeIn className="text-center mb-12">
            <p className="text-sm font-semibold text-primary-400 uppercase tracking-widest mb-4">How It Works</p>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-6">
              Simple. Fast. <span className="gradient-text">Impactful.</span>
            </h2>

            {/* Role toggle */}
            <div className="inline-flex rounded-2xl bg-gray-900 border border-gray-800 p-1 gap-1">
              {['donor', 'receiver'].map((role) => (
                <button
                  key={role}
                  onClick={() => setActiveRole(role)}
                  className={cn(
                    'px-6 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all duration-200',
                    activeRole === role
                      ? 'bg-gradient-to-r from-primary-600 to-accent-600 text-white shadow-glow'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  I'm a {role}
                </button>
              ))}
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS_STEPS[activeRole].map((step, i) => (
              <FadeIn key={step.step} delay={i * 0.1}>
                <div className="glass-card relative">
                  {i < 3 && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-px bg-gradient-to-r from-primary-500 to-transparent hidden lg:block z-10" />
                  )}
                  <div className="text-5xl font-black gradient-text mb-4 font-display">{step.step}</div>
                  <h3 className="font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ────────────────────────────────────────────────── */}
      <section className="py-24" id="testimonials">
        <div className="container-main">
          <FadeIn className="text-center mb-16">
            <p className="text-sm font-semibold text-pink-400 uppercase tracking-widest mb-4">Testimonials</p>
            <h2 className="text-4xl sm:text-5xl font-black text-white">
              Stories of <span className="bg-clip-text text-transparent bg-gradient-to-r from-pink-400 to-rose-400">Change</span>
            </h2>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={t.name} delay={i * 0.08}>
                <div className="glass-card h-full flex flex-col gap-4">
                  <div className="flex gap-0.5">
                    {[...Array(t.rating)].map((_, i) => (
                      <Star key={i} size={14} className="fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed flex-1 italic">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-xl">
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.role} · {t.org}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── NGO PARTNERS ─────────────────────────────────────────────────── */}
      <section className="py-16 border-y border-gray-800/60">
        <div className="container-main">
          <FadeIn>
            <p className="text-center text-sm text-gray-500 uppercase tracking-widest mb-8 font-medium">
              Trusted by Leading NGOs across India
            </p>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-8">
              {NGO_PARTNERS.map((ngo) => (
                <div key={ngo} className="px-5 py-2.5 glass rounded-full text-sm font-medium text-gray-400 border border-gray-800/60">
                  {ngo}
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── CTA SECTION ─────────────────────────────────────────────────── */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/40 via-gray-950 to-accent-900/30" />
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-primary-600/15 blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full bg-accent-600/15 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="container-main relative text-center">
          <FadeIn>
            <div className="text-6xl mb-6">🤝</div>
            <h2 className="text-4xl sm:text-6xl font-black text-white mb-6 font-display">
              Ready to Make a<br />
              <span className="gradient-text">Difference?</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
              Join 50,000+ people already changing lives through SEVASETU.
              Your generosity, amplified by technology.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/signup"
                className="group relative inline-flex items-center gap-3 px-10 py-5 font-bold text-white rounded-2xl
                           bg-gradient-to-r from-primary-600 to-accent-600 text-lg
                           hover:shadow-glow-lg hover:scale-[1.03] transition-all duration-300"
              >
                <span>Start Your Journey</span>
                <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <div className="flex items-center gap-3 text-gray-400 text-sm">
                <CheckCircle size={16} className="text-green-400" />
                Free forever · No credit card
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800/60 py-16">
        <div className="container-main">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center">
                  🤝
                </div>
                <span className="font-black text-xl font-display">
                  SEVA<span className="gradient-text">SETU</span>
                </span>
              </div>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                Connecting hearts, changing lives. The AI-powered donation matching platform for a better India.
              </p>
              <div className="flex gap-3">
                {['𝕏', 'in', 'f', '▶'].map((icon) => (
                  <button key={icon} className="w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition-colors text-sm font-bold">
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {[
              { title: 'Platform', links: ['Browse Donations', 'Post a Donation', 'NGO Registration', 'Impact Dashboard'] },
              { title: 'Company', links: ['About Us', 'Our Mission', 'Team', 'Press & Media'] },
              { title: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Cookie Policy', 'Contact Us'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="font-semibold text-white mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="divider pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-600">
              <p>© {new Date().getFullYear()} SEVASETU. All rights reserved. Built with ❤️ for India.</p>
              <p className="flex items-center gap-1">
                <Award size={14} className="text-primary-400" />
                Award-Winning NGO Platform
              </p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Landing;
