import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBackend } from "../hooks/useAuth";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";

export default function PrintAssetLabel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const backend = useBackend();
  const [labelHtml, setLabelHtml] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      backend.asset.generateQRLabel({ id: parseInt(id) })
        .then(response => {
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
  }, [id, backend]);

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
      <div className="mb-4 no-print">
        <Button onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Asset
        </Button>
      </div>
      <div dangerouslySetInnerHTML={{ __html: labelHtml }} />
    </div>
  );
}
