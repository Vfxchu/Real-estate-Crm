import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPropertyFileUrl } from "@/services/propertyFiles";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ContactFile {
  id: string;
  name: string;
  path: string;
  type: string;
  tag?: string;
  created_at: string;
  source: 'contact' | 'property';
  property_title?: string;
}

interface ContactDocumentsTabProps {
  contactId: string;
}

export function ContactDocumentsTab({ contactId }: ContactDocumentsTabProps) {
  const [files, setFiles] = useState<ContactFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContactFiles();
  }, [contactId]);

  const loadContactFiles = async () => {
    try {
      // 1. Get files directly linked to contact
      const { data: contactFiles, error: contactFilesError } = await supabase
        .from('contact_files')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });

      if (contactFilesError) throw contactFilesError;

      // 2. Get files from properties linked to this contact
      const { data: linkedProperties, error: propertiesError } = await supabase
        .from('contact_properties')
        .select(`
          property_id,
          properties!inner(
            id,
            title
          )
        `)
        .eq('contact_id', contactId);

      if (propertiesError) throw propertiesError;

      // 3. Get files from properties owned by this contact
      const { data: ownedProperties, error: ownedError } = await supabase
        .from('properties')
        .select('id, title')
        .eq('owner_contact_id', contactId);

      if (ownedError) throw ownedError;

      // Combine all property IDs
      const allPropertyIds = [
        ...(linkedProperties?.map(lp => lp.property_id) || []),
        ...(ownedProperties?.map(op => op.id) || [])
      ];

      let propertyFiles: ContactFile[] = [];
      if (allPropertyIds.length > 0) {
        const { data: propFiles, error: propFilesError } = await supabase
          .from('property_files')
          .select(`
            id,
            name,
            path,
            type,
            created_at,
            property_id,
            properties!inner(title)
          `)
          .in('property_id', allPropertyIds)
          .order('created_at', { ascending: false });

        if (propFilesError) throw propFilesError;

        propertyFiles = (propFiles || []).map(file => ({
          id: file.id,
          name: file.name,
          path: file.path,
          type: file.type,
          created_at: file.created_at,
          source: 'property' as const,
          property_title: file.properties?.title
        }));
      }

      // Combine and format all files
      const allFiles: ContactFile[] = [
        ...(contactFiles || []).map(file => ({
          ...file,
          source: 'contact' as const
        })),
        ...propertyFiles
      ];

      // Sort by creation date (newest first)
      allFiles.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setFiles(allFiles);
    } catch (error) {
      console.error('Failed to load contact files:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileDownload = async (file: ContactFile) => {
    try {
      const url = await getPropertyFileUrl({ id: file.id, type: file.source === 'property' ? 'document' : 'document' } as any);
      if (!url) throw new Error('Could not generate download URL');
      
      // Open in new tab for download
      window.open(url, '_blank');
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download the file",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return '🖼️';
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    return '📁';
  };

  const getTagVariant = (tag?: string) => {
    switch (tag) {
      case 'contract': return 'default';
      case 'id_document': return 'secondary';
      case 'financial': return 'outline';
      case 'property_doc': return 'outline';
      default: return 'outline';
    }
  };

  const getSourceBadge = (source: string) => {
    return source === 'contact' ? 'Contact' : 'Property';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Documents</h3>
        <Badge variant="outline">{files.length} files</Badge>
      </div>

      <div className="space-y-3">
        {files.map((file) => (
          <Card key={`${file.source}-${file.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="text-2xl">{getFileIcon(file.type)}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm truncate">{file.name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {getSourceBadge(file.source)}
                      </Badge>
                      {file.tag && (
                        <Badge variant={getTagVariant(file.tag)} className="text-xs">
                          {file.tag.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{format(new Date(file.created_at), 'MMM dd, yyyy')}</span>
                      {file.property_title && (
                        <>
                          <span>•</span>
                          <span>From: {file.property_title}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFileDownload(file)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFileDownload(file)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {files.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No documents found</p>
            <p className="text-sm">Documents uploaded for this contact or related properties will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}