import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useBackend } from "../hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  ArrowLeft, 
  Upload, 
  Download, 
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  FileText
} from "lucide-react";

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

export default function BulkImportAssets() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const backend = useBackend();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const base64Data = await fileToBase64(file);
      return backend.asset.bulkImportAssets({
        data: base64Data,
        filename: file.name
      });
    },
    onSuccess: (result) => {
      setImportResult(result);
      setSelectedFile(null);
      if (result.errorCount === 0) {
        toast({
          title: "Import successful",
          description: `Successfully imported ${result.successCount} assets.`,
        });
      } else {
        toast({
          title: "Import completed with errors",
          description: `${result.successCount} assets imported, ${result.errorCount} errors occurred.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error("Failed to import assets:", error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to import assets. Please try again.",
        variant: "destructive",
      });
    },
  });

  const downloadTemplateMutation = useMutation({
    mutationFn: () => backend.asset.generateImportTemplate(),
    onSuccess: (response) => {
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
      toast({
        title: "Template downloaded",
        description: "Asset import template has been downloaded successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Failed to download template:", error);
      toast({
        title: "Download failed",
        description: "Failed to download template. Please try again.",
        variant: "destructive",
      });
    },
  });

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
        toast({
          title: "Invalid file type",
          description: "Please select an Excel file (.xlsx, .xls).",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to import.",
        variant: "destructive",
      });
      return;
    }
    importMutation.mutate(selectedFile);
  };

  const handleDownloadTemplate = () => {
    downloadTemplateMutation.mutate();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Import Assets</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            Import Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="font-medium text-blue-900 mb-2">How to Import Assets:</h4>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Download the Excel template.</li>
              <li>Fill in your asset data. Required fields: assetId, productName, serialNumber, brandName.</li>
              <li>Save the file as Excel (.xlsx) format.</li>
              <li>Upload the file and review the results.</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 1: Download Template</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDownloadTemplate} disabled={downloadTemplateMutation.isPending} variant="outline">
            {downloadTemplateMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Downloading...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" /> Download Template</>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Step 2: Upload Your File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Select Excel File</Label>
            <Input id="file" type="file" accept=".xlsx,.xls" onChange={handleFileSelect} disabled={importMutation.isPending} />
          </div>
          {selectedFile && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                  </div>
                </div>
                <Button onClick={handleImport} disabled={importMutation.isPending}>
                  {importMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" /> Import Assets</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {importResult.errorCount === 0 ? (
                <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 mr-2 text-yellow-600" />
              )}
              Import Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-600">Total Rows</p>
                <p className="text-2xl font-bold text-blue-900">{importResult.totalRows}</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm font-medium text-green-600">Successful</p>
                <p className="text-2xl font-bold text-green-900">{importResult.successCount}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm font-medium text-red-600">Errors</p>
                <p className="text-2xl font-bold text-red-900">{importResult.errorCount}</p>
              </div>
            </div>
            {importResult.errors && importResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-900">Import Errors:</h4>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Error</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResult.errors.map((error: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">#{error.row}</TableCell>
                          <TableCell className="text-red-600">{error.error}</TableCell>
                          <TableCell className="max-w-xs">
                            {error.data && (
                              <div className="text-sm text-gray-600 truncate">{JSON.stringify(error.data)}</div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
            <div className="flex space-x-4">
              <Button onClick={() => navigate("/assets")} variant="outline">View All Assets</Button>
              <Button onClick={() => { setImportResult(null); setSelectedFile(null); }} variant="outline">Import Another File</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
