import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBackend, useAuth } from "../hooks/useAuth";
import type { TicketComment } from "~backend/ticket/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { 
  MessageSquare, 
  Send, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Lock,
  User
} from "lucide-react";

interface CommentSectionProps {
  ticketId: number;
}

export default function CommentSection({ ticketId }: CommentSectionProps) {
  const { toast } = useToast();
  const backend = useBackend();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState({
    content: "",
    isInternal: false,
  });
  const [editingComment, setEditingComment] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  const { data: commentsData, isLoading } = useQuery({
    queryKey: ["comments", ticketId],
    queryFn: () => backend.ticket.listComments({ ticketId }),
  });

  const addCommentMutation = useMutation({
    mutationFn: (data: any) => backend.ticket.addComment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId.toString()] });
      setNewComment({
        content: "",
        isInternal: false,
      });
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Failed to add comment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: (data: { id: number; content: string }) => 
      backend.ticket.updateComment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", ticketId] });
      setEditingComment(null);
      setEditContent("");
      toast({
        title: "Comment updated",
        description: "Comment has been updated successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Failed to update comment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id: number) => backend.ticket.deleteComment({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", ticketId] });
      toast({
        title: "Comment deleted",
        description: "Comment has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Failed to delete comment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a comment.",
        variant: "destructive",
      });
      return;
    }

    addCommentMutation.mutate({
      ticketId,
      ...newComment,
    });
  };

  const handleEditComment = (comment: TicketComment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = () => {
    if (!editContent.trim()) {
      toast({
        title: "Validation Error",
        description: "Comment content cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    updateCommentMutation.mutate({
      id: editingComment!,
      content: editContent,
    });
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setEditContent("");
  };

  const handleDeleteComment = (id: number) => {
    if (confirm("Are you sure you want to delete this comment?")) {
      deleteCommentMutation.mutate(id);
    }
  };

  const canEditComment = (comment: TicketComment) => {
    return user?.role === "admin" || comment.authorName === user?.fullName;
  };

  const comments = commentsData?.comments || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="w-5 h-5 mr-2" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Comment */}
        <form onSubmit={handleAddComment} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="content">Add Comment</Label>
            <Textarea
              id="content"
              value={newComment.content}
              onChange={(e) => setNewComment({ ...newComment, content: e.target.value })}
              placeholder="Add your comment here..."
              rows={3}
              required
            />
          </div>

          <div className="flex items-center justify-between">
            {user?.role !== "reporter" && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isInternal"
                  checked={newComment.isInternal}
                  onCheckedChange={(checked) => 
                    setNewComment({ ...newComment, isInternal: checked as boolean })
                  }
                />
                <Label htmlFor="isInternal" className="text-sm">
                  Internal comment (not visible to reporter)
                </Label>
              </div>
            )}
            
            <Button
              type="submit"
              disabled={addCommentMutation.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              {addCommentMutation.isPending ? "Adding..." : "Add Comment"}
            </Button>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No comments yet. Be the first to add one!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className={`border rounded-lg p-4 ${
                  comment.isInternal ? "bg-yellow-50 border-yellow-200" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {comment.authorName}
                      </span>
                      {comment.authorEmail && (
                        <span className="text-sm text-gray-500">
                          ({comment.authorEmail})
                        </span>
                      )}
                    </div>
                    {comment.isInternal && (
                      <Badge variant="secondary" className="flex items-center">
                        <Lock className="w-3 h-3 mr-1" />
                        Internal
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {new Date(comment.createdAt).toLocaleString()}
                      {comment.updatedAt !== comment.createdAt && " (edited)"}
                    </span>
                    {canEditComment(comment) && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditComment(comment)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {editingComment === comment.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                    />
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={updateCommentMutation.isPending}
                      >
                        <Save className="w-4 h-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {comment.content}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
