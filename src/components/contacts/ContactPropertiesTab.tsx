import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, ExternalLink, Unlink } from "lucide-react";
import { getContactProperties, linkPropertyToContact, unlinkPropertyFromContact, ContactPropertyRole } from "@/services/contacts";
import { useProperties } from "@/hooks/useProperties";
import { toast } from "@/hooks/use-toast";
// Format currency helper
const formatCurrency = (amount: number, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

interface ContactPropertiesTabProps {
  contactId: string;
}

export function ContactPropertiesTab({ contactId }: ContactPropertiesTabProps) {
  const [contactProperties, setContactProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<ContactPropertyRole>('buyer_interest');
  
  const { properties } = useProperties();

  useEffect(() => {
    loadContactProperties();
  }, [contactId]);

  const loadContactProperties = async () => {
    try {
      const { data } = await getContactProperties(contactId);
      setContactProperties(data || []);
    } catch (error) {
      console.error('Failed to load contact properties:', error);
    }
    setLoading(false);
  };

  const handleLinkProperty = async () => {
    if (!selectedProperty) return;
    
    try {
      await linkPropertyToContact({
        contactId,
        propertyId: selectedProperty,
        role: selectedRole
      });
      
      toast({
        title: "Property Linked",
        description: "Property has been linked to this contact",
      });
      
      setShowLinkDialog(false);
      setSelectedProperty('');
      loadContactProperties();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to link property",
        variant: "destructive",
      });
    }
  };

  const handleUnlinkProperty = async (propertyId: string, role: ContactPropertyRole) => {
    try {
      await unlinkPropertyFromContact({
        contactId,
        propertyId,
        role
      });
      
      toast({
        title: "Property Unlinked",
        description: "Property has been unlinked from this contact",
      });
      
      loadContactProperties();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unlink property",
        variant: "destructive",
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-green-100 text-green-800';
      case 'buyer_interest':
        return 'bg-blue-100 text-blue-800';
      case 'tenant':
        return 'bg-purple-100 text-purple-800';
      case 'investor':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'buyer_interest':
        return 'Buyer Interest';
      default:
        return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const availableProperties = properties.filter(
    prop => !contactProperties.some(cp => cp.property_id === prop.id)
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse">
            <div className="h-24 bg-muted rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Properties</h3>
        
        <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Link Property
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link Property to Contact</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="property">Select Property</Label>
                <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a property" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProperties.map(property => (
                      <SelectItem key={property.id} value={property.id}>
                        {property.title} - {property.address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="role">Relationship Type</Label>
                <Select value={selectedRole} onValueChange={(value: ContactPropertyRole) => setSelectedRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="buyer_interest">Buyer Interest</SelectItem>
                    <SelectItem value="tenant">Tenant</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleLinkProperty} disabled={!selectedProperty}>
                  Link Property
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {contactProperties.map((item) => (
          <Card key={`${item.property_id}-${item.role}`}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-base">{item.properties.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{item.properties.address}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={getRoleColor(item.role)}>
                    {getRoleLabel(item.role)}
                  </Badge>
                  <Badge variant="outline">
                    {item.properties.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(item.properties.price)} • {item.properties.property_type}
                  {item.properties.bedrooms && ` • ${item.properties.bedrooms} bed`}
                  {item.properties.bathrooms && ` • ${item.properties.bathrooms} bath`}
                </div>
                
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleUnlinkProperty(item.property_id, item.role)}
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Unlink
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {contactProperties.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <ExternalLink className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No properties linked yet</p>
            <p className="text-sm">Use the "Link Property" button to connect properties to this contact</p>
          </div>
        )}
      </div>
    </div>
  );
}