import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, Download, Eye, Calendar, 
  File, Image, Video, Archive
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface LeadDocumentsTabProps {
  lead: Lead;
}

interface ContactFile {
  id: string;
  name: string;
  type: string;
  path: string;
  tag?: string;
  created_at: string;
  contact_id: string;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
  if (type.startsWith('video/')) return <Video className="w-4 h-4" />;
  if (type.includes('pdf') || type.includes('document')) return <FileText className="w-4 h-4" />;
  if (type.includes('zip') || type.includes('rar')) return <Archive className="w-4 h-4" />;
  return <File className="w-4 h-4" />;
};

const getFileTypeDisplay = (type: string) => {
  if (type.startsWith('image/')) return 'Image';
  if (type.startsWith('video/')) return 'Video';
  if (type.includes('pdf')) return 'PDF';
  if (type.includes('document') || type.includes('word')) return 'Document';
  if (type.includes('spreadsheet') || type.includes('excel')) return 'Spreadsheet';
  if (type.includes('zip') || type.includes('rar')) return 'Archive';
  return 'File';
};

export const LeadDocumentsTab: React.FC<LeadDocumentsTabProps> = ({ lead }) => {
  const [documents, setDocuments] = useState<ContactFile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (lead?.id) {
      loadDocuments();
    }
  }, [lead?.id]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      
      // Fetch documents linked to this lead
      // Check contact_id = lead.id (lead acts as contact in this context)
      const contactIds = [lead.id];

      const { data, error } = await supabase
        .from('contact_files')
        .select('*')
        .in('contact_id', contactIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error loading documents:', error);
      toast({
        title: 'Error loading documents',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (file: ContactFile) => {
    try {
      // Get signed URL for download
      const { data, error } = await supabase
        .storage
        .from('documents')
        .createSignedUrl(file.path, 60); // Valid for 1 minute

      if (error) throw error;
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      toast({
        title: 'Error downloading file',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handlePreview = async (file: ContactFile) => {
    try {
      // For images and PDFs, try to get a signed URL for preview
      if (file.type.startsWith('image/') || file.type.includes('pdf')) {
        const { data, error } = await supabase
          .storage
          .from('documents')
          .createSignedUrl(file.path, 60);

        if (error) throw error;
        
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
        }
      } else {
        // For other file types, just download
        handleDownload(file);
      }
    } catch (error: any) {
      toast({
        title: 'Error previewing file',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Loading documents...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="w-4 h-4" />
          Documents ({documents.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex-shrink-0 text-muted-foreground">
                  {getFileIcon(doc.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {getFileTypeDisplay(doc.type)}
                    </Badge>
                    {doc.tag && (
                      <Badge variant="secondary" className="text-xs">
                        {doc.tag}
                      </Badge>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePreview(doc)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(doc)}
                    className="h-8 w-8 p-0"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">No documents available</p>
            <p className="text-xs mt-1">Documents will appear here when uploaded during lead or contact creation</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};