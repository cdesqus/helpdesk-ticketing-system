import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useBackend, useAuth } from "../hooks/useAuth";
import type { TicketStatus, TicketPriority } from "~backend/ticket/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  AlertCircle,
  Trash2,
  CheckSquare,
  Square,
  Upload,
  FileSpreadsheet,
  ChevronDown
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function TicketList() {
  const { toast } = useToast();
  const backend = useBackend();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TicketStatus | "all">("all");
  const [priority, setPriority] = useState<TicketPriority | "all">("all");
  
  // For engineers, default to showing their own tickets, but allow viewing all
  const [assignedEngineer, setAssignedEngineer] = useState(
    user?.role === "engineer" ? user.fullName : "all"
  );
  
  const [page, setPage] = useState(0);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"excel" | "pdf">("excel");
  const [exportDateRange, setExportDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  
  // Multiple selection state
  const [selectedTickets, setSelectedTickets] = useState<Set<number>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  
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
          assignedEngineer: assignedEngineer === "all" ? "all" : (assignedEngineer === "unassigned" ? "Unassigned" : assignedEngineer),
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

  const bulkDeleteMutation = useMutation({
    mutationFn: (ticketIds: number[]) => backend.ticket.bulkDeleteTickets({ ticketIds }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      setSelectedTickets(new Set());
      setIsSelectMode(false);
      setIsBulkDeleteDialogOpen(false);
      
      if (result.failedIds.length > 0) {
        toast({
          title: "Partial success",
          description: `${result.deletedCount} tickets deleted successfully. ${result.failedIds.length} tickets failed to delete.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Tickets deleted",
          description: `${result.deletedCount} tickets have been deleted successfully.`,
        });
      }
    },
    onError: (error: any) => {
      console.error("Failed to delete tickets:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete tickets. Please try again.",
        variant: "destructive",
      });
    },
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

  const handleSelectModeToggle = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedTickets(new Set());
  };

  const handleTicketSelect = (ticketId: number, checked: boolean) => {
    const newSelected = new Set(selectedTickets);
    if (checked) {
      newSelected.add(ticketId);
    } else {
      newSelected.delete(ticketId);
    }
    setSelectedTickets(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allTicketIds = new Set(tickets.map(ticket => ticket.id));
      setSelectedTickets(allTicketIds);
    } else {
      setSelectedTickets(new Set());
    }
  };

  const handleBulkDelete = () => {
    if (selectedTickets.size === 0) {
      toast({
        title: "No tickets selected",
        description: "Please select tickets to delete.",
        variant: "destructive",
      });
      return;
    }
    setIsBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = () => {
    const ticketIds = Array.from(selectedTickets);
    bulkDeleteMutation.mutate(ticketIds);
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
  const canDeleteTickets = user?.role === "admin";
  const canBulkImport = user?.role === "admin";
  const allTicketsSelected = tickets.length > 0 && tickets.every(ticket => selectedTickets.has(ticket.id));
  const someTicketsSelected = selectedTickets.size > 0 && !allTicketsSelected;

  // Debug information
  console.log("TicketList render state:", {
    isLoading,
    isError,
    error,
    ticketsCount: tickets.length,
    total,
    user: user?.username,
    userRole: user?.role,
    selectedCount: selectedTickets.size,
    isSelectMode,
    assignedEngineer
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
          
          {canDeleteTickets && (
            <Button
              variant={isSelectMode ? "secondary" : "outline"}
              onClick={handleSelectModeToggle}
            >
              {isSelectMode ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Cancel Select
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Select Multiple
                </>
              )}
            </Button>
          )}
          
          {canCreateTicket && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Ticket
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/tickets/new" className="flex items-center">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Single Ticket
                  </Link>
                </DropdownMenuItem>
                {canBulkImport && (
                  <DropdownMenuItem asChild>
                    <Link to="/tickets/bulk-import" className="flex items-center">
                      <Upload className="w-4 h-4 mr-2" />
                      Bulk Import from Excel
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {isSelectMode && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-blue-900">
                  {selectedTickets.size} ticket(s) selected
                </span>
                {tickets.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll(!allTicketsSelected)}
                  >
                    {allTicketsSelected ? "Deselect All" : "Select All"}
                  </Button>
                )}
              </div>
              
              {selectedTickets.size > 0 && (
                <div className="flex items-center space-x-2">
                  <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Selected ({selectedTickets.size})
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Selected Tickets</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {selectedTickets.size} selected ticket(s)? 
                          This action cannot be undone and will also delete all associated comments.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={confirmBulkDelete}
                          disabled={bulkDeleteMutation.isPending}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {bulkDeleteMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete {selectedTickets.size} Ticket(s)
                            </>
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bulk Import Info */}
      {canBulkImport && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileSpreadsheet className="w-5 h-5 text-green-600 mr-3" />
                <div>
                  <p className="text-green-800 font-medium">Bulk Import Available</p>
                  <p className="text-green-600 text-sm">
                    Import multiple tickets from Excel files. Status is automatically set based on resolution field.
                  </p>
                </div>
              </div>
              <Link to="/tickets/bulk-import">
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Import from Excel
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Engineer Filter Info */}
      {user?.role === "engineer" && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-blue-800 font-medium">Engineer View</p>
                  <p className="text-blue-600 text-sm">
                    {assignedEngineer === user.fullName 
                      ? "Showing only tickets assigned to you. Use the filter below to view all tickets."
                      : assignedEngineer === "all" 
                        ? "Showing all tickets. You can filter by engineer to see specific assignments."
                        : `Showing tickets assigned to ${assignedEngineer}.`
                    }
                  </p>
                </div>
              </div>
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
              <p>Selected tickets: {selectedTickets.size}</p>
              <p>Select mode: {isSelectMode ? 'Yes' : 'No'}</p>
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
                <div className="flex justify-center space-x-2">
                  <Link to="/tickets/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Ticket
                    </Button>
                  </Link>
                  {canBulkImport && (
                    <Link to="/tickets/bulk-import">
                      <Button variant="outline">
                        <Upload className="w-4 h-4 mr-2" />
                        Import from Excel
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isSelectMode && (
                      <TableHead className="w-12">
                        <Checkbox
                          checked={allTicketsSelected}
                          onCheckedChange={handleSelectAll}
                          ref={(el) => {
                            if (el) {
                              el.indeterminate = someTicketsSelected;
                            }
                          }}
                        />
                      </TableHead>
                    )}
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
                      {isSelectMode && (
                        <TableCell>
                          <Checkbox
                            checked={selectedTickets.has(ticket.id)}
                            onCheckedChange={(checked) => 
                              handleTicketSelect(ticket.id, checked as boolean)
                            }
                          />
                        </TableCell>
                      )}
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
