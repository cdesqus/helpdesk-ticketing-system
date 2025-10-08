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
  labelSize?: "60x30" | "4x6" | "a4";
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

    const labelSize = req.labelSize || "60x30";
    const is60x30 = labelSize === "60x30";
    const isA4 = labelSize === "a4";

    // Generate QR code image with appropriate size for label
    const qrSize = is60x30 ? 80 : (isA4 ? 200 : 200);
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: qrSize
    });

    // Generate HTML label
    const labelHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Asset Label - ${asset.asset_id}</title>
    <style>
        @media print {
            body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none; }
            .label { page-break-inside: avoid; }
        }
        body {
            font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: ${is60x30 ? '2mm' : (isA4 ? '20mm' : '5mm')};
            background: #f0f2f5;
        }
        .label-container {
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .label {
            width: ${is60x30 ? '60mm' : (isA4 ? '180mm' : '95mm')};
            height: ${is60x30 ? '30mm' : (isA4 ? '120mm' : '60mm')};
            border: 1px solid #ccc;
            border-radius: ${is60x30 ? '2px' : '8px'};
            padding: ${is60x30 ? '2mm' : (isA4 ? '8mm' : '4mm')};
            box-sizing: border-box;
            display: flex;
            flex-direction: ${is60x30 ? 'row' : 'column'};
            background: white;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .header {
            display: ${is60x30 ? 'none' : 'flex'};
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #3b82f6;
            padding-bottom: ${isA4 ? '6mm' : '3mm'};
            margin-bottom: ${isA4 ? '6mm' : '3mm'};
        }
        .company-name {
            font-size: ${isA4 ? '20px' : '16px'};
            font-weight: bold;
            color: #1e3a8a;
        }
        .asset-title {
            font-size: ${isA4 ? '14px' : '10px'};
            color: #666;
            text-transform: uppercase;
        }
        .content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex: 1;
            gap: ${is60x30 ? '2mm' : '0'};
        }
        .asset-info {
            flex: ${is60x30 ? '1' : '2'};
            padding-right: ${is60x30 ? '0' : (isA4 ? '8mm' : '4mm')};
        }
        .qr-code {
            flex: ${is60x30 ? '0 0 auto' : '1'};
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .qr-code img {
            width: ${is60x30 ? '24mm' : (isA4 ? '100px' : '70px')};
            height: ${is60x30 ? '24mm' : (isA4 ? '100px' : '70px')};
            border: ${is60x30 ? '1px' : '2px'} solid #eee;
            padding: ${is60x30 ? '1px' : '4px'};
            border-radius: 2px;
        }
        .qr-code-text {
            font-size: ${is60x30 ? '5px' : (isA4 ? '10px' : '8px')};
            color: #555;
            margin-top: ${is60x30 ? '1px' : '4px'};
            display: ${is60x30 ? 'none' : 'block'};
        }
        .info-grid {
            display: grid;
            grid-template-columns: ${is60x30 ? '1fr' : 'auto 1fr'};
            gap: ${is60x30 ? '0.5mm' : (isA4 ? '4mm 8mm' : '2mm 4mm')};
            font-size: ${is60x30 ? '7px' : (isA4 ? '12px' : '10px')};
            line-height: ${is60x30 ? '1.1' : '1.4'};
        }
        .info-label {
            font-weight: ${is60x30 ? '700' : '600'};
            color: #374151;
            text-align: ${is60x30 ? 'left' : 'right'};
            display: ${is60x30 ? 'inline' : 'block'};
        }
        .info-value {
            color: #4b5563;
            font-family: ${is60x30 ? 'Arial, sans-serif' : "'Consolas', 'Monaco', monospace"};
            display: ${is60x30 ? 'inline' : 'block'};
        }
        .info-row {
            white-space: ${is60x30 ? 'nowrap' : 'normal'};
            overflow: ${is60x30 ? 'hidden' : 'visible'};
            text-overflow: ${is60x30 ? 'ellipsis' : 'clip'};
        }
        .footer {
            display: ${is60x30 ? 'none' : 'block'};
            text-align: center;
            font-size: ${isA4 ? '10px' : '8px'};
            color: #9ca3af;
            border-top: 1px solid #eee;
            padding-top: ${isA4 ? '4mm' : '2mm'};
            margin-top: ${isA4 ? '4mm' : '2mm'};
        }
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #3b82f6;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .print-button:hover {
            background: #2563eb;
        }
    </style>
</head>
<body>
    <button class="print-button no-print" onclick="window.print()">Print Label</button>
    <div class="label-container">
        <div class="label">
            <div class="header">
                <div class="company-name">IDESOLUSI</div>
                <div class="asset-title">IT Asset Tag</div>
            </div>
            <div class="content">
                ${is60x30 ? `
                <div class="qr-code">
                    <img src="${qrCodeDataUrl}" alt="QR Code" />
                </div>
                <div class="asset-info">
                    <div class="info-grid">
                        <div class="info-row"><span class="info-label">ID:</span> <span class="info-value">${asset.asset_id}</span></div>
                        <div class="info-row"><span class="info-label">Host:</span> <span class="info-value">${asset.hostname || asset.asset_id}</span></div>
                        <div class="info-row"><span class="info-label">SN:</span> <span class="info-value">${asset.serial_number}</span></div>
                        <div class="info-row"><span class="info-label">Brand:</span> <span class="info-value">${asset.brand_name}</span></div>
                    </div>
                </div>
                ` : `
                <div class="asset-info">
                    <div class="info-grid">
                        <span class="info-label">Asset ID:</span>
                        <span class="info-value">${asset.asset_id}</span>
                        
                        <span class="info-label">Hostname:</span>
                        <span class="info-value">${asset.hostname || asset.asset_id}</span>
                        
                        <span class="info-label">Product:</span>
                        <span class="info-value">${asset.product_name}</span>
                        
                        <span class="info-label">Brand:</span>
                        <span class="info-value">${asset.brand_name} ${asset.model || ''}</span>
                        
                        <span class="info-label">Serial:</span>
                        <span class="info-value">${asset.serial_number}</span>
                    </div>
                </div>
                <div class="qr-code">
                    <img src="${qrCodeDataUrl}" alt="QR Code" />
                    <div class="qr-code-text">Scan for details</div>
                </div>
                `}
            </div>
            <div class="footer">
                Acquired: ${asset.date_acquired ? new Date(asset.date_acquired).toLocaleDateString() : 'N/A'} | Property of IDESOLUSI
            </div>
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
