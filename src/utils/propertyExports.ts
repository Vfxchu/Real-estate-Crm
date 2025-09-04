import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { Property } from '@/hooks/useProperties';
import { formatAED } from '@/lib/currency';
import { sanitizeHtml, escapeHtml } from '@/lib/sanitizer';
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
    
    // Get the featured image (sanitized)
    const featuredImage = property.images && property.images.length > 0 ? property.images[0] : null;
    
    // Create elements securely without innerHTML
    const imageContainer = document.createElement('div');
    imageContainer.style.cssText = 'margin-bottom: 20px;';
    
    const img = document.createElement('img');
    img.src = featuredImage || propertyPlaceholder;
    img.style.cssText = 'width: 100%; height: 200px; object-fit: cover; border-radius: 8px;';
    img.onerror = () => { img.src = propertyPlaceholder; };
    imageContainer.appendChild(img);
    
    const headerContainer = document.createElement('div');
    headerContainer.style.cssText = 'margin-bottom: 20px;';
    
    const title = document.createElement('h1');
    title.style.cssText = 'font-size: 24px; font-weight: bold; margin: 0 0 10px 0; color: #1a1a1a;';
    title.textContent = property.title || 'Property';
    
    const price = document.createElement('div');
    price.style.cssText = 'font-size: 20px; font-weight: bold; color: #059669; margin-bottom: 10px;';
    price.textContent = formatAED(property.price);
    
    const address = document.createElement('div');
    address.style.cssText = 'color: #666; margin-bottom: 15px;';
    address.textContent = `📍 ${property.address || 'Address not specified'}`;
    
    headerContainer.appendChild(title);
    headerContainer.appendChild(price);
    headerContainer.appendChild(address);
    
    const detailsGrid = document.createElement('div');
    detailsGrid.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 25px; padding: 15px; background-color: #f8f9fa; border-radius: 8px;';
    
    const details = [
      ['Bedrooms', property.bedrooms || 'N/A'],
      ['Bathrooms', property.bathrooms || 'N/A'],
      ['Area', property.area_sqft ? `${property.area_sqft} sqft` : 'N/A'],
      ['Type', property.property_type || 'N/A'],
      ['Status', property.status || 'N/A'],
      ['Offer Type', property.offer_type || 'N/A']
    ];
    
    details.forEach(([label, value]) => {
      const detailDiv = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = `${label}: `;
      detailDiv.appendChild(strong);
      detailDiv.appendChild(document.createTextNode(String(value)));
      detailsGrid.appendChild(detailDiv);
    });
    
    // Add description if exists (sanitized)
    let descriptionContainer = null;
    if (property.description) {
      descriptionContainer = document.createElement('div');
      descriptionContainer.style.cssText = 'margin-bottom: 25px;';
      
      const descTitle = document.createElement('h3');
      descTitle.style.cssText = 'font-size: 18px; font-weight: bold; margin-bottom: 10px;';
      descTitle.textContent = 'Description';
      
      const descContent = document.createElement('div');
      descContent.style.cssText = 'white-space: pre-wrap;';
      descContent.textContent = property.description; // Safe text content
      
      descriptionContainer.appendChild(descTitle);
      descriptionContainer.appendChild(descContent);
    }
    
    const footer = document.createElement('div');
    footer.style.cssText = 'margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;';
    
    const footerGrid = document.createElement('div');
    footerGrid.style.cssText = 'display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;';
    
    const listingId = document.createElement('div');
    const idStrong = document.createElement('strong');
    idStrong.textContent = 'Listing ID: ';
    listingId.appendChild(idStrong);
    listingId.appendChild(document.createTextNode(property.id || 'N/A'));
    
    const listed = document.createElement('div');
    const listedStrong = document.createElement('strong');
    listedStrong.textContent = 'Listed: ';
    listed.appendChild(listedStrong);
    listed.appendChild(document.createTextNode(
      property.created_at ? new Date(property.created_at).toLocaleDateString() : 'N/A'
    ));
    
    footerGrid.appendChild(listingId);
    footerGrid.appendChild(listed);
    
    const urlContainer = document.createElement('div');
    urlContainer.style.cssText = 'margin-top: 15px; text-align: center;';
    const urlDiv = document.createElement('div');
    urlDiv.style.cssText = 'font-size: 12px; color: #666;';
    urlDiv.textContent = `View online: ${window.location.origin}/share/property/${property.id}`;
    urlContainer.appendChild(urlDiv);
    
    footer.appendChild(footerGrid);
    footer.appendChild(urlContainer);
    
    // Append all elements
    tempDiv.appendChild(imageContainer);
    tempDiv.appendChild(headerContainer);
    tempDiv.appendChild(detailsGrid);
    if (descriptionContainer) {
      tempDiv.appendChild(descriptionContainer);
    }
    tempDiv.appendChild(footer);
    
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