import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useBackend, useAuth } from "../hooks/useAuth";
import type { AssetCategory, AssetStatus } from "~backend/asset/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  Filter, 
  Download, 
  Plus,
  Eye,
  RefreshCw,
  Loader2,
  AlertCircle,
  Upload,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  QrCode,
  Package,
  Calendar,
  User
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

type SortField = "id" | "asset_id" | "product_name" | "date_acquired";
type SortOrder = "asc" | "desc";

export default function AssetList() {
  const { toast } = useToast();
  const backend = useBackend();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<AssetCategory | "all">("all");
  const [status, setStatus] = useState<AssetStatus | "all">("all");
  const [assignedUser, setAssignedUser] = useState("all");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [sortField, setSortField] = useState<SortField>("date_acquired");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel");

  const { data: assetsData, isLoading, error, refetch, isError } = useQuery({
    queryKey: ["assets", search, category, status, assignedUser, page, limit, sortField, sortOrder],
    queryFn: async () => {
      console.log("Fetching assets with params:", { 
        search, category, status, assignedUser, page, limit, sortField, sortOrder 
      });
      try {
        const result = await backend.asset.listAssets({
          search: search || undefined,
          category: category === "all" ? undefined : category,
          status: status === "all" ? undefined : status,
          assignedUser: assignedUser === "all" ? undefined : assignedUser,
          limit,
          offset: page * limit,
          sortField,
          sortOrder,
        });
        console.log("Assets fetched successfully:", result);
        return result;
      } catch (error) {
        console.error("Error fetching assets:", error);
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const handleExport = async () => {
    try {
      const response = await backend.asset.exportAssets({
        format: exportFormat,
        search: search || undefined,
        category: category === "all" ? undefined : category,
        status: status === "all" ? undefined : status,
        assignedUser: assignedUser === "all" ? undefined : assignedUser,
      });

      // Create download link from base64 binary data
      const byteArray = base64ToUint8Array(response.data);
      const blob = new Blob([byteArray], { type: response.contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = response.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setIsExportDialogOpen(false);
      toast({
        title: "Export successful",
        description: `Assets exported as ${exportFormat.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export failed",
        description: "Failed to export assets",
        variant: "destructive",
      });
    }
  };

  const handleRefresh = () => {
    console.log("Refreshing assets...");
    refetch();
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Set new field with default order
      setSortField(field);
      setSortOrder("desc"); // Default to desc
    }
    setPage(0); // Reset to first page when sorting changes
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(0); // Reset to first page when limit changes
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === "asc" ? 
      <ArrowUp className="w-4 h-4 text-blue-600" /> : 
      <ArrowDown className="w-4 h-4 text-blue-600" />;
  };

  const getCategoryColor = (category: AssetCategory) => {
    switch (category) {
      case "laptop": return "default";
      case "network_device": return "secondary";
      case "printer": return "outline";
      case "license": return "destructive";
      case "scanner": return "default";
      case "consumable": return "secondary";
      default: return "default";
    }
  };

  const getStatusColor = (status: AssetStatus) => {
    switch (status) {
      case "in_use": return "default";
      case "available": return "secondary";
      case "out_of_order": return "destructive";
      case "maintenance": return "outline";
      case "retired": return "secondary";
      default: return "default";
    }
  };

  const formatCategoryName = (category: AssetCategory) => {
    return category.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatStatusName = (status: AssetStatus) => {
    return status.replace('_', ' ').split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Helper function to convert base64 to a byte array
  const base64ToUint8Array = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const assets = assetsData?.assets || [];
  const total = assetsData?.total || 0;

  // Show create button only for admin role
  const canCreateAsset = user?.role === "admin";
  const canBulkImport = user?.role === "admin";

  // Calculate pagination info
  const totalPages = Math.ceil(total / limit);
  const startItem = page * limit + 1;
  const endItem = Math.min((page + 1) * limit, total);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">IT Asset Management</h1>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
          
          {canCreateAsset && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Asset
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/assets/new" className="flex items-center">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Single Asset
                  </Link>
                </DropdownMenuItem>
                {canBulkImport && (
                  <DropdownMenuItem asChild>
                    <Link to="/assets/bulk-import" className="flex items-center">
                      <Upload className="w-4 h-4 mr-2" />
                      Bulk Import from Excel
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                <div>
                  <p className="text-red-800 font-medium">Failed to load assets</p>
                  <p className="text-red-600 text-sm">
                    {error instanceof Error ? error.message : "An error occurred while loading assets"}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Import Info */}
      {canBulkImport && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Package className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="text-green-800 font-medium">Bulk Import Available</p>
                  <p className="text-green-600 text-sm">
                    Import multiple assets from Excel files with QR code generation.
                  </p>
                </div>
              </div>
              <Link to="/assets/bulk-import">
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Import from Excel
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters & Sorting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* First row: Search and basic filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search assets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={category} onValueChange={(value) => setCategory(value as AssetCategory | "all")}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="laptop">Laptop/Computer</SelectItem>
                  <SelectItem value="network_device">Network Device</SelectItem>
                  <SelectItem value="printer">Printer</SelectItem>
                  <SelectItem value="license">License</SelectItem>
                  <SelectItem value="scanner">Scanner</SelectItem>
                  <SelectItem value="consumable">Consumable</SelectItem>
                </SelectContent>
              </Select>

              <Select value={status} onValueChange={(value) => setStatus(value as AssetStatus | "all")}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="in_use">In Use</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="out_of_order">Out of Order</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>

              <Select value={assignedUser} onValueChange={setAssignedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Assigned User" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Second row: Sorting and pagination controls */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <Label className="text-sm font-medium">Sort by:</Label>
                <div className="flex space-x-2">
                  <Button
                    variant={sortField === "asset_id" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSort("asset_id")}
                    className="flex items-center space-x-1"
                  >
                    <Package className="w-4 h-4" />
                    <span>Asset ID</span>
                    {getSortIcon("asset_id")}
                  </Button>
                  <Button
                    variant={sortField === "product_name" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSort("product_name")}
                    className="flex items-center space-x-1"
                  >
                    <Package className="w-4 h-4" />
                    <span>Product</span>
                    {getSortIcon("product_name")}
                  </Button>
                  <Button
                    variant={sortField === "date_acquired" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSort("date_acquired")}
                    className="flex items-center space-x-1"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Date</span>
                    {getSortIcon("date_acquired")}
                  </Button>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Label className="text-sm font-medium">Items per page:</Label>
                <Select value={limit.toString()} onValueChange={(value) => handleLimitChange(parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex space-x-2">
                <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Export Assets</DialogTitle>
                      <DialogDescription>
                        Choose export format for asset export.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="exportFormat">Export Format</Label>
                        <Select
                          value={exportFormat}
                          onValueChange={(value) => setExportFormat(value as "excel" | "pdf")}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                            <SelectItem value="pdf">PDF Report</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                        <p className="text-sm text-blue-800">
                          Current filters will be applied to the export.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsExportDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleExport}>
                        <Download className="w-4 h-4 mr-2" />
                        Export {exportFormat.toUpperCase()}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Assets ({total} total)</span>
            <div className="text-sm text-gray-500">
              Sorted by {sortField === "asset_id" ? "Asset ID" : sortField === "product_name" ? "Product" : "Date Acquired"} ({sortOrder === "asc" ? "ascending" : "descending"})
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-gray-600">Loading assets...</p>
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Package className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No assets found</h3>
              <p className="text-gray-600 mb-4">
                {search || category !== "all" || status !== "all" || assignedUser !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "No assets have been created yet."
                }
              </p>
              {canCreateAsset && (
                <div className="flex justify-center space-x-2">
                  <Link to="/assets/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Asset
                    </Button>
                  </Link>
                  {canBulkImport && (
                    <Link to="/assets/bulk-import">
                      <Button variant="outline">
                        <Upload className="w-4 h-4 mr-2" />
                        Import from Excel
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("asset_id")}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        <div className="flex items-center space-x-1">
                          <Package className="w-4 h-4" />
                          <span>Asset ID</span>
                          {getSortIcon("asset_id")}
                        </div>
                      </Button>
                    </TableHead>
                    <TableHead>Hostname</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort("product_name")}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        <div className="flex items-center space-x-1">
                          <span>Product</span>
                          {getSortIcon("product_name")}
                        </div>
                      </Button>
                    </TableHead>
                    <TableHead>Brand & Model</TableHead>
                    <TableHead>Serial Number</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned User</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => (
                    <TableRow key={asset.id}>
                      <TableCell className="font-medium">{asset.assetId}</TableCell>
                      <TableCell>{asset.hostname || "-"}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={asset.productName}>
                          {asset.productName}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{asset.brandName}</div>
                          {asset.model && (
                            <div className="text-sm text-gray-500">{asset.model}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{asset.serialNumber}</TableCell>
                      <TableCell>
                        <Badge variant={getCategoryColor(asset.category)}>
                          {formatCategoryName(asset.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(asset.status)}>
                          {formatStatusName(asset.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {asset.assignedUser ? (
                          <div>
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-1 text-gray-400" />
                              {asset.assignedUser}
                            </div>
                            {asset.assignedUserEmail && (
                              <div className="text-sm text-gray-500">{asset.assignedUserEmail}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </TableCell>
                      <TableCell>{asset.location || "-"}</TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Link to={`/assets/${asset.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                          {(user?.role === "admin" || user?.role === "engineer") && (
                            <Link to={`/assets/${asset.id}/qr-label`}>
                              <Button variant="ghost" size="sm" title="Generate QR Label">
                                <QrCode className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Enhanced Pagination */}
          {total > 0 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="flex items-center space-x-4">
                <p className="text-sm text-gray-700">
                  Showing {startItem} to {endItem} of {total} results
                </p>
                <div className="text-sm text-gray-500">
                  Page {page + 1} of {totalPages}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(0)}
                  disabled={page === 0}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                
                {/* Page numbers */}
                <div className="flex space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i;
                    } else if (page < 3) {
                      pageNum = i;
                    } else if (page > totalPages - 4) {
                      pageNum = totalPages - 5 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum + 1}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages - 1}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(totalPages - 1)}
                  disabled={page >= totalPages - 1}
                >
                  Last
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
