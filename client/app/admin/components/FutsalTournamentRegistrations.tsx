'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Download, Search, Trophy, Calendar, MapPin, Users, IndianRupee, Eye, FileText, User } from 'lucide-react';

type FutsalTournamentRegistration = {
  _id: string;
  tournamentName: string;
  teamName: string;
  registrationNumber?: string;
  invoiceNumber?: string;
  paymentStatus: 'pending' | 'confirmed' | 'failed';
  amount: number;
  currency: string;
  player: {
    fullName: string;
    phone?: string;
    idType: string;
    idNumber: string;
  };
  numberOfPlayers: number;
  players?: string[];
  teamManager?: {
    fullName?: string;
    phone?: string;
    email?: string;
  };
  teamCoach?: {
    fullName?: string;
    phone?: string;
    email?: string;
  };
  tournamentDetails: {
    dates: string;
    venue: string;
    format: string;
    prizePool: string;
  };
  registrationDate?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  createdAt?: string;
};

const idTypeLabels: Record<string, string> = {
  aadhar: 'Aadhar',
  pan: 'PAN',
  voter_id: 'Voter ID',
};

export default function FutsalTournamentRegistrations() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [registrations, setRegistrations] = useState<FutsalTournamentRegistration[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'pending' | 'confirmed' | 'failed'>('confirmed');
  const [selectedRegistration, setSelectedRegistration] = useState<FutsalTournamentRegistration | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
    if (!token) {
      toast.error('Admin authentication required');
      router.replace('/admin/login');
      return;
    }
    fetchRegistrations();
  }, [status]);

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      
      const params = new URLSearchParams();
      if (status !== 'all') params.append('paymentStatus', status);
      
      const response = await fetch(`${apiUrl}/api/futsal/tournaments/registrations?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load registrations');
      }

      const data = await response.json();
      setRegistrations(data.data?.registrations || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load futsal tournament registrations');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!query) return registrations;
    const q = query.toLowerCase();
    return registrations.filter((registration) => {
      return [
        registration.registrationNumber,
        registration.invoiceNumber,
        registration.teamName,
        registration.tournamentName,
        registration.player.fullName,
        registration.teamManager?.fullName,
        registration.teamCoach?.fullName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [registrations, query]);

  const handleViewDetails = (registration: FutsalTournamentRegistration) => {
    setSelectedRegistration(registration);
    setShowDetailModal(true);
  };

  const handleDownloadInvoice = (invoiceNumber: string) => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    window.open(`${apiUrl}/api/futsal/tournaments/invoice/${invoiceNumber}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-600">Confirmed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-600">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-600">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Futsal Tournament Registrations</h2>
          <p className="text-gray-600">Turf Titans Tournament T3</p>
        </div>
        <Button onClick={fetchRegistrations} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{registrations.length}</p>
              </div>
              <Users className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">
                  {registrations.filter(r => r.paymentStatus === 'confirmed').length}
                </p>
              </div>
              <Trophy className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {registrations.filter(r => r.paymentStatus === 'pending').length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  ₹{registrations
                    .filter(r => r.paymentStatus === 'confirmed')
                    .reduce((sum, r) => sum + r.amount, 0)
                    .toLocaleString('en-IN')}
                </p>
              </div>
              <IndianRupee className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by team name, registration number, player name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={status} onValueChange={(value: any) => setStatus(value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Registrations ({filtered.length})</CardTitle>
          <CardDescription>
            {status === 'all' ? 'All registrations' : `${status} registrations`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reg #</TableHead>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                      No registrations found
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((registration) => (
                    <TableRow key={registration._id}>
                      <TableCell className="font-mono text-sm">
                        {registration.registrationNumber || 'N/A'}
                      </TableCell>
                      <TableCell className="font-semibold">{registration.teamName}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{registration.numberOfPlayers} players</p>
                          <p className="text-gray-500 text-xs">
                            Captain: {registration.player?.fullName || 'N/A'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {registration.teamManager?.fullName || 'N/A'}
                      </TableCell>
                      <TableCell>{getStatusBadge(registration.paymentStatus)}</TableCell>
                      <TableCell className="font-semibold">
                        ₹{registration.amount.toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell className="text-sm">
                        {registration.registrationDate
                          ? new Date(registration.registrationDate).toLocaleDateString('en-IN')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewDetails(registration)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {registration.paymentStatus === 'confirmed' && registration.invoiceNumber && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadInvoice(registration.invoiceNumber!)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {showDetailModal && selectedRegistration && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Registration Details</CardTitle>
                  <CardDescription>{selectedRegistration.teamName}</CardDescription>
                </div>
                <Button variant="ghost" onClick={() => setShowDetailModal(false)}>
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Registration Info */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600">Registration Number</p>
                  <p className="font-semibold">{selectedRegistration.registrationNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="font-semibold">{selectedRegistration.invoiceNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Payment Status</p>
                  <p>{getStatusBadge(selectedRegistration.paymentStatus)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="font-semibold">₹{selectedRegistration.amount.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Registration Date</p>
                  <p className="font-semibold">
                    {selectedRegistration.registrationDate
                      ? new Date(selectedRegistration.registrationDate).toLocaleDateString('en-IN')
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Razorpay Payment ID</p>
                  <p className="font-mono text-sm">{selectedRegistration.razorpayPaymentId || 'N/A'}</p>
                </div>
              </div>

              {/* Tournament Details */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Tournament Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span>{selectedRegistration.tournamentDetails.dates}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span className="text-xs">{selectedRegistration.tournamentDetails.venue}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>{selectedRegistration.tournamentDetails.format}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <IndianRupee className="w-4 h-4 text-gray-500" />
                    <span>{selectedRegistration.tournamentDetails.prizePool}</span>
                  </div>
                </div>
              </div>

              {/* Team Manager & Coach */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedRegistration.teamManager?.fullName && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Team Manager</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p><span className="font-semibold">Name:</span> {selectedRegistration.teamManager.fullName}</p>
                      {selectedRegistration.teamManager.phone && (
                        <p><span className="font-semibold">Phone:</span> {selectedRegistration.teamManager.phone}</p>
                      )}
                      {selectedRegistration.teamManager.email && (
                        <p><span className="font-semibold">Email:</span> {selectedRegistration.teamManager.email}</p>
                      )}
                    </CardContent>
                  </Card>
                )}
                {selectedRegistration.teamCoach?.fullName && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Team Coach</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p><span className="font-semibold">Name:</span> {selectedRegistration.teamCoach.fullName}</p>
                      {selectedRegistration.teamCoach.phone && (
                        <p><span className="font-semibold">Phone:</span> {selectedRegistration.teamCoach.phone}</p>
                      )}
                      {selectedRegistration.teamCoach.email && (
                        <p><span className="font-semibold">Email:</span> {selectedRegistration.teamCoach.email}</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Team Details */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Team Details
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-semibold">Number of Players:</span> {selectedRegistration.numberOfPlayers}
                    </div>
                    <div>
                      <span className="font-semibold">Team Name:</span> {selectedRegistration.teamName}
                    </div>
                  </div>
                </div>
              </div>

              {/* Captain/Representative Details */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Captain/Representative Details
                </h3>
                <Card>
                  <CardContent className="p-4 text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Team Captain/Representative</span>
                    </div>
                    <p><span className="font-semibold">Name:</span> {selectedRegistration.player?.fullName || 'N/A'}</p>
                    {selectedRegistration.player?.phone && (
                      <p><span className="font-semibold">Phone:</span> {selectedRegistration.player.phone}</p>
                    )}
                    <p>
                      <span className="font-semibold">ID:</span> {selectedRegistration.player ? `${idTypeLabels[selectedRegistration.player.idType] || selectedRegistration.player.idType} - ${selectedRegistration.player.idNumber}` : 'N/A'}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* All Players Names */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  All Team Players
                </h3>
                <Card>
                  <CardContent className="p-4 text-sm space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">Player Names ({selectedRegistration.numberOfPlayers || 0})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedRegistration.players && selectedRegistration.players.length > 0 ? (
                        selectedRegistration.players.map((playerName: string, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <span className="font-semibold text-green-600">{index + 1}.</span>
                            <span>{playerName || 'N/A'}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-gray-500 col-span-2">No player names available</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              {selectedRegistration.paymentStatus === 'confirmed' && selectedRegistration.invoiceNumber && (
                <Button
                  onClick={() => handleDownloadInvoice(selectedRegistration.invoiceNumber!)}
                  className="w-full"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Download Invoice
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
