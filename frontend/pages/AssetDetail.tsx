import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { useBackend, useAuth } from "../hooks/useAuth";
import type { AssetCategory, AssetStatus } from "~backend/asset/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  Calendar,
  User,
  Building,
  Mail,
  Trash2,
  AlertCircle,
  RefreshCw,
  QrCode,
  Package,
  Shield,
  Eye,
  Printer,
  Loader2
} from "lucide-react";

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const backend = useBackend();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isQRDialogOpen, setIsQRDialogOpen] = useState(false);
  const [qrCodeData, setQRCodeData] = useState<string>("");
  const [formData, setFormData] = useState({
    assetId: "",
    hostname: "",
    productName: "",
    serialNumber: "",
    brandName: "",
    model: "",
    category: "laptop" as AssetCategory,
    location: "",
    assignedUser: "",
    assignedUserEmail: "",
    dateAcquired: "",
    warrantyExpiryDate: "",
    status: "available" as AssetStatus,
    comments: "",
    totalLicenses: "",
    usedLicenses: "",
  });

  const { data: asset, isLoading, error, refetch, isError } = useQuery({
    queryKey: ["asset", id],
    queryFn: async () => {
      if (!id) throw new Error("No asset ID provided");
      
      console.log("Fetching asset details for ID:", id);
      try {
        const result = await backend.asset.getAsset({ id: parseInt(id) });
        console.log("Asset fetched successfully:", result);
        return result;
      } catch (error) {
        console.error("Error fetching asset:", error);
        throw error;
      }
    },
    enabled: !!id && isAuthenticated,
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 3;
    },
    staleTime: 30 * 1000,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => backend.asset.updateAsset({ id: parseInt(id!), ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset", id] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["asset-stats"] });
      setIsEditing(false);
      toast({
        title: "Asset updated",
        description: "Asset has been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Failed to update asset:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update asset. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => backend.asset.deleteAsset({ id: parseInt(id!) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["asset-stats"] });
      toast({
        title: "Asset deleted",
        description: "Asset has been deleted successfully.",
      });
      navigate("/assets");
    },
    onError: (error: any) => {
      console.error("Failed to delete asset:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete asset. Please try again.",
        variant: "destructive",
      });
    },
  });

  const qrCodeMutation = useMutation({
    mutationFn: () => backend.asset.generateQRCode({ id: parseInt(id!) }),
    onSuccess: (data) => {
      setQRCodeData(data.qrCodeDataUrl);
      setIsQRDialogOpen(true);
    },
    onError: (error: any) => {
      console.error("Failed to generate QR code:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate QR code.",
        variant: "destructive",
      });
    },
  });

  React.useEffect(() => {
    if (asset) {
      setFormData({
        assetId: asset.assetId,
        hostname: asset.hostname || "",
        productName: asset.productName,
        serialNumber: asset.serialNumber,
        brandName: asset.brandName,
        model: asset.model || "",
        category: asset.category,
        location: asset.location || "",
        assignedUser: asset.assignedUser || "",
        assignedUserEmail: asset.assignedUserEmail || "",
        dateAcquired: asset.dateAcquired ? new Date(asset.dateAcquired).toISOString().split('T')[0] : "",
        warrantyExpiryDate: asset.warrantyExpiryDate ? new Date(asset.warrantyExpiryDate).toISOString().split('T')[0] : "",
        status: asset.status,
        comments: asset.comments || "",
        totalLicenses: asset.category === 'license' && asset.totalLicenses ? asset.totalLicenses.toString() : "",
        usedLicenses: asset.category === 'license' && asset.usedLicenses ? asset.usedLicenses.toString() : "",
      });
    }
  }, [asset]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-4">Please log in to view asset details.</p>
          <Button onClick={() => navigate("/login")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (asset) {
      setFormData({
        assetId: asset.assetId,
        hostname: asset.hostname || "",
        productName: asset.productName,
        serialNumber: asset.serialNumber,
        brandName: asset.brandName,
        model: asset.model || "",
        category: asset.category,
        location: asset.location || "",
        assignedUser: asset.assignedUser || "",
        assignedUserEmail: asset.assignedUserEmail || "",
        dateAcquired: asset.dateAcquired ? new Date(asset.dateAcquired).toISOString().split('T')[0] : "",
        warrantyExpiryDate: asset.warrantyExpiryDate ? new Date(asset.warrantyExpiryDate).toISOString().split('T')[0] : "",
        status: asset.status,
        comments: asset.comments || "",
        totalLicenses: asset.category === 'license' && asset.totalLicenses ? asset.totalLicenses.toString() : "",
        usedLicenses: asset.category === 'license' && asset.usedLicenses ? asset.usedLicenses.toString() : "",
      });
    }
  };

  const handleSave = () => {
    if (!formData.assetId.trim() || !formData.productName.trim() || !formData.serialNumber.trim() || !formData.brandName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const updateData = {
      ...formData,
      dateAcquired: formData.dateAcquired ? new Date(formData.dateAcquired) : undefined,
      warrantyExpiryDate: formData.warrantyExpiryDate ? new Date(formData.warrantyExpiryDate) : undefined,
      totalLicenses: formData.category === 'license' ? parseInt(formData.totalLicenses) || 0 : undefined,
      usedLicenses: formData.category === 'license' ? parseInt(formData.usedLicenses) || 0 : undefined,
    };

    updateMutation.mutate(updateData);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this asset? This action cannot be undone.")) {
      deleteMutation.mutate();
    }
  };

  const handleRetry = () => {
    console.log("Retrying asset fetch...");
    refetch();
  };

  const handleGenerateQR = () => {
    qrCodeMutation.mutate();
  };

  const handlePrintLabel = () => {
    navigate(`/assets/${id}/qr-label`);
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

  const canEdit = user?.role === "admin" || user?.role === "engineer";
  const canDelete = user?.role === "admin";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Asset Details</h1>
        </div>
        
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-8 h-8 text-red-600 mr-4" />
                <div>
                  <h3 className="text-lg font-medium text-red-800">Failed to load asset</h3>
                  <p className="text-red-600">
                    {error instanceof Error ? error.message : "An error occurred while loading the asset"}
                  </p>
                  {(error as any)?.status === 401 && (
                    <p className="text-sm text-red-500 mt-2">
                      Your session may have expired. Please try logging in again.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleRetry}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
                <Button onClick={() => navigate("/login")}>
                  Login
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Asset not found</h2>
        <p className="text-gray-600 mt-2">The asset you're looking for doesn't exist.</p>
        <Button onClick={() => navigate("/assets")} className="mt-4">
          Back to Assets
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Asset: {asset.assetId}
          </h1>
        </div>
        
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <>
              {canEdit && (
                <Button onClick={handleEdit}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              {canDelete && (
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button variant="outline" onClick={handleGenerateQR}>
                <QrCode className="w-4 h-4 mr-2" />
                Generate QR
              </Button>
              <Button variant="outline" onClick={handlePrintLabel}>
                <Printer className="w-4 h-4 mr-2" />
                Print Label
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Asset Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="assetId">Asset ID</Label>
                  {isEditing ? (
                    <Input
                      id="assetId"
                      value={formData.assetId}
                      onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                    />
                  ) : (
                    <p className="text-lg font-medium">{asset.assetId}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hostname">Hostname</Label>
                  {isEditing ? (
                    <Input
                      id="hostname"
                      value={formData.hostname}
                      onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                    />
                  ) : (
                    <p className="text-lg font-medium">{asset.hostname || "-"}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="productName">Product Name</Label>
                  {isEditing ? (
                    <Input
                      id="productName"
                      value={formData.productName}
                      onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{asset.productName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serialNumber">Serial Number</Label>
                  {isEditing ? (
                    <Input
                      id="serialNumber"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm font-mono">{asset.serialNumber}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="brandName">Brand Name</Label>
                  {isEditing ? (
                    <Input
                      id="brandName"
                      value={formData.brandName}
                      onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{asset.brandName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  {isEditing ? (
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{asset.model || "-"}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comments">Comments</Label>
                {isEditing ? (
                  <Textarea
                    id="comments"
                    value={formData.comments}
                    onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                    rows={4}
                  />
                ) : (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="whitespace-pre-wrap">{asset.comments || "No comments."}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status & Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                {isEditing ? (
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as AssetStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_use">In Use</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="out_of_order">Out of Order</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={getStatusColor(asset.status)}>
                    {formatStatusName(asset.status)}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                {isEditing ? (
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as AssetCategory })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="laptop">Laptop/Computer</SelectItem>
                      <SelectItem value="network_device">Network Device</SelectItem>
                      <SelectItem value="printer">Printer</SelectItem>
                      <SelectItem value="license">License</SelectItem>
                      <SelectItem value="scanner">Scanner</SelectItem>
                      <SelectItem value="consumable">Consumable</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={getCategoryColor(asset.category)}>
                    {formatCategoryName(asset.category)}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {asset.category === 'license' && (
            <Card>
              <CardHeader>
                <CardTitle>License Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Total Licenses</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={formData.totalLicenses}
                      onChange={(e) => setFormData({ ...formData, totalLicenses: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{asset.totalLicenses || 0}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Used Licenses</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={formData.usedLicenses}
                      onChange={(e) => setFormData({ ...formData, usedLicenses: e.target.value })}
                    />
                  ) : (
                    <p className="text-sm">{asset.usedLicenses || 0}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Assignment & Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Assigned User</Label>
                {isEditing ? (
                  <Input
                    value={formData.assignedUser}
                    onChange={(e) => setFormData({ ...formData, assignedUser: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-sm">{asset.assignedUser || "Unassigned"}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>User Email</Label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={formData.assignedUserEmail}
                    onChange={(e) => setFormData({ ...formData, assignedUserEmail: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-sm">{asset.assignedUserEmail || "-"}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                {isEditing ? (
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center">
                    <Building className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-sm">{asset.location || "-"}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Date Acquired</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={formData.dateAcquired}
                    onChange={(e) => setFormData({ ...formData, dateAcquired: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-sm">
                      {asset.dateAcquired ? new Date(asset.dateAcquired).toLocaleDateString() : "-"}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Warranty Expiry</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={formData.warrantyExpiryDate}
                    onChange={(e) => setFormData({ ...formData, warrantyExpiryDate: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-sm">
                      {asset.warrantyExpiryDate ? new Date(asset.warrantyExpiryDate).toLocaleDateString() : "-"}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isQRDialogOpen} onOpenChange={setIsQRDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asset QR Code</DialogTitle>
            <DialogDescription>
              Scan this QR code to view asset details or perform an audit.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center p-4">
            {qrCodeMutation.isPending ? (
              <Loader2 className="w-16 h-16 animate-spin" />
            ) : (
              <img src={qrCodeData} alt="Asset QR Code" className="w-64 h-64" />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQRDialogOpen(false)}>Close</Button>
            <Button onClick={handlePrintLabel}>
              <Printer className="w-4 h-4 mr-2" />
              Print Label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
