import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import backend from "~backend/client";
import type { TicketStatus, TicketPriority } from "~backend/ticket/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import CommentSection from "../components/CommentSection";
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  Calendar,
  User,
  Building,
  Mail,
  Trash2,
  XCircle
} from "lucide-react";

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    status: "Open" as TicketStatus,
    priority: "Medium" as TicketPriority,
    assignedEngineer: "unassigned",
    reporterName: "",
    reporterEmail: "",
    companyName: "",
    customDate: "",
  });

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: () => backend.ticket.get({ id: parseInt(id!) }),
    enabled: !!id,
  });

  const { data: engineersData } = useQuery({
    queryKey: ["engineers"],
    queryFn: () => backend.ticket.listEngineers(),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => backend.ticket.update({ id: parseInt(id!), ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      setIsEditing(false);
      toast({
        title: "Ticket updated",
        description: "Ticket has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Failed to update ticket:", error);
      toast({
        title: "Error",
        description: "Failed to update ticket. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => backend.ticket.deleteTicket({ id: parseInt(id!) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      toast({
        title: "Ticket deleted",
        description: "Ticket has been deleted successfully.",
      });
      navigate("/tickets");
    },
    onError: (error) => {
      console.error("Failed to delete ticket:", error);
      toast({
        title: "Error",
        description: "Failed to delete ticket. Please try again.",
        variant: "destructive",
      });
    },
  });

  const closeMutation = useMutation({
    mutationFn: (data: { id: number; reason?: string }) => 
      backend.ticket.closeTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      queryClient.invalidateQueries({ queryKey: ["comments", parseInt(id!)] });
      setIsCloseDialogOpen(false);
      setCloseReason("");
      toast({
        title: "Ticket closed",
        description: "Ticket has been closed successfully.",
      });
    },
    onError: (error) => {
      console.error("Failed to close ticket:", error);
      toast({
        title: "Error",
        description: "Failed to close ticket. Please try again.",
        variant: "destructive",
      });
    },
  });

  React.useEffect(() => {
    if (ticket) {
      setFormData({
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        assignedEngineer: ticket.assignedEngineer || "unassigned",
        reporterName: ticket.reporterName,
        reporterEmail: ticket.reporterEmail || "",
        companyName: ticket.companyName || "",
        customDate: ticket.customDate 
          ? new Date(ticket.customDate).toISOString().slice(0, 16)
          : "",
      });
    }
  }, [ticket]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (ticket) {
      setFormData({
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        assignedEngineer: ticket.assignedEngineer || "unassigned",
        reporterName: ticket.reporterName,
        reporterEmail: ticket.reporterEmail || "",
        companyName: ticket.companyName || "",
        customDate: ticket.customDate 
          ? new Date(ticket.customDate).toISOString().slice(0, 16)
          : "",
      });
    }
  };

  const handleSave = () => {
    if (!formData.subject.trim() || !formData.description.trim() || !formData.reporterName.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const updateData = {
      ...formData,
      assignedEngineer: formData.assignedEngineer === "unassigned" ? undefined : formData.assignedEngineer,
      reporterEmail: formData.reporterEmail || undefined,
      companyName: formData.companyName || undefined,
      customDate: formData.customDate ? new Date(formData.customDate) : undefined,
    };

    updateMutation.mutate(updateData);
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this ticket? This action cannot be undone.")) {
      deleteMutation.mutate();
    }
  };

  const handleClose = () => {
    closeMutation.mutate({
      id: parseInt(id!),
      reason: closeReason || undefined,
    });
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Ticket not found</h2>
        <p className="text-gray-600 mt-2">The ticket you're looking for doesn't exist.</p>
        <Button onClick={() => navigate("/tickets")} className="mt-4">
          Back to Tickets
        </Button>
      </div>
    );
  }

  const engineers = engineersData?.engineers || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">
            Ticket #{ticket.id}
          </h1>
        </div>
        
        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <>
              <Button onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              {ticket.status !== "Closed" && (
                <Dialog open={isCloseDialogOpen} onOpenChange={setIsCloseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <XCircle className="w-4 h-4 mr-2" />
                      Close
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Close Ticket</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to close this ticket? You can optionally provide a reason.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="closeReason">Closing Reason (Optional)</Label>
                        <Textarea
                          id="closeReason"
                          value={closeReason}
                          onChange={(e) => setCloseReason(e.target.value)}
                          placeholder="Provide a reason for closing this ticket..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsCloseDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleClose}
                        disabled={closeMutation.isPending}
                      >
                        {closeMutation.isPending ? "Closing..." : "Close Ticket"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={updateMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                {isEditing ? (
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                ) : (
                  <p className="text-lg font-medium">{ticket.subject}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                {isEditing ? (
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={8}
                  />
                ) : (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="whitespace-pre-wrap">{ticket.description}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Comments Section */}
          <CommentSection ticketId={ticket.id} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status & Priority</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                {isEditing ? (
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as TicketStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="Resolved">Resolved</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={getStatusColor(ticket.status)}>
                    {ticket.status}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                {isEditing ? (
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value as TicketPriority })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={getPriorityColor(ticket.priority)}>
                    {ticket.priority}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <Label>Assigned Engineer</Label>
                {isEditing ? (
                  <Select
                    value={formData.assignedEngineer}
                    onValueChange={(value) => setFormData({ ...formData, assignedEngineer: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an engineer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {engineers.map((engineer) => (
                        <SelectItem key={engineer.id} value={engineer.name}>
                          {engineer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm">{ticket.assignedEngineer || "Unassigned"}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reporter Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                {isEditing ? (
                  <Input
                    value={formData.reporterName}
                    onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-sm">{ticket.reporterName}</span>
                  </div>
                )}
              </div>

              {(ticket.reporterEmail || isEditing) && (
                <div className="space-y-2">
                  <Label>Email</Label>
                  {isEditing ? (
                    <Input
                      type="email"
                      value={formData.reporterEmail}
                      onChange={(e) => setFormData({ ...formData, reporterEmail: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-sm">{ticket.reporterEmail}</span>
                    </div>
                  )}
                </div>
              )}

              {(ticket.companyName || isEditing) && (
                <div className="space-y-2">
                  <Label>Company</Label>
                  {isEditing ? (
                    <Input
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center">
                      <Building className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-sm">{ticket.companyName}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timestamps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Created</Label>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="text-sm">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Last Updated</Label>
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="text-sm">
                    {new Date(ticket.updatedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {ticket.resolvedAt && (
                <div className="space-y-2">
                  <Label>Resolved</Label>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="text-sm">
                      {new Date(ticket.resolvedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {(ticket.customDate || isEditing) && (
                <div className="space-y-2">
                  <Label>Custom Date</Label>
                  {isEditing ? (
                    <Input
                      type="datetime-local"
                      value={formData.customDate}
                      onChange={(e) => setFormData({ ...formData, customDate: e.target.value })}
                    />
                  ) : (
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-sm">
                        {new Date(ticket.customDate!).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
