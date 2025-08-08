import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useBackend } from "../hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

export default function BulkImport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const backend = useBackend();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      // Convert file to base64
      const base64Data = await fileToBase64(file);
      
      return backend.ticket.bulkImportTickets({
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
          description: `Successfully imported ${result.successCount} tickets.`,
        });
      } else {
        toast({
          title: "Import completed with errors",
          description: `${result.successCount} tickets imported, ${result.errorCount} errors occurred.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error("Failed to import tickets:", error);
      toast({
        title: "Import failed",
        description: error.message || "Failed to import tickets. Please try again.",
        variant: "destructive",
      });
    },
  });

  const downloadTemplateMutation = useMutation({
    mutationFn: () => backend.ticket.generateImportTemplate(),
    onSuccess: (response) => {
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

      toast({
        title: "Template downloaded",
        description: "Import template has been downloaded successfully.",
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
        // Remove data URL prefix (data:application/...;base64,)
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
      ];
      
      if (!validTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.xlsx') && !file.name.toLowerCase().endsWith('.xls')) {
        toast({
          title: "Invalid file type",
          description: "Please select an Excel file (.xlsx, .xls).",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 10MB)
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
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="flex items-center"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Bulk Import Tickets</h1>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            Import Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="font-medium text-blue-900 mb-2">📋 How to Import Tickets:</h4>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              <li>Download the Excel template using the button below</li>
              <li>Fill in your ticket data following the template format</li>
              <li>Save the file as Excel (.xlsx) format</li>
              <li>Upload the file using the form below</li>
              <li>Review the import results and fix any errors if needed</li>
            </ol>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <h4 className="font-medium text-green-900 mb-2">✅ Column Requirements:</h4>
            <div className="text-sm text-green-800 space-y-1">
              <p><strong>Required columns:</strong> subject, description, reporterName</p>
              <p><strong>Optional columns:</strong> priority, assignedEngineer, reporterEmail, companyName, resolution, customDate</p>
              <p><strong>Status Logic:</strong></p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>If <strong>resolution</strong> is empty → Status will be <strong>Open</strong></li>
                <li>If <strong>resolution</strong> has content → Status will be <strong>Closed</strong></li>
              </ul>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <h4 className="font-medium text-yellow-900 mb-2">⚠️ Important Notes:</h4>
            <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
              <li>Maximum file size: 10MB</li>
              <li>Supported formats: Excel (.xlsx, .xls)</li>
              <li>Email notifications will be sent if reporterEmail is provided</li>
              <li>Invalid rows will be skipped and reported in the results</li>
              <li>Priority values: Low, Medium, High, Urgent (default: Medium)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Download Template */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Download Template</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 mb-2">
                Download the Excel template with the correct column format and sample data.
              </p>
              <p className="text-sm text-gray-500">
                The template includes all required and optional columns with examples.
              </p>
            </div>
            <Button
              onClick={handleDownloadTemplate}
              disabled={downloadTemplateMutation.isPending}
              variant="outline"
            >
              {downloadTemplateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Upload Your File</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Select Excel File</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              disabled={importMutation.isPending}
            />
          </div>

          {selectedFile && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown type'}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleImport}
                  disabled={importMutation.isPending}
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Import Tickets
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Results */}
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
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Total Rows</p>
                    <p className="text-2xl font-bold text-blue-900">{importResult.totalRows}</p>
                  </div>
                  <FileSpreadsheet className="w-8 h-8 text-blue-500" />
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">Successful</p>
                    <p className="text-2xl font-bold text-green-900">{importResult.successCount}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-600">Errors</p>
                    <p className="text-2xl font-bold text-red-900">{importResult.errorCount}</p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">Success Rate</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {importResult.totalRows > 0 
                        ? Math.round((importResult.successCount / importResult.totalRows) * 100)
                        : 0}%
                    </p>
                  </div>
                  <Badge variant="outline" className="text-purple-600">
                    Rate
                  </Badge>
                </div>
              </div>
            </div>

            {/* Success Message */}
            {importResult.errorCount === 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  All tickets were imported successfully! You can now view them in the tickets list.
                </AlertDescription>
              </Alert>
            )}

            {/* Errors Table */}
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
                              <div className="text-sm text-gray-600 truncate">
                                {JSON.stringify(error.data)}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Created Tickets Summary */}
            {importResult.createdTickets && importResult.createdTickets.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-green-900">Successfully Created Tickets:</h4>
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {importResult.createdTickets.slice(0, 10).map((ticket: any) => (
                      <div key={ticket.id} className="flex items-center space-x-2">
                        <Badge variant="outline">#{ticket.id}</Badge>
                        <span className="text-sm text-green-800 truncate">
                          {ticket.subject}
                        </span>
                        <Badge variant={ticket.status === "Closed" ? "default" : "destructive"}>
                          {ticket.status}
                        </Badge>
                      </div>
                    ))}
                    {importResult.createdTickets.length > 10 && (
                      <div className="text-sm text-green-600">
                        ... and {importResult.createdTickets.length - 10} more tickets
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <Button
                onClick={() => navigate("/tickets")}
                variant="outline"
              >
                View All Tickets
              </Button>
              <Button
                onClick={() => {
                  setImportResult(null);
                  setSelectedFile(null);
                }}
                variant="outline"
              >
                Import Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
