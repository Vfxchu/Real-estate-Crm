import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { setContactStatusMode, setContactManualStatus, recomputeContactStatus } from "@/services/contacts";

interface ContactHeaderProps {
  contact: any;
  onUpdate: () => void;
}

export function ContactHeader({ contact, onUpdate }: ContactHeaderProps) {
  const { profile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const isManualMode = contact.status_mode === 'manual';
  const currentStatus = contact.status_effective;

  const handleModeToggle = async (checked: boolean) => {
    if (!isAdmin) return;
    
    setIsUpdating(true);
    try {
      const newMode = checked ? 'manual' : 'auto';
      await setContactStatusMode(contact.id, newMode);
      
      if (newMode === 'auto') {
        // Trigger recomputation when switching to auto
        const result = await recomputeContactStatus(contact.id);
        toast({
          title: "Status set to Auto",
          description: `Recalculated status based on leads and properties.`,
        });
      } else {
        toast({
          title: "Status set to Manual",
          description: "Status will not auto-update based on leads/properties.",
        });
      }
      
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status mode",
        variant: "destructive",
      });
    }
    setIsUpdating(false);
  };

  const handleStatusChange = async (newStatus: 'active' | 'past') => {
    if (!isAdmin || !isManualMode) return;
    
    setIsUpdating(true);
    try {
      await setContactManualStatus(contact.id, newStatus);
      toast({
        title: "Status Updated",
        description: `Contact status set to ${newStatus}`,
      });
      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
    setIsUpdating(false);
  };

  const getStatusVariant = (status: string) => {
    return status === 'active' ? 'default' : 'secondary';
  };

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{contact.name}</h1>
          <p className="text-muted-foreground">{contact.email}</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(currentStatus)} className="capitalize">
            {currentStatus}
          </Badge>
          
          {contact.tags && contact.tags.length > 0 && (
            <div className="flex gap-1">
              {contact.tags.slice(0, 3).map((tag: string) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {contact.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{contact.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Label htmlFor="status-mode" className="text-sm">Manual</Label>
            <Switch
              id="status-mode"
              checked={isManualMode}
              onCheckedChange={handleModeToggle}
              disabled={isUpdating}
            />
          </div>
          
          {isManualMode && (
            <Select value={currentStatus} onValueChange={handleStatusChange} disabled={isUpdating}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}