import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, Heart, Loader2, CheckCircle, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/index.js';

// ─── Validation Schema ────────────────────────────────────────────────────────
const forgotSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
});

// ─── Success State ────────────────────────────────────────────────────────────
function SuccessState({ email }) {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="text-center space-y-6"
    >
      {/* Animated check icon */}
      <div className="relative mx-auto w-24 h-24">
        {/* Ripple rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-green-500/40"
            initial={{ scale: 0.7, opacity: 0.8 }}
            animate={{ scale: 1.8, opacity: 0 }}
            transition={{
              duration: 2,
              delay: i * 0.6,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        ))}
        {/* Icon container */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 14 }}
          className="absolute inset-0 flex items-center justify-center rounded-full bg-green-500/15 border-2 border-green-500/50"
        >
          <CheckCircle className="w-10 h-10 text-green-400" />
        </motion.div>
      </div>

      <div className="space-y-2">
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-xl font-bold text-white"
        >
          Email sent!
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-400 text-sm leading-relaxed"
        >
          We've sent a password reset link to{' '}
          <span className="text-primary-400 font-medium">{email}</span>.
          <br />
          Check your inbox and follow the instructions.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass p-4 rounded-2xl text-left space-y-2"
      >
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Tip</p>
        <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
          <li>The link expires in <span className="text-yellow-400">10 minutes</span></li>
          <li>Check your spam or junk folder</li>
          <li>You can request a new link after 60 seconds</li>
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col gap-3"
      >
        <Link
          to="/login"
          className="btn-primary w-full justify-center py-3 block text-center"
        >
          Back to Login
        </Link>
      </motion.div>
    </motion.div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values) => {
    try {
      await authService.forgotPassword(values.email);
      setSentEmail(values.email);
      setSubmitted(true);
      toast.success('Reset link sent to your email!');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to send reset email. Try again.';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[5%] left-[-5%] w-[450px] h-[450px] rounded-full bg-primary-600/8 blur-[100px]" />
        <div className="absolute bottom-[5%] right-[-5%] w-[350px] h-[350px] rounded-full bg-teal-600/8 blur-[100px]" />
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
            {submitted ? 'Check your inbox' : 'Forgot password?'}
          </h1>
          {!submitted && (
            <p className="text-gray-400 mt-1 text-sm">
              No worries — we'll send you a reset link
            </p>
          )}
        </div>

        {/* Card */}
        <div className="glass p-8 rounded-3xl">
          <AnimatePresence mode="wait">
            {submitted ? (
              <SuccessState key="success" email={sentEmail} />
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
                <div className="form-group">
                  <label className="label" htmlFor="email">
                    Email address
                  </label>
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
                    <p className="error-message">
                      <span>⚠</span> {errors.email.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full justify-center py-3"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending link…
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Reset Link
                    </>
                  )}
                </button>

                {/* Back to login */}
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors mt-1"
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
