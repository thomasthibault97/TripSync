import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Globe, ArrowLeft, Users, MapPin, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPanel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [tab, setTab] = useState('users');

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    Promise.all([api.get('/admin/users'), api.get('/admin/trips')])
      .then(([u, t]) => { setUsers(u.data); setTrips(t.data); })
      .catch(() => toast.error('Failed to load admin data'));
  }, [user, navigate]);

  const deleteUser = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
      toast.success('User deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2]">
      <nav className="sticky top-0 z-50 glass border-b border-white/40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2 text-[#5C605E] hover:text-[#1C1E1D]">
            <ArrowLeft className="w-5 h-5" /> Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#D96A53]" />
            <span className="font-['Outfit'] font-semibold text-[#1C1E1D]">Admin Panel</span>
          </div>
          <div className="w-20" />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8" data-testid="admin-panel-page">
        <h1 className="font-['Outfit'] text-3xl font-medium text-[#1C1E1D] mb-6">Administration</h1>

        <div className="flex gap-3 mb-6">
          <Button onClick={() => setTab('users')} variant={tab === 'users' ? 'default' : 'outline'}
            className={`rounded-xl ${tab === 'users' ? 'bg-[#2C4234] text-white' : 'border-[#E5E4DE]'}`} data-testid="admin-tab-users">
            <Users className="w-4 h-4 mr-2" /> Users ({users.length})
          </Button>
          <Button onClick={() => setTab('trips')} variant={tab === 'trips' ? 'default' : 'outline'}
            className={`rounded-xl ${tab === 'trips' ? 'bg-[#2C4234] text-white' : 'border-[#E5E4DE]'}`} data-testid="admin-tab-trips">
            <MapPin className="w-4 h-4 mr-2" /> Trips ({trips.length})
          </Button>
        </div>

        {tab === 'users' && (
          <div className="bg-white rounded-2xl border border-[#E5E4DE] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-[#D96A53]/10 text-[#D96A53]' : 'bg-[#2C4234]/10 text-[#2C4234]'}`}>
                        {u.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-[#5C605E]">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      {u.role !== 'admin' && (
                        <Button size="sm" variant="ghost" onClick={() => deleteUser(u.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg" data-testid={`delete-user-${u.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {tab === 'trips' && (
          <div className="bg-white rounded-2xl border border-[#E5E4DE] overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Participants</TableHead>
                  <TableHead>Budget</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-sm">{t.trip_type}</TableCell>
                    <TableCell>{t.participants?.length || 0}/{t.group_size}</TableCell>
                    <TableCell className="text-sm">{t.per_person_budget} {t.currency}</TableCell>
                    <TableCell>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{t.status}</span>
                    </TableCell>
                    <TableCell className="text-sm text-[#5C605E]">
                      {t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
