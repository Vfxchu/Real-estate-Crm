import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PropertyGallery } from "./PropertyGallery";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Property } from "@/hooks/useProperties";
import {
  MapPin, Bed, Bath, Square, Calendar, FileText, 
  Download, ExternalLink, Building, Home,
  Edit, X, Share2
} from 'lucide-react';

interface PropertyDetailViewProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (property: Property) => void;
  onScheduleViewing?: (property: Property) => void;
  onShare?: (property: Property) => void;
}

interface PropertyFile {
  id: string;
  name: string;
  path: string;
  type: string;
  size?: number;
  created_at: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AE', { 
    style: 'currency', 
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const PropertyDetailView: React.FC<PropertyDetailViewProps> = ({
  property,
  open,
  onOpenChange,
  onEdit,
  onScheduleViewing,
  onShare
}) => {
  const [files, setFiles] = useState<PropertyFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const isAdmin = profile?.role === 'admin';
  const isOwner = property?.agent_id === user?.id;
  const canEdit = isAdmin || isOwner;
  const canShare = true; // All authenticated users can share/export

  useEffect(() => {
    if (property && open) {
      fetchPropertyFiles();
    }
  }, [property, open]);

  const fetchPropertyFiles = async () => {
    if (!property) return;
    
    setLoadingFiles(true);
    try {
      const { data, error } = await supabase
        .from('property_files')
        .select('*')
        .eq('property_id', property.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error: any) {
      console.error('Error fetching property files:', error);
      toast({
        title: 'Error loading files',
        description: 'Could not load property documents',
        variant: 'destructive',
      });
    } finally {
      setLoadingFiles(false);
    }
  };

  const downloadFile = async (file: PropertyFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('property-documents')
        .download(file.path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: 'Download failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (!property) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">
                {property.title}
              </DialogTitle>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <MapPin className="w-4 h-4" />
                <span>{property.address}, {property.city}, {property.state}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {onShare && canShare && (
                <Button
                  variant="outline"
                  onClick={() => onShare(property)}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}
              {onEdit && canEdit && (
                <Button
                  variant="outline"
                  onClick={() => onEdit(property)}
                  title={canEdit ? "Edit property" : "You can only edit your own properties"}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
              {onScheduleViewing && (
                <Button
                  onClick={() => onScheduleViewing(property)}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Viewing
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-6">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gallery */}
                <div>
                  <PropertyGallery 
                    images={property.images} 
                    propertyId={property.id}
                    propertyTitle={property.title}
                  />
                </div>

                {/* Key Information */}
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="w-5 h-5" />
                        Property Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-muted-foreground">Price</span>
                          <p className="text-2xl font-bold text-primary">
                            {formatCurrency(property.price)}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Type</span>
                          <p className="font-medium capitalize">
                            {property.offer_type} • {property.property_type}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <Badge variant="secondary">
                          {property.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        {property.featured && (
                          <Badge variant="default">Featured</Badge>
                        )}
                      </div>

                      {(property.bedrooms || property.bathrooms || property.area_sqft) && (
                        <div className="flex gap-6 pt-2">
                          {property.bedrooms && (
                            <div className="flex items-center gap-1">
                              <Bed className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{property.bedrooms} beds</span>
                            </div>
                          )}
                          {property.bathrooms && (
                            <div className="flex items-center gap-1">
                              <Bath className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{property.bathrooms} baths</span>
                            </div>
                          )}
                          {property.area_sqft && (
                            <div className="flex items-center gap-1">
                              <Square className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{property.area_sqft} sqft</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {property.description && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Description</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground leading-relaxed">
                          {property.description}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Property Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Segment</span>
                        <p className="font-medium capitalize">{property.segment || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Subtype</span>
                        <p className="font-medium capitalize">{property.subtype || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Permit Number</span>
                        <p className="font-medium">{property.permit_number || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Unit Number</span>
                        <p className="font-medium">{property.unit_number || 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Location</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground">Full Address</span>
                      <p className="font-medium">{property.address}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">City</span>
                        <p className="font-medium">{property.city}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">State</span>
                        <p className="font-medium">{property.state}</p>
                      </div>
                    </div>
                    {property.zip_code && (
                      <div>
                        <span className="text-sm text-muted-foreground">ZIP Code</span>
                        <p className="font-medium">{property.zip_code}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Timeline</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm text-muted-foreground">Created</span>
                      <p className="font-medium">
                        {new Date(property.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Last Updated</span>
                      <p className="font-medium">
                        {new Date(property.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="media" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Property Gallery</CardTitle>
                </CardHeader>
                <CardContent>
                  <PropertyGallery 
                    images={property.images} 
                    propertyId={property.id}
                    propertyTitle={property.title}
                  />
                  {(!property.images || property.images.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Home className="w-12 h-12 mx-auto mb-4" />
                      <p>No images uploaded for this property</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Property Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingFiles ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : files.length > 0 ? (
                    <div className="space-y-3">
                      {files.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-5 h-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{file.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {file.type} • {file.size ? formatBytes(file.size) : 'Unknown size'}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadFile(file)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4" />
                      <p>No documents uploaded for this property</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};