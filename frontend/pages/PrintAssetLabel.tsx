import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBackend } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";

export default function PrintAssetLabel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const backend = useBackend();
  const [labelHtml, setLabelHtml] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [labelSize, setLabelSize] = useState<"60x30" | "4x6" | "a4">("60x30");

  useEffect(() => {
    if (id) {
      setIsLoading(true);
      setError(null);
      console.log("Generating QR label for asset:", id, "with size:", labelSize);
      
      backend.asset.generateQRLabel({ id: parseInt(id), labelSize })
        .then(response => {
          console.log("QR label generated successfully");
          setLabelHtml(response.labelHtml);
        })
        .catch(err => {
          console.error("Failed to generate label:", err);
          setError(err.message || "Failed to load label.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [id, backend, labelSize]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700">Error</h2>
          <p className="text-gray-600 mt-2">{error}</p>
          <Button onClick={() => navigate(-1)} className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 p-4">
      <div className="mb-4 no-print flex gap-4 items-center">
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Asset
        </Button>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Label Size:</label>
          <Select value={labelSize} onValueChange={(value: "60x30" | "4x6" | "a4") => setLabelSize(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="60x30">60mm x 30mm</SelectItem>
              <SelectItem value="4x6">4" x 6"</SelectItem>
              <SelectItem value="a4">A4</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div dangerouslySetInnerHTML={{ __html: labelHtml }} />
    </div>
  );
}
