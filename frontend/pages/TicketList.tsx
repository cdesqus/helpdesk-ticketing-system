import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useBackend, useAuth } from "../hooks/useAuth";
import type { TicketStatus, TicketPriority } from "~backend/ticket/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Plus,
  Eye,
  Calendar,
  RefreshCw,
  Loader2,
  AlertCircle
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function TicketList() {
  const { toast } = useToast();
  const backend = useBackend();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TicketStatus | "all">("all");
  const [priority, setPriority] = useState<TicketPriority | "all">("all");
  const [assignedEngineer, setAssignedEngineer] = useState("all");
  const [page, setPage] = useState(0);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel");
  const [exportDateRange, setExportDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const limit = 20;

  const { data: ticketsData, isLoading, error, refetch, isError } = useQuery({
    queryKey: ["tickets", search, status, priority, assignedEngineer, page],
    queryFn: async () => {
      console.log("Fetching tickets with params:", { search, status, priority, assignedEngineer, page });
      try {
        const result = await backend.ticket.list({
          search: search || undefined,
          status: status === "all" ? undefined : status,
          priority: priority === "all" ? undefined : priority,
          assignedEngineer: assignedEngineer === "all" ? undefined : (assignedEngineer === "unassigned" ? "Unassigned" : assignedEngineer),
          limit,
          offset: page * limit,
        });
        console.log("Tickets fetched successfully:", result);
        return result;
      } catch (error) {
        console.error("Error fetching tickets:", error);
        throw error;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const { data: engineersData } = useQuery({
    queryKey: ["engineers"],
    queryFn: () => backend.ticket.listEngineers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleExport = async () => {
    try {
      const response = await backend.ticket.exportTickets({
        format: exportFormat,
        search: search || undefined,
        status: status === "all" ? undefined : status,
        priority: priority === "all" ? undefined : priority,
        assignedEngineer: assignedEngineer === "all" ? undefined : (assignedEngineer === "unassigned" ? "Unassigned" : assignedEngineer),
        startDate: exportDateRange.startDate || undefined,
        endDate: exportDateRange.endDate || undefined,
      });

      // Create download link
      const blob = new Blob([atob(response.data)], { 
        type: response.contentType 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = response.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setIsExportDialogOpen(false);
      toast({
        title: "Export successful",
        description: `Tickets exported as ${exportFormat.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export failed",
        description: "Failed to export tickets",
        variant: "destructive",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRefresh = () => {
    console.log("Refreshing tickets...");
    refetch();
  };

  const getPriorityColor = (priority: TicketPriority) => {
    switch (priority) {
      case "Urgent": return "destructive";
      case "High": return "destructive";
      case "Medium": return "default";
      case "Low": return "secondary";
      default: return "default";
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case "Open": return "destructive";
      case "In Progress": return "default";
      case "Resolved": return "default";
      case "Closed": return "secondary";
      default: return "default";
    }
  };

  const tickets = ticketsData?.tickets || [];
  const total = ticketsData?.total || 0;
  const engineers = engineersData?.engineers || [];

  // Show create button only for admin and reporter roles
  const canCreateTicket = user?.role === "admin" || user?.role === "reporter";

  // Debug information
  console.log("TicketList render state:", {
    isLoading,
    isError,
    error,
    ticketsCount: tickets.length,
    total,
    user: user?.username,
    userRole: user?.role
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tickets</h1>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
          {canCreateTicket && (
            <Link to="/tickets/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Ticket
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Error State */}
      {isError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
                <div>
                  <p className="text-red-800 font-medium">Failed to load tickets</p>
                  <p className="text-red-600 text-sm">
                    {error instanceof Error ? error.message : "An error occurred while loading tickets"}
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debug Information (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <h4 className="font-medium text-blue-900 mb-2">Debug Information</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>User: {user?.username} ({user?.role})</p>
              <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
              <p>Error: {isError ? 'Yes' : 'No'}</p>
              <p>Tickets loaded: {tickets.length}</p>
              <p>Total tickets: {total}</p>
              <p>Current filters: {JSON.stringify({ search, status, priority, assignedEngineer })}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={status} onValueChange={(value) => setStatus(value as TicketStatus | "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priority} onValueChange={(value) => setPriority(value as TicketPriority | "all")}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>

            <Select value={assignedEngineer} onValueChange={setAssignedEngineer}>
              <SelectTrigger>
                <SelectValue placeholder="Engineer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Engineers</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {engineers.map((engineer) => (
                  <SelectItem key={engineer.id} value={engineer.name}>
                    {engineer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex space-x-2">
              <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-1" />
                    Export
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export Tickets</DialogTitle>
                    <DialogDescription>
                      Choose export format and date range for ticket export.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="exportFormat">Export Format</Label>
                      <Select
                        value={exportFormat}
                        onValueChange={(value) => setExportFormat(value as "excel" | "pdf")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excel">Excel (CSV)</SelectItem>
                          <SelectItem value="pdf">PDF (Text)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="startDate">Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={exportDateRange.startDate}
                          onChange={(e) => setExportDateRange({ 
                            ...exportDateRange, 
                            startDate: e.target.value 
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endDate">End Date</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={exportDateRange.endDate}
                          onChange={(e) => setExportDateRange({ 
                            ...exportDateRange, 
                            endDate: e.target.value 
                          })}
                        />
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-sm text-blue-800">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Leave date fields empty to export all tickets. Current filters will be applied.
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsExportDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleExport}>
                      <Download className="w-4 h-4 mr-2" />
                      Export {exportFormat.toUpperCase()}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
              >
                <Printer className="w-4 h-4 mr-1" />
                Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Tickets ({total} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                <p className="text-gray-600">Loading tickets...</p>
              </div>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tickets found</h3>
              <p className="text-gray-600 mb-4">
                {search || status !== "all" || priority !== "all" || assignedEngineer !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "No tickets have been created yet."
                }
              </p>
              {canCreateTicket && (
                <Link to="/tickets/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Ticket
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Engineer</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">#{ticket.id}</TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={ticket.subject}>
                          {ticket.subject}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(ticket.status)}>
                          {ticket.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>{ticket.reporterName}</TableCell>
                      <TableCell>{ticket.assignedEngineer || "Unassigned"}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(ticket.createdAt).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link to={`/tickets/${ticket.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-700">
                Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total} results
              </p>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * limit >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
