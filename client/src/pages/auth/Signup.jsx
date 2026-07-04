import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Phone, Heart, Loader2, CheckCircle, HandHeart, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/index.js';

// ─── Validation Schema ────────────────────────────────────────────────────────
const signupSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Name must be at least 2 characters')
      .max(60, 'Name must be under 60 characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Enter a valid email address'),
    phone: z
      .string()
      .min(1, 'Phone number is required')
      .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
    role: z.enum(['donor', 'receiver']),
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// ─── Role Card ────────────────────────────────────────────────────────────────
function RoleToggle({ value, onChange }) {
  const roles = [
    {
      id: 'donor',
      label: 'Donor',
      description: 'I want to donate items',
      icon: Heart,
      gradient: 'from-primary-600 to-accent-600',
      border: 'border-primary-500/60',
      bg: 'bg-primary-600/15',
    },
    {
      id: 'receiver',
      label: 'Receiver',
      description: 'I need donated items',
      icon: Inbox,
      gradient: 'from-teal-600 to-primary-600',
      border: 'border-teal-500/60',
      bg: 'bg-teal-600/15',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {roles.map((role) => {
        const Icon = role.icon;
        const active = value === role.id;
        return (
          <button
            key={role.id}
            type="button"
            onClick={() => onChange(role.id)}
            className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer
              ${active
                ? `${role.border} ${role.bg} shadow-lg`
                : 'border-gray-700/50 bg-gray-900/40 hover:border-gray-600/70 hover:bg-gray-800/40'
              }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200
                ${active ? `bg-gradient-to-br ${role.gradient} shadow-md` : 'bg-gray-800'}`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-gray-500'}`} />
            </div>
            <div className="text-center">
              <p className={`font-semibold text-sm transition-colors ${active ? 'text-white' : 'text-gray-400'}`}>
                {role.label}
              </p>
              <p className={`text-[11px] transition-colors ${active ? 'text-gray-300' : 'text-gray-600'}`}>
                {role.description}
              </p>
            </div>
            {active && (
              <motion.div
                layoutId="role-active-dot"
                className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-green-400"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Password Strength ────────────────────────────────────────────────────────
function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { label: '8+ chars', ok: password.length >= 8 },
    { label: 'Uppercase', ok: /[A-Z]/.test(password) },
    { label: 'Number', ok: /[0-9]/.test(password) },
  ];
  const strength = checks.filter((c) => c.ok).length;
  const colors = ['bg-red-500', 'bg-yellow-500', 'bg-green-500'];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < strength ? colors[strength - 1] : 'bg-gray-700'
            }`}
          />
        ))}
      </div>
      <div className="flex gap-3">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`text-[10px] transition-colors ${c.ok ? 'text-green-400' : 'text-gray-600'}`}
          >
            {c.ok ? '✓' : '·'} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Success State ────────────────────────────────────────────────────────────
function SuccessState({ email }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="text-center py-6 space-y-5"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/15 border-2 border-green-500/40 mx-auto"
      >
        <CheckCircle className="w-10 h-10 text-green-400" />
      </motion.div>
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Check your inbox!</h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          We've sent a verification link to{' '}
          <span className="text-primary-400 font-medium">{email}</span>.
          <br />
          Click the link to activate your account.
        </p>
      </div>
      <div className="glass p-4 rounded-2xl text-left space-y-2">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Didn't receive it?</p>
        <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
          <li>Check your spam or junk folder</li>
          <li>Make sure you entered the correct email</li>
          <li>Allow a few minutes for delivery</li>
        </ul>
      </div>
      <Link to="/login" className="btn-primary w-full justify-center py-3 block text-center mt-2">
        Go to Login
      </Link>
    </motion.div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Signup() {
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [registered, setRegistered]   = useState(false);
  const [regEmail, setRegEmail]       = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'donor',
      password: '',
      confirmPassword: '',
    },
  });

  const role     = watch('role');
  const password = watch('password');

  const onSubmit = async (values) => {
    try {
      await authService.register({
        name:     values.name,
        email:    values.email,
        phone:    values.phone,
        role:     values.role,
        password: values.password,
      });
      setRegEmail(values.email);
      setRegistered(true);
      toast.success('Account created! Please verify your email.');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-teal-600/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo + heading */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-600 mb-4 shadow-glow"
          >
            <Heart className="w-8 h-8 text-white fill-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-white font-['Outfit']">
            {registered ? 'Almost there!' : 'Join SEVASETU'}
          </h1>
          {!registered && (
            <p className="text-gray-400 mt-1 text-sm">
              Create your account and start making a difference
            </p>
          )}
        </div>

        {/* Card */}
        <div className="glass p-8 rounded-3xl">
          <AnimatePresence mode="wait">
            {registered ? (
              <SuccessState key="success" email={regEmail} />
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="space-y-5"
              >
                {/* Role toggle */}
                <div className="form-group">
                  <label className="label">I am a…</label>
                  <RoleToggle value={role} onChange={(v) => setValue('role', v, { shouldValidate: true })} />
                  {errors.role && (
                    <p className="error-message"><span>⚠</span> {errors.role.message}</p>
                  )}
                </div>

                {/* Full name */}
                <div className="form-group">
                  <label className="label" htmlFor="name">Full name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      placeholder="Rahul Sharma"
                      className={`input pl-10 ${errors.name ? 'input-error' : ''}`}
                      {...register('name')}
                    />
                  </div>
                  {errors.name && (
                    <p className="error-message"><span>⚠</span> {errors.name.message}</p>
                  )}
                </div>

                {/* Email */}
                <div className="form-group">
                  <label className="label" htmlFor="email">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      className={`input pl-10 ${errors.email ? 'input-error' : ''}`}
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="error-message"><span>⚠</span> {errors.email.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label className="label" htmlFor="phone">Phone number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <div className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-gray-500 pointer-events-none select-none">
                      +91
                    </div>
                    <input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="98765 43210"
                      className={`input pl-[4.25rem] ${errors.phone ? 'input-error' : ''}`}
                      maxLength={10}
                      {...register('phone')}
                    />
                  </div>
                  {errors.phone && (
                    <p className="error-message"><span>⚠</span> {errors.phone.message}</p>
                  )}
                </div>

                {/* Password */}
                <div className="form-group">
                  <label className="label" htmlFor="password">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <input
                      id="password"
                      type={showPass ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Min. 8 chars with uppercase & number"
                      className={`input pl-10 pr-10 ${errors.password ? 'input-error' : ''}`}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      aria-label={showPass ? 'Hide password' : 'Show password'}
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <PasswordStrength password={password} />
                  {errors.password && (
                    <p className="error-message mt-1"><span>⚠</span> {errors.password.message}</p>
                  )}
                </div>

                {/* Confirm password */}
                <div className="form-group">
                  <label className="label" htmlFor="confirmPassword">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      className={`input pl-10 pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                      {...register('confirmPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="error-message"><span>⚠</span> {errors.confirmPassword.message}</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full justify-center py-3 mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating account…
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {!registered && (
            <>
              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-gray-700/60" />
                <span className="text-xs text-gray-500 px-1">Already have an account?</span>
                <div className="flex-1 h-px bg-gray-700/60" />
              </div>

              <Link
                to="/login"
                className="btn-secondary w-full justify-center py-3 block text-center"
              >
                Sign in instead
              </Link>
            </>
          )}
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          By creating an account, you agree to our{' '}
          <span className="text-gray-500 hover:text-gray-400 cursor-pointer transition-colors">Terms of Service</span>{' '}
          and{' '}
          <span className="text-gray-500 hover:text-gray-400 cursor-pointer transition-colors">Privacy Policy</span>.
        </p>
      </motion.div>
    </div>
  );
}
