import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  listActivities, 
  createActivity, 
  updateActivity, 
  deleteActivity, 
  getAgentActivities,
  type ActivityPayload 
} from '@/services/activities';

export interface Activity {
  id: string;
  type: string;
  description: string;
  lead_id?: string;
  property_id?: string;
  contact_id?: string;
  created_by: string;
  created_at: string;
  leads?: {
    name: string;
    email: string;
    agent_id?: string;
  };
  properties?: {
    title: string;
    address: string;
    agent_id?: string;
  };
  profiles?: {
    name: string;
    email: string;
  };
}

export const useActivities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const fetchActivities = async (filters?: {
    lead_id?: string;
    property_id?: string;
    contact_id?: string;
  }) => {
    try {
      setLoading(true);
      
      let result;
      if (profile?.role === 'agent' && user?.id) {
        // Agents see activities for their assigned leads and properties
        result = await getAgentActivities(user.id);
      } else {
        // Admins or filtered queries
        result = await listActivities(
          filters?.lead_id,
          filters?.property_id,
          filters?.contact_id
        );
      }

      if (result.error) throw result.error;
      
      // Transform the data to match Activity interface
      const transformedActivities: Activity[] = (result.data || []).map((activity: any) => {
        const safeLeads = activity.leads && typeof activity.leads === 'object' && !Array.isArray(activity.leads) ? activity.leads : null;
        const safeProperties = activity.properties && typeof activity.properties === 'object' && !Array.isArray(activity.properties) ? activity.properties : null;
        const safeProfiles = activity.profiles && typeof activity.profiles === 'object' && !Array.isArray(activity.profiles) ? activity.profiles : null;
        
        return {
          id: activity.id,
          type: activity.type,
          description: activity.description,
          lead_id: activity.lead_id,
          property_id: activity.property_id,
          contact_id: activity.contact_id,
          created_by: activity.created_by,
          created_at: activity.created_at,
          leads: safeLeads && safeLeads.name ? {
            name: safeLeads.name,
            email: safeLeads.email,
            agent_id: safeLeads.agent_id
          } : undefined,
          properties: safeProperties && safeProperties.title ? {
            title: safeProperties.title,
            address: safeProperties.address,
            agent_id: safeProperties.agent_id
          } : undefined,
          profiles: safeProfiles && safeProfiles.name ? {
            name: safeProfiles.name,
            email: safeProfiles.email
          } : undefined,
        };
      });
      
      setActivities(transformedActivities);
    } catch (error: any) {
      console.error('Error fetching activities:', error);
      toast({
        title: 'Error fetching activities',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addActivity = async (payload: ActivityPayload) => {
    try {
      const result = await createActivity(payload);
      if (result.error) throw result.error;

      const data = result.data as any;
      const safeLeads = data.leads && typeof data.leads === 'object' && !Array.isArray(data.leads) ? data.leads : null;
      const safeProperties = data.properties && typeof data.properties === 'object' && !Array.isArray(data.properties) ? data.properties : null;
      const safeProfiles = data.profiles && typeof data.profiles === 'object' && !Array.isArray(data.profiles) ? data.profiles : null;
      
      const transformedActivity: Activity = {
        id: data.id,
        type: data.type,
        description: data.description,
        lead_id: data.lead_id,
        property_id: data.property_id,
        contact_id: data.contact_id,
        created_by: data.created_by,
        created_at: data.created_at,
        leads: safeLeads && safeLeads.name ? {
          name: safeLeads.name,
          email: safeLeads.email,
          agent_id: safeLeads.agent_id
        } : undefined,
        properties: safeProperties && safeProperties.title ? {
          title: safeProperties.title,
          address: safeProperties.address,
          agent_id: safeProperties.agent_id
        } : undefined,
        profiles: safeProfiles && safeProfiles.name ? {
          name: safeProfiles.name,
          email: safeProfiles.email
        } : undefined,
      };

      setActivities(prev => [transformedActivity, ...prev]);
      toast({
        title: 'Activity added',
        description: 'Activity has been logged successfully.',
      });

      return { data: result.data, error: null };
    } catch (error: any) {
      toast({
        title: 'Error adding activity',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const editActivity = async (id: string, updates: Partial<ActivityPayload>) => {
    try {
      const result = await updateActivity(id, updates);
      if (result.error) throw result.error;

      const data = result.data as any;
      const safeLeads = data.leads && typeof data.leads === 'object' && !Array.isArray(data.leads) ? data.leads : null;
      const safeProperties = data.properties && typeof data.properties === 'object' && !Array.isArray(data.properties) ? data.properties : null;
      const safeProfiles = data.profiles && typeof data.profiles === 'object' && !Array.isArray(data.profiles) ? data.profiles : null;
      
      const transformedActivity: Activity = {
        id: data.id,
        type: data.type,
        description: data.description,
        lead_id: data.lead_id,
        property_id: data.property_id,
        contact_id: data.contact_id,
        created_by: data.created_by,
        created_at: data.created_at,
        leads: safeLeads && safeLeads.name ? {
          name: safeLeads.name,
          email: safeLeads.email,
          agent_id: safeLeads.agent_id
        } : undefined,
        properties: safeProperties && safeProperties.title ? {
          title: safeProperties.title,
          address: safeProperties.address,
          agent_id: safeProperties.agent_id
        } : undefined,
        profiles: safeProfiles && safeProfiles.name ? {
          name: safeProfiles.name,
          email: safeProfiles.email
        } : undefined,
      };

      setActivities(prev => prev.map(activity => 
        activity.id === id ? transformedActivity : activity
      ));
      
      toast({
        title: 'Activity updated',
        description: 'Activity has been updated successfully.',
      });

      return { data: result.data, error: null };
    } catch (error: any) {
      toast({
        title: 'Error updating activity',
        description: error.message,
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  const removeActivity = async (id: string) => {
    try {
      const result = await deleteActivity(id);
      if (result.error) throw result.error;

      setActivities(prev => prev.filter(activity => activity.id !== id));
      toast({
        title: 'Activity deleted',
        description: 'Activity has been deleted successfully.',
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Error deleting activity',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user, profile]);

  return {
    activities,
    loading,
    fetchActivities,
    addActivity,
    editActivity,
    removeActivity,
  };
};