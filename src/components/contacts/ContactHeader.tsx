import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  setContactStatusMode,
  setContactManualStatus,
  recomputeContactStatus,
} from "@/services/contacts";

type ContactStatusMode = "auto" | "manual";
type ContactStatusValue = "active" | "past";

interface Contact {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  status_mode: ContactStatusMode;
  status_effective: ContactStatusValue;
  status_manual?: ContactStatusValue | null;
  tags?: string[];
}

interface ContactHeaderProps {
  contact: Contact;
  onUpdate: () => void; // parent refetch callback
}

export function ContactHeader({ contact, onUpdate }: ContactHeaderProps) {
  const { profile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);

  const isAdmin = profile?.role === "admin" || profile?.role === "superadmin";
  const isManualMode: boolean = contact?.status_mode === "manual";
  const currentStatus: ContactStatusValue = contact?.status_effective ?? "active";

  const getStatusVariant = (status: ContactStatusValue) =>
    status === "active" ? "default" : "secondary";

  const handleModeToggle = async (checked: boolean) => {
    if (!isAdmin || !contact?.id) return;

    setIsUpdating(true);
    try {
      const newMode: ContactStatusMode = checked ? "manual" : "auto";
      const { error } = await setContactStatusMode(contact.id, newMode);
      if (error) throw error;

      if (newMode === "auto") {
        const { error: err2 } = await recomputeContactStatus(contact.id);
        if (err2) throw err2;
        toast({
          title: "Status set to Auto",
          description: "Recalculated based on linked leads and properties.",
        });
      } else {
        toast({
          title: "Status set to Manual",
          description: "Automation paused. You can set Active/Past manually.",
        });
      }

      onUpdate?.();
    } catch (error) {
      console.error("Failed to update status mode", error);
      toast({
        title: "Error",
        description: "Failed to update status mode.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (newStatus: ContactStatusValue) => {
    if (!isAdmin || !isManualMode || !contact?.id) return;

    setIsUpdating(true);
    try {
      const { error } = await setContactManualStatus(contact.id, newStatus);
      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Contact status set to ${newStatus}.`,
      });

      onUpdate?.();
    } catch (error) {
      console.error("Failed to set manual status", error);
      toast({
        title: "Error",
        description: "Failed to set manual status.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className="flex items-center justify-between p-4 border-b"
      aria-busy={isUpdating}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold truncate">
            {contact?.name || "Contact"}
          </h1>
          {contact?.email && (
            <p className="text-muted-foreground truncate">{contact.email}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(currentStatus)} className="capitalize">
            {currentStatus}
          </Badge>
          <Badge variant="outline" className="text-[10px] uppercase">
            {isManualMode ? "MANUAL" : "AUTO"}
          </Badge>

          {Array.isArray(contact?.tags) && contact.tags.length > 0 && (
            <div className="flex gap-1">
              {contact.tags.slice(0, 3).map((tag) => (
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
            <Label htmlFor="status-mode" className="text-sm">
              Manual
            </Label>
            <Switch
              id="status-mode"
              checked={isManualMode}
              onCheckedChange={handleModeToggle}
              disabled={isUpdating}
            />
          </div>

          {isManualMode && (
            <Select
              value={currentStatus}
              onValueChange={(v) => handleStatusChange(v as ContactStatusValue)}
              disabled={isUpdating}
            >
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Status" />
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

export default ContactHeader;
