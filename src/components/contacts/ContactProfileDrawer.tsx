import React, { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Edit, X } from "lucide-react";
import { Lead } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile, createSignedUrl, deleteFile } from "@/services/storage";
import ContactForm from "./ContactForm";
import { ContactHeader } from "./ContactHeader";
import { ContactEnhancedTabs } from "./ContactEnhancedTabs";

interface ContactProfileDrawerProps {
  contact: Lead | null;
  open: boolean;
  onClose: () => void;
}

interface ContactFile {
  id: string;
  name: string;
  path: string;
  type: string;
  created_at: string;
  // tag?: string; // uncomment if you show tags in UI
}

function ContactProfileDrawer({ contact, open, onClose }: ContactProfileDrawerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editMode, setEditMode] = useState(false);
  const [files, setFiles] = useState<ContactFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Build a contact-like shape for ContactHeader (ensures required fields exist)
  const headerContact = contact
    ? {
        id: contact.id,
        name: (contact as any).name ?? (contact as any).full_name ?? "Contact",
        email: (contact as any).email ?? null,
        phone: (contact as any).phone ?? null,
        status_mode: ((contact as any).status_mode ?? "auto") as "auto" | "manual",
        status_effective: ((contact as any).status_effective ?? "active") as "active" | "past",
        status_manual: ((contact as any).status_manual ?? null) as "active" | "past" | null,
        tags: (contact as any).tags ?? (contact as any).interest_tags ?? [],
      }
    : null;

  // Load contact files
  useEffect(() => {
    if (contact?.id) {
      loadFiles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact?.id]);

  const loadFiles = async () => {
    if (!contact?.id) return;

    try {
      const { data, error } = await supabase
        .from("contact_files")
        .select("*")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFiles((data as ContactFile[]) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load files: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !contact?.id || !user?.id) return;

    setUploading(true);
    try {
      // Create storage path
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `documents/${user.id}/${contact.id}/general/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await uploadFile("documents", filePath, file);
      if (uploadError) throw uploadError;

      // Save to database (NOTE: your table does not have "size", so we don't send it)
      const { error: dbError } = await supabase.from("contact_files").insert({
        contact_id: contact.id,
        name: file.name,
        path: filePath,
        type: "document", // or 'manual'/'upload' depending on your UI
        // tag: 'id', // optionally add default tag
      });

      if (dbError) throw dbError;

      toast({ title: "Success", description: "File uploaded successfully" });
      await loadFiles();
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset input
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleFileDownload = async (file: ContactFile) => {
    try {
      const { data: signedUrl, error } = await createSignedUrl("documents", file.path, 300);
      if (error) throw error;
      if (!signedUrl?.signedUrl) throw new Error("No signed URL received");
      window.open(signedUrl.signedUrl, "_blank");
    } catch (error: any) {
      toast({
        title: "Download failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileDelete = async (file: ContactFile) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      const { error: storageError } = await deleteFile("documents", file.path);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from("contact_files").delete().eq("id", file.id);
      if (dbError) throw dbError;

      toast({ title: "Success", description: "File deleted successfully" });
      await loadFiles();
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!contact) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col h-full">
        <SheetHeader className="p-6 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {contact.name || "Unknown Contact"}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={contact.contact_status === "lead" ? "secondary" : "default"}>
                  {contact.contact_status}
                </Badge>
                {contact.interest_tags?.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!editMode && (
                <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {headerContact && (
          <ContactHeader
            contact={headerContact}
            onUpdate={() => {
              // Trigger refresh events (your app listens to these)
              window.dispatchEvent(new CustomEvent("contacts:updated"));
              window.dispatchEvent(new CustomEvent("leads:changed"));
            }}
          />
        )}

        <div className="flex-1 overflow-hidden">
          {editMode ? (
            <ScrollArea className="h-full">
              <div className="p-6">
                <ContactForm
                  contact={contact}
                  onSuccess={() => {
                    setEditMode(false);
                    toast({ title: "Success", description: "Contact updated successfully" });
                    window.dispatchEvent(new CustomEvent("contacts:updated"));
                    window.dispatchEvent(new CustomEvent("leads:changed"));
                  }}
                  onCancel={() => setEditMode(false)}
                />
              </div>
            </ScrollArea>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      id="file-upload"
                      type="file"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                    />
                    <label htmlFor="file-upload">
                      <Button type="button" disabled={uploading}>
                        Upload File
                      </Button>
                    </label>
                  </div>
                </div>

                {/* Files list */}
                {files.length > 0 && (
                  <div className="space-y-2 mb-6">
                    {files.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between border rounded-lg p-3"
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{f.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{f.path}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleFileDownload(f)}>
                            Download
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleFileDelete(f)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Role-aware tabs / details */}
                <ContactEnhancedTabs
                  contact={contact}
                  onUpdate={() => {
                    window.dispatchEvent(new CustomEvent("contacts:updated"));
                    window.dispatchEvent(new CustomEvent("leads:changed"));
                  }}
                />
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ContactProfileDrawer;
