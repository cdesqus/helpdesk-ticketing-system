import { api } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { assetDB } from "./db";
import type { StockTransaction, StockTransactionType } from "./types";

export interface AdjustStockRequest {
  assetId: number;
  transactionType: StockTransactionType;
  quantity: number;
  reason?: string;
  referenceNumber?: string;
}

export interface AdjustStockResponse {
  success: boolean;
  newQuantity: number;
  transaction: StockTransaction;
}

export interface GetStockTransactionsRequest {
  assetId: number;
}

export interface GetStockTransactionsResponse {
  transactions: StockTransaction[];
}

export interface GetLowStockItemsResponse {
  items: Array<{
    id: number;
    assetId: string;
    productName: string;
    brandName: string;
    quantity: number;
    minStockLevel: number;
  }>;
}

export const adjustStock = api(
  { method: "POST", path: "/assets/:assetId/stock/adjust", expose: true, auth: true },
  async ({ assetId, transactionType, quantity, reason, referenceNumber }: AdjustStockRequest): Promise<AdjustStockResponse> => {
    const auth = getAuthData();
    if (!auth) throw new Error("Unauthorized");

    const asset = await assetDB.queryRow`
      SELECT id, is_consumable, quantity, product_name
      FROM assets
      WHERE id = ${assetId}
    `;

    if (!asset) {
      throw new Error("Asset not found");
    }

    if (!asset.is_consumable) {
      throw new Error("This asset is not a consumable item");
    }

    const currentQuantity = asset.quantity || 0;
    let quantityChange = 0;
    let newQuantity = currentQuantity;

    if (transactionType === "add") {
      quantityChange = Math.abs(quantity);
      newQuantity = currentQuantity + quantityChange;
    } else if (transactionType === "remove") {
      quantityChange = -Math.abs(quantity);
      newQuantity = currentQuantity + quantityChange;
      
      if (newQuantity < 0) {
        throw new Error("Insufficient stock");
      }
    } else if (transactionType === "adjustment") {
      quantityChange = quantity - currentQuantity;
      newQuantity = quantity;
    }

    await assetDB.exec`
      UPDATE assets 
      SET quantity = ${newQuantity},
          updated_at = NOW()
      WHERE id = ${assetId}
    `;

    const result = await assetDB.queryRow`
      INSERT INTO stock_transactions (
        asset_id, transaction_type, quantity_change, 
        quantity_before, quantity_after, performed_by, reason, reference_number
      )
      VALUES (
        ${assetId}, ${transactionType}, ${quantityChange},
        ${currentQuantity}, ${newQuantity}, ${auth.userID}, ${reason || null}, ${referenceNumber || null}
      )
      RETURNING 
        id, asset_id, transaction_type, quantity_change, 
        quantity_before, quantity_after, performed_by, reason, reference_number, created_at
    `;

    if (!result) {
      throw new Error("Failed to create stock transaction");
    }

    const transaction: StockTransaction = {
      id: result.id,
      assetId: result.asset_id,
      transactionType: result.transaction_type,
      quantityChange: result.quantity_change,
      quantityBefore: result.quantity_before,
      quantityAfter: result.quantity_after,
      performedBy: result.performed_by,
      reason: result.reason,
      referenceNumber: result.reference_number,
      createdAt: result.created_at,
    };

    return {
      success: true,
      newQuantity,
      transaction,
    };
  }
);

export const getStockTransactions = api(
  { method: "GET", path: "/assets/:assetId/stock/transactions", expose: true, auth: true },
  async ({ assetId }: GetStockTransactionsRequest): Promise<GetStockTransactionsResponse> => {
    const auth = getAuthData();
    if (!auth) throw new Error("Unauthorized");

    const rows = await assetDB.queryAll`
      SELECT 
        id, asset_id, transaction_type, quantity_change, 
        quantity_before, quantity_after, performed_by, reason, reference_number, created_at
      FROM stock_transactions
      WHERE asset_id = ${assetId}
      ORDER BY created_at DESC
    `;

    const transactions: StockTransaction[] = rows.map((row) => ({
      id: row.id,
      assetId: row.asset_id,
      transactionType: row.transaction_type,
      quantityChange: row.quantity_change,
      quantityBefore: row.quantity_before,
      quantityAfter: row.quantity_after,
      performedBy: row.performed_by,
      reason: row.reason,
      referenceNumber: row.reference_number,
      createdAt: row.created_at,
    }));

    return { transactions };
  }
);

export const getLowStockItems = api(
  { method: "GET", path: "/assets/stock/low", expose: true, auth: true },
  async (): Promise<GetLowStockItemsResponse> => {
    const auth = getAuthData();
    if (!auth) throw new Error("Unauthorized");

    const rows = await assetDB.queryAll`
      SELECT id, asset_id, product_name, brand_name, quantity, min_stock_level
      FROM assets
      WHERE is_consumable = TRUE 
        AND quantity <= min_stock_level
        AND status != 'retired'
      ORDER BY (quantity - min_stock_level) ASC
    `;

    const items = rows.map((row) => ({
      id: row.id,
      assetId: row.asset_id,
      productName: row.product_name,
      brandName: row.brand_name,
      quantity: row.quantity,
      minStockLevel: row.min_stock_level,
    }));

    return { items };
  }
);
