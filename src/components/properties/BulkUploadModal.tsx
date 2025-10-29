import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { generateTemplate, parseExcelFile, validateRow, type PropertyExcelRow, type ImportPreview } from '@/utils/propertyExcel';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BulkUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const BulkUploadModal: React.FC<BulkUploadModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [upsertBySlug, setUpsertBySlug] = useState(true);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a .xlsx file',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      setPreview(null);
    }
  };

  const handleValidate = async () => {
    if (!selectedFile) {
      toast({
        title: 'No file selected',
        description: 'Please select an Excel file to upload',
        variant: 'destructive',
      });
      return;
    }

    setValidating(true);
    try {
      const rows = await parseExcelFile(selectedFile);
      
      if (rows.length === 0) {
        toast({
          title: 'Empty file',
          description: 'The Excel file contains no data',
          variant: 'destructive',
        });
        setValidating(false);
        return;
      }

      // Validate each row
      const add: PropertyExcelRow[] = [];
      const update: PropertyExcelRow[] = [];
      const skip: Array<{ row: number; data: any; reason: string }> = [];
      const slugMap = new Map<string, number>();

      for (let i = 0; i < rows.length; i++) {
        const validation = validateRow(rows[i], i + 2); // +2 for header row and 0-index
        
        if (!validation.valid) {
          skip.push({ row: validation.row, data: rows[i], reason: validation.reason || 'Unknown error' });
          continue;
        }

        const data = validation.data!;
        
        // Check for duplicate slugs in file
        if (slugMap.has(data.slug!)) {
          skip.push({ 
            row: validation.row, 
            data: rows[i], 
            reason: `Duplicate slug in file (first seen on row ${slugMap.get(data.slug!)})` 
          });
          continue;
        }
        slugMap.set(data.slug!, validation.row);

        // Check if property exists in database (by title as proxy for slug)
        const { data: existing } = await supabase
          .from('properties')
          .select('id')
          .eq('title', data.title)
          .maybeSingle();

        if (existing) {
          update.push(data);
        } else {
          add.push(data);
        }
      }

      setPreview({ add, update, skip });
      
      toast({
        title: 'Validation complete',
        description: `${add.length} to add, ${update.length} to update, ${skip.length} skipped`,
      });
    } catch (error: any) {
      toast({
        title: 'Validation failed',
        description: error.message || 'Failed to validate Excel file',
        variant: 'destructive',
      });
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!preview) return;

    setImporting(true);
    try {
      const allRecords = [...preview.add, ...preview.update];
      let addedCount = 0;
      let updatedCount = 0;
      
      for (const record of allRecords) {
        const isUpdate = preview.update.includes(record);
        
        // Check if exists by title
        const { data: existing } = await supabase
          .from('properties')
          .select('id')
          .eq('title', record.title)
          .maybeSingle();

        const propertyData = {
          title: record.title,
          status: record.status,
          segment: record.segment,
          property_type: record.property_type,
          subtype: record.subtype,
          offer_type: record.offer_type,
          bedrooms: record.bedrooms,
          bathrooms: record.bathrooms,
          area_sqft: record.area_sqft,
          price: record.price,
          city: record.city,
          address: record.address || record.city, // Fallback to city if no address
          state: 'UAE',
          unit_number: record.unit_number,
          description: record.description,
          permit_number: record.permit_number,
        };

        if (existing) {
          // Update
          await supabase
            .from('properties')
            .update(propertyData)
            .eq('id', existing.id);
          updatedCount++;
        } else {
          // Insert
          await supabase
            .from('properties')
            .insert([propertyData]);
          addedCount++;
        }
      }

      toast({
        title: 'Import successful',
        description: `${addedCount} added, ${updatedCount} updated, ${preview.skip.length} skipped`,
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      toast({
        title: 'Import failed',
        description: error.message || 'Failed to import properties',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreview(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Properties</DialogTitle>
          <DialogDescription>
            Upload an Excel file (.xlsx) to import multiple properties at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Download Template */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Download Template</p>
              <p className="text-sm text-muted-foreground">
                Get the Excel template with sample data and instructions
              </p>
            </div>
            <Button
              variant="outline"
              onClick={generateTemplate}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Upload Excel File (.xlsx)</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="mt-2"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="upsert"
                checked={upsertBySlug}
                onCheckedChange={(checked) => setUpsertBySlug(checked as boolean)}
              />
              <Label htmlFor="upsert" className="text-sm font-normal cursor-pointer">
                Upsert by title (update if exists, add if new)
              </Label>
            </div>

            <Button
              onClick={handleValidate}
              disabled={!selectedFile || validating}
              className="w-full gap-2"
            >
              <Upload className="h-4 w-4" />
              {validating ? 'Validating...' : 'Upload & Validate'}
            </Button>
          </div>

          {/* Preview */}
          {preview && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">To Add</p>
                    <p className="text-2xl font-bold">{preview.add.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">To Update</p>
                    <p className="text-2xl font-bold">{preview.update.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 border rounded-lg">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-medium">Skipped</p>
                    <p className="text-2xl font-bold">{preview.skip.length}</p>
                  </div>
                </div>
              </div>

              {/* Skipped Rows */}
              {preview.skip.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3">Skipped Rows</h4>
                  <ScrollArea className="h-64">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Row</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.skip.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.row}</TableCell>
                            <TableCell>{item.data.title || 'N/A'}</TableCell>
                            <TableCell>
                              <Badge variant="destructive" className="text-xs">
                                {item.reason}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}

              {/* Confirm Import */}
              <Button
                onClick={handleImport}
                disabled={importing || (preview.add.length === 0 && preview.update.length === 0)}
                className="w-full gap-2"
                size="lg"
              >
                {importing ? 'Importing...' : `Confirm Import (${preview.add.length + preview.update.length} properties)`}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
