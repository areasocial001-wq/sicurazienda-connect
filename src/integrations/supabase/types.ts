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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_user_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_user_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_user_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          phone: string | null
          service_type: string
          updated_at: string
          user_type: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          service_type: string
          updated_at?: string
          user_type: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          service_type?: string
          updated_at?: string
          user_type?: string
        }
        Relationships: []
      }
      crm_activities: {
        Row: {
          actual_cost: number | null
          actual_time: number | null
          assignee: string | null
          billing_notes: string | null
          completion_date: string | null
          contact_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoiced_hours: number | null
          is_invoiced: boolean | null
          name: string
          owner_name: string | null
          priority: string | null
          project_name: string | null
          start_date: string | null
          status: string
          type: string
          updated_at: string
          user_id: string
          work_type: string | null
        }
        Insert: {
          actual_cost?: number | null
          actual_time?: number | null
          assignee?: string | null
          billing_notes?: string | null
          completion_date?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoiced_hours?: number | null
          is_invoiced?: boolean | null
          name: string
          owner_name?: string | null
          priority?: string | null
          project_name?: string | null
          start_date?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id: string
          work_type?: string | null
        }
        Update: {
          actual_cost?: number | null
          actual_time?: number | null
          assignee?: string | null
          billing_notes?: string | null
          completion_date?: string | null
          contact_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoiced_hours?: number | null
          is_invoiced?: boolean | null
          name?: string
          owner_name?: string | null
          priority?: string | null
          project_name?: string | null
          start_date?: string | null
          status?: string
          type?: string
          updated_at?: string
          user_id?: string
          work_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_client_documents: {
        Row: {
          area: string
          contact_id: string
          created_at: string
          description: string | null
          expiry_date: string | null
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          name: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          area: string
          contact_id: string
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          area?: string
          contact_id?: string
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          name?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_client_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          address: string | null
          client_user_id: string | null
          code: string | null
          company: string | null
          created_at: string
          email: string | null
          fiscal_code: string | null
          id: string
          last_contact_at: string | null
          name: string
          next_followup_at: string | null
          notes: string | null
          owner_name: string | null
          pec: string | null
          phone: string | null
          rating: string | null
          role: string | null
          sdi_code: string | null
          source: string | null
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string
          vat_number: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          client_user_id?: string | null
          code?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          fiscal_code?: string | null
          id?: string
          last_contact_at?: string | null
          name: string
          next_followup_at?: string | null
          notes?: string | null
          owner_name?: string | null
          pec?: string | null
          phone?: string | null
          rating?: string | null
          role?: string | null
          sdi_code?: string | null
          source?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          client_user_id?: string | null
          code?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          fiscal_code?: string | null
          id?: string
          last_contact_at?: string | null
          name?: string
          next_followup_at?: string | null
          notes?: string | null
          owner_name?: string | null
          pec?: string | null
          phone?: string | null
          rating?: string | null
          role?: string | null
          sdi_code?: string | null
          source?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          vat_number?: string | null
          website?: string | null
        }
        Relationships: []
      }
      crm_contracts: {
        Row: {
          contact_id: string | null
          contract_amount: number | null
          contract_date: string | null
          contract_expiry_date: string | null
          contract_type: string | null
          created_at: string
          description: string | null
          documentation_delivery_date: string | null
          end_date: string | null
          external_cost: number | null
          group_name: string | null
          id: string
          internal_cost: number | null
          name: string
          quote_amount: number | null
          responsible: string | null
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          contract_amount?: number | null
          contract_date?: string | null
          contract_expiry_date?: string | null
          contract_type?: string | null
          created_at?: string
          description?: string | null
          documentation_delivery_date?: string | null
          end_date?: string | null
          external_cost?: number | null
          group_name?: string | null
          id?: string
          internal_cost?: number | null
          name: string
          quote_amount?: number | null
          responsible?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string | null
          contract_amount?: number | null
          contract_date?: string | null
          contract_expiry_date?: string | null
          contract_type?: string | null
          created_at?: string
          description?: string | null
          documentation_delivery_date?: string | null
          end_date?: string | null
          external_cost?: number | null
          group_name?: string | null
          id?: string
          internal_cost?: number | null
          name?: string
          quote_amount?: number | null
          responsible?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contracts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_employee_activities: {
        Row: {
          activity_name: string
          activity_type: string
          created_at: string
          employee_id: string | null
          execution_date: string | null
          expiry_date: string | null
          id: string
          notes: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_name: string
          activity_type: string
          created_at?: string
          employee_id?: string | null
          execution_date?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_name?: string
          activity_type?: string
          created_at?: string
          employee_id?: string | null
          execution_date?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_employee_activities_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "crm_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_employees: {
        Row: {
          contact_id: string | null
          created_at: string
          email: string | null
          first_name: string
          fiscal_code: string | null
          hire_date: string | null
          id: string
          last_name: string
          location_id: string | null
          notes: string | null
          phone: string | null
          role: string | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          email?: string | null
          first_name: string
          fiscal_code?: string | null
          hire_date?: string | null
          id?: string
          last_name: string
          location_id?: string | null
          notes?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          email?: string | null
          first_name?: string
          fiscal_code?: string | null
          hire_date?: string | null
          id?: string
          last_name?: string
          location_id?: string | null
          notes?: string | null
          phone?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_employees_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_employees_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "crm_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_interactions: {
        Row: {
          completed_at: string | null
          contact_id: string
          created_at: string
          description: string | null
          id: string
          scheduled_at: string | null
          subject: string
          type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          contact_id: string
          created_at?: string
          description?: string | null
          id?: string
          scheduled_at?: string | null
          subject: string
          type: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          description?: string | null
          id?: string
          scheduled_at?: string | null
          subject?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_interactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_locations: {
        Row: {
          address: string | null
          city: string | null
          code: string | null
          contact_id: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_main_location: boolean | null
          location_type: string | null
          name: string
          notes: string | null
          pec: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code?: string | null
          contact_id?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_main_location?: boolean | null
          location_type?: string | null
          name: string
          notes?: string | null
          pec?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string | null
          contact_id?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_main_location?: boolean | null
          location_type?: string | null
          name?: string
          notes?: string | null
          pec?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_locations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      document_extracted_data: {
        Row: {
          addresses: Json | null
          amounts: Json | null
          codes: Json | null
          companies: Json | null
          contacts: Json | null
          dates: Json | null
          document_id: string
          extracted_at: string
          id: string
          people: Json | null
          raw_data: Json | null
          summary: string | null
        }
        Insert: {
          addresses?: Json | null
          amounts?: Json | null
          codes?: Json | null
          companies?: Json | null
          contacts?: Json | null
          dates?: Json | null
          document_id: string
          extracted_at?: string
          id?: string
          people?: Json | null
          raw_data?: Json | null
          summary?: string | null
        }
        Update: {
          addresses?: Json | null
          amounts?: Json | null
          codes?: Json | null
          companies?: Json | null
          contacts?: Json | null
          dates?: Json | null
          document_id?: string
          extracted_at?: string
          id?: string
          people?: Json | null
          raw_data?: Json | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_extracted_data_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          area_competenza: string | null
          category: string | null
          created_at: string | null
          expiry_date: string | null
          file_path: string
          file_type: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          area_competenza?: string | null
          category?: string | null
          created_at?: string | null
          expiry_date?: string | null
          file_path: string
          file_type?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          area_competenza?: string | null
          category?: string | null
          created_at?: string | null
          expiry_date?: string | null
          file_path?: string
          file_type?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      form_drafts: {
        Row: {
          client_type: string
          created_at: string
          form_data: Json
          id: string
          service_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_type: string
          created_at?: string
          form_data: Json
          id?: string
          service_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_type?: string
          created_at?: string
          form_data?: Json
          id?: string
          service_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_drive_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          folder_id: string | null
          id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          folder_id?: string | null
          id?: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          folder_id?: string | null
          id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      note_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          note_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          note_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_attachments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notebooks: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          color: string | null
          contact_id: string | null
          content: string | null
          created_at: string
          id: string
          is_archived: boolean
          is_pinned: boolean
          notebook_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          notebook_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          contact_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_archived?: boolean
          is_pinned?: boolean
          notebook_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_notebook_id_fkey"
            columns: ["notebook_id"]
            isOneToOne: false
            referencedRelation: "notebooks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      qr_codes: {
        Row: {
          created_at: string
          created_by: string
          document_id: string
          document_name: string
          expires_at: string | null
          id: string
          is_active: boolean
          public_url: string
          sent_at: string | null
          sent_to_email: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          document_id: string
          document_name: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          public_url: string
          sent_at?: string | null
          sent_to_email?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          document_id?: string
          document_name?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          public_url?: string
          sent_at?: string | null
          sent_to_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_scans: {
        Row: {
          city: string | null
          country: string | null
          country_code: string | null
          id: string
          ip_address: string | null
          qr_code_id: string
          region: string | null
          scanned_at: string
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          id?: string
          ip_address?: string | null
          qr_code_id: string
          region?: string | null
          scanned_at?: string
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          country_code?: string | null
          id?: string
          ip_address?: string | null
          qr_code_id?: string
          region?: string | null
          scanned_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_scans_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "qr_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string
          description: string | null
          due_date: string
          id: string
          is_completed: boolean
          is_read: boolean
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date: string
          id?: string
          is_completed?: boolean
          is_read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string
          id?: string
          is_completed?: boolean
          is_read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      get_documents_for_role: {
        Args: { user_role: Database["public"]["Enums"]["app_role"] }
        Returns: {
          area_competenza: string
          category: string
          company_name: string
          created_at: string
          file_path: string
          file_type: string
          full_name: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { user_uuid: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          role_name: Database["public"]["Enums"]["app_role"]
          user_uuid: string
        }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_target_user_id?: string
          p_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "user"
        | "contabilita"
        | "area_tecnica"
        | "gestione_corsi"
        | "consulenti_tecnici"
        | "medicina"
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
      app_role: [
        "admin",
        "user",
        "contabilita",
        "area_tecnica",
        "gestione_corsi",
        "consulenti_tecnici",
        "medicina",
      ],
    },
  },
} as const
