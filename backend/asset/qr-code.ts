import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { assetDB } from "./db";
import * as QRCode from "qrcode";

export interface GenerateQRCodeRequest {
  id: number;
}

export interface GenerateQRCodeResponse {
  qrCodeDataUrl: string;
  qrCodeData: string;
}

export interface GenerateQRLabelRequest {
  id: number;
  labelSize?: "4x6" | "a4";
}

export interface GenerateQRLabelResponse {
  labelHtml: string;
  qrCodeDataUrl: string;
}

// Generates QR code for an asset.
export const generateQRCode = api<GenerateQRCodeRequest, GenerateQRCodeResponse>(
  { auth: true, expose: true, method: "POST", path: "/assets/:id/qr-code" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only admins and engineers can generate QR codes
    if (auth.role === "reporter") {
      throw APIError.permissionDenied("reporters cannot generate QR codes");
    }

    const asset = await assetDB.queryRow<{
      id: number;
      asset_id: string;
      hostname: string | null;
      serial_number: string;
      date_acquired: Date | null;
      qr_code_data: string | null;
    }>`SELECT id, asset_id, hostname, serial_number, date_acquired, qr_code_data FROM assets WHERE id = ${req.id}`;

    if (!asset) {
      throw APIError.notFound("asset not found");
    }

    let qrCodeData = asset.qr_code_data;
    
    // Generate QR code data if not exists
    if (!qrCodeData) {
      const currentYear = new Date().getFullYear();
      qrCodeData = JSON.stringify({
        company: "IDESOLUSI",
        hostname: asset.hostname || asset.asset_id,
        serialNumber: asset.serial_number,
        year: asset.date_acquired ? new Date(asset.date_acquired).getFullYear() : currentYear,
      });

      // Update asset with QR code data
      await assetDB.exec`
        UPDATE assets 
        SET qr_code_data = ${qrCodeData}, updated_at = NOW()
        WHERE id = ${req.id}
      `;
    }

    // Generate QR code image
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    });

    return {
      qrCodeDataUrl,
      qrCodeData,
    };
  }
);

// Generates printable QR code label for an asset.
export const generateQRLabel = api<GenerateQRLabelRequest, GenerateQRLabelResponse>(
  { auth: true, expose: true, method: "POST", path: "/assets/:id/qr-label" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only admins and engineers can generate QR labels
    if (auth.role === "reporter") {
      throw APIError.permissionDenied("reporters cannot generate QR labels");
    }

    const asset = await assetDB.queryRow<{
      id: number;
      asset_id: string;
      hostname: string | null;
      product_name: string;
      serial_number: string;
      brand_name: string;
      model: string | null;
      date_acquired: Date | null;
      qr_code_data: string | null;
    }>`
      SELECT id, asset_id, hostname, product_name, serial_number, brand_name, model, date_acquired, qr_code_data 
      FROM assets WHERE id = ${req.id}
    `;

    if (!asset) {
      throw APIError.notFound("asset not found");
    }

    let qrCodeData = asset.qr_code_data;
    
    // Generate QR code data if not exists
    if (!qrCodeData) {
      const currentYear = new Date().getFullYear();
      qrCodeData = JSON.stringify({
        company: "IDESOLUSI",
        hostname: asset.hostname || asset.asset_id,
        serialNumber: asset.serial_number,
        year: asset.date_acquired ? new Date(asset.date_acquired).getFullYear() : currentYear,
      });

      // Update asset with QR code data
      await assetDB.exec`
        UPDATE assets 
        SET qr_code_data = ${qrCodeData}, updated_at = NOW()
        WHERE id = ${req.id}
      `;
    }

    // Generate QR code image
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 200
    });

    const labelSize = req.labelSize || "4x6";
    const isA4 = labelSize === "a4";

    // Generate HTML label
    const labelHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Asset Label - ${asset.asset_id}</title>
    <style>
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
        }
        
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: ${isA4 ? '20mm' : '5mm'};
            background: white;
        }
        
        .label {
            width: ${isA4 ? '180mm' : '95mm'};
            height: ${isA4 ? '120mm' : '60mm'};
            border: 2px solid #000;
            padding: ${isA4 ? '10mm' : '5mm'};
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-after: always;
        }
        
        .header {
            text-align: center;
            border-bottom: 1px solid #ccc;
            padding-bottom: ${isA4 ? '8mm' : '4mm'};
            margin-bottom: ${isA4 ? '5mm' : '3mm'};
        }
        
        .company-name {
            font-size: ${isA4 ? '18px' : '14px'};
            font-weight: bold;
            color: #333;
            margin-bottom: ${isA4 ? '4mm' : '2mm'};
        }
        
        .asset-title {
            font-size: ${isA4 ? '16px' : '12px'};
            color: #666;
        }
        
        .content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex: 1;
        }
        
        .asset-info {
            flex: 1;
            margin-right: ${isA4 ? '10mm' : '5mm'};
        }
        
        .qr-code {
            text-align: center;
        }
        
        .qr-code img {
            width: ${isA4 ? '80px' : '60px'};
            height: ${isA4 ? '80px' : '60px'};
        }
        
        .info-row {
            margin-bottom: ${isA4 ? '3mm' : '2mm'};
            font-size: ${isA4 ? '12px' : '10px'};
        }
        
        .info-label {
            font-weight: bold;
            color: #444;
            display: inline-block;
            width: ${isA4 ? '25mm' : '20mm'};
        }
        
        .info-value {
            color: #666;
        }
        
        .footer {
            text-align: center;
            font-size: ${isA4 ? '10px' : '8px'};
            color: #888;
            border-top: 1px solid #ccc;
            padding-top: ${isA4 ? '3mm' : '2mm'};
        }
        
        .print-button {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin-bottom: 20px;
            font-size: 14px;
        }
        
        .print-button:hover {
            background: #0056b3;
        }
    </style>
</head>
<body>
    <button class="print-button no-print" onclick="window.print()">Print Label</button>
    
    <div class="label">
        <div class="header">
            <div class="company-name">IDESOLUSI</div>
            <div class="asset-title">IT Asset Management</div>
        </div>
        
        <div class="content">
            <div class="asset-info">
                <div class="info-row">
                    <span class="info-label">Asset ID:</span>
                    <span class="info-value">${asset.asset_id}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Hostname:</span>
                    <span class="info-value">${asset.hostname || asset.asset_id}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Product:</span>
                    <span class="info-value">${asset.product_name}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Brand:</span>
                    <span class="info-value">${asset.brand_name}</span>
                </div>
                ${asset.model ? `
                <div class="info-row">
                    <span class="info-label">Model:</span>
                    <span class="info-value">${asset.model}</span>
                </div>
                ` : ''}
                <div class="info-row">
                    <span class="info-label">Serial:</span>
                    <span class="info-value">${asset.serial_number}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Year:</span>
                    <span class="info-value">${asset.date_acquired ? new Date(asset.date_acquired).getFullYear() : new Date().getFullYear()}</span>
                </div>
            </div>
            
            <div class="qr-code">
                <img src="${qrCodeDataUrl}" alt="QR Code" />
            </div>
        </div>
        
        <div class="footer">
            Generated on ${new Date().toLocaleDateString()} | Scan QR code for asset details
        </div>
    </div>
</body>
</html>
    `;

    return {
      labelHtml,
      qrCodeDataUrl,
    };
  }
);
