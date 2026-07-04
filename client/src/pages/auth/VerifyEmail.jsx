import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, Heart, ArrowRight, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/index.js';
import useAuthStore from '../../store/authStore.js';

// ─── Role-based redirect helper ───────────────────────────────────────────────
const getRoleRedirect = (role) => {
  switch (role) {
    case 'admin':    return '/admin/dashboard';
    case 'donor':    return '/donor/dashboard';
    case 'receiver': return '/receiver/dashboard';
    default:         return '/dashboard';
  }
};

// ─── Loading State ────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <motion.div
      key="loading"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="text-center space-y-6 py-4"
    >
      {/* Animated spinner with gradient ring */}
      <div className="relative mx-auto w-24 h-24">
        <div className="absolute inset-0 rounded-full border-4 border-gray-700/50" />
        <motion.div
          className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 border-r-accent-500"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Heart className="w-8 h-8 text-primary-400 fill-primary-400/30" />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-bold text-white">Verifying your email…</h3>
        <p className="text-gray-400 text-sm">
          Please hold on while we verify your account.
        </p>
      </div>

      {/* Animated progress dots */}
      <div className="flex items-center justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary-500"
            animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Success State ────────────────────────────────────────────────────────────
function SuccessState({ user, onRedirect, countdown }) {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="text-center space-y-6 py-4"
    >
      {/* Animated success icon */}
      <div className="relative mx-auto w-24 h-24">
        {[0, 1].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border-2 border-green-500/40"
            initial={{ scale: 0.8, opacity: 0.6 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{
              duration: 2,
              delay: i * 0.8,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        ))}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 200, damping: 12 }}
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
          Email verified! 🎉
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-400 text-sm leading-relaxed"
        >
          {user?.name
            ? `Welcome to SEVASETU, ${user.name.split(' ')[0]}!`
            : 'Welcome to SEVASETU!'}
          <br />
          Your account is now active and ready to use.
        </motion.p>
      </div>

      {/* Role badge */}
      {user?.role && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600/20 border border-primary-500/30"
        >
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm text-primary-300 font-medium capitalize">
            {user.role} account verified
          </span>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="space-y-3"
      >
        <button
          onClick={onRedirect}
          className="btn-primary w-full justify-center py-3"
        >
          <ArrowRight className="w-4 h-4" />
          Go to Dashboard
        </button>

        {countdown > 0 && (
          <p className="text-xs text-gray-500">
            Redirecting automatically in{' '}
            <span className="text-primary-400 font-medium">{countdown}s</span>…
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────
function ErrorState({ message, onRetry, isRetrying }) {
  return (
    <motion.div
      key="error"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="text-center space-y-6 py-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-500/15 border-2 border-red-500/40 mx-auto"
      >
        <XCircle className="w-10 h-10 text-red-400" />
      </motion.div>

      <div className="space-y-2">
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="text-xl font-bold text-white"
        >
          Verification failed
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="text-gray-400 text-sm leading-relaxed"
        >
          {message || 'This verification link is invalid or has expired.'}
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="glass p-4 rounded-2xl text-left space-y-2"
      >
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Why might this happen?</p>
        <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
          <li>The link has expired (valid for 24 hours)</li>
          <li>The link has already been used</li>
          <li>The link was copied incorrectly</li>
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col gap-3"
      >
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="btn-primary w-full justify-center py-3"
        >
          {isRetrying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Resending…
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Resend Verification Email
            </>
          )}
        </button>
        <Link to="/login" className="btn-secondary w-full justify-center py-3 block text-center">
          Back to Login
        </Link>
      </motion.div>
    </motion.div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function VerifyEmail() {
  const { token }        = useParams();
  const navigate         = useNavigate();
  const { user, setUser } = useAuthStore();

  const [status, setStatus]       = useState('loading'); // loading | success | error
  const [errorMsg, setErrorMsg]   = useState('');
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [isRetrying, setIsRetrying]     = useState(false);
  const [countdown, setCountdown]       = useState(5);

  // Auto-verify on mount
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMsg('No verification token found in the link.');
      return;
    }

    const verify = async () => {
      try {
        const { data } = await authService.verifyEmail(token);
        const resolvedUser = data?.user || user;
        setVerifiedUser(resolvedUser);
        if (data?.user) setUser(data.user);
        setStatus('success');
        toast.success('Email verified successfully!');
      } catch (err) {
        const msg = err?.response?.data?.message || 'Verification failed. The link may have expired.';
        setErrorMsg(msg);
        setStatus('error');
        toast.error(msg);
      }
    };

    verify();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-redirect countdown on success
  useEffect(() => {
    if (status !== 'success') return;
    if (countdown <= 0) {
      handleRedirect();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRedirect = () => {
    const role = verifiedUser?.role || user?.role;
    navigate(getRoleRedirect(role), { replace: true });
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await authService.resendVerification();
      toast.success('Verification email resent! Check your inbox.');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to resend verification email.';
      toast.error(msg);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      {/* Background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-[-5%] left-[20%] w-[400px] h-[400px] rounded-full bg-primary-600/8 blur-[100px]" />
        <div className="absolute bottom-[10%] right-[5%] w-[350px] h-[350px] rounded-full bg-teal-600/8 blur-[100px]" />
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
            {status === 'loading' ? 'Verifying…' : status === 'success' ? 'Verified!' : 'Verification Failed'}
          </h1>
          <p className="text-gray-400 mt-1 text-sm">
            {status === 'loading'
              ? 'Confirming your email address'
              : status === 'success'
              ? 'Your account is now active'
              : 'Something went wrong with your link'}
          </p>
        </div>

        {/* Card */}
        <div className="glass p-8 rounded-3xl">
          <AnimatePresence mode="wait">
            {status === 'loading' && <LoadingState key="loading" />}
            {status === 'success' && (
              <SuccessState
                key="success"
                user={verifiedUser || user}
                onRedirect={handleRedirect}
                countdown={countdown}
              />
            )}
            {status === 'error' && (
              <ErrorState
                key="error"
                message={errorMsg}
                onRetry={handleRetry}
                isRetrying={isRetrying}
              />
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Need help?{' '}
          <span className="text-gray-500 hover:text-gray-400 cursor-pointer transition-colors">
            Contact support
          </span>
        </p>
      </motion.div>
    </div>
  );
}
