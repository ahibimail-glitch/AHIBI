"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Download, Search, X, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MerchOrder {
  _id: string;
  sessionId: string;
  user?: {
    name: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    variant?: string;
    sku?: string;
  }>;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: 'created' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  shippingAddress: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  createdAt: string;
  payment?: {
    status: string;
    amount: number;
    transactionId?: string;
  };
}

interface OrderStats {
  totalOrders: number;
  paidOrders: number;
  pendingOrders: number;
  failedOrders: number;
  totalRevenue: number;
}

export default function MerchOrders() {
  const [orders, setOrders] = useState<MerchOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<MerchOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<MerchOrder | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [statusFilter, currentPage]);

  useEffect(() => {
    filterOrders();
  }, [orders, statusFilter, searchFilter]);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("admin_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchFilter && { search: searchFilter }),
      });
      
      const response = await fetch(`${apiUrl}/api/admin/merch/orders?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : "",
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Access Denied: You do not have permission to view this page.');
        }
        throw new Error('Failed to fetch orders');
      }
      
      const data = await response.json();
      setOrders(data.data.orders || []);
      setTotalPages(data.data.pagination?.pages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("admin_token");
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${apiUrl}/api/admin/merch/orders/stats`, {
        method: 'GET',
        headers: {
          'Authorization': token ? `Bearer ${token}` : "",
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    if (searchFilter) {
      const searchLower = searchFilter.toLowerCase();
      filtered = filtered.filter(order => 
        order.shippingAddress.fullName.toLowerCase().includes(searchLower) ||
        order.shippingAddress.phone.includes(searchFilter) ||
        order.sessionId.toLowerCase().includes(searchLower) ||
        order.user?.email?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredOrders(filtered);
  };

  const exportToExcel = () => {
    const data = [
      [
        'Order ID',
        'Date',
        'Customer',
        'Phone',
        'Email',
        'Items',
        'Subtotal',
        'Tax',
        'Shipping',
        'Total',
        'Status',
        'Address Line 1',
        'Address Line 2',
        'City',
        'State',
        'Postal Code',
        'Country'
      ]
    ];
  
    filteredOrders.forEach(order => {
      const itemNames = order.items
        .map(item => `${item.name} (x${item.quantity})`)
        .join(', ');
  
      data.push([
        order._id,
        new Date(order.createdAt).toLocaleDateString(),
        order.shippingAddress.fullName,
        order.shippingAddress.phone,
        order.user?.email || '',
        itemNames,
        `₹${order.subtotal.toFixed(2)}`,
        `₹${order.tax.toFixed(2)}`,
        `₹${order.shipping.toFixed(2)}`,
        `₹${order.total.toFixed(2)}`,
        order.status.toUpperCase(),
        order.shippingAddress.addressLine1,
        order.shippingAddress.addressLine2 || '',
        order.shippingAddress.city,
        order.shippingAddress.state,
        order.shippingAddress.postalCode,
        order.shippingAddress.country
      ]);
    });
  
    const ws = XLSX.utils.aoa_to_sheet(data);
  
    // Adjust column widths
    const wscols = [
      { wch: 25 }, // Order ID
      { wch: 15 }, // Date
      { wch: 20 }, // Customer
      { wch: 15 }, // Phone
      { wch: 25 }, // Email
      { wch: 40 }, // Items
      { wch: 12 }, // Subtotal
      { wch: 12 }, // Tax
      { wch: 12 }, // Shipping
      { wch: 12 }, // Total
      { wch: 12 }, // Status
      { wch: 30 }, // Address Line 1
      { wch: 30 }, // Address Line 2
      { wch: 15 }, // City
      { wch: 15 }, // State
      { wch: 12 }, // Postal Code
      { wch: 12 }, // Country
    ];
    ws['!cols'] = wscols;
  
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Merch Orders");
  
    const fileName = `merch-orders-export-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };
  
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value);

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <h3 className="text-lg font-medium text-red-600 mb-2">Error loading orders</h3>
        <p className="text-gray-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Paid Orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.paidOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pendingOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(stats.totalRevenue)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Hornbill Merch Orders
            </CardTitle>
            <CardDescription>Total: {filteredOrders.length} orders</CardDescription>
          </div>
          <Button onClick={exportToExcel} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export to Excel
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filter section */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="search-filter">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-filter"
                  placeholder="Search by name, phone, email, or order ID"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8"
                />
                {searchFilter && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setSearchFilter("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <h3 className="text-lg font-medium text-gray-600 mb-2">No orders found</h3>
              <p className="text-gray-500">There are no orders matching your filters.</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow key={order._id}>
                        <TableCell className="font-mono text-xs">
                          {order._id.slice(-8)}
                        </TableCell>
                        <TableCell>
                          {new Date(order.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.shippingAddress.fullName}</div>
                            <div className="text-sm text-muted-foreground">{order.shippingAddress.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(order.total)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(order.status)}>
                            {order.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order ID: {selectedOrder?._id}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Order Information</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Status:</strong> <Badge variant={getStatusBadgeVariant(selectedOrder.status)}>{selectedOrder.status.toUpperCase()}</Badge></p>
                    <p><strong>Date:</strong> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                    <p><strong>Session ID:</strong> <span className="font-mono text-xs">{selectedOrder.sessionId}</span></p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Payment</h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Status:</strong> {selectedOrder.payment?.status || 'N/A'}</p>
                    <p><strong>Amount:</strong> {formatCurrency(selectedOrder.payment?.amount || selectedOrder.total)}</p>
                    {selectedOrder.payment?.transactionId && (
                      <p><strong>Transaction ID:</strong> <span className="font-mono text-xs">{selectedOrder.payment.transactionId}</span></p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.variant && <p className="text-sm text-muted-foreground">Variant: {item.variant}</p>}
                        {item.sku && <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>}
                      </div>
                      <div className="text-right">
                        <p>Qty: {item.quantity}</p>
                        <p className="font-semibold">{formatCurrency(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Order Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>{formatCurrency(selectedOrder.tax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping:</span>
                      <span>{formatCurrency(selectedOrder.shipping)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Shipping Address</h4>
                  <div className="text-sm space-y-1">
                    <p>{selectedOrder.shippingAddress.fullName}</p>
                    <p>{selectedOrder.shippingAddress.addressLine1}</p>
                    {selectedOrder.shippingAddress.addressLine2 && (
                      <p>{selectedOrder.shippingAddress.addressLine2}</p>
                    )}
                    <p>
                      {selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state}{" "}
                      {selectedOrder.shippingAddress.postalCode}
                    </p>
                    <p>{selectedOrder.shippingAddress.country}</p>
                    <p>Phone: {selectedOrder.shippingAddress.phone}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

