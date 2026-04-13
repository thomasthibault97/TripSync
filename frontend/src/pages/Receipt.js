import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Globe, ArrowLeft, FileText, Download, Check, Wallet, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

export default function Receipt() {
  const { tripId } = useParams();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    api.get(`/payments/receipt/${sessionId}`)
      .then(r => setReceipt(r.data))
      .catch(() => toast.error('Receipt not found'))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F6F2]">
      <div className="w-10 h-10 border-3 border-[#2C4234] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!receipt) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F6F2]">
      <div className="text-center">
        <p className="text-[#5C605E] mb-4">No receipt found.</p>
        <Link to={`/trip/${tripId}`}><Button className="rounded-xl">Back to Trip</Button></Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      <nav className="sticky top-0 z-50 glass border-b border-white/40 print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to={`/trip/${tripId}/cost-splitter`} className="flex items-center gap-2 text-[#5C605E] hover:text-[#1C1E1D]">
            <ArrowLeft className="w-5 h-5" /> Back
          </Link>
          <Globe className="w-6 h-6 text-[#2C4234]" />
          <Button onClick={handlePrint} size="sm" className="bg-[#2C4234] hover:bg-[#1F3025] text-white rounded-xl" data-testid="print-receipt-btn">
            <Download className="w-4 h-4 mr-1" /> Print/Save
          </Button>
        </div>
      </nav>

      <div className="max-w-xl mx-auto px-6 py-8" data-testid="receipt-page">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-[#E5E4DE] overflow-hidden">
          {/* Header */}
          <div className="bg-[#2C4234] p-8 text-white text-center">
            <Globe className="w-8 h-8 mx-auto mb-2" />
            <h1 className="font-['Outfit'] text-2xl font-medium">TripSync</h1>
            <p className="text-white/60 text-sm mt-1">Payment Receipt</p>
          </div>

          {/* Receipt ID */}
          <div className="p-6 border-b border-[#E5E4DE] text-center">
            <div className="text-xs text-[#5C605E] uppercase tracking-wider mb-1">Receipt No.</div>
            <div className="font-['Outfit'] text-lg font-medium text-[#1C1E1D]">{receipt.receipt_id}</div>
          </div>

          {/* Details */}
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-[#E5E4DE]">
              <User className="w-5 h-5 text-[#2C4234]" />
              <div>
                <div className="text-xs text-[#5C605E]">Paid by</div>
                <div className="text-sm font-medium text-[#1C1E1D]">{receipt.payer_name}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 pb-3 border-b border-[#E5E4DE]">
              <FileText className="w-5 h-5 text-[#2C4234]" />
              <div>
                <div className="text-xs text-[#5C605E]">Trip</div>
                <div className="text-sm font-medium text-[#1C1E1D]">{receipt.trip_name}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 pb-3 border-b border-[#E5E4DE]">
              <Calendar className="w-5 h-5 text-[#2C4234]" />
              <div>
                <div className="text-xs text-[#5C605E]">Date</div>
                <div className="text-sm font-medium text-[#1C1E1D]">
                  {receipt.paid_at ? new Date(receipt.paid_at).toLocaleString() : receipt.created_at ? new Date(receipt.created_at).toLocaleString() : '-'}
                </div>
              </div>
            </div>

            {/* Items */}
            <div className="mt-4">
              <div className="text-xs text-[#5C605E] uppercase tracking-wider mb-3">Items</div>
              {receipt.items?.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <span className="text-sm text-[#1C1E1D]">{item.description}</span>
                  <span className="text-sm font-medium text-[#1C1E1D]">{item.amount} {receipt.currency}</span>
                </div>
              ))}
              <hr className="my-3 border-[#E5E4DE]" />
              <div className="flex items-center justify-between">
                <span className="font-['Outfit'] font-medium text-[#1C1E1D]">Total</span>
                <span className="font-['Outfit'] text-xl font-medium text-[#D96A53]">{receipt.amount} {receipt.currency}</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className={`p-4 text-center ${receipt.payment_status === 'paid' ? 'bg-green-50' : 'bg-amber-50'}`}>
            <div className="flex items-center justify-center gap-2">
              {receipt.payment_status === 'paid' ? (
                <><Check className="w-5 h-5 text-green-600" /><span className="font-medium text-green-700">Payment Confirmed</span></>
              ) : (
                <><Wallet className="w-5 h-5 text-amber-600" /><span className="font-medium text-amber-700">Payment {receipt.payment_status}</span></>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 text-center text-xs text-[#5C605E] border-t border-[#E5E4DE]">
            TripSync - AI-powered group travel planning
          </div>
        </motion.div>
      </div>
    </div>
  );
}
