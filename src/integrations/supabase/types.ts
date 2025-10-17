export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      _crm_constants: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      access_audit: {
        Row: {
          action: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown | null
          timestamp: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown | null
          timestamp?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown | null
          timestamp?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          lead_id: string | null
          property_id: string | null
          type: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          lead_id?: string | null
          property_id?: string | null
          type: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          lead_id?: string | null
          property_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_history: {
        Row: {
          agent_id: string
          assigned_at: string
          id: string
          lead_id: string
          reason: string | null
          released_at: string | null
          version: number
        }
        Insert: {
          agent_id: string
          assigned_at?: string
          id?: string
          lead_id: string
          reason?: string | null
          released_at?: string | null
          version?: number
        }
        Update: {
          agent_id?: string
          assigned_at?: string
          id?: string
          lead_id?: string
          reason?: string | null
          released_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assignment_history_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assignment_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_executions: {
        Row: {
          completed_at: string | null
          error_message: string | null
          executed_at: string
          execution_result: Json | null
          id: string
          status: string
          trigger_data: Json | null
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          executed_at?: string
          execution_result?: Json | null
          id?: string
          status?: string
          trigger_data?: Json | null
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          executed_at?: string
          execution_result?: Json | null
          id?: string
          status?: string
          trigger_data?: Json | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "automation_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_workflows: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          n8n_workflow_id: string | null
          name: string
          trigger_conditions: Json | null
          trigger_type: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          n8n_workflow_id?: string | null
          name: string
          trigger_conditions?: Json | null
          trigger_type: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          n8n_workflow_id?: string | null
          name?: string
          trigger_conditions?: Json | null
          trigger_type?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          agent_id: string
          contact_id: string | null
          created_at: string
          created_by: string
          deal_id: string | null
          description: string | null
          end_date: string | null
          event_type: string
          id: string
          is_recurring: boolean | null
          lead_id: string | null
          location: string | null
          next_due_at: string | null
          notes: string | null
          notification_sent: boolean | null
          property_id: string | null
          recurrence_data: Json | null
          recurrence_end_date: string | null
          recurrence_pattern: string | null
          reminder_ack_at: string | null
          reminder_acknowledged: boolean
          reminder_minutes: number | null
          reminder_offset_min: number
          snooze_until: string | null
          start_date: string
          status: string
          task_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agent_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string | null
          description?: string | null
          end_date?: string | null
          event_type: string
          id?: string
          is_recurring?: boolean | null
          lead_id?: string | null
          location?: string | null
          next_due_at?: string | null
          notes?: string | null
          notification_sent?: boolean | null
          property_id?: string | null
          recurrence_data?: Json | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          reminder_ack_at?: string | null
          reminder_acknowledged?: boolean
          reminder_minutes?: number | null
          reminder_offset_min?: number
          snooze_until?: string | null
          start_date: string
          status?: string
          task_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          is_recurring?: boolean | null
          lead_id?: string | null
          location?: string | null
          next_due_at?: string | null
          notes?: string | null
          notification_sent?: boolean | null
          property_id?: string | null
          recurrence_data?: Json | null
          recurrence_end_date?: string | null
          recurrence_pattern?: string | null
          reminder_ack_at?: string | null
          reminder_acknowledged?: boolean
          reminder_minutes?: number | null
          reminder_offset_min?: number
          snooze_until?: string | null
          start_date?: string
          status?: string
          task_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      call_attempts: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          outcome: Database["public"]["Enums"]["call_outcome"]
        }
        Insert: {
          agent_id?: string
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          outcome: Database["public"]["Enums"]["call_outcome"]
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          outcome?: Database["public"]["Enums"]["call_outcome"]
        }
        Relationships: [
          {
            foreignKeyName: "call_attempts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "call_attempts_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          agent_id: string
          contact_id: string | null
          created_at: string
          created_by: string
          direction: string
          id: string
          lead_id: string | null
          message: string
          metadata: Json | null
          status: string
          subject: string | null
          type: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          contact_id?: string | null
          created_at?: string
          created_by?: string
          direction?: string
          id?: string
          lead_id?: string | null
          message: string
          metadata?: Json | null
          status?: string
          subject?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string
          direction?: string
          id?: string
          lead_id?: string | null
          message?: string
          metadata?: Json | null
          status?: string
          subject?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "communications_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "communications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_files: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          path: string
          property_id: string | null
          source: string
          tag: Database["public"]["Enums"]["contact_file_tag"] | null
          type: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          path: string
          property_id?: string | null
          source?: string
          tag?: Database["public"]["Enums"]["contact_file_tag"] | null
          type: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          path?: string
          property_id?: string | null
          source?: string
          tag?: Database["public"]["Enums"]["contact_file_tag"] | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_files_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_files_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_properties: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          property_id: string
          role: Database["public"]["Enums"]["contact_property_role"]
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          property_id: string
          role: Database["public"]["Enums"]["contact_property_role"]
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          property_id?: string
          role?: Database["public"]["Enums"]["contact_property_role"]
        }
        Relationships: [
          {
            foreignKeyName: "contact_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_status_changes: {
        Row: {
          changed_by: string | null
          contact_id: string
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["contact_status"]
          old_status: Database["public"]["Enums"]["contact_status"] | null
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          contact_id: string
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["contact_status"]
          old_status?: Database["public"]["Enums"]["contact_status"] | null
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["contact_status"]
          old_status?: Database["public"]["Enums"]["contact_status"] | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_status_changes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          buyer_preferences: Json | null
          created_at: string
          created_by: string
          email: string | null
          full_name: string | null
          id: string
          interest_tags: string[] | null
          marketing_source: string | null
          phone: string | null
          status_effective: Database["public"]["Enums"]["contact_status"]
          status_manual: Database["public"]["Enums"]["contact_status"] | null
          status_mode: Database["public"]["Enums"]["contact_status_mode"]
          tenant_preferences: Json | null
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          buyer_preferences?: Json | null
          created_at?: string
          created_by?: string
          email?: string | null
          full_name?: string | null
          id?: string
          interest_tags?: string[] | null
          marketing_source?: string | null
          phone?: string | null
          status_effective?: Database["public"]["Enums"]["contact_status"]
          status_manual?: Database["public"]["Enums"]["contact_status"] | null
          status_mode?: Database["public"]["Enums"]["contact_status_mode"]
          tenant_preferences?: Json | null
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          buyer_preferences?: Json | null
          created_at?: string
          created_by?: string
          email?: string | null
          full_name?: string | null
          id?: string
          interest_tags?: string[] | null
          marketing_source?: string | null
          phone?: string | null
          status_effective?: Database["public"]["Enums"]["contact_status"]
          status_manual?: Database["public"]["Enums"]["contact_status"] | null
          status_mode?: Database["public"]["Enums"]["contact_status_mode"]
          tenant_preferences?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      deal_lost_reasons: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          agent_id: string
          close_date: string | null
          contact_id: string
          created_at: string
          currency: string | null
          id: string
          notes: string | null
          probability: number | null
          property_id: string | null
          source: string | null
          status: string
          title: string
          updated_at: string
          value: number | null
        }
        Insert: {
          agent_id: string
          close_date?: string | null
          contact_id: string
          created_at?: string
          currency?: string | null
          id?: string
          notes?: string | null
          probability?: number | null
          property_id?: string | null
          source?: string | null
          status?: string
          title: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          agent_id?: string
          close_date?: string | null
          contact_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          notes?: string | null
          probability?: number | null
          property_id?: string | null
          source?: string | null
          status?: string
          title?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          content: string | null
          embedding: string | null
          id: number
          metadata: Json | null
        }
        Insert: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Update: {
          content?: string | null
          embedding?: string | null
          id?: number
          metadata?: Json | null
        }
        Relationships: []
      }
      index_usage_log: {
        Row: {
          checked_at: string | null
          idx_scan: number | null
          indexrelname: string | null
          relname: string | null
          schemaname: string | null
        }
        Insert: {
          checked_at?: string | null
          idx_scan?: number | null
          indexrelname?: string | null
          relname?: string | null
          schemaname?: string | null
        }
        Update: {
          checked_at?: string | null
          idx_scan?: number | null
          indexrelname?: string | null
          relname?: string | null
          schemaname?: string | null
        }
        Relationships: []
      }
      invalid_reasons: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          label: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
        }
        Relationships: []
      }
      lead_outcomes: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          lead_id: string
          notes: string | null
          outcome: string
          reason_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          outcome: string
          reason_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          outcome?: string
          reason_id?: string | null
        }
        Relationships: []
      }
      lead_status_changes: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          lead_id: string
          new_status: string
          old_status: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          lead_id: string
          new_status: string
          old_status?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          new_status?: string
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_status_changes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agent_id: string | null
          assigned_at: string | null
          assignment_version: number
          bedrooms: string | null
          budget_range: string | null
          budget_rent_band: string | null
          budget_sale_band: string | null
          buyer_preferences: Json | null
          category: string | null
          contact_id: string | null
          contact_pref: string[] | null
          contact_status: string | null
          created_at: string
          custom_fields: Json | null
          email: string
          first_outcome_at: string | null
          follow_up_date: string | null
          id: string
          interest_tags: string[] | null
          interested_in: string | null
          last_assigned_at: string | null
          last_contact_at: string | null
          last_outcome: string | null
          lead_source: string | null
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          location_place_id: string | null
          marketing_source: string | null
          merged_into_id: string | null
          name: string
          notes: string | null
          outcome_count: number
          phone: string | null
          priority: string
          score: number | null
          segment: string | null
          size_band: string | null
          source: Database["public"]["Enums"]["lead_source_enum"]
          status: string
          status_effective: Database["public"]["Enums"]["contact_status"]
          status_manual: Database["public"]["Enums"]["contact_status"] | null
          status_mode: Database["public"]["Enums"]["contact_status_mode"]
          subtype: string | null
          tags: string[] | null
          tenant_preferences: Json | null
          unreachable_count: number
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          assigned_at?: string | null
          assignment_version?: number
          bedrooms?: string | null
          budget_range?: string | null
          budget_rent_band?: string | null
          budget_sale_band?: string | null
          buyer_preferences?: Json | null
          category?: string | null
          contact_id?: string | null
          contact_pref?: string[] | null
          contact_status?: string | null
          created_at?: string
          custom_fields?: Json | null
          email: string
          first_outcome_at?: string | null
          follow_up_date?: string | null
          id?: string
          interest_tags?: string[] | null
          interested_in?: string | null
          last_assigned_at?: string | null
          last_contact_at?: string | null
          last_outcome?: string | null
          lead_source?: string | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_place_id?: string | null
          marketing_source?: string | null
          merged_into_id?: string | null
          name: string
          notes?: string | null
          outcome_count?: number
          phone?: string | null
          priority?: string
          score?: number | null
          segment?: string | null
          size_band?: string | null
          source?: Database["public"]["Enums"]["lead_source_enum"]
          status?: string
          status_effective?: Database["public"]["Enums"]["contact_status"]
          status_manual?: Database["public"]["Enums"]["contact_status"] | null
          status_mode?: Database["public"]["Enums"]["contact_status_mode"]
          subtype?: string | null
          tags?: string[] | null
          tenant_preferences?: Json | null
          unreachable_count?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          assigned_at?: string | null
          assignment_version?: number
          bedrooms?: string | null
          budget_range?: string | null
          budget_rent_band?: string | null
          budget_sale_band?: string | null
          buyer_preferences?: Json | null
          category?: string | null
          contact_id?: string | null
          contact_pref?: string[] | null
          contact_status?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string
          first_outcome_at?: string | null
          follow_up_date?: string | null
          id?: string
          interest_tags?: string[] | null
          interested_in?: string | null
          last_assigned_at?: string | null
          last_contact_at?: string | null
          last_outcome?: string | null
          lead_source?: string | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_place_id?: string | null
          marketing_source?: string | null
          merged_into_id?: string | null
          name?: string
          notes?: string | null
          outcome_count?: number
          phone?: string | null
          priority?: string
          score?: number | null
          segment?: string | null
          size_band?: string | null
          source?: Database["public"]["Enums"]["lead_source_enum"]
          status?: string
          status_effective?: Database["public"]["Enums"]["contact_status"]
          status_manual?: Database["public"]["Enums"]["contact_status"] | null
          status_mode?: Database["public"]["Enums"]["contact_status_mode"]
          subtype?: string | null
          tags?: string[] | null
          tenant_preferences?: Json | null
          unreachable_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          deal_id: string | null
          event_id: string | null
          id: string
          is_read: boolean | null
          lead_id: string | null
          message: string
          priority: string
          property_id: string | null
          scheduled_for: string | null
          sent_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deal_id?: string | null
          event_id?: string | null
          id?: string
          is_read?: boolean | null
          lead_id?: string | null
          message: string
          priority?: string
          property_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          deal_id?: string | null
          event_id?: string | null
          id?: string
          is_read?: boolean | null
          lead_id?: string | null
          message?: string
          priority?: string
          property_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_audit: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          new_role: string | null
          old_role: string | null
          user_id: string
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_role?: string | null
          old_role?: string | null
          user_id: string
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          new_role?: string | null
          old_role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          agent_id: string
          area_sqft: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string
          created_at: string
          created_by: string | null
          description: string | null
          featured: boolean | null
          featured_image: string | null
          gallery: Json | null
          geo_lat: number | null
          geo_lng: number | null
          id: string
          images: string[] | null
          location_lat: number | null
          location_lng: number | null
          location_place_id: string | null
          offer_type: string
          owner_contact_id: string | null
          permit_number: string | null
          price: number
          property_type: string
          segment: string | null
          state: string
          status: string
          subtype: string | null
          title: string
          unit_number: string | null
          updated_at: string
          view: string | null
          wp_id: number | null
          wp_permalink: string | null
          wp_slug: string | null
          zip_code: string | null
        }
        Insert: {
          address: string
          agent_id?: string
          area_sqft?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          featured?: boolean | null
          featured_image?: string | null
          gallery?: Json | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          images?: string[] | null
          location_lat?: number | null
          location_lng?: number | null
          location_place_id?: string | null
          offer_type: string
          owner_contact_id?: string | null
          permit_number?: string | null
          price: number
          property_type: string
          segment?: string | null
          state: string
          status?: string
          subtype?: string | null
          title: string
          unit_number?: string | null
          updated_at?: string
          view?: string | null
          wp_id?: number | null
          wp_permalink?: string | null
          wp_slug?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          agent_id?: string
          area_sqft?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          featured?: boolean | null
          featured_image?: string | null
          gallery?: Json | null
          geo_lat?: number | null
          geo_lng?: number | null
          id?: string
          images?: string[] | null
          location_lat?: number | null
          location_lng?: number | null
          location_place_id?: string | null
          offer_type?: string
          owner_contact_id?: string | null
          permit_number?: string | null
          price?: number
          property_type?: string
          segment?: string | null
          state?: string
          status?: string
          subtype?: string | null
          title?: string
          unit_number?: string | null
          updated_at?: string
          view?: string | null
          wp_id?: number | null
          wp_permalink?: string | null
          wp_slug?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "properties_owner_contact_id_fkey"
            columns: ["owner_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      property_files: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          path: string
          property_id: string
          size: number | null
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          path: string
          property_id: string
          size?: number | null
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          path?: string
          property_id?: string
          size?: number | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_files_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_status_changes: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string
          old_status: string | null
          property_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: string
          old_status?: string | null
          property_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string
          old_status?: string | null
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_status_changes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string
          calendar_event_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_at: string
          id: string
          lead_id: string | null
          origin: string
          status: string
          sync_origin: string | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string
          calendar_event_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_at: string
          id?: string
          lead_id?: string | null
          origin?: string
          status?: string
          sync_origin?: string | null
          title: string
          type?: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string
          calendar_event_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_at?: string
          id?: string
          lead_id?: string | null
          origin?: string
          status?: string
          sync_origin?: string | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          agent_id: string
          amount: number | null
          created_at: string
          currency: string | null
          deal_id: string | null
          id: string
          id_expiry: string | null
          id_number: string | null
          id_type: string | null
          lead_id: string
          nationality: string | null
          notes: string | null
          pep: boolean
          property_id: string | null
          source_of_funds: string | null
          status: string | null
          type: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          amount?: number | null
          created_at?: string
          currency?: string | null
          deal_id?: string | null
          id?: string
          id_expiry?: string | null
          id_number?: string | null
          id_type?: string | null
          lead_id: string
          nationality?: string | null
          notes?: string | null
          pep?: boolean
          property_id?: string | null
          source_of_funds?: string | null
          status?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          amount?: number | null
          created_at?: string
          currency?: string | null
          deal_id?: string | null
          id?: string
          id_expiry?: string | null
          id_number?: string | null
          id_type?: string | null
          lead_id?: string
          nationality?: string | null
          notes?: string | null
          pep?: boolean
          property_id?: string | null
          source_of_funds?: string | null
          status?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_followup_outcome: {
        Args: {
          p_client_still_with_us?: boolean
          p_due_at: string
          p_lead_id: string
          p_notes?: string
          p_outcome: string
          p_reason_id?: string
          p_title?: string
        }
        Returns: {
          calendar_event_id: string
          new_stage: string
          task_id: string
        }[]
      }
      can_access_contact_property_link: {
        Args: { p_contact_id: string; p_property_id: string; p_user_id: string }
        Returns: boolean
      }
      can_view_profile_sensitive: {
        Args: { profile_user_id: string }
        Returns: boolean
      }
      check_task_consistency: {
        Args: Record<PropertyKey, never>
        Returns: {
          issue_type: string
          lead_id: string
          lead_name: string
          lead_status: string
          task_count: number
        }[]
      }
      complete_task_with_auto_followup: {
        Args:
          | { p_auto_next_hours?: number; p_task_id: string }
          | { p_lead_id: string; p_outcome: string }
        Returns: {
          completed_task_id: string
          lead_stage: string
          next_event_id: string
          next_task_id: string
        }[]
      }
      custom_access_token_hook: {
        Args: { event: Json }
        Returns: Json
      }
      ensure_manual_followup: {
        Args: { p_due_at?: string; p_lead_id: string; p_title?: string }
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_least_busy_agent: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_public_info: {
        Args: { user_ids: string[] }
        Returns: {
          is_admin: boolean
          name: string
          user_id: string
        }[]
      }
      has_role: {
        Args:
          | { _role: Database["public"]["Enums"]["app_role"]; _user_id: string }
          | { _role: string; _user_id: string }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_valid_uuid_path: {
        Args: { path: string }
        Returns: boolean
      }
      log_call_outcome: {
        Args: {
          p_agent_id: string
          p_callback_at?: string
          p_lead_id: string
          p_notes?: string
          p_outcome: Database["public"]["Enums"]["call_outcome"]
        }
        Returns: undefined
      }
      log_index_usage: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      log_profile_access: {
        Args: {
          p_accessed_email: string
          p_accessed_name: string
          p_accessed_user_id: string
        }
        Returns: undefined
      }
      log_security_event: {
        Args: {
          p_action: string
          p_new_values?: Json
          p_old_values?: Json
          p_resource_id?: string
          p_resource_type: string
        }
        Returns: undefined
      }
      match_documents: {
        Args: { filter?: Json; match_count?: number; query_embedding: string }
        Returns: {
          content: string
          id: number
          metadata: Json
          similarity: number
        }[]
      }
      reassign_overdue_leads: {
        Args: { p_minutes?: number }
        Returns: number
      }
      recompute_contact_status: {
        Args: { p_contact_id: string; p_reason?: string }
        Returns: undefined
      }
      update_contact_profile_safe: {
        Args: { p_contact_id: string; p_patch: Json }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "agent" | "user" | "superadmin"
      call_outcome:
        | "interested"
        | "callback"
        | "no_answer"
        | "busy"
        | "not_interested"
        | "invalid"
        | "other"
      contact_file_tag:
        | "id"
        | "poa"
        | "listing_agreement"
        | "tenancy"
        | "mou"
        | "other"
      contact_property_role: "owner" | "buyer_interest" | "tenant" | "investor"
      contact_status: "active" | "past"
      contact_status_mode: "auto" | "manual"
      lead_source_enum:
        | "referral"
        | "website"
        | "social_media"
        | "advertisement"
        | "cold_call"
        | "email"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "agent", "user", "superadmin"],
      call_outcome: [
        "interested",
        "callback",
        "no_answer",
        "busy",
        "not_interested",
        "invalid",
        "other",
      ],
      contact_file_tag: [
        "id",
        "poa",
        "listing_agreement",
        "tenancy",
        "mou",
        "other",
      ],
      contact_property_role: ["owner", "buyer_interest", "tenant", "investor"],
      contact_status: ["active", "past"],
      contact_status_mode: ["auto", "manual"],
      lead_source_enum: [
        "referral",
        "website",
        "social_media",
        "advertisement",
        "cold_call",
        "email",
        "other",
      ],
    },
  },
} as const
