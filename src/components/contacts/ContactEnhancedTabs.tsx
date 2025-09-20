import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ContactDetailTabs from "@/components/contacts/ContactDetailTabs";
import { ContactTimeline } from "@/components/contacts/ContactTimeline";
import { ContactPropertiesTab } from "@/components/contacts/ContactPropertiesTab";
import { useEffect, useState } from "react";
import { getContactProperties } from "@/services/contacts";
import { useContacts } from "@/hooks/useContacts";

interface ContactEnhancedTabsProps {
  contact: any;
  onUpdate: () => void;
}

export function ContactEnhancedTabs({ contact, onUpdate }: ContactEnhancedTabsProps) {
  const [propertyRoles, setPropertyRoles] = useState<string[]>([]);
  const { getContactLeads, getActivities } = useContacts();
  const [leadsCount, setLeadsCount] = useState(0);
  const [activitiesCount, setActivitiesCount] = useState(0);
  const [filesCount, setFilesCount] = useState(0);

  useEffect(() => {
    loadTabCounts();
  }, [contact.id]);

  const loadTabCounts = async () => {
    try {
      // Get property roles
      const { data: properties } = await getContactProperties(contact.id);
      const roles = [...new Set(properties?.map(p => p.role) || [])];
      setPropertyRoles(roles);

      // Get leads count
      const { data: leads } = await getContactLeads(contact.id);
      setLeadsCount(leads?.length || 0);

      // Get activities count
      const { data: activities } = await getActivities(contact.id);
      setActivitiesCount(activities?.length || 0);

      // Get files count from contact_files (would need to implement)
      // For now, assume 0
      setFilesCount(0);
    } catch (error) {
      console.error('Failed to load tab counts:', error);
    }
  };

  // Determine which tabs to show based on roles and data
  const interestTags = contact.interest_tags || [];
  const showBuyerTab = interestTags.includes('buyer') || propertyRoles.includes('buyer_interest');
  const showTenantTab = interestTags.includes('tenant') || propertyRoles.includes('tenant');
  const showOwnerTab = interestTags.includes('owner') || propertyRoles.includes('owner');
  const showInvestorTab = interestTags.includes('investor') || propertyRoles.includes('investor');

  const showLeadsTab = leadsCount > 0;
  const showPropertiesTab = propertyRoles.length > 0;
  const showActivitiesTab = activitiesCount > 0;
  const showDocumentsTab = filesCount > 0;

  return (
    <Tabs defaultValue="details" className="w-full">
      <TabsList className="grid w-full grid-cols-auto gap-2 h-auto p-1">
        <TabsTrigger value="details">Details</TabsTrigger>
        
        {showBuyerTab && (
          <TabsTrigger value="buyer" className="flex items-center gap-2">
            Buyer
            {interestTags.includes('buyer') && <Badge variant="secondary" className="h-5 px-1 text-xs">Active</Badge>}
          </TabsTrigger>
        )}
        
        {showTenantTab && (
          <TabsTrigger value="tenant" className="flex items-center gap-2">
            Tenant
            {interestTags.includes('tenant') && <Badge variant="secondary" className="h-5 px-1 text-xs">Active</Badge>}
          </TabsTrigger>
        )}
        
        {showOwnerTab && (
          <TabsTrigger value="owner" className="flex items-center gap-2">
            Owner
            {interestTags.includes('owner') && <Badge variant="secondary" className="h-5 px-1 text-xs">Active</Badge>}
          </TabsTrigger>
        )}
        
        {showInvestorTab && (
          <TabsTrigger value="investor" className="flex items-center gap-2">
            Investor
            {interestTags.includes('investor') && <Badge variant="secondary" className="h-5 px-1 text-xs">Active</Badge>}
          </TabsTrigger>
        )}
        
        {showLeadsTab && (
          <TabsTrigger value="leads" className="flex items-center gap-2">
            Leads
            <Badge variant="outline" className="h-5 px-1 text-xs">{leadsCount}</Badge>
          </TabsTrigger>
        )}
        
        {showPropertiesTab && (
          <TabsTrigger value="properties" className="flex items-center gap-2">
            Properties
            <Badge variant="outline" className="h-5 px-1 text-xs">{propertyRoles.length}</Badge>
          </TabsTrigger>
        )}
        
        {showActivitiesTab && (
          <TabsTrigger value="activities" className="flex items-center gap-2">
            Activities
            <Badge variant="outline" className="h-5 px-1 text-xs">{activitiesCount}</Badge>
          </TabsTrigger>
        )}
        
        {showDocumentsTab && (
          <TabsTrigger value="documents" className="flex items-center gap-2">
            Documents
            <Badge variant="outline" className="h-5 px-1 text-xs">{filesCount}</Badge>
          </TabsTrigger>
        )}
        
        <TabsTrigger value="timeline">History</TabsTrigger>
      </TabsList>

      <TabsContent value="details" className="mt-6">
        <ContactDetailTabs contact={contact} />
      </TabsContent>

      {showBuyerTab && (
        <TabsContent value="buyer" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Buyer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Budget Range</label>
                <p>{contact.budget_range || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Preferred Bedrooms</label>
                <p>{contact.bedrooms || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Preferred Location</label>
                <p>{contact.location_address || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Property Type</label>
                <p>{contact.interested_in || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </TabsContent>
      )}

      {showTenantTab && (
        <TabsContent value="tenant" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Tenant Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Rental Budget</label>
                <p>{contact.budget_rent_band || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Preferred Bedrooms</label>
                <p>{contact.bedrooms || 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Preferred Location</label>
                <p>{contact.location_address || 'Not specified'}</p>
              </div>
            </div>
          </div>
        </TabsContent>
      )}

      {showOwnerTab && (
        <TabsContent value="owner" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Property Owner Information</h3>
            <ContactPropertiesTab contactId={contact.id} />
          </div>
        </TabsContent>
      )}

      {showInvestorTab && (
        <TabsContent value="investor" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Investor Information</h3>
            <ContactPropertiesTab contactId={contact.id} />
          </div>
        </TabsContent>
      )}

      {showLeadsTab && (
        <TabsContent value="leads" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Associated Leads</h3>
            <p className="text-muted-foreground">Lead management functionality will be implemented here.</p>
          </div>
        </TabsContent>
      )}

      {showPropertiesTab && (
        <TabsContent value="properties" className="mt-6">
          <ContactPropertiesTab contactId={contact.id} />
        </TabsContent>
      )}

      {showActivitiesTab && (
        <TabsContent value="activities" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Activities</h3>
            <p className="text-muted-foreground">Activity management functionality will be implemented here.</p>
          </div>
        </TabsContent>
      )}

      {showDocumentsTab && (
        <TabsContent value="documents" className="mt-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Documents</h3>
            <p className="text-muted-foreground">Document management functionality will be implemented here.</p>
          </div>
        </TabsContent>
      )}

      <TabsContent value="timeline" className="mt-6">
        <ContactTimeline contactId={contact.id} />
      </TabsContent>
    </Tabs>
  );
}