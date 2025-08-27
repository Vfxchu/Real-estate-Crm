import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Property } from "@/hooks/useProperties";
import { FileDown, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generatePropertyPDF, generatePropertyExcel } from '@/utils/propertyExports';

interface ExportPropertyDialogProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ExportPropertyDialog: React.FC<ExportPropertyDialogProps> = ({
  property,
  open,
  onOpenChange
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  if (!property) return null;

  const handleExportPDF = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      await generatePropertyPDF(property);
      toast({
        title: "PDF Generated",
        description: "Property PDF has been downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      generatePropertyExcel(property);
      toast({
        title: "Excel Generated",
        description: "Property Excel file has been downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Could not generate Excel file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="w-5 h-5" />
            Export Property
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Export property information as PDF or Excel file
            </p>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button 
                  onClick={handleExportPDF}
                  disabled={isExporting}
                  className="flex-1"
                  aria-label="Download property as PDF"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  {isExporting ? 'Generating...' : 'Download PDF'}
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      disabled={isExporting}
                      aria-label="Export options"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={handleExportPDF}
                      disabled={isExporting}
                    >
                      <FileDown className="w-4 h-4 mr-2" />
                      Download PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={handleExportExcel}
                      disabled={isExporting}
                    >
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Download Excel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Property Preview:</p>
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="font-semibold text-sm">{property.title}</p>
              <p className="text-sm text-muted-foreground">{property.address}</p>
              <p className="text-sm font-medium text-primary">
                {new Intl.NumberFormat('en-AE', { 
                  style: 'currency', 
                  currency: 'AED',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                }).format(property.price)}
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};