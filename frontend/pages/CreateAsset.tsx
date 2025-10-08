import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useBackend } from "../hooks/useAuth";
import type { AssetCategory, AssetStatus } from "~backend/asset/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Save, Loader2, Package } from "lucide-react";

export default function CreateAsset() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const backend = useBackend();
  const queryClient = useQueryClient();

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
    isConsumable: false,
    quantity: "",
    minStockLevel: "",
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => backend.asset.createAsset(data),
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["asset-stats"] });
      toast({
        title: "Asset created",
        description: `Asset ${asset.assetId} has been created successfully.`,
      });
      navigate(`/assets/${asset.id}`);
    },
    onError: (error: any) => {
      console.error("Failed to create asset:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create asset. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.assetId.trim() || !formData.productName.trim() || !formData.serialNumber.trim() || !formData.brandName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const isConsumable = formData.isConsumable || formData.category === 'consumable';
    
    const submitData = {
      ...formData,
      dateAcquired: formData.dateAcquired ? new Date(formData.dateAcquired) : undefined,
      warrantyExpiryDate: formData.warrantyExpiryDate ? new Date(formData.warrantyExpiryDate) : undefined,
      totalLicenses: formData.category === 'license' ? parseInt(formData.totalLicenses) || 0 : undefined,
      usedLicenses: formData.category === 'license' ? parseInt(formData.usedLicenses) || 0 : undefined,
      isConsumable,
      quantity: isConsumable ? parseInt(formData.quantity) || 0 : undefined,
      minStockLevel: isConsumable ? parseInt(formData.minStockLevel) || 0 : undefined,
    };

    createMutation.mutate(submitData);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="flex items-center"
          disabled={createMutation.isPending}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Asset</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Asset Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="assetId">Asset ID *</Label>
                <Input id="assetId" value={formData.assetId} onChange={(e) => setFormData({ ...formData, assetId: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hostname">Hostname</Label>
                <Input id="hostname" value={formData.hostname} onChange={(e) => setFormData({ ...formData, hostname: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="productName">Product Name *</Label>
                <Input id="productName" value={formData.productName} onChange={(e) => setFormData({ ...formData, productName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serialNumber">Serial Number *</Label>
                <Input id="serialNumber" value={formData.serialNumber} onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandName">Brand Name *</Label>
                <Input id="brandName" value={formData.brandName} onChange={(e) => setFormData({ ...formData, brandName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input id="model" value={formData.model} onChange={(e) => setFormData({ ...formData, model: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value as AssetCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="laptop">Laptop/Computer</SelectItem>
                    <SelectItem value="network_device">Network Device</SelectItem>
                    <SelectItem value="printer">Printer</SelectItem>
                    <SelectItem value="license">License</SelectItem>
                    <SelectItem value="scanner">Scanner</SelectItem>
                    <SelectItem value="consumable">Consumable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as AssetStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_use">In Use</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="out_of_order">Out of Order</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedUser">Assigned User/PIC</Label>
                <Input id="assignedUser" value={formData.assignedUser} onChange={(e) => setFormData({ ...formData, assignedUser: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assignedUserEmail">User Email</Label>
                <Input id="assignedUserEmail" type="email" value={formData.assignedUserEmail} onChange={(e) => setFormData({ ...formData, assignedUserEmail: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateAcquired">Date Acquired</Label>
                <Input id="dateAcquired" type="date" value={formData.dateAcquired} onChange={(e) => setFormData({ ...formData, dateAcquired: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warrantyExpiryDate">Warranty Expiry</Label>
                <Input id="warrantyExpiryDate" type="date" value={formData.warrantyExpiryDate} onChange={(e) => setFormData({ ...formData, warrantyExpiryDate: e.target.value })} />
              </div>
            </div>

            {formData.category === 'license' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="totalLicenses">Total Licenses</Label>
                  <Input id="totalLicenses" type="number" value={formData.totalLicenses} onChange={(e) => setFormData({ ...formData, totalLicenses: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usedLicenses">Used Licenses</Label>
                  <Input id="usedLicenses" type="number" value={formData.usedLicenses} onChange={(e) => setFormData({ ...formData, usedLicenses: e.target.value })} />
                </div>
              </div>
            )}

            {(formData.isConsumable || formData.category === 'consumable') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Initial Quantity</Label>
                  <Input id="quantity" type="number" min="0" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minStockLevel">Minimum Stock Level (Alert Threshold)</Label>
                  <Input id="minStockLevel" type="number" min="0" value={formData.minStockLevel} onChange={(e) => setFormData({ ...formData, minStockLevel: e.target.value })} />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="comments">Comments/Notes</Label>
              <Textarea id="comments" value={formData.comments} onChange={(e) => setFormData({ ...formData, comments: e.target.value })} rows={4} />
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={createMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Asset
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
