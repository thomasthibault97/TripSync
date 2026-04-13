import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Globe, ArrowLeft, Plus, X, BarChart3, Check, Clock, Lock, Users, ChevronRight, Sparkles, Trash2, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const QUICK_POLLS = [
  { q: "Beach or City?", opts: ["Beach", "City", "Both"] },
  { q: "Friday or Thursday departure?", opts: ["Thursday evening", "Friday morning", "Friday afternoon"] },
  { q: "Hotel or Airbnb?", opts: ["Hotel", "Airbnb", "Hostel", "No preference"] },
  { q: "Budget level?", opts: ["Budget-friendly", "Mid-range", "Treat ourselves"] },
  { q: "Activities pace?", opts: ["Chill & relax", "Balanced", "See everything"] },
];

function PollCard({ poll, userId, onVote, onClose }) {
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [voting, setVoting] = useState(false);
  const isCreator = poll.creator_id === userId;
  const isActive = poll.status === 'active';
  const totalVoters = new Set(poll.options.flatMap(o => o.votes.map(v => v.user_id))).size;
  const myVotes = poll.options.map((o, i) => o.votes.some(v => v.user_id === userId) ? i : -1).filter(i => i >= 0);
  const hasVoted = myVotes.length > 0;
  const winnerIdx = poll.options.reduce((best, o, i, arr) => o.votes.length > arr[best].votes.length ? i : best, 0);

  const handleVote = async () => {
    if (selectedOptions.length === 0) return;
    setVoting(true);
    try {
      await onVote(poll.id, selectedOptions);
      setSelectedOptions([]);
    } finally {
      setVoting(false);
    }
  };

  const toggleOption = (idx) => {
    if (!isActive) return;
    if (poll.allow_multiple) {
      setSelectedOptions(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
    } else {
      setSelectedOptions([idx]);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border overflow-hidden ${!isActive ? 'border-[#E5E4DE] opacity-80' : 'border-[#E5E4DE]'}`}
      data-testid={`poll-card-${poll.id}`}>
      {/* Header */}
      <div className={`px-6 pt-5 pb-4 ${!isActive ? 'bg-[#F7F6F2]' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {!isActive && <Lock className="w-4 h-4 text-[#5C605E]" />}
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
              isActive ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-gray-200'
            }`}>
              {poll.status === 'active' ? 'Active' : poll.status === 'closed' ? 'Closed' : 'Expired'}
            </span>
            {poll.allow_multiple && isActive && (
              <span className="text-[10px] text-[#5C605E] bg-[#F7F6F2] px-2 py-0.5 rounded-full border border-[#E5E4DE]">Multiple choice</span>
            )}
          </div>
          {isCreator && isActive && (
            <Button onClick={() => onClose(poll.id)} size="sm" variant="ghost"
              className="text-[#5C605E] hover:text-red-500 rounded-lg h-7 px-2 text-xs"
              data-testid={`close-poll-${poll.id}`}>
              <Lock className="w-3 h-3 mr-1" /> Close
            </Button>
          )}
        </div>
        <h3 className="font-['Outfit'] text-lg font-bold text-[#1C1E1D]">{poll.question}</h3>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-[#5C605E]">
          <span>by {poll.creator_name}</span>
          <span>{totalVoters} vote{totalVoters !== 1 ? 's' : ''}</span>
          {poll.expires_at && isActive && (
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Expires {new Date(poll.expires_at).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="px-6 pb-5 space-y-2.5">
        {poll.options.map((opt, idx) => {
          const voteCount = opt.votes.length;
          const pct = totalVoters > 0 ? Math.round((voteCount / totalVoters) * 100) : 0;
          const isSelected = selectedOptions.includes(idx);
          const iVoted = myVotes.includes(idx);
          const isWinner = !isActive && idx === winnerIdx && voteCount > 0;

          return (
            <button key={idx} onClick={() => isActive && !hasVoted && toggleOption(idx)}
              disabled={!isActive || (hasVoted && !isCreator)}
              className={`w-full text-left rounded-xl border-2 p-3.5 relative overflow-hidden transition-all duration-200
                ${isWinner ? 'border-emerald-400 bg-emerald-50' :
                  isSelected ? 'border-[#D96A53] bg-[#D96A53]/5' :
                  iVoted ? 'border-[#2C4234] bg-[#2C4234]/5' :
                  'border-[#E5E4DE] hover:border-[#D96A53]/40 bg-white'}`}
              data-testid={`poll-option-${poll.id}-${idx}`}>
              {/* Progress bar background */}
              {(hasVoted || !isActive) && (
                <div className={`absolute inset-0 transition-all duration-500 ${isWinner ? 'bg-emerald-100' : iVoted ? 'bg-[#2C4234]/5' : 'bg-[#F7F6F2]'}`}
                  style={{ width: `${pct}%` }} />
              )}
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Checkbox / Radio indicator */}
                  <div className={`w-5 h-5 rounded-${poll.allow_multiple ? 'md' : 'full'} border-2 flex items-center justify-center shrink-0 transition-all
                    ${isSelected || iVoted ? 'border-[#2C4234] bg-[#2C4234]' : 'border-[#E5E4DE]'}`}>
                    {(isSelected || iVoted) && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className={`text-sm font-medium ${iVoted || isWinner ? 'text-[#1C1E1D]' : 'text-[#5C605E]'}`}>
                    {opt.text}
                  </span>
                  {isWinner && <Award className="w-4 h-4 text-emerald-600" />}
                </div>
                <div className="flex items-center gap-2">
                  {(hasVoted || !isActive) && (
                    <>
                      <div className="flex -space-x-1.5">
                        {opt.votes.slice(0, 3).map((v, vi) => (
                          <div key={vi} className="w-5 h-5 rounded-full bg-[#2C4234]/10 border border-white flex items-center justify-center text-[7px] font-bold text-[#2C4234]">
                            {v.user_name?.charAt(0)?.toUpperCase()}
                          </div>
                        ))}
                        {opt.votes.length > 3 && (
                          <div className="w-5 h-5 rounded-full bg-[#E5E4DE] border border-white flex items-center justify-center text-[7px] font-bold text-[#5C605E]">
                            +{opt.votes.length - 3}
                          </div>
                        )}
                      </div>
                      <span className={`text-xs font-bold ${isWinner ? 'text-emerald-600' : 'text-[#5C605E]'}`}>{pct}%</span>
                    </>
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {/* Vote button */}
        {isActive && !hasVoted && selectedOptions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Button onClick={handleVote} disabled={voting}
              className="w-full bg-[#D96A53] hover:bg-[#C25944] text-white rounded-xl h-11 mt-2"
              data-testid={`submit-vote-${poll.id}`}>
              {voting ? 'Submitting...' : `Vote${selectedOptions.length > 1 ? ` (${selectedOptions.length})` : ''}`}
              <Check className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}
        {hasVoted && isActive && (
          <div className="text-center text-xs text-emerald-600 font-medium pt-1 flex items-center justify-center gap-1">
            <Check className="w-3 h-3" /> You voted!
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function GroupPolls() {
  const { tripId } = useParams();
  const { user } = useAuth();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [expiresHours, setExpiresHours] = useState(null);
  const [creating, setCreating] = useState(false);

  const fetchPolls = () => {
    api.get(`/trips/${tripId}/polls`).then(r => setPolls(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchPolls(); }, [tripId]);

  // WebSocket for live poll updates
  useEffect(() => {
    const wsUrl = process.env.REACT_APP_BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(`${wsUrl}/ws/trip/${tripId}`);
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'new_poll' || msg.type === 'poll_vote' || msg.type === 'poll_closed') {
          fetchPolls();
          if (msg.type === 'new_poll') toast.info(`New poll: "${msg.data?.question}"`);
          if (msg.type === 'poll_vote') toast.info(`${msg.data?.user_name} voted on "${msg.data?.question?.slice(0, 30)}"`);
          if (msg.type === 'poll_closed') toast.success(`Poll closed! Winner: ${msg.data?.winner}`);
        }
      } catch {}
    };
    return () => ws.close();
  }, [tripId]);

  const handleCreate = async () => {
    const validOpts = options.filter(o => o.trim());
    if (!question.trim() || validOpts.length < 2) {
      toast.error('Enter a question and at least 2 options');
      return;
    }
    setCreating(true);
    try {
      await api.post(`/trips/${tripId}/polls`, {
        question: question.trim(),
        options: validOpts,
        allow_multiple: allowMultiple,
        expires_in_hours: expiresHours
      });
      toast.success('Poll created! Participants have been notified.');
      setQuestion('');
      setOptions(['', '']);
      setAllowMultiple(false);
      setExpiresHours(null);
      setShowCreate(false);
      fetchPolls();
    } catch {
      toast.error('Failed to create poll');
    } finally {
      setCreating(false);
    }
  };

  const handleVote = async (pollId, optionIndices) => {
    try {
      await api.post(`/trips/${tripId}/polls/${pollId}/vote`, { option_indices: optionIndices });
      toast.success('Vote submitted!');
      fetchPolls();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to vote');
    }
  };

  const handleClose = async (pollId) => {
    try {
      const { data } = await api.post(`/trips/${tripId}/polls/${pollId}/close`);
      toast.success(`Poll closed! Winner: ${data.winner}`);
      fetchPolls();
    } catch {
      toast.error('Failed to close poll');
    }
  };

  const addOption = () => setOptions(prev => [...prev, '']);
  const removeOption = (idx) => setOptions(prev => prev.filter((_, i) => i !== idx));
  const updateOption = (idx, val) => setOptions(prev => prev.map((o, i) => i === idx ? val : o));

  const applyQuickPoll = (qp) => {
    setQuestion(qp.q);
    setOptions(qp.opts);
    setShowCreate(true);
  };

  const activePolls = polls.filter(p => p.status === 'active');
  const closedPolls = polls.filter(p => p.status !== 'active');

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      <nav className="sticky top-0 z-50 glass border-b border-white/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={`/trip/${tripId}`} className="flex items-center gap-2 text-[#5C605E] hover:text-[#1C1E1D]">
            <ArrowLeft className="w-5 h-5" /> Back to trip
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#2C4234]" />
            <span className="font-['Outfit'] font-semibold text-lg text-[#1C1E1D]">TripSync</span>
          </Link>
          <Button onClick={() => setShowCreate(!showCreate)}
            className="bg-[#D96A53] hover:bg-[#C25944] text-white rounded-xl px-4" size="sm"
            data-testid="create-poll-btn">
            <Plus className="w-4 h-4 mr-1" /> New Poll
          </Button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8" data-testid="group-polls-page">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-7 h-7 text-[#D96A53]" />
            <h1 className="font-['Outfit'] text-3xl font-bold text-[#1C1E1D] tracking-tight">Group Polls</h1>
          </div>
          <p className="text-[#5C605E] mb-8">Make decisions together in seconds. One tap to vote.</p>
        </motion.div>

        {/* Create Poll Form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden mb-8">
              <div className="bg-white rounded-2xl border border-[#E5E4DE] p-6 space-y-5">
                <h3 className="font-['Outfit'] font-bold text-[#1C1E1D]">Create a Poll</h3>

                {/* Quick Polls */}
                <div>
                  <Label className="text-xs text-[#5C605E] font-medium mb-2 block">Quick start</Label>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_POLLS.map((qp, i) => (
                      <button key={i} onClick={() => applyQuickPoll(qp)}
                        className="text-xs bg-[#2C4234]/5 text-[#2C4234] px-3 py-1.5 rounded-full hover:bg-[#2C4234]/10 transition-colors font-medium"
                        data-testid={`quick-poll-${i}`}>
                        {qp.q}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-[#1C1E1D] text-sm font-bold mb-1.5 block">Question</Label>
                  <Input value={question} onChange={e => setQuestion(e.target.value)}
                    placeholder="What should the group decide?"
                    className="h-12 rounded-xl border-[#E5E4DE] bg-white text-base"
                    data-testid="poll-question-input" />
                </div>

                <div>
                  <Label className="text-[#1C1E1D] text-sm font-bold mb-2 block">Options</Label>
                  <div className="space-y-2">
                    {options.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <Input value={opt} onChange={e => updateOption(i, e.target.value)}
                          placeholder={`Option ${i + 1}`}
                          className="h-10 rounded-xl border-[#E5E4DE] bg-white flex-1"
                          data-testid={`poll-option-input-${i}`} />
                        {options.length > 2 && (
                          <Button onClick={() => removeOption(i)} size="icon" variant="ghost"
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl h-10 w-10">
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {options.length < 6 && (
                    <Button onClick={addOption} variant="ghost" size="sm"
                      className="text-[#2C4234] hover:bg-[#2C4234]/5 rounded-xl mt-2 text-xs"
                      data-testid="add-option-btn">
                      <Plus className="w-3 h-3 mr-1" /> Add Option
                    </Button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 p-3 bg-[#F7F6F2] rounded-xl">
                    <Switch checked={allowMultiple} onCheckedChange={setAllowMultiple} />
                    <span className="text-sm text-[#1C1E1D]">Allow multiple choices</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button onClick={() => setShowCreate(false)} variant="outline" className="rounded-xl border-[#E5E4DE] flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={creating}
                    className="bg-[#D96A53] hover:bg-[#C25944] text-white rounded-xl flex-1"
                    data-testid="submit-poll-btn">
                    {creating ? 'Creating...' : 'Create Poll'}
                    <Sparkles className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Polls */}
        {loading ? (
          <div className="space-y-4">
            {[1,2].map(i => <div key={i} className="h-48 bg-white rounded-2xl animate-pulse border border-[#E5E4DE]" />)}
          </div>
        ) : polls.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-[#D96A53]/10 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="w-8 h-8 text-[#D96A53]" />
            </div>
            <h2 className="font-['Outfit'] text-xl font-bold text-[#1C1E1D] mb-2">No polls yet</h2>
            <p className="text-[#5C605E] mb-6">Create the first poll and let the group decide!</p>
            <Button onClick={() => setShowCreate(true)} className="bg-[#D96A53] hover:bg-[#C25944] text-white rounded-xl px-6">
              <Plus className="w-4 h-4 mr-2" /> Create First Poll
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {activePolls.length > 0 && (
              <div>
                <h2 className="font-['Outfit'] text-lg font-bold text-[#1C1E1D] mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Active Polls
                </h2>
                <div className="space-y-4">
                  {activePolls.map(p => (
                    <PollCard key={p.id} poll={p} userId={user?.id} onVote={handleVote} onClose={handleClose} />
                  ))}
                </div>
              </div>
            )}
            {closedPolls.length > 0 && (
              <div>
                <h2 className="font-['Outfit'] text-lg font-bold text-[#5C605E] mb-4">Past Polls</h2>
                <div className="space-y-4">
                  {closedPolls.map(p => (
                    <PollCard key={p.id} poll={p} userId={user?.id} onVote={handleVote} onClose={handleClose} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
