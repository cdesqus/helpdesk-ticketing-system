import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useBackend } from "../hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { 
  Package, RefreshCw, AlertCircle, Shield, Users, PackageCheck, PackageX, ScanLine
} from "lucide-react";

export default function AssetDashboard() {
  const backend = useBackend();
  const navigate = useNavigate();

  const { data: statsData, isLoading, error, refetch, isError } = useQuery({
    queryKey: ["asset-stats"],
    queryFn: () => backend.asset.getAssetStats(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Asset Dashboard</h1>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-600 mr-4" />
              <div>
                <h3 className="text-lg font-medium text-red-800">Failed to load dashboard data</h3>
                <p className="text-red-600">{error instanceof Error ? error.message : "An error occurred"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Asset Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-16 bg-gray-200 rounded"></div></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-64 bg-gray-200 rounded"></div></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = statsData?.stats;
  const categoryData = stats?.assetsByCategory.map(c => ({ name: c.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value: c.count })) || [];
  const statusData = stats?.assetsByStatus.map(s => ({ name: s.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value: s.count })) || [];
  const userData = stats?.assetsByUser || [];
  const auditProgress = stats?.auditProgress;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Asset Dashboard</h1>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card><CardContent className="p-6"><div className="flex items-center"><Package className="h-8 w-8 text-blue-600" /><div className="ml-4"><p className="text-sm font-medium text-gray-500">Total Assets</p><p className="text-2xl font-semibold text-gray-900">{stats?.totalAssets}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center"><PackageCheck className="h-8 w-8 text-green-600" /><div className="ml-4"><p className="text-sm font-medium text-gray-500">Assets In Use</p><p className="text-2xl font-semibold text-gray-900">{stats?.assetsByStatus.find(s => s.status === 'in_use')?.count || 0}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center"><PackageX className="h-8 w-8 text-red-600" /><div className="ml-4"><p className="text-sm font-medium text-gray-500">Out of Order</p><p className="text-2xl font-semibold text-gray-900">{stats?.assetsByStatus.find(s => s.status === 'out_of_order')?.count || 0}</p></div></div></CardContent></Card>
        <Card><CardContent className="p-6"><div className="flex items-center"><Shield className="h-8 w-8 text-yellow-600" /><div className="ml-4"><p className="text-sm font-medium text-gray-500">Warranty Expiring Soon</p><p className="text-2xl font-semibold text-gray-900">{stats?.warrantyExpiringSoon}</p></div></div></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Assets by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Assets by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                  {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Top 10 Users by Asset Count</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={12} />
                <YAxis type="category" dataKey="user" fontSize={12} width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#ffc658" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Audit Progress</CardTitle></CardHeader>
          <CardContent>
            {auditProgress && (
              <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Assets</span>
                  <span className="font-bold">{auditProgress.totalAssets}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Audited Assets</span>
                  <span className="font-bold">{auditProgress.auditedAssets} ({auditProgress.totalAssets > 0 ? Math.round((auditProgress.auditedAssets / auditProgress.totalAssets) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${auditProgress.totalAssets > 0 ? (auditProgress.auditedAssets / auditProgress.totalAssets) * 100 : 0}%` }}></div>
                </div>
                <div className="flex justify-between text-sm pt-2">
                  <span className="text-green-600 font-medium">Valid: {auditProgress.validAssets}</span>
                  <span className="text-red-600 font-medium">Invalid: {auditProgress.invalidAssets}</span>
                </div>
                <Button className="w-full mt-4" onClick={() => navigate("/assets/audit")}>
                  <ScanLine className="w-4 h-4 mr-2" />
                  Start New Audit
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
