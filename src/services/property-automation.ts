import { supabase } from "@/integrations/supabase/client";
import { dispatchSyncEvents } from "./lead-automation";

// Property Automation Services
export const propertyAutomation = {
  // 1. Auto-linking Owner Contacts
  async autoLinkOwnerContact(propertyId: string, ownerContactId: string) {
    try {
      // Link Property → Contact in contact_properties
      await supabase
        .from('contact_properties')
        .insert({
          contact_id: ownerContactId,
          property_id: propertyId,
          role: 'owner'
        });

      // Log activity
      await supabase
        .from('activities')
        .insert({
          type: 'property_link',
          description: 'Property linked to Contact',
          property_id: propertyId,
          contact_id: ownerContactId,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      // Dispatch sync events
      dispatchSyncEvents('contact', 'updated', { contactId: ownerContactId });
    } catch (error) {
      console.error('Error auto-linking owner contact:', error);
    }
  },

  // 2. Agent Assignment Notifications
  async notifyAgentAssignment(propertyId: string, agentId: string, propertyTitle: string) {
    try {
      // Send notification to agent
      await supabase
        .from('notifications')
        .insert({
          user_id: agentId,
          title: 'Property Assigned',
          message: `Property "${propertyTitle}" has been assigned to you`,
          type: 'info',
          priority: 'medium',
          property_id: propertyId
        });

      // Create task for agent
      await supabase
        .from('calendar_events')
        .insert({
          title: 'Review newly assigned property',
          description: `Review property: ${propertyTitle}`,
          event_type: 'task',
          start_date: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
          agent_id: agentId,
          created_by: agentId,
          property_id: propertyId
        });
    } catch (error) {
      console.error('Error notifying agent assignment:', error);
    }
  },

  // 3. Document & Layout Upload Alerts
  async logFileUpload(propertyId: string, agentId: string, fileName: string, fileType: 'document' | 'layout', contactId?: string) {
    try {
      // Log in activity feed
      await supabase
        .from('activities')
        .insert({
          type: fileType + '_upload',
          description: `${fileType === 'document' ? 'Document' : 'Layout'} "${fileName}" uploaded`,
          property_id: propertyId,
          contact_id: contactId,
          created_by: agentId
        });

      // Notify assigned agent if different from uploader
      const { data: property } = await supabase
        .from('properties')
        .select('agent_id, title')
        .eq('id', propertyId)
        .single();

      if (property && property.agent_id !== agentId) {
        await supabase
          .from('notifications')
          .insert({
            user_id: property.agent_id,
            title: `${fileType === 'document' ? 'Document' : 'Layout'} Uploaded`,
            message: `New ${fileType} "${fileName}" uploaded for property "${property.title}"`,
            type: 'info',
            priority: 'medium',
            property_id: propertyId
          });
      }

      // Notify linked contact if exists
      if (contactId) {
        // Get contact's linked leads to find agent
        const { data: leads } = await supabase
          .from('leads')
          .select('agent_id')
          .eq('id', contactId)
          .limit(1);

        if (leads && leads[0]) {
          await supabase
            .from('notifications')
            .insert({
              user_id: leads[0].agent_id,
              title: `${fileType === 'document' ? 'Document' : 'Layout'} Available`,
              message: `New ${fileType} available for contact property`,
              type: 'info',
              priority: 'low',
              property_id: propertyId
            });
        }
      }
    } catch (error) {
      console.error('Error logging file upload:', error);
    }
  },

  // 4. Schedule a Viewing → Calendar Sync
  async createViewingEvent(propertyId: string, leadId: string, contactId: string, agentId: string, viewingDate: Date) {
    try {
      const { data: property } = await supabase
        .from('properties')
        .select('title, address')
        .eq('id', propertyId)
        .single();

      const { data: contact } = await supabase
        .from('leads')
        .select('name')
        .eq('id', leadId)
        .single();

      if (property && contact) {
        // Create calendar event
        const { data: event } = await supabase
          .from('calendar_events')
          .insert({
            title: `Property Viewing - ${property.title}`,
            description: `Property viewing with ${contact.name} at ${property.address}`,
            event_type: 'property_viewing',
            start_date: viewingDate.toISOString(),
            end_date: new Date(viewingDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
            agent_id: agentId,
            created_by: agentId,
            property_id: propertyId,
            lead_id: leadId,
            contact_id: contactId
          })
          .select()
          .single();

        // Notify agent
        await supabase
          .from('notifications')
          .insert({
            user_id: agentId,
            title: 'Property Viewing Scheduled',
            message: `Viewing scheduled for ${property.title} with ${contact.name}`,
            type: 'info',
            priority: 'high',
            property_id: propertyId,
            event_id: event?.id
          });

        // Log activity
        await supabase
          .from('activities')
          .insert({
            type: 'viewing_scheduled',
            description: `Property viewing scheduled with ${contact.name}`,
            property_id: propertyId,
            lead_id: leadId,
            contact_id: contactId,
            created_by: agentId
          });

        return event;
      }
    } catch (error) {
      console.error('Error creating viewing event:', error);
    }
  },

  // 5. Lead ↔ Property Sync
  async linkLeadToProperty(leadId: string, propertyId: string) {
    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('agent_id, name')
        .eq('id', leadId)
        .single();

      if (lead) {
        // Auto-link in contact_properties
        await supabase
          .from('contact_properties')
          .insert({
            contact_id: leadId,
            property_id: propertyId,
            role: 'buyer_interest'
          });

        // Create follow-up task
        await supabase
          .from('calendar_events')
          .insert({
            title: 'Follow up on property enquiry',
            description: `Follow up with ${lead.name} about property enquiry`,
            event_type: 'lead_followup',
            start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            agent_id: lead.agent_id,
            created_by: lead.agent_id,
            property_id: propertyId,
            lead_id: leadId
          });

        // Log activity
        await supabase
          .from('activities')
          .insert({
            type: 'property_enquiry',
            description: 'Lead enquiry linked to property',
            property_id: propertyId,
            lead_id: leadId,
            created_by: lead.agent_id
          });
      }
    } catch (error) {
      console.error('Error linking lead to property:', error);
    }
  },

  // 6. Auto-Tasks on Property Add
  async createPropertyTasks(propertyId: string, agentId: string, propertyTitle: string) {
    try {
      const tasks = [
        {
          title: 'Verify documents uploaded',
          description: `Ensure all necessary documents are uploaded for ${propertyTitle}`,
          start_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
        },
        {
          title: 'Confirm owner details',
          description: `Verify and confirm owner contact details for ${propertyTitle}`,
          start_date: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(), // 4 hours
        },
        {
          title: 'Schedule internal review',
          description: `Schedule internal property review for ${propertyTitle}`,
          start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 1 day
        }
      ];

      for (const task of tasks) {
        await supabase
          .from('calendar_events')
          .insert({
            ...task,
            event_type: 'task',
            agent_id: agentId,
            created_by: agentId,
            property_id: propertyId
          });
      }
    } catch (error) {
      console.error('Error creating property tasks:', error);
    }
  },

  // 7. Status-Based Automations
  async handleStatusChange(propertyId: string, oldStatus: string, newStatus: string, agentId: string) {
    try {
      const { data: property } = await supabase
        .from('properties')
        .select('title')
        .eq('id', propertyId)
        .single();

      if (!property) return;

      if (newStatus === 'pending') {
        // Create reminder task in 3 days
        await supabase
          .from('calendar_events')
          .insert({
            title: `Follow up on pending property: ${property.title}`,
            description: 'Check status of pending property',
            event_type: 'task',
            start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            agent_id: agentId,
            created_by: agentId,
            property_id: propertyId
          });
      }

      if (['sold', 'rented'].includes(newStatus)) {
        // Get contact IDs to update their leads
        const { data: contactIds } = await supabase
          .from('contact_properties')
          .select('contact_id')
          .eq('property_id', propertyId);

        if (contactIds && contactIds.length > 0) {
          const contactIdList = contactIds.map(c => c.contact_id);
          
          await supabase
            .from('leads')
            .update({ status: 'won' })
            .in('id', contactIdList)
            .neq('status', 'won');
        }

        // Archive open tasks
        await supabase
          .from('calendar_events')
          .update({ status: 'completed' })
          .eq('property_id', propertyId)
          .eq('status', 'scheduled');

        // Notify agent
        await supabase
          .from('notifications')
          .insert({
            user_id: agentId,
            title: 'Property Closed',
            message: `Property "${property.title}" has been ${newStatus}. Related leads and tasks updated.`,
            type: 'success',
            priority: 'medium',
            property_id: propertyId
          });
      }

      if (newStatus === 'available' && ['sold', 'rented'].includes(oldStatus)) {
        // Notify agent - property available again
        await supabase
          .from('notifications')
          .insert({
            user_id: agentId,
            title: 'Property Available Again',
            message: `Property "${property.title}" is now available again`,
            type: 'info',
            priority: 'high',
            property_id: propertyId
          });

        // Reopen related leads marked as lost due to availability
        await supabase
          .from('leads')
          .update({ status: 'contacted' })
          .eq('status', 'lost')
          .in('id', 
            supabase
              .from('contact_properties')
              .select('contact_id')
              .eq('property_id', propertyId)
          );
      }

      // Log status change activity
      await supabase
        .from('activities')
        .insert({
          type: 'status_change',
          description: `Property status changed from ${oldStatus} to ${newStatus}`,
          property_id: propertyId,
          created_by: agentId
        });

    } catch (error) {
      console.error('Error handling status change:', error);
    }
  },

  // 8. Cross-logging Activities
  async logPropertyChange(propertyId: string, changeType: string, description: string, agentId: string) {
    try {
      // Log activity in property
      await supabase
        .from('activities')
        .insert({
          type: changeType,
          description: description,
          property_id: propertyId,
          created_by: agentId
        });

      // Get related leads and contacts
      const { data: linkedContacts } = await supabase
        .from('contact_properties')
        .select('contact_id')
        .eq('property_id', propertyId);

      if (linkedContacts) {
        // Log activity in each related lead/contact
        for (const link of linkedContacts) {
          await supabase
            .from('activities')
            .insert({
              type: changeType,
              description: `Property update: ${description}`,
              property_id: propertyId,
              lead_id: link.contact_id,
              contact_id: link.contact_id,
              created_by: agentId
            });
        }
      }

      // Dispatch sync events
      dispatchSyncEvents('contact', 'updated', { propertyId });
    } catch (error) {
      console.error('Error cross-logging activities:', error);
    }
  },

  // 9. Auto-Reminders for Expiring Docs
  async checkExpiringDocuments() {
    try {
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      
      // This would require extending the property_files table with expiry_date
      // For now, we'll create a placeholder implementation
      
      // Future implementation would query files with expiry dates
      // and create notifications for agents/admins
      
      console.log('Document expiry check would run here');
    } catch (error) {
      console.error('Error checking expiring documents:', error);
    }
  },

  // 10. Duplicate Property Check
  async checkForDuplicates(address: string, title: string, areaSize?: number): Promise<boolean> {
    try {
      let query = supabase
        .from('properties')
        .select('id, title, address, area_sqft')
        .ilike('address', `%${address}%`)
        .ilike('title', `%${title}%`);

      if (areaSize) {
        // Check for properties within 10% size range
        const sizeRange = areaSize * 0.1;
        query = query
          .gte('area_sqft', areaSize - sizeRange)
          .lte('area_sqft', areaSize + sizeRange);
      }

      const { data: duplicates } = await query;

      if (duplicates && duplicates.length > 0) {
        // Notify admin about potential duplicate
        const { data: adminUsers } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('role', 'admin');

        if (adminUsers) {
          for (const admin of adminUsers) {
            await supabase
              .from('notifications')
              .insert({
                user_id: admin.user_id,
                title: 'Potential Duplicate Property',
                message: `Property "${title}" at "${address}" may be a duplicate`,
                type: 'warning',
                priority: 'medium'
              });
          }
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return false;
    }
  },

  // 11. Pipeline KPIs Tracking
  async trackPropertyKPIs() {
    try {
      const today = new Date();
      const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay());
      
      // Properties listed this week
      const { count: listedThisWeek } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekStart.toISOString());

      // Properties linked to leads
      const { count: linkedToLeads } = await supabase
        .from('contact_properties')
        .select('*', { count: 'exact', head: true });

      // Viewings scheduled/completed
      const { count: viewingsScheduled } = await supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'property_viewing')
        .gte('created_at', weekStart.toISOString());

      const { count: viewingsCompleted } = await supabase
        .from('calendar_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'property_viewing')
        .eq('status', 'completed')
        .gte('created_at', weekStart.toISOString());

      // Properties closed (sold/rented)
      const { count: propertiesClosed } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .in('status', ['sold', 'rented'])
        .gte('updated_at', weekStart.toISOString());

      // Store KPIs (would need a kpis table)
      const kpis = {
        week_start: weekStart.toISOString(),
        properties_listed: listedThisWeek || 0,
        properties_linked_to_leads: linkedToLeads || 0,
        viewings_scheduled: viewingsScheduled || 0,
        viewings_completed: viewingsCompleted || 0,
        properties_closed: propertiesClosed || 0,
        computed_at: new Date().toISOString()
      };

      // For now, just log the KPIs
      console.log('Property KPIs:', kpis);

      return kpis;
    } catch (error) {
      console.error('Error tracking property KPIs:', error);
      return null;
    }
  }
};