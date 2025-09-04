import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { Property } from '@/hooks/useProperties';
import { formatAED } from '@/lib/currency';
import propertyPlaceholder from '@/assets/property-placeholder.jpg';

// PDF Export
export const generatePropertyPDF = async (property: Property): Promise<void> => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 24;
  const contentWidth = pageWidth - (margin * 2);
  
  try {
    // Create a temporary div for the PDF content
    const tempDiv = document.createElement('div');
    tempDiv.style.width = `${contentWidth * 3.78}px`; // Convert mm to pixels (roughly)
    tempDiv.style.fontFamily = 'Arial, sans-serif';
    tempDiv.style.fontSize = '14px';
    tempDiv.style.lineHeight = '1.6';
    tempDiv.style.color = '#333';
    tempDiv.style.backgroundColor = 'white';
    tempDiv.style.padding = '20px';
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    
    // Get the featured image
    const featuredImage = property.images && property.images.length > 0 ? property.images[0] : null;
    
    tempDiv.innerHTML = `
      <div style="margin-bottom: 20px;">
        <img src="${featuredImage || propertyPlaceholder}" 
             style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px;" 
             onerror="this.src='${propertyPlaceholder}'" />
      </div>
      
      <div style="margin-bottom: 20px;">
        <h1 style="font-size: 24px; font-weight: bold; margin: 0 0 10px 0; color: #1a1a1a;">
          ${property.title}
        </h1>
        <div style="font-size: 20px; font-weight: bold; color: #059669; margin-bottom: 10px;">
          ${formatAED(property.price)}
        </div>
        <div style="color: #666; margin-bottom: 15px;">
          📍 ${property.address || 'Address not specified'}
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
        <div><strong>Bedrooms:</strong> ${property.bedrooms || 'N/A'}</div>
        <div><strong>Bathrooms:</strong> ${property.bathrooms || 'N/A'}</div>
        <div><strong>Area:</strong> ${property.area_sqft ? `${property.area_sqft} sqft` : 'N/A'}</div>
        <div><strong>Type:</strong> ${property.property_type || 'N/A'}</div>
        <div><strong>Status:</strong> ${property.status || 'N/A'}</div>
        <div><strong>Offer Type:</strong> ${property.offer_type || 'N/A'}</div>
      </div>
      
      ${property.description ? `
        <div style="margin-bottom: 25px;">
          <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">Features</h3>
          <div style="color: #666;">
            Additional property features and details available upon request.
          </div>
        </div>
      ` : ''}
      
      ${property.description ? `
        <div style="margin-bottom: 25px;">
          <h3 style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">Description</h3>
          <div style="white-space: pre-wrap;">${property.description}</div>
        </div>
      ` : ''}
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
          <div>
            <strong>Listing ID:</strong> ${property.id}
          </div>
          <div>
            <strong>Listed:</strong> ${property.created_at ? new Date(property.created_at).toLocaleDateString() : 'N/A'}
          </div>
        </div>
        <div style="margin-top: 15px; text-align: center;">
          <div style="font-size: 12px; color: #666;">
            View online: ${window.location.origin}/share/property/${property.id}
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(tempDiv);
    
    // Convert to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: 'white'
    });
    
    document.body.removeChild(tempDiv);
    
    // Add to PDF
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    
    // Save the PDF
    pdf.save(`property-${property.id}.pdf`);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};

// Excel Export
export const generatePropertyExcel = (property: Property): void => {
  try {
    const data = [
      ['Property Information', ''],
      ['ID', property.id],
      ['Title', property.title],
      ['Address', property.address || ''],
      ['City', property.city || ''],
      ['State', property.state || ''],
      ['Price (AED)', property.price],
      ['Offer Type', property.offer_type || ''],
      ['Status', property.status || ''],
      ['', ''],
      ['Property Details', ''],
      ['Segment', property.segment || ''],
      ['Subtype', property.subtype || ''],
      ['Property Type', property.property_type || ''],
      ['Bedrooms', property.bedrooms || ''],
      ['Bathrooms', property.bathrooms || ''],
      ['Area (sqft)', property.area_sqft || ''],
      ['Unit Number', property.unit_number || ''],
      ['Permit Number', property.permit_number || ''],
      ['', ''],
      ['Additional Info', ''],
      ['Description', property.description || ''],
      ['Features', 'Standard property features included'],
      ['Images Count', property.images ? property.images.length : 0],
      ['', ''],
      ['Dates', ''],
      ['Created', property.created_at ? new Date(property.created_at) : ''],
      ['Updated', property.updated_at ? new Date(property.updated_at) : ''],
      ['', ''],
      ['Agent', ''],
      ['Agent ID', property.agent_id || ''],
      ['Agent Name', property.profiles?.name || ''],
      ['Agent Email', property.profiles?.email || ''],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // Property Information column
      { wch: 40 }  // Values column
    ];
    
    // Style the headers
    const headerStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: "EEEEEE" } }
    };
    
    // Apply styles to section headers
    ['A1', 'A11', 'A21', 'A26', 'A30'].forEach(cell => {
      if (worksheet[cell]) {
        worksheet[cell].s = headerStyle;
      }
    });
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Property Details');
    
    // Save the file
    XLSX.writeFile(workbook, `property-${property.id}.xlsx`);
    
  } catch (error) {
    console.error('Error generating Excel:', error);
    throw new Error('Failed to generate Excel file');
  }
};