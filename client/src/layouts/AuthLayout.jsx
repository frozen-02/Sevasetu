import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex bg-gray-950">
      {/* Left side - visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900/80 via-surface-dark to-accent-900/50" />
        <div className="absolute inset-0 bg-mesh-gradient" />
        
        {/* Animated orbs */}
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-primary-600/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-accent-600/15 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-teal-600/20 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-6xl mb-6">🤝</div>
            <h1 className="text-5xl font-black text-white mb-4 font-display">
              SEVA<span className="gradient-text">SETU</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Connecting Hearts,<br />Changing Lives
            </p>
            
            <div className="grid grid-cols-3 gap-6 mt-12">
              {[
                { label: 'Donations', value: '10K+', icon: '📦' },
                { label: 'Receivers', value: '50K+', icon: '🏠' },
                { label: 'Matches', value: '8K+', icon: '🤝' },
              ].map((stat) => (
                <div key={stat.label} className="glass p-4 rounded-2xl text-center">
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className="text-xl font-bold gradient-text">{stat.value}</div>
                  <div className="text-xs text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right side - form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <span className="text-4xl">🤝</span>
            <h1 className="text-3xl font-black mt-2">
              SEVA<span className="gradient-text">SETU</span>
            </h1>
          </div>
          <Outlet />
        </motion.div>
      </div>
    </div>
  );
};

export default AuthLayout;
