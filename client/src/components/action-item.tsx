import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, User } from "lucide-react";
import type { ActionItem } from "@shared/schema";

interface ActionItemProps {
  actionItem: ActionItem;
  showMeetingTitle?: boolean;
}

export function ActionItem({ actionItem, showMeetingTitle = false }: ActionItemProps) {
  const { toast } = useToast();
  const [isCompleted, setIsCompleted] = useState(actionItem.status === "completed");

  // Update action item mutation
  const updateActionItemMutation = useMutation({
    mutationFn: async (completed: boolean) => {
      const response = await apiRequest('PATCH', `/api/action-items/${actionItem.id}`, {
        status: completed ? "completed" : "pending",
      });
      return response.json();
    },
    onSuccess: (_, completed) => {
      setIsCompleted(completed);
      queryClient.invalidateQueries({ queryKey: ["/api/workspaces"] });
      toast({
        title: "Success",
        description: `Action item marked as ${completed ? 'completed' : 'pending'}.`,
      });
    },
    onError: (error) => {
      // Revert the local state change
      setIsCompleted(!isCompleted);
      
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to update action item.",
        variant: "destructive",
      });
    },
  });

  const handleToggle = (checked: boolean) => {
    setIsCompleted(checked);
    updateActionItemMutation.mutate(checked);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    
    if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    }
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge className="priority-badge-high">High Priority</Badge>;
      case "medium":
        return <Badge className="priority-badge-medium">Medium Priority</Badge>;
      case "low":
        return <Badge className="priority-badge-low">Low Priority</Badge>;
      default:
        return <Badge className="priority-badge-medium">Medium Priority</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word.charAt(0))
      .join("")
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <Card className="border border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Checkbox
            checked={isCompleted}
            onCheckedChange={handleToggle}
            disabled={updateActionItemMutation.isPending}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <p className={`font-medium ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
              {actionItem.task}
            </p>
            
            <div className="flex items-center space-x-4 mt-2 text-sm text-slate-500">
              <div className="flex items-center space-x-1">
                <Avatar className="w-4 h-4">
                  <AvatarFallback className="text-xs">
                    {getInitials(actionItem.assigneeName)}
                  </AvatarFallback>
                </Avatar>
                <span>{actionItem.assigneeName}</span>
              </div>
              
              {actionItem.dueDate && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(actionItem.dueDate)}</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2 mt-2">
              {getPriorityBadge(actionItem.priority)}
              {showMeetingTitle && (
                <Badge variant="outline" className="text-xs">
                  Meeting #{actionItem.meetingId}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
