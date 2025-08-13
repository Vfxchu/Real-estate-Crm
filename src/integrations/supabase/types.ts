export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          lead_id: string
          type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description: string
          id?: string
          lead_id: string
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          lead_id?: string
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
        ]
      }
      contact_files: {
        Row: {
          contact_id: string
          created_at: string
          id: string
          name: string
          path: string
          property_id: string | null
          source: string
          type: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          id?: string
          name: string
          path: string
          property_id?: string | null
          source?: string
          type: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          id?: string
          name?: string
          path?: string
          property_id?: string | null
          source?: string
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
      leads: {
        Row: {
          agent_id: string | null
          bedrooms: string | null
          budget_range: string | null
          budget_rent_band: string | null
          budget_sale_band: string | null
          category: string | null
          contact_pref: string[] | null
          contact_status: string | null
          created_at: string
          custom_fields: Json | null
          email: string
          follow_up_date: string | null
          id: string
          interest_tags: string[] | null
          interested_in: string | null
          lead_source: string | null
          location_address: string | null
          location_lat: number | null
          location_lng: number | null
          location_place_id: string | null
          merged_into_id: string | null
          name: string
          notes: string | null
          phone: string | null
          priority: string
          score: number | null
          segment: string | null
          size_band: string | null
          source: Database["public"]["Enums"]["lead_source_enum"]
          status: string
          subtype: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          bedrooms?: string | null
          budget_range?: string | null
          budget_rent_band?: string | null
          budget_sale_band?: string | null
          category?: string | null
          contact_pref?: string[] | null
          contact_status?: string | null
          created_at?: string
          custom_fields?: Json | null
          email: string
          follow_up_date?: string | null
          id?: string
          interest_tags?: string[] | null
          interested_in?: string | null
          lead_source?: string | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_place_id?: string | null
          merged_into_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          priority?: string
          score?: number | null
          segment?: string | null
          size_band?: string | null
          source?: Database["public"]["Enums"]["lead_source_enum"]
          status?: string
          subtype?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          bedrooms?: string | null
          budget_range?: string | null
          budget_rent_band?: string | null
          budget_sale_band?: string | null
          category?: string | null
          contact_pref?: string[] | null
          contact_status?: string | null
          created_at?: string
          custom_fields?: Json | null
          email?: string
          follow_up_date?: string | null
          id?: string
          interest_tags?: string[] | null
          interested_in?: string | null
          lead_source?: string | null
          location_address?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_place_id?: string | null
          merged_into_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          priority?: string
          score?: number | null
          segment?: string | null
          size_band?: string | null
          source?: Database["public"]["Enums"]["lead_source_enum"]
          status?: string
          subtype?: string | null
          tags?: string[] | null
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
          role: string
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
          role?: string
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
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          agent_id: string | null
          area_sqft: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string
          created_at: string
          description: string | null
          featured: boolean | null
          id: string
          images: string[] | null
          location_lat: number | null
          location_lng: number | null
          location_place_id: string | null
          offer_type: string | null
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
          zip_code: string | null
        }
        Insert: {
          address: string
          agent_id?: string | null
          area_sqft?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city: string
          created_at?: string
          description?: string | null
          featured?: boolean | null
          id?: string
          images?: string[] | null
          location_lat?: number | null
          location_lng?: number | null
          location_place_id?: string | null
          offer_type?: string | null
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
          zip_code?: string | null
        }
        Update: {
          address?: string
          agent_id?: string | null
          area_sqft?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string
          created_at?: string
          description?: string | null
          featured?: boolean | null
          id?: string
          images?: string[] | null
          location_lat?: number | null
          location_lng?: number | null
          location_place_id?: string | null
          offer_type?: string | null
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
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      property_files: {
        Row: {
          created_at: string
          id: string
          name: string
          path: string
          property_id: string
          size: number | null
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          path: string
          property_id: string
          size?: number | null
          type: string
        }
        Update: {
          created_at?: string
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
      transactions: {
        Row: {
          amount: number | null
          created_at: string
          currency: string | null
          id: string
          id_expiry: string | null
          id_number: string | null
          id_type: string | null
          lead_id: string
          nationality: string | null
          notes: string | null
          pep: boolean
          source_of_funds: string | null
          status: string | null
          type: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          id_expiry?: string | null
          id_number?: string | null
          id_type?: string | null
          lead_id: string
          nationality?: string | null
          notes?: string | null
          pep?: boolean
          source_of_funds?: string | null
          status?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string | null
          id?: string
          id_expiry?: string | null
          id_number?: string | null
          id_type?: string | null
          lead_id?: string
          nationality?: string | null
          notes?: string | null
          pep?: boolean
          source_of_funds?: string | null
          status?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      leads_per_agent_per_month: {
        Row: {
          agent_id: string | null
          lead_count: number | null
          month: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Functions: {
      create_property_with_files: {
        Args:
          | { p_title: string; p_description: string; p_file_urls: string[] }
          | { property_data: Json; files_data?: Json[] }
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
      map_status_to_contact_status: {
        Args: { lead_status: string }
        Returns: string
      }
    }
    Enums: {
      lead_source_enum:
        | "website"
        | "referral"
        | "social"
        | "advertising"
        | "cold_call"
        | "email"
        | "whatsapp"
        | "instagram"
        | "facebook_ads"
        | "google_ads"
        | "walk_in"
        | "portal"
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
      lead_source_enum: [
        "website",
        "referral",
        "social",
        "advertising",
        "cold_call",
        "email",
        "whatsapp",
        "instagram",
        "facebook_ads",
        "google_ads",
        "walk_in",
        "portal",
      ],
    },
  },
} as const
