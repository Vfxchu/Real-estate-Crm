import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useLeads } from "@/hooks/useLeads";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AddLeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Agent {
  user_id: string;
  name: string;
  email: string;
}

export const AddLeadForm: React.FC<AddLeadFormProps> = ({ open, onOpenChange }) => {
  const { createLead } = useLeads();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
    property_type: '',
    budget_range: '',
    urgency: '',
    preferred_contact_time: '',
    source: 'website' as const,
    bedrooms: '',
    furnishing_status: '',
    lead_type: '',
    priority: 'medium' as const,
    status: 'new' as const,
    score: 0,
  });

  // Fetch agents for admin assignment
  useEffect(() => {
    const fetchAgents = async () => {
      if (profile?.role === 'admin' && open) {
        setLoadingAgents(true);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('user_id, name, email')
            .eq('role', 'agent')
            .eq('status', 'active')
            .order('name');

          if (error) throw error;
          setAgents(data as Agent[]);
        } catch (error: any) {
          toast({
            title: 'Error fetching agents',
            description: error.message,
            variant: 'destructive',
          });
        } finally {
          setLoadingAgents(false);
        }
      }
    };

    fetchAgents();
  }, [profile?.role, open, toast]);

  // Function to get agent with fewest active leads
  const getAgentWithFewestLeads = async (): Promise<string | null> => {
    try {
      const { data: leadCounts, error } = await supabase
        .from('leads')
        .select('agent_id')
        .in('status', ['new', 'contacted'])
        .not('agent_id', 'is', null);

      if (error) throw error;

      // Count leads per agent
      const agentLeadCounts = agents.reduce((acc, agent) => {
        acc[agent.user_id] = 0;
        return acc;
      }, {} as Record<string, number>);

      leadCounts?.forEach((lead) => {
        if (lead.agent_id && agentLeadCounts.hasOwnProperty(lead.agent_id)) {
          agentLeadCounts[lead.agent_id]++;
        }
      });

      // Find agent with minimum leads
      let minLeads = Infinity;
      let selectedAgent = null;

      for (const [agentId, count] of Object.entries(agentLeadCounts)) {
        if (count < minLeads) {
          minLeads = count;
          selectedAgent = agentId;
        }
      }

      return selectedAgent;
    } catch (error) {
      console.error('Error finding agent with fewest leads:', error);
      return agents.length > 0 ? agents[0].user_id : null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!formData.name.trim() || !formData.phone.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Name and phone are required fields.',
          variant: 'destructive',
        });
        return;
      }

      // Determine agent assignment
      let assignedAgentId = null;
      
      if (profile?.role === 'admin') {
        // For admin, auto-assign to agent with fewest leads
        assignedAgentId = await getAgentWithFewestLeads();
      } else {
        // For agents, assign to themselves
        assignedAgentId = user?.id;
      }

      const leadData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        notes: formData.notes.trim() || null,
        source: formData.source as 'website' | 'referral' | 'social' | 'advertising' | 'cold_call' | 'email',
        priority: formData.priority,
        status: formData.status,
        score: formData.score,
        agent_id: assignedAgentId,
        // Additional fields stored in interested_in and budget_range
        interested_in: JSON.stringify({
          property_type: formData.property_type || null,
          bedrooms: formData.bedrooms || null,
          furnishing_status: formData.furnishing_status || null,
          lead_type: formData.lead_type || null,
          urgency: formData.urgency || null,
          preferred_contact_time: formData.preferred_contact_time || null,
        }),
        budget_range: formData.budget_range || null,
      };

      await createLead(leadData);
      
      // Reset form
      setFormData({
        name: '',
        phone: '',
        email: '',
        notes: '',
        property_type: '',
        budget_range: '',
        urgency: '',
        preferred_contact_time: '',
        source: 'website' as const,
        bedrooms: '',
        furnishing_status: '',
        lead_type: '',
        priority: 'medium',
        status: 'new',
        score: 0,
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error creating lead',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label htmlFor="source">Lead Source</Label>
                <Select value={formData.source} onValueChange={(value) => handleInputChange('source', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="advertising">Advertising</SelectItem>
                    <SelectItem value="cold_call">Cold Call</SelectItem>
                    <SelectItem value="email">Email Campaign</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Property Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Property Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="property_type">Property Type</Label>
                <Select value={formData.property_type} onValueChange={(value) => handleInputChange('property_type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="house">House</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="penthouse">Penthouse</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="budget_range">Budget Range</Label>
                <Select value={formData.budget_range} onValueChange={(value) => handleInputChange('budget_range', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="under_500k">Under $500K</SelectItem>
                    <SelectItem value="500k_1m">$500K - $1M</SelectItem>
                    <SelectItem value="1m_2m">$1M - $2M</SelectItem>
                    <SelectItem value="2m_5m">$2M - $5M</SelectItem>
                    <SelectItem value="above_5m">Above $5M</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bedroom Count - Radio Buttons */}
            <div>
              <Label>Bedroom Count</Label>
              <RadioGroup
                value={formData.bedrooms}
                onValueChange={(value) => handleInputChange('bedrooms', value)}
                className="flex flex-wrap gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="studio" id="studio" />
                  <Label htmlFor="studio">Studio</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="1br" />
                  <Label htmlFor="1br">1 BR</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="2br" />
                  <Label htmlFor="2br">2 BR</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="3" id="3br" />
                  <Label htmlFor="3br">3 BR</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="4+" id="4br" />
                  <Label htmlFor="4br">4+ BR</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Furnishing Status - Radio Buttons */}
            <div>
              <Label>Furnishing Status</Label>
              <RadioGroup
                value={formData.furnishing_status}
                onValueChange={(value) => handleInputChange('furnishing_status', value)}
                className="flex flex-wrap gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="furnished" id="furnished" />
                  <Label htmlFor="furnished">Furnished</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="semi_furnished" id="semi_furnished" />
                  <Label htmlFor="semi_furnished">Semi-Furnished</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="unfurnished" id="unfurnished" />
                  <Label htmlFor="unfurnished">Unfurnished</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Lead Type - Radio Buttons */}
            <div>
              <Label>Interest Type</Label>
              <RadioGroup
                value={formData.lead_type}
                onValueChange={(value) => handleInputChange('lead_type', value)}
                className="flex flex-wrap gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="buy" id="buy" />
                  <Label htmlFor="buy">Buy</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="rent" id="rent" />
                  <Label htmlFor="rent">Rent</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="invest" id="invest" />
                  <Label htmlFor="invest">Invest</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Contact Preferences */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="urgency">Urgency Level</Label>
                <Select value={formData.urgency} onValueChange={(value) => handleInputChange('urgency', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate (Within 1 week)</SelectItem>
                    <SelectItem value="soon">Soon (Within 1 month)</SelectItem>
                    <SelectItem value="planning">Planning (1-3 months)</SelectItem>
                    <SelectItem value="future">Future (3+ months)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="preferred_contact_time">Preferred Contact Time</Label>
                <Select value={formData.preferred_contact_time} onValueChange={(value) => handleInputChange('preferred_contact_time', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select preferred time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (9 AM - 12 PM)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12 PM - 5 PM)</SelectItem>
                    <SelectItem value="evening">Evening (5 PM - 8 PM)</SelectItem>
                    <SelectItem value="anytime">Anytime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes or comments..."
              rows={3}
            />
          </div>

          {/* Agent Assignment Info for Admin */}
          {profile?.role === 'admin' && (
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-medium mb-2">Agent Assignment</h4>
              {loadingAgents ? (
                <p className="text-sm text-muted-foreground">Loading available agents...</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This lead will be automatically assigned to the agent with the fewest active leads.
                  {agents.length > 0 && ` (${agents.length} active agents available)`}
                </p>
              )}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};