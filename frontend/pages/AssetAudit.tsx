import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBackend } from "../hooks/useAuth";
import QRScanner from "../components/QRScanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { 
  ScanLine, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Loader2,
  Download,
  RefreshCw
} from "lucide-react";

export default function AssetAudit() {
  const { toast } = useToast();
  const backend = useBackend();
  const queryClient = useQueryClient();
  const [scanResult, setScanResult] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  const scanMutation = useMutation({
    mutationFn: (data: { qrCodeData: string; notes?: string }) => backend.asset.scanAsset(data),
    onSuccess: (result) => {
      setScanResult(result);
      setIsScanning(false);
      queryClient.invalidateQueries({ queryKey: ["asset-audits"] });
      toast({
        title: "Scan Processed",
        description: result.message,
        variant: result.status === 'valid' ? 'default' : 'destructive',
      });
    },
    onError: (error: any) => {
      console.error("Failed to process scan:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to process scan. Please try again.",
        variant: "destructive",
      });
      setIsScanning(false);
    },
  });

  const { data: auditsData, isLoading: auditsLoading } = useQuery({
    queryKey: ["asset-audits"],
    queryFn: () => backend.asset.listAudits({ limit: 10 }),
  });

  const handleScan = (data: string) => {
    if (data && !scanMutation.isPending) {
      scanMutation.mutate({ qrCodeData: data, notes });
    }
  };

  const handleRescan = () => {
    setScanResult(null);
    setNotes("");
    setIsScanning(true);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">IT Asset Audit</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ScanLine className="w-5 h-5 mr-2" />
              Scan Asset QR Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scanResult && (
                <>
                  {scanResult.status === 'valid' && (
                    <Alert variant="default"><CheckCircle className="h-4 w-4" /><AlertDescription>Asset Validated: {scanResult.message}</AlertDescription></Alert>
                  )}
                  {scanResult.status === 'invalid' && (
                    <Alert variant="destructive"><XCircle className="h-4 w-4" /><AlertDescription>Asset Invalid: {scanResult.message}</AlertDescription></Alert>
                  )}
                  {scanResult.status === 'not_found' && (
                    <Alert variant="destructive"><HelpCircle className="h-4 w-4" /><AlertDescription>Asset Not Found: {scanResult.message}</AlertDescription></Alert>
                  )}
                  {scanResult.asset && (
                    <div className="space-y-2 border p-4 rounded-md bg-gray-50">
                      <p className="text-sm"><strong>Asset ID:</strong> {scanResult.asset.assetId}</p>
                      <p className="text-sm"><strong>Product:</strong> {scanResult.asset.productName}</p>
                      <p className="text-sm"><strong>Serial:</strong> {scanResult.asset.serialNumber}</p>
                      <p className="text-sm"><strong>Brand:</strong> {scanResult.asset.brandName}</p>
                      <p className="text-sm"><strong>Location:</strong> {scanResult.asset.location || "N/A"}</p>
                      <p className="text-sm"><strong>Assigned to:</strong> {scanResult.asset.assignedUser || "Unassigned"}</p>
                    </div>
                  )}
                </>
              )}
              
              <QRScanner
                onScan={handleScan}
                isScanning={isScanning}
                onStartScan={() => setIsScanning(true)}
                onStopScan={() => setIsScanning(false)}
              />
              
              {!isScanning && scanResult && (
                <Button onClick={handleRescan} className="w-full">
                  Scan Another Asset
                </Button>
              )}
              
              {isScanning && (
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea 
                    id="notes" 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)} 
                    placeholder="Add any notes about the audit..."
                    rows={3}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Audits</span>
              <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["asset-audits"] })}>
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditsLoading ? (
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Auditor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditsData?.audits.map((audit) => (
                    <TableRow key={audit.id}>
                      <TableCell>{new Date(audit.auditDate).toLocaleString()}</TableCell>
                      <TableCell>{audit.auditedBy}</TableCell>
                      <TableCell>
                        <Badge variant={audit.status === 'valid' ? 'default' : 'destructive'}>{audit.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="mt-4">
              <Button variant="outline" disabled>
                <Download className="w-4 h-4 mr-2" /> Export Audit Report (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
