import { api, APIError } from "encore.dev/api";
import { getAuthData } from "~encore/auth";
import { assetDB } from "./db";

export interface DeleteAssetRequest {
  id: number;
}

// Deletes an asset (admin only).
export const deleteAsset = api<DeleteAssetRequest, void>(
  { auth: true, expose: true, method: "DELETE", path: "/assets/:id" },
  async (req) => {
    const auth = getAuthData()!;
    
    // Only admins can delete assets
    if (auth.role !== "admin") {
      throw APIError.permissionDenied("only admins can delete assets");
    }
    
    const result = await assetDB.exec`DELETE FROM assets WHERE id = ${req.id}`;
  }
);
