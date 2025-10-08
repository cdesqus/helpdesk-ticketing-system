import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { useBackend } from "../hooks/useAuth";
import type { StockTransaction, StockTransactionType } from "~backend/asset/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ArrowLeft, Plus, Minus, RefreshCw, Package, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function StockManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const backend = useBackend();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<StockTransactionType>("add");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");

  const { data: asset } = useQuery({
    queryKey: ["asset", id],
    queryFn: async () => {
      if (!id) throw new Error("No asset ID provided");
      return backend.asset.getAsset({ id: parseInt(id) });
    },
    enabled: !!id,
  });

  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ["stock-transactions", id],
    queryFn: async () => {
      if (!id) throw new Error("No asset ID provided");
      return backend.asset.getStockTransactions({ assetId: parseInt(id) });
    },
    enabled: !!id,
  });

  const transactions = transactionsData?.transactions || [];

  const adjustStockMutation = useMutation({
    mutationFn: (data: { assetId: number; transactionType: StockTransactionType; quantity: number; reason?: string; referenceNumber?: string }) =>
      backend.asset.adjustStock(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["stock-transactions", id] });
      queryClient.invalidateQueries({ queryKey: ["asset", id] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["asset-stats"] });
      toast({
        title: "Stock adjusted",
        description: `Stock updated. New quantity: ${result.newQuantity}`,
      });
      setIsDialogOpen(false);
      setQuantity("");
      setReason("");
      setReferenceNumber("");
    },
    onError: (error: any) => {
      console.error("Failed to adjust stock:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to adjust stock. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!id) return;
    
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid quantity.",
        variant: "destructive",
      });
      return;
    }

    adjustStockMutation.mutate({
      assetId: parseInt(id),
      transactionType,
      quantity: qty,
      reason: reason || undefined,
      referenceNumber: referenceNumber || undefined,
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: StockTransactionType) => {
    switch (type) {
      case "add": return <Plus className="w-4 h-4 text-green-600" />;
      case "remove": return <Minus className="w-4 h-4 text-red-600" />;
      case "adjustment": return <RefreshCw className="w-4 h-4 text-blue-600" />;
      case "initial": return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: StockTransactionType) => {
    switch (type) {
      case "add": return "text-green-600";
      case "remove": return "text-red-600";
      case "adjustment": return "text-blue-600";
      case "initial": return "text-gray-600";
    }
  };

  if (!asset?.isConsumable) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <AlertCircle className="w-12 h-12 mx-auto text-amber-500" />
              <p className="text-lg font-semibold">This is not a consumable asset</p>
              <p className="text-muted-foreground">Stock management is only available for consumable items.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLowStock = asset.quantity !== undefined && asset.minStockLevel !== undefined && asset.quantity <= asset.minStockLevel;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Stock Management</h1>
            <p className="text-muted-foreground">{asset?.productName} ({asset?.assetId})</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Current Stock
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>Adjust Stock</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adjust Stock</DialogTitle>
                  <DialogDescription>
                    Add, remove, or adjust the stock quantity for this item.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="transactionType">Transaction Type</Label>
                    <Select value={transactionType} onValueChange={(value) => setTransactionType(value as StockTransactionType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Add Stock</SelectItem>
                        <SelectItem value="remove">Remove Stock</SelectItem>
                        <SelectItem value="adjustment">Adjust to Quantity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">
                      {transactionType === "adjustment" ? "Set Quantity To" : "Quantity"}
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Enter quantity"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="referenceNumber">Reference Number (Optional)</Label>
                    <Input
                      id="referenceNumber"
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                      placeholder="e.g., PO-12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason (Optional)</Label>
                    <Textarea
                      id="reason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason for stock adjustment..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={adjustStockMutation.isPending}>
                    {adjustStockMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Submit"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Current Quantity</p>
              <p className="text-3xl font-bold">{asset.quantity || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Minimum Stock Level</p>
              <p className="text-3xl font-bold">{asset.minStockLevel || 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status</p>
              {isLowStock ? (
                <Badge variant="destructive" className="text-base">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Low Stock
                </Badge>
              ) : (
                <Badge variant="default" className="text-base bg-green-600">
                  Sufficient Stock
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No transactions yet</p>
          ) : (
            <div className="space-y-4">
              {transactions.map((txn: StockTransaction) => (
                <div key={txn.id} className="flex items-start justify-between border-b pb-4 last:border-b-0">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1">{getTransactionIcon(txn.transactionType)}</div>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold capitalize">{txn.transactionType.replace('_', ' ')}</span>
                        {txn.referenceNumber && (
                          <Badge variant="outline" className="text-xs">{txn.referenceNumber}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Performed by {txn.performedBy} • {formatDate(txn.createdAt)}
                      </p>
                      {txn.reason && (
                        <p className="text-sm text-muted-foreground italic">{txn.reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-semibold ${getTransactionColor(txn.transactionType)}`}>
                      {txn.quantityChange > 0 ? '+' : ''}{txn.quantityChange}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {txn.quantityBefore} → {txn.quantityAfter}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
