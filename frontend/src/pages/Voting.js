import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Globe, ArrowLeft, ThumbsUp, ThumbsDown, Award, MessageSquare, Send, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Voting() {
  const { tripId } = useParams();
  const { user } = useAuth();
  const [recs, setRecs] = useState([]);
  const [votes, setVotes] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [votingDest, setVotingDest] = useState(null);
  const [voteComment, setVoteComment] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/trips/${tripId}/recommendations`),
      api.get(`/trips/${tripId}/votes`),
      api.get(`/trips/${tripId}/comments`)
    ]).then(([r, v, c]) => {
      setRecs(r.data);
      setVotes(v.data);
      setComments(c.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [tripId]);

  const castVote = async (destId, score) => {
    try {
      await api.post(`/trips/${tripId}/votes`, { destination_id: destId, score, comment: voteComment });
      const { data } = await api.get(`/trips/${tripId}/votes`);
      setVotes(data);
      setVotingDest(null);
      setVoteComment('');
      toast.success('Vote recorded!');
    } catch {
      toast.error('Failed to vote');
    }
  };

  const addComment = async () => {
    if (!commentText.trim()) return;
    try {
      await api.post(`/trips/${tripId}/comments`, { text: commentText });
      const { data } = await api.get(`/trips/${tripId}/comments`);
      setComments(data);
      setCommentText('');
    } catch {
      toast.error('Failed to add comment');
    }
  };

  const getVoteTally = (destId) => {
    const destVotes = votes.filter(v => v.destination_id === destId);
    const ups = destVotes.filter(v => v.score > 0).length;
    const downs = destVotes.filter(v => v.score < 0).length;
    return { ups, downs, total: ups - downs, voters: destVotes };
  };

  const myVote = (destId) => votes.find(v => v.destination_id === destId && v.user_id === user?.id);

  // Sort by vote tally
  const sorted = [...recs].sort((a, b) => getVoteTally(b.id).total - getVoteTally(a.id).total);

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
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8" data-testid="voting-page">
        <h1 className="font-['Outfit'] text-3xl font-medium text-[#1C1E1D] mb-2">Vote on Destinations</h1>
        <p className="text-[#5C605E] mb-8">Pick your favorites. The top-voted destination wins!</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Voting cards */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              [1,2,3].map(i => <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-[#E5E4DE]" />)
            ) : (
              sorted.map((rec, i) => {
                const tally = getVoteTally(rec.id);
                const mv = myVote(rec.id);
                const isTop = i === 0 && tally.total > 0;
                return (
                  <motion.div key={rec.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`bg-white rounded-2xl border p-5 transition-all ${isTop ? 'border-[#D96A53] shadow-sm' : 'border-[#E5E4DE]'}`}>
                    <div className="flex items-center gap-4">
                      <img src={rec.image} alt={rec.name} className="w-16 h-16 rounded-xl object-cover" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-['Outfit'] font-medium text-[#1C1E1D]">{rec.name}</h3>
                          {isTop && <span className="flex items-center gap-1 text-xs text-[#D96A53] font-medium"><Award className="w-3 h-3" /> Leading</span>}
                        </div>
                        <div className="text-sm text-[#5C605E]">{rec.country} · {rec.avg_budget_per_person} {rec.currency}/pp · Score: {rec.match_score?.overall}</div>
                        {tally.voters.length > 0 && (
                          <div className="flex items-center gap-2 mt-1 text-xs text-[#5C605E]">
                            {tally.voters.map((v, j) => (
                              <span key={j} className={`px-2 py-0.5 rounded-full ${v.score > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {v.user_name}: {v.score > 0 ? '+1' : '-1'}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => castVote(rec.id, 1)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${mv?.score > 0 ? 'bg-green-100 text-green-700' : 'bg-[#F7F6F2] text-[#5C605E] hover:bg-green-50 hover:text-green-600'}`}
                          data-testid={`vote-up-${rec.id}`}>
                          <ThumbsUp className="w-5 h-5" />
                        </button>
                        <div className="text-center min-w-[30px]">
                          <span className={`font-['Outfit'] font-medium text-lg ${tally.total > 0 ? 'text-green-600' : tally.total < 0 ? 'text-red-500' : 'text-[#5C605E]'}`}>
                            {tally.total > 0 ? '+' : ''}{tally.total}
                          </span>
                        </div>
                        <button onClick={() => castVote(rec.id, -1)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${mv?.score < 0 ? 'bg-red-100 text-red-700' : 'bg-[#F7F6F2] text-[#5C605E] hover:bg-red-50 hover:text-red-600'}`}
                          data-testid={`vote-down-${rec.id}`}>
                          <ThumbsDown className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Discussion sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#E5E4DE] p-5">
              <h3 className="font-['Outfit'] font-medium text-[#1C1E1D] mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#2C4234]" /> Group Discussion
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto mb-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-[#5C605E] text-center py-4">No comments yet. Start the discussion!</p>
                ) : (
                  comments.map((c, i) => (
                    <div key={i} className="p-3 bg-[#F7F6F2] rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-[#2C4234]/10 flex items-center justify-center text-[#2C4234] text-xs font-medium">
                          {c.user_name?.charAt(0)?.toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-[#1C1E1D]">{c.user_name}</span>
                        <span className="text-xs text-[#5C605E]">{new Date(c.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-[#5C605E]">{c.text}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <Textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                  placeholder="Share your thoughts..."
                  className="rounded-xl border-[#E5E4DE] bg-[#F7F6F2] text-sm min-h-[60px]"
                  data-testid="comment-input" />
                <Button onClick={addComment} size="icon" className="bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl h-[60px] w-12"
                  data-testid="send-comment-btn">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {sorted.length > 0 && getVoteTally(sorted[0]?.id).total > 0 && (
              <Link to={`/trip/${tripId}/itinerary`}>
                <div className="bg-[#D96A53] rounded-2xl p-5 text-white cursor-pointer hover:bg-[#C25944] transition-all">
                  <Check className="w-5 h-5 mb-2" />
                  <h4 className="font-['Outfit'] font-medium mb-1">Finalize Trip</h4>
                  <p className="text-white/70 text-sm">Go with {sorted[0]?.name} - the group favorite!</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
