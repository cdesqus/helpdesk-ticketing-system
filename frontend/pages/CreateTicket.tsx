import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useBackend } from "../hooks/useAuth";
import type { TicketStatus, TicketPriority } from "~backend/ticket/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

export default function CreateTicket() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const backend = useBackend();
  const queryClient = useQueryClient();

  // Set default date to current date and time
  const now = new Date();
  const defaultDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    status: "Open" as TicketStatus,
    priority: "Medium" as TicketPriority,
    assignedEngineer: "unassigned",
    reporterName: "",
    reporterEmail: "",
    companyName: "",
    customDate: defaultDateTime,
  });

  const { data: engineersData, isLoading: engineersLoading } = useQuery({
    queryKey: ["engineers"],
    queryFn: () => backend.ticket.listEngineers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log("Creating ticket with data:", data);
      const result = await backend.ticket.create(data);
      console.log("Ticket created:", result);
      return result;
    },
    onSuccess: (ticket) => {
      console.log("Ticket creation successful, invalidating queries...");
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      
      toast({
        title: "Ticket created",
        description: `Ticket #${ticket.id} has been created successfully.`,
      });
      
      // Navigate to the ticket detail page
      navigate(`/tickets/${ticket.id}`);
    },
    onError: (error: any) => {
      console.error("Failed to create ticket:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create ticket. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.description.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in subject and description.",
        variant: "destructive",
      });
      return;
    }

    const submitData = {
      subject: formData.subject.trim(),
      description: formData.description.trim(),
      status: formData.status,
      priority: formData.priority,
      assignedEngineer: formData.assignedEngineer === "unassigned" ? undefined : formData.assignedEngineer,
      reporterName: formData.reporterName.trim() || undefined,
      reporterEmail: formData.reporterEmail.trim() || undefined,
      companyName: formData.companyName.trim() || undefined,
      customDate: formData.customDate ? new Date(formData.customDate) : undefined,
    };

    console.log("Submitting ticket data:", submitData);
    createMutation.mutate(submitData);
  };

  const engineers = engineersData?.engineers || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="flex items-center"
          disabled={createMutation.isPending}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Create New Ticket</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Ticket Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Brief description of the issue"
                  required
                  disabled={createMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customDate">Custom Date</Label>
                <Input
                  id="customDate"
                  type="datetime-local"
                  value={formData.customDate}
                  onChange={(e) => setFormData({ ...formData, customDate: e.target.value })}
                  disabled={createMutation.isPending}
                />
                <p className="text-xs text-gray-500">
                  Default is set to current date and time
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as TicketStatus })}
                  disabled={createMutation.isPending}
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value as TicketPriority })}
                  disabled={createMutation.isPending}
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedEngineer">Assigned Engineer</Label>
                <Select
                  value={formData.assignedEngineer}
                  onValueChange={(value) => setFormData({ ...formData, assignedEngineer: value })}
                  disabled={createMutation.isPending || engineersLoading}
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="reporterName">Reporter Name</Label>
                <Input
                  id="reporterName"
                  value={formData.reporterName}
                  onChange={(e) => setFormData({ ...formData, reporterName: e.target.value })}
                  placeholder="Name of the person reporting the issue"
                  disabled={createMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reporterEmail">Reporter Email</Label>
                <Input
                  id="reporterEmail"
                  type="email"
                  value={formData.reporterEmail}
                  onChange={(e) => setFormData({ ...formData, reporterEmail: e.target.value })}
                  placeholder="email@example.com"
                  disabled={createMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Company or organization name"
                  disabled={createMutation.isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Problem Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of the problem or issue"
                rows={6}
                required
                disabled={createMutation.isPending}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Create Ticket
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
