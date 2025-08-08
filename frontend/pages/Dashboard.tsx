import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useBackend } from "../hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  Ticket, 
  Clock, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  RefreshCw,
  AlertCircle
} from "lucide-react";

export default function Dashboard() {
  const backend = useBackend();

  // Get ticket list data to calculate totals
  const { data: ticketsData, isLoading: ticketsLoading, error: ticketsError, refetch: refetchTickets } = useQuery({
    queryKey: ["dashboard-tickets"],
    queryFn: async () => {
      console.log("Fetching tickets for dashboard...");
      try {
        // Fetch all tickets without pagination to get accurate totals
        const result = await backend.ticket.list({
          limit: 1000, // Large limit to get all tickets
          offset: 0,
        });
        console.log("Dashboard tickets fetched successfully:", result);
        return result;
      } catch (error) {
        console.error("Error fetching dashboard tickets:", error);
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
    refetchOnWindowFocus: true,
    retry: (failureCount, error: any) => {
      // Don't retry on client errors (400-499)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Get trends and engineer stats from the stats endpoint
  const { data: statsData, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["ticket-stats"],
    queryFn: async () => {
      console.log("Fetching dashboard stats...");
      try {
        const result = await backend.ticket.getStats();
        console.log("Dashboard stats fetched successfully:", result);
        return result;
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
    refetchOnWindowFocus: true,
    retry: (failureCount, error: any) => {
      // Don't retry on client errors (400-499)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const handleRefresh = () => {
    console.log("Manually refreshing dashboard data...");
    refetchTickets();
    refetchStats();
  };

  const isLoading = ticketsLoading || statsLoading;
  const isError = ticketsError || statsError;
  const error = ticketsError || statsError;

  // Error state
  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
        
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-600 mr-4" />
              <div>
                <h3 className="text-lg font-medium text-red-800">Failed to load dashboard data</h3>
                <p className="text-red-600">
                  {error instanceof Error ? error.message : "An error occurred while loading dashboard statistics"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <Badge variant="outline" className="text-sm">
            Loading...
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-64 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate stats from ticket list data
  const tickets = ticketsData?.tickets || [];
  const totalFromList = ticketsData?.total || 0;
  
  // Calculate status counts from actual ticket data
  const calculatedStats = {
    total: totalFromList,
    open: tickets.filter(t => t.status === "Open").length,
    inProgress: tickets.filter(t => t.status === "In Progress").length,
    resolved: tickets.filter(t => t.status === "Resolved").length,
    closed: tickets.filter(t => t.status === "Closed").length,
  };

  // Use trends and engineer stats from the stats endpoint
  const trends = statsData?.trends || [];
  const engineerStats = statsData?.engineerStats || [];

  // Use calculated stats instead of stats from endpoint
  const currentStats = calculatedStats;

  const statusData = [
    { name: "Open", value: currentStats.open, color: "#ef4444" },
    { name: "Resolved", value: currentStats.resolved, color: "#f59e0b" },
    { name: "Closed", value: currentStats.closed, color: "#10b981" },
  ].filter(item => item.value > 0); // Only show non-zero values

  // Prepare trends data (reverse to show chronologically)
  const trendsData = trends.slice().reverse().map(trend => ({
    ...trend,
    date: new Date(trend.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-sm">
            Last updated: {new Date().toLocaleTimeString()}
          </Badge>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Ticket className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Tickets</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {currentStats.total}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Open</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {currentStats.open}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Resolved</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {currentStats.resolved}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Closed</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {currentStats.closed}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Ticket Trends (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {trendsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trendsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date"
                    fontSize={12}
                  />
                  <YAxis fontSize={12} />
                  <Tooltip 
                    labelFormatter={(value) => `Date: ${value}`}
                    formatter={(value) => [`${value}`, 'Tickets']}
                  />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BarChart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No trend data available</p>
                  <p className="text-sm mt-2">Create some tickets to see trends</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Ticket Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}`, 'Tickets']} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <XCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No tickets to display</p>
                  <p className="text-sm mt-2">Create some tickets to see distribution</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Engineer Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets by Engineer</CardTitle>
        </CardHeader>
        <CardContent>
          {engineerStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={engineerStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="engineer" 
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis fontSize={12} />
                <Tooltip formatter={(value) => [`${value}`, 'Tickets']} />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <div className="text-center">
                <BarChart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No engineer assignment data available</p>
                <p className="text-sm mt-2">Assign tickets to engineers to see stats</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{currentStats.total}</p>
              <p className="text-sm text-gray-600">Total Tickets</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{currentStats.open}</p>
              <p className="text-sm text-gray-600">Need Attention</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{currentStats.resolved}</p>
              <p className="text-sm text-gray-600">Resolved</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{currentStats.closed}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Information (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <h4 className="font-medium text-blue-900 mb-2">Debug Information</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>Tickets loaded: {tickets.length}</p>
              <p>Total from list: {totalFromList}</p>
              <p>Calculated stats: {JSON.stringify(calculatedStats)}</p>
              <p>Trends count: {trends.length}</p>
              <p>Engineer stats count: {engineerStats.length}</p>
              <p>Last fetch: {new Date().toLocaleTimeString()}</p>
              <p>Auto-refresh: Every 60 seconds</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
