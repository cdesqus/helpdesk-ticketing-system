export type AssetCategory = "laptop" | "network_device" | "printer" | "license" | "scanner" | "consumable";
export type AssetStatus = "in_use" | "available" | "out_of_order" | "maintenance" | "retired";

export interface Asset {
  id: number;
  assetId: string;
  hostname?: string;
  productName: string;
  serialNumber: string;
  brandName: string;
  model?: string;
  category: AssetCategory;
  location?: string;
  assignedUser?: string;
  assignedUserEmail?: string;
  dateAcquired?: Date;
  warrantyExpiryDate?: Date;
  status: AssetStatus;
  comments?: string;
  qrCodeData?: string;
  createdAt: Date;
  updatedAt: Date;
  totalLicenses?: number;
  usedLicenses?: number;
  isConsumable: boolean;
  quantity?: number;
  minStockLevel?: number;
}

export interface AssetAudit {
  id: number;
  assetId: number;
  auditedBy: string;
  auditDate: Date;
  status: "valid" | "invalid" | "not_found";
  scannedData?: string;
  notes?: string;
}

export type StockTransactionType = "add" | "remove" | "adjustment" | "initial";

export interface StockTransaction {
  id: number;
  assetId: number;
  transactionType: StockTransactionType;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  performedBy: string;
  reason?: string;
  referenceNumber?: string;
  createdAt: Date;
}

export interface AssetStats {
  totalAssets: number;
  assetsByCategory: Array<{
    category: AssetCategory;
    count: number;
  }>;
  assetsByStatus: Array<{
    status: AssetStatus;
    count: number;
  }>;
  assetsByUser: Array<{
    user: string;
    count: number;
  }>;
  warrantyExpiringSoon: number;
  auditProgress: {
    totalAssets: number;
    auditedAssets: number;
    validAssets: number;
    invalidAssets: number;
  };
  lowStockItems: number;
}
