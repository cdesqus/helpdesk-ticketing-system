import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useBackend } from "../hooks/useAuth";
import { QrReader } from "react-qr-reader";
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
  const [isScanning, setIsScanning] = useState(true);

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
    },
  });

  const { data: auditsData, isLoading: auditsLoading } = useQuery({
    queryKey: ["asset-audits"],
    queryFn: () => backend.asset.listAudits({ limit: 10 }),
  });

  const handleScan = (result: any, error: any) => {
    if (!!result) {
      scanMutation.mutate({ qrCodeData: result.text, notes });
    }
    if (!!error) {
      // console.info(error);
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
            {isScanning ? (
              <div className="space-y-4">
                <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                  <QrReader
                    onResult={handleScan}
                    constraints={{ facingMode: "environment" }}
                    containerStyle={{ width: '100%', height: '100%' }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any notes about the audit..." />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
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
                  <div className="space-y-2">
                    <p><strong>Asset ID:</strong> {scanResult.asset.assetId}</p>
                    <p><strong>Product:</strong> {scanResult.asset.productName}</p>
                    <p><strong>Serial:</strong> {scanResult.asset.serialNumber}</p>
                    <p><strong>Assigned to:</strong> {scanResult.asset.assignedUser || "Unassigned"}</p>
                  </div>
                )}
                <Button onClick={handleRescan}>Scan Another Asset</Button>
              </div>
            )}
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
