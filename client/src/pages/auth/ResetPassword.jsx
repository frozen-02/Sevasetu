import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, ArrowLeft, Heart, Loader2, CheckCircle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/index.js';

// ─── Validation Schema ────────────────────────────────────────────────────────
const resetSchema = z
  .object({
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
  const labels = ['Weak', 'Fair', 'Strong'];

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < strength ? colors[strength - 1] : 'bg-gray-700'
            }`}
          />
        ))}
        {strength > 0 && (
          <span className={`text-[10px] font-medium ml-1 ${colors[strength - 1].replace('bg-', 'text-')}`}>
            {labels[strength - 1]}
          </span>
        )}
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
function SuccessState() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="text-center space-y-6"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 12 }}
        className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/15 border-2 border-green-500/40 mx-auto"
      >
        <CheckCircle className="w-10 h-10 text-green-400" />
      </motion.div>

      <div className="space-y-2">
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl font-bold text-white"
        >
          Password reset!
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-400 text-sm leading-relaxed"
        >
          Your password has been updated successfully.
          <br />
          You can now sign in with your new password.
        </motion.p>
      </div>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        onClick={() => navigate('/login', { replace: true })}
        className="btn-primary w-full justify-center py-3"
      >
        Go to Login
      </motion.button>
    </motion.div>
  );
}

// ─── Invalid Token State ──────────────────────────────────────────────────────
function InvalidToken() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="text-center space-y-6"
    >
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/15 border-2 border-red-500/40 mx-auto">
        <ShieldCheck className="w-10 h-10 text-red-400" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-white">Link expired</h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          This password reset link is invalid or has expired.
          <br />
          Reset links are only valid for 10 minutes.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <Link to="/forgot-password" className="btn-primary w-full justify-center py-3 block text-center">
          Request New Link
        </Link>
        <Link to="/login" className="btn-secondary w-full justify-center py-3 block text-center">
          Back to Login
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ResetPassword() {
  const { token } = useParams();
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus]           = useState('idle'); // idle | success | invalid

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const password = watch('password');

  const onSubmit = async (values) => {
    if (!token) {
      setStatus('invalid');
      return;
    }
    try {
      await authService.resetPassword(token, { password: values.password });
      toast.success('Password reset successfully!');
      setStatus('success');
    } catch (err) {
      const code = err?.response?.status;
      if (code === 400 || code === 404 || code === 410) {
        setStatus('invalid');
        toast.error('Reset link is invalid or has expired.');
      } else {
        const msg = err?.response?.data?.message || 'Failed to reset password. Please try again.';
        toast.error(msg);
      }
    }
  };

  // No token in URL
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass p-8 rounded-3xl w-full max-w-md">
          <InvalidToken />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] rounded-full bg-primary-600/8 blur-[100px]" />
        <div className="absolute bottom-[5%] left-[-5%] w-[350px] h-[350px] rounded-full bg-accent-600/8 blur-[100px]" />
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
            {status === 'success' ? 'All done!' : status === 'invalid' ? 'Oops!' : 'Reset password'}
          </h1>
          {status === 'idle' && (
            <p className="text-gray-400 mt-1 text-sm">
              Choose a strong new password for your account
            </p>
          )}
        </div>

        {/* Card */}
        <div className="glass p-8 rounded-3xl">
          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <SuccessState key="success" />
            ) : status === 'invalid' ? (
              <InvalidToken key="invalid" />
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
                {/* New password */}
                <div className="form-group">
                  <label className="label" htmlFor="password">New password</label>
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
                    <p className="error-message mt-1">
                      <span>⚠</span> {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Confirm new password */}
                <div className="form-group">
                  <label className="label" htmlFor="confirmPassword">Confirm new password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    <input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Repeat your new password"
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
                    <p className="error-message">
                      <span>⚠</span> {errors.confirmPassword.message}
                    </p>
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
                      Resetting password…
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>

                {/* Back to login */}
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
