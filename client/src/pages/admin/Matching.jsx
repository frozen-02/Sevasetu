import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  Shuffle, Package, MapPin, User, AlertCircle, Loader2, X,
  Target, ChevronRight, CheckCircle, XCircle, Star, Building2,
  ArrowRight, Search, Info,
} from 'lucide-react';

import { donationService, matchService } from '../../services/index.js';
import {
  formatDate, formatRelativeTime, getInitials, getCategoryIcon,
  getCategoryColor, getConditionColor, getApiError,
} from '../../utils/index.js';

// ─── Score breakdown config ───────────────────────────────────────────────────
const SCORE_FACTORS = [
  { key: 'categoryScore',     label: 'Category Match', weight: 40, color: 'bg-blue-500',   textColor: 'text-blue-400'   },
  { key: 'locationScore',     label: 'Location Match', weight: 20, color: 'bg-teal-500',   textColor: 'text-teal-400'   },
  { key: 'urgencyScore',      label: 'Urgency Level',  weight: 15, color: 'bg-amber-500',  textColor: 'text-amber-400'  },
  { key: 'availabilityScore', label: 'Availability',   weight: 15, color: 'bg-green-500',  textColor: 'text-green-400'  },
  { key: 'conditionScore',    label: 'Condition Match',weight: 10, color: 'bg-purple-500', textColor: 'text-purple-400' },
];

// ─── Score Bar ────────────────────────────────────────────────────────────────
const ScoreBar = ({ label, score, weight, color, textColor }) => {
  const pct = Math.round((score ?? 0) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">{weight}%</span>
          <span className={`font-bold ${textColor}`}>{pct}%</span>
        </div>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, delay: 0.1 }}
        />
      </div>
    </div>
  );
};

// ─── Receiver Match Card ──────────────────────────────────────────────────────
const MatchCard = ({ suggestion, rank, onCreateMatch, onReject, isCreating, isRejecting }) => {
  const [expanded, setExpanded] = useState(rank === 0);
  const receiver = suggestion.receiver;
  const request = suggestion.request;
  const totalScore = Math.round((suggestion.score ?? 0) * 100);

  const scoreColor =
    totalScore >= 80 ? 'text-green-400 bg-green-500/15 border-green-500/25' :
    totalScore >= 60 ? 'text-yellow-400 bg-yellow-500/15 border-yellow-500/25' :
                      'text-gray-400 bg-gray-500/15 border-gray-500/25';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.06 }}
      className="glass-card !p-0 overflow-hidden"
    >
      {/* Card header */}
      <div className="flex items-center gap-4 p-4">
        {/* Rank */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0 ${
          rank === 0 ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30' : 'bg-gray-700/60 text-gray-400'
        }`}>
          #{rank + 1}
        </div>

        {/* Receiver avatar */}
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-primary-600 flex items-center justify-center text-sm font-bold text-white overflow-hidden flex-shrink-0">
          {receiver?.avatar?.url
            ? <img src={receiver.avatar.url} alt={receiver.name} className="w-full h-full object-cover" />
            : getInitials(receiver?.name || 'R')
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-white text-sm truncate">{receiver?.name || 'Unknown'}</p>
            {receiver?.isNGO && (
              <span className="badge-teal text-[10px] px-1.5 py-0.5 flex items-center gap-0.5">
                <Building2 size={9} /> NGO
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">{receiver?.email}</p>
          {receiver?.address?.city && (
            <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
              <MapPin size={10} /> {receiver.address.city}, {receiver.address.state}
            </p>
          )}
        </div>

        {/* Score badge */}
        <div className={`flex-shrink-0 px-3 py-1.5 rounded-xl border text-sm font-bold ${scoreColor}`}>
          {totalScore}%
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-all"
        >
          <Info size={15} />
        </button>
      </div>

      {/* Request info strip */}
      {request && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white/2 border-t border-gray-800/60 text-xs text-gray-400">
          <FileText_Icon className="w-3 h-3 text-cyan-400" />
          <span className="truncate flex-1">"{request.message?.slice(0, 60)}…"</span>
          <span className={`badge capitalize ${
            request.urgencyLevel === 'critical' ? 'badge-danger' :
            request.urgencyLevel === 'high' ? 'badge-warning' :
            request.urgencyLevel === 'medium' ? 'badge-primary' : 'badge-gray'
          }`}>
            {request.urgencyLevel}
          </span>
        </div>
      )}

      {/* Score breakdown (expandable) */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4 border-t border-gray-800/60 space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Score Breakdown</p>
              {SCORE_FACTORS.map(f => (
                <ScoreBar
                  key={f.key}
                  label={f.label}
                  score={suggestion.breakdown?.[f.key] ?? suggestion[f.key]}
                  weight={f.weight}
                  color={f.color}
                  textColor={f.textColor}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <div className="flex gap-2 p-4 pt-0 border-t border-gray-800/40 mt-0 pt-3">
        <button
          onClick={() => onReject && onReject(suggestion)}
          disabled={isCreating || isRejecting}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all disabled:opacity-50 border border-red-500/15"
        >
          <XCircle size={14} /> Skip
        </button>
        <button
          onClick={() => onCreateMatch(suggestion)}
          disabled={isCreating || isRejecting}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-green-500/15 text-green-400 hover:bg-green-500/25 text-sm font-semibold transition-all disabled:opacity-50 border border-green-500/20"
        >
          {isCreating
            ? <Loader2 size={14} className="animate-spin" />
            : <><Shuffle size={14} /> Create Match</>
          }
        </button>
      </div>
    </motion.div>
  );
};

// Need to define FileText_Icon inline to avoid import issues
const FileText_Icon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

// ─── Donation selector card ───────────────────────────────────────────────────
const DonationItem = ({ donation, selected, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border ${
      selected
        ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300'
        : 'bg-white/3 border-white/8 text-gray-400 hover:bg-white/8 hover:text-gray-200'
    }`}
  >
    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-800 flex items-center justify-center text-lg flex-shrink-0">
      {donation.images?.[0]
        ? <img src={donation.images[0]} alt={donation.title} className="w-full h-full object-cover" />
        : getCategoryIcon(donation.category)
      }
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium truncate">{donation.title}</p>
      <p className="text-xs text-gray-600 truncate">{donation.category} · {donation.location?.city}</p>
    </div>
    {selected && <CheckCircle size={16} className="text-indigo-400 flex-shrink-0" />}
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Matching() {
  const queryClient = useQueryClient();
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [search, setSearch] = useState('');
  const [creatingId, setCreatingId] = useState(null);

  // Fetch approved donations
  const { data: donationsData, isLoading: donationsLoading } = useQuery({
    queryKey: ['approved-donations-matching'],
    queryFn: () => donationService.getAll({ status: 'approved', limit: 50 }).then(r => r.data),
  });

  // Fetch suggestions for selected donation
  const { data: suggestionsData, isLoading: suggestionsLoading, isError: suggestionsError } = useQuery({
    queryKey: ['match-suggestions', selectedDonation?._id],
    queryFn: () => matchService.getSuggestions(selectedDonation._id).then(r => r.data?.data ?? r.data),
    enabled: !!selectedDonation,
  });

  const createMatchMutation = useMutation({
    mutationFn: ({ requestId }) => matchService.create({ requestId }),
    onMutate: s => setCreatingId(s.request?._id),
    onSuccess: () => {
      toast.success('Match created! 🎯');
      setCreatingId(null);
      queryClient.invalidateQueries({ queryKey: ['match-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: err => { toast.error(getApiError(err)); setCreatingId(null); },
  });

  const donations = donationsData?.donations ?? [];
  const filtered = search
    ? donations.filter(d =>
        d.title?.toLowerCase().includes(search.toLowerCase()) ||
        d.category?.toLowerCase().includes(search.toLowerCase())
      )
    : donations;

  const suggestions = suggestionsData?.suggestions ?? suggestionsData ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-pink-500/20 rounded-xl">
            <Shuffle className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">AI Matching</h1>
            <p className="text-gray-400 text-sm">Select a donation to see top receiver matches</p>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Left — Donation Selector */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 glass-card !p-0 overflow-hidden"
        >
          <div className="p-4 border-b border-gray-800/80">
            <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Package size={14} className="text-purple-400" />
              Approved Donations
              {donations.length > 0 && (
                <span className="badge-primary text-xs">{donations.length}</span>
              )}
            </h2>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search donations…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input pl-8 text-sm py-2"
              />
            </div>
          </div>

          <div className="p-3 space-y-2 max-h-[60vh] overflow-y-auto">
            {donationsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-14 rounded-xl" />
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package size={32} className="mx-auto mb-2 text-gray-700" />
                <p className="text-sm">No approved donations</p>
              </div>
            ) : (
              filtered.map(d => (
                <DonationItem
                  key={d._id}
                  donation={d}
                  selected={selectedDonation?._id === d._id}
                  onClick={() => setSelectedDonation(d)}
                />
              ))
            )}
          </div>
        </motion.div>

        {/* Right — Match Suggestions */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-3"
        >
          {!selectedDonation ? (
            <div className="glass-card text-center py-20 h-full flex flex-col items-center justify-center gap-4 text-gray-500">
              <Target size={48} className="text-gray-700" />
              <div>
                <p className="font-semibold text-gray-400">Select a Donation</p>
                <p className="text-sm mt-1">Choose an approved donation on the left to see AI-generated receiver matches</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <ArrowRight size={14} className="text-indigo-400" />
                <span>Up to 5 best matches ranked by score</span>
              </div>
            </div>
          ) : suggestionsLoading ? (
            <div className="space-y-4">
              <div className="glass-card flex items-center gap-3">
                <div className="skeleton w-10 h-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-40" />
                  <div className="skeleton h-3 w-56" />
                </div>
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="skeleton w-10 h-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-4 w-32" />
                      <div className="skeleton h-3 w-24" />
                    </div>
                    <div className="skeleton w-16 h-8 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, j) => <div key={j} className="skeleton h-3 rounded" />)}
                  </div>
                </div>
              ))}
            </div>
          ) : suggestionsError ? (
            <div className="glass-card text-center py-16">
              <AlertCircle size={36} className="text-red-400 mx-auto mb-3" />
              <p className="text-gray-300 font-medium">Failed to load suggestions</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="glass-card text-center py-16">
              <Star size={36} className="text-gray-700 mx-auto mb-3" />
              <p className="text-gray-300 font-medium">No matches found</p>
              <p className="text-gray-500 text-sm mt-1">No eligible receiver requests for this donation</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected donation info */}
              <div className="glass-card flex items-center gap-3 bg-indigo-600/5 border-indigo-500/15">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-800 flex items-center justify-center text-xl flex-shrink-0">
                  {selectedDonation.images?.[0]
                    ? <img src={selectedDonation.images[0]} alt={selectedDonation.title} className="w-full h-full object-cover" />
                    : getCategoryIcon(selectedDonation.category)
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{selectedDonation.title}</p>
                  <p className="text-xs text-gray-400">{selectedDonation.category} · {selectedDonation.location?.city}</p>
                </div>
                <span className="badge-primary text-xs">{suggestions.length} matches</span>
              </div>

              {/* Match cards */}
              {suggestions.slice(0, 5).map((s, i) => (
                <MatchCard
                  key={s.request?._id || i}
                  suggestion={s}
                  rank={i}
                  onCreateMatch={sug => createMatchMutation.mutate({ requestId: sug.request?._id })}
                  isCreating={creatingId === s.request?._id && createMatchMutation.isPending}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
