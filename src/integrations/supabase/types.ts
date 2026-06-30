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
      calendar_event_audit: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          event_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          event_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          event_id?: string | null
          id?: string
        }
        Relationships: []
      }
      calendar_event_comments: {
        Row: {
          author_name: string | null
          content: string
          created_at: string
          event_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author_name?: string | null
          content: string
          created_at?: string
          event_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author_name?: string | null
          content?: string
          created_at?: string
          event_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          category: string
          color: string | null
          contact_id: string | null
          created_at: string
          created_by_name: string | null
          description: string | null
          employee_id: string | null
          end_datetime: string
          id: string
          is_shared: boolean
          linked_user_ids: string[]
          location: string | null
          start_datetime: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          all_day?: boolean
          category?: string
          color?: string | null
          contact_id?: string | null
          created_at?: string
          created_by_name?: string | null
          description?: string | null
          employee_id?: string | null
          end_datetime: string
          id?: string
          is_shared?: boolean
          linked_user_ids?: string[]
          location?: string | null
          start_datetime: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          all_day?: boolean
          category?: string
          color?: string | null
          contact_id?: string | null
          created_at?: string
          created_by_name?: string | null
          description?: string | null
          employee_id?: string | null
          end_datetime?: string
          id?: string
          is_shared?: boolean
          linked_user_ids?: string[]
          location?: string | null
          start_datetime?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "crm_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_requests: {
        Row: {
          assigned_to: string | null
          company: string | null
          created_at: string
          email: string
          id: string
          internal_notes: string | null
          message: string | null
          name: string
          phone: string | null
          resolved_at: string | null
          service_type: string
          status: Database["public"]["Enums"]["contact_request_status"]
          updated_at: string
          user_type: string
        }
        Insert: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          email: string
          id?: string
          internal_notes?: string | null
          message?: string | null
          name: string
          phone?: string | null
          resolved_at?: string | null
          service_type: string
          status?: Database["public"]["Enums"]["contact_request_status"]
          updated_at?: string
          user_type: string
        }
        Update: {
          assigned_to?: string | null
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          internal_notes?: string | null
          message?: string | null
          name?: string
          phone?: string | null
          resolved_at?: string | null
          service_type?: string
          status?: Database["public"]["Enums"]["contact_request_status"]
          updated_at?: string
          user_type?: string
        }
        Relationships: []
      }
      course_attendance: {
        Row: {
          created_at: string
          enrollment_id: string
          entry_time: string | null
          exit_time: string | null
          id: string
          lesson_id: string
          notes: string | null
          present: boolean | null
        }
        Insert: {
          created_at?: string
          enrollment_id: string
          entry_time?: string | null
          exit_time?: string | null
          id?: string
          lesson_id: string
          notes?: string | null
          present?: boolean | null
        }
        Update: {
          created_at?: string
          enrollment_id?: string
          entry_time?: string | null
          exit_time?: string | null
          id?: string
          lesson_id?: string
          notes?: string | null
          present?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "course_attendance_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "course_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_attendance_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      course_branding_settings: {
        Row: {
          company_address: string | null
          company_email: string | null
          company_fiscal_code: string | null
          company_name: string | null
          company_pec: string | null
          company_phone: string | null
          company_vat: string | null
          company_website: string | null
          created_at: string
          footer_text: string | null
          id: string
          logo_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_address?: string | null
          company_email?: string | null
          company_fiscal_code?: string | null
          company_name?: string | null
          company_pec?: string | null
          company_phone?: string | null
          company_vat?: string | null
          company_website?: string | null
          created_at?: string
          footer_text?: string | null
          id?: string
          logo_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_address?: string | null
          company_email?: string | null
          company_fiscal_code?: string | null
          company_name?: string | null
          company_pec?: string | null
          company_phone?: string | null
          company_vat?: string | null
          company_website?: string | null
          created_at?: string
          footer_text?: string | null
          id?: string
          logo_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      course_editions: {
        Row: {
          classroom: string | null
          course_id: string
          created_at: string
          edition_code: string | null
          end_date: string | null
          id: string
          instructor_email: string | null
          instructor_name: string | null
          location: string | null
          notes: string | null
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          classroom?: string | null
          course_id: string
          created_at?: string
          edition_code?: string | null
          end_date?: string | null
          id?: string
          instructor_email?: string | null
          instructor_name?: string | null
          location?: string | null
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          classroom?: string | null
          course_id?: string
          created_at?: string
          edition_code?: string | null
          end_date?: string | null
          id?: string
          instructor_email?: string | null
          instructor_name?: string | null
          location?: string | null
          notes?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_editions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          certificate_date: string | null
          certificate_expiry: string | null
          certificate_issued: boolean | null
          contact_id: string | null
          created_at: string
          edition_id: string
          employee_id: string | null
          enrollment_date: string | null
          id: string
          notes: string | null
          result: string | null
          score: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          certificate_date?: string | null
          certificate_expiry?: string | null
          certificate_issued?: boolean | null
          contact_id?: string | null
          created_at?: string
          edition_id: string
          employee_id?: string | null
          enrollment_date?: string | null
          id?: string
          notes?: string | null
          result?: string | null
          score?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          certificate_date?: string | null
          certificate_expiry?: string | null
          certificate_issued?: boolean | null
          contact_id?: string | null
          created_at?: string
          edition_id?: string
          employee_id?: string | null
          enrollment_date?: string | null
          id?: string
          notes?: string | null
          result?: string | null
          score?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "course_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "crm_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          created_at: string
          edition_id: string
          end_time: string | null
          id: string
          instructor_name: string | null
          lesson_date: string
          notes: string | null
          start_time: string | null
          topic: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          edition_id: string
          end_time?: string | null
          id?: string
          instructor_name?: string | null
          lesson_date: string
          notes?: string | null
          start_time?: string | null
          topic?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          edition_id?: string
          end_time?: string | null
          id?: string
          instructor_name?: string | null
          lesson_date?: string
          notes?: string | null
          start_time?: string | null
          topic?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "course_editions"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          course_type: string
          created_at: string
          description: string | null
          duration_hours: number | null
          id: string
          is_mandatory: boolean | null
          max_participants: number | null
          name: string
          notes: string | null
          renewal_months: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          course_type?: string
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_mandatory?: boolean | null
          max_participants?: number | null
          name: string
          notes?: string | null
          renewal_months?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          course_type?: string
          created_at?: string
          description?: string | null
          duration_hours?: number | null
          id?: string
          is_mandatory?: boolean | null
          max_participants?: number | null
          name?: string
          notes?: string | null
          renewal_months?: number | null
          updated_at?: string
          user_id?: string
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
          category: Database["public"]["Enums"]["document_category"]
          contact_id: string
          created_at: string
          description: string | null
          expiry_date: string | null
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          is_current_version: boolean
          name: string
          parent_document_id: string | null
          updated_at: string
          uploaded_by: string
          version: number
        }
        Insert: {
          area: string
          category?: Database["public"]["Enums"]["document_category"]
          contact_id: string
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_current_version?: boolean
          name: string
          parent_document_id?: string | null
          updated_at?: string
          uploaded_by: string
          version?: number
        }
        Update: {
          area?: string
          category?: Database["public"]["Enums"]["document_category"]
          contact_id?: string
          created_at?: string
          description?: string | null
          expiry_date?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          is_current_version?: boolean
          name?: string
          parent_document_id?: string | null
          updated_at?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_client_documents_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_client_documents_parent_document_id_fkey"
            columns: ["parent_document_id"]
            isOneToOne: false
            referencedRelation: "crm_client_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          activity_end_date: string | null
          activity_start_date: string | null
          address: string | null
          ateco_code: string | null
          ateco_letter: string | null
          cdl_reference: string | null
          city: string | null
          client_user_id: string | null
          code: string | null
          company: string | null
          created_at: string
          email: string | null
          exemption_amount: number | null
          exemption_issue_date: string | null
          exemption_number: string | null
          exemption_valid_until: string | null
          external_id: string | null
          fiscal_code: string | null
          fondo_appartenenza: string | null
          id: string
          internal_registration_date: string | null
          internal_registration_number: string | null
          last_contact_at: string | null
          legal_form: string | null
          legal_name: string | null
          mobile: string | null
          name: string
          next_followup_at: string | null
          notes: string | null
          owner_name: string | null
          partners_count: number | null
          payment_method: string | null
          payment_terms: string | null
          pec: string | null
          pec_fe: string | null
          phone: string | null
          postal_code: string | null
          province: string | null
          rating: string | null
          rea_number: string | null
          referente_email: string | null
          referente_mobile: string | null
          referente_phone: string | null
          region: string | null
          role: string | null
          sdi_code: string | null
          segnalatore_name: string | null
          source: string | null
          status: string
          tags: string[] | null
          technical_consultant: string | null
          updated_at: string
          user_id: string
          vat_number: string | null
          website: string | null
        }
        Insert: {
          activity_end_date?: string | null
          activity_start_date?: string | null
          address?: string | null
          ateco_code?: string | null
          ateco_letter?: string | null
          cdl_reference?: string | null
          city?: string | null
          client_user_id?: string | null
          code?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          exemption_amount?: number | null
          exemption_issue_date?: string | null
          exemption_number?: string | null
          exemption_valid_until?: string | null
          external_id?: string | null
          fiscal_code?: string | null
          fondo_appartenenza?: string | null
          id?: string
          internal_registration_date?: string | null
          internal_registration_number?: string | null
          last_contact_at?: string | null
          legal_form?: string | null
          legal_name?: string | null
          mobile?: string | null
          name: string
          next_followup_at?: string | null
          notes?: string | null
          owner_name?: string | null
          partners_count?: number | null
          payment_method?: string | null
          payment_terms?: string | null
          pec?: string | null
          pec_fe?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          rating?: string | null
          rea_number?: string | null
          referente_email?: string | null
          referente_mobile?: string | null
          referente_phone?: string | null
          region?: string | null
          role?: string | null
          sdi_code?: string | null
          segnalatore_name?: string | null
          source?: string | null
          status?: string
          tags?: string[] | null
          technical_consultant?: string | null
          updated_at?: string
          user_id: string
          vat_number?: string | null
          website?: string | null
        }
        Update: {
          activity_end_date?: string | null
          activity_start_date?: string | null
          address?: string | null
          ateco_code?: string | null
          ateco_letter?: string | null
          cdl_reference?: string | null
          city?: string | null
          client_user_id?: string | null
          code?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          exemption_amount?: number | null
          exemption_issue_date?: string | null
          exemption_number?: string | null
          exemption_valid_until?: string | null
          external_id?: string | null
          fiscal_code?: string | null
          fondo_appartenenza?: string | null
          id?: string
          internal_registration_date?: string | null
          internal_registration_number?: string | null
          last_contact_at?: string | null
          legal_form?: string | null
          legal_name?: string | null
          mobile?: string | null
          name?: string
          next_followup_at?: string | null
          notes?: string | null
          owner_name?: string | null
          partners_count?: number | null
          payment_method?: string | null
          payment_terms?: string | null
          pec?: string | null
          pec_fe?: string | null
          phone?: string | null
          postal_code?: string | null
          province?: string | null
          rating?: string | null
          rea_number?: string | null
          referente_email?: string | null
          referente_mobile?: string | null
          referente_phone?: string | null
          region?: string | null
          role?: string | null
          sdi_code?: string | null
          segnalatore_name?: string | null
          source?: string | null
          status?: string
          tags?: string[] | null
          technical_consultant?: string | null
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
      crm_document_history: {
        Row: {
          action: string
          contact_id: string
          created_at: string
          details: Json | null
          document_id: string
          id: string
          performed_by: string
          performer_name: string | null
        }
        Insert: {
          action: string
          contact_id: string
          created_at?: string
          details?: Json | null
          document_id: string
          id?: string
          performed_by: string
          performer_name?: string | null
        }
        Update: {
          action?: string
          contact_id?: string
          created_at?: string
          details?: Json | null
          document_id?: string
          id?: string
          performed_by?: string
          performer_name?: string | null
        }
        Relationships: []
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
          birth_date: string | null
          birth_place: string | null
          contact_id: string | null
          created_at: string
          email: string | null
          external_id: string | null
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
          termination_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          birth_place?: string | null
          contact_id?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
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
          termination_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string | null
          birth_place?: string | null
          contact_id?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
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
          termination_date?: string | null
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
      document_access_logs: {
        Row: {
          access_type: string
          created_at: string
          details: Json | null
          document_id: string | null
          file_path: string
          id: string
          ip_address: string | null
          qr_code_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          access_type: string
          created_at?: string
          details?: Json | null
          document_id?: string | null
          file_path: string
          id?: string
          ip_address?: string | null
          qr_code_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          access_type?: string
          created_at?: string
          details?: Json | null
          document_id?: string | null
          file_path?: string
          id?: string
          ip_address?: string | null
          qr_code_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      medical_annual_reports: {
        Row: {
          allegato_3b_data: Json | null
          contact_id: string | null
          content: string | null
          created_at: string
          doctor_id: string | null
          fit_count: number | null
          fit_with_limitations_count: number | null
          id: string
          notes: string | null
          reference_year: number
          report_date: string | null
          report_file_path: string | null
          sent_at: string | null
          status: string
          total_workers: number | null
          unfit_count: number | null
          updated_at: string
          user_id: string
          visits_performed: number | null
        }
        Insert: {
          allegato_3b_data?: Json | null
          contact_id?: string | null
          content?: string | null
          created_at?: string
          doctor_id?: string | null
          fit_count?: number | null
          fit_with_limitations_count?: number | null
          id?: string
          notes?: string | null
          reference_year: number
          report_date?: string | null
          report_file_path?: string | null
          sent_at?: string | null
          status?: string
          total_workers?: number | null
          unfit_count?: number | null
          updated_at?: string
          user_id: string
          visits_performed?: number | null
        }
        Update: {
          allegato_3b_data?: Json | null
          contact_id?: string | null
          content?: string | null
          created_at?: string
          doctor_id?: string | null
          fit_count?: number | null
          fit_with_limitations_count?: number | null
          id?: string
          notes?: string | null
          reference_year?: number
          report_date?: string | null
          report_file_path?: string | null
          sent_at?: string | null
          status?: string
          total_workers?: number | null
          unfit_count?: number | null
          updated_at?: string
          user_id?: string
          visits_performed?: number | null
        }
        Relationships: []
      }
      medical_doctors: {
        Row: {
          created_at: string
          email: string | null
          facility_address: string | null
          facility_name: string | null
          first_name: string
          fiscal_code: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean
          last_name: string
          medical_order: string | null
          notes: string | null
          order_number: string | null
          pec: string | null
          phone: string | null
          updated_at: string
          user_id: string
          visit_rate: number | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          facility_address?: string | null
          facility_name?: string | null
          first_name: string
          fiscal_code?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          last_name: string
          medical_order?: string | null
          notes?: string | null
          order_number?: string | null
          pec?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          visit_rate?: number | null
        }
        Update: {
          created_at?: string
          email?: string | null
          facility_address?: string | null
          facility_name?: string | null
          first_name?: string
          fiscal_code?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean
          last_name?: string
          medical_order?: string | null
          notes?: string | null
          order_number?: string | null
          pec?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          visit_rate?: number | null
        }
        Relationships: []
      }
      medical_health_files: {
        Row: {
          contact_id: string | null
          created_at: string
          description: string | null
          document_date: string | null
          document_type: string
          employee_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          updated_at: string
          uploaded_by: string
          user_id: string
          visit_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          description?: string | null
          document_date?: string | null
          document_type?: string
          employee_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          updated_at?: string
          uploaded_by: string
          user_id: string
          visit_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          description?: string | null
          document_date?: string | null
          document_type?: string
          employee_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          updated_at?: string
          uploaded_by?: string
          user_id?: string
          visit_id?: string | null
        }
        Relationships: []
      }
      medical_inspections: {
        Row: {
          contact_id: string | null
          created_at: string
          doctor_id: string | null
          findings: string | null
          id: string
          inspection_date: string
          location_id: string | null
          notes: string | null
          participants: string | null
          recommendations: string | null
          report_file_path: string | null
          status: string
          topics: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          doctor_id?: string | null
          findings?: string | null
          id?: string
          inspection_date: string
          location_id?: string | null
          notes?: string | null
          participants?: string | null
          recommendations?: string | null
          report_file_path?: string | null
          status?: string
          topics?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          doctor_id?: string | null
          findings?: string | null
          id?: string
          inspection_date?: string
          location_id?: string | null
          notes?: string | null
          participants?: string | null
          recommendations?: string | null
          report_file_path?: string | null
          status?: string
          topics?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medical_judgments: {
        Row: {
          created_at: string
          doctor_id: string | null
          employee_id: string | null
          id: string
          judgment: string
          judgment_date: string
          limitations: string | null
          notes: string | null
          prescriptions: string | null
          updated_at: string
          user_id: string
          valid_until: string | null
          visit_id: string | null
        }
        Insert: {
          created_at?: string
          doctor_id?: string | null
          employee_id?: string | null
          id?: string
          judgment?: string
          judgment_date?: string
          limitations?: string | null
          notes?: string | null
          prescriptions?: string | null
          updated_at?: string
          user_id: string
          valid_until?: string | null
          visit_id?: string | null
        }
        Update: {
          created_at?: string
          doctor_id?: string | null
          employee_id?: string | null
          id?: string
          judgment?: string
          judgment_date?: string
          limitations?: string | null
          notes?: string | null
          prescriptions?: string | null
          updated_at?: string
          user_id?: string
          valid_until?: string | null
          visit_id?: string | null
        }
        Relationships: []
      }
      medical_protocols: {
        Row: {
          contact_id: string | null
          created_at: string
          description: string | null
          exams: Json | null
          id: string
          is_active: boolean
          job_role: string | null
          name: string
          periodicity_months: number | null
          risks: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          description?: string | null
          exams?: Json | null
          id?: string
          is_active?: boolean
          job_role?: string | null
          name: string
          periodicity_months?: number | null
          risks?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          description?: string | null
          exams?: Json | null
          id?: string
          is_active?: boolean
          job_role?: string | null
          name?: string
          periodicity_months?: number | null
          risks?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      medical_visits: {
        Row: {
          contact_id: string | null
          cost: number | null
          created_at: string
          doctor_id: string | null
          employee_id: string | null
          exams_performed: Json | null
          execution_date: string | null
          id: string
          location: string | null
          next_due_date: string | null
          notes: string | null
          protocol_id: string | null
          scheduled_date: string | null
          status: string
          updated_at: string
          user_id: string
          visit_type: string
        }
        Insert: {
          contact_id?: string | null
          cost?: number | null
          created_at?: string
          doctor_id?: string | null
          employee_id?: string | null
          exams_performed?: Json | null
          execution_date?: string | null
          id?: string
          location?: string | null
          next_due_date?: string | null
          notes?: string | null
          protocol_id?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
          visit_type?: string
        }
        Update: {
          contact_id?: string | null
          cost?: number | null
          created_at?: string
          doctor_id?: string | null
          employee_id?: string | null
          exams_performed?: Json | null
          execution_date?: string | null
          id?: string
          location?: string | null
          next_due_date?: string | null
          notes?: string | null
          protocol_id?: string | null
          scheduled_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          visit_type?: string
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
      note_comment_notifications: {
        Row: {
          comment_id: string
          comment_preview: string | null
          commenter_name: string | null
          created_at: string
          id: string
          is_read: boolean
          note_id: string
          note_title: string | null
          user_id: string
        }
        Insert: {
          comment_id: string
          comment_preview?: string | null
          commenter_name?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          note_id: string
          note_title?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string
          comment_preview?: string | null
          commenter_name?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          note_id?: string
          note_title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_comment_notifications_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "note_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_comment_notifications_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          note_id: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          note_id: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          note_id?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_comments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "note_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      note_share_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          note_id: string
          note_title: string | null
          shared_by_name: string | null
          shared_by_user_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          note_id: string
          note_title?: string | null
          shared_by_name?: string | null
          shared_by_user_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          note_id?: string
          note_title?: string | null
          shared_by_name?: string | null
          shared_by_user_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_share_notifications_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_shares: {
        Row: {
          created_at: string
          id: string
          note_id: string
          owner_id: string
          permission: string
          shared_with_email: string
          shared_with_user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          owner_id: string
          permission?: string
          shared_with_email: string
          shared_with_user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          owner_id?: string
          permission?: string
          shared_with_email?: string
          shared_with_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_shares_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_versions: {
        Row: {
          content: string | null
          created_at: string
          id: string
          note_id: string
          title: string
          user_id: string
          version_number: number
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          note_id: string
          title: string
          user_id: string
          version_number?: number
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          note_id?: string
          title?: string
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "note_versions_note_id_fkey"
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
          calendar_color: string | null
          company_name: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          calendar_color?: string | null
          company_name?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          calendar_color?: string | null
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
          {
            foreignKeyName: "qr_scans_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "qr_codes_public"
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
      worker_chat_channels: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          name: string
          role: Database["public"]["Enums"]["app_role"] | null
          type: Database["public"]["Enums"]["worker_channel_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          role?: Database["public"]["Enums"]["app_role"] | null
          type: Database["public"]["Enums"]["worker_channel_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          type?: Database["public"]["Enums"]["worker_channel_type"]
          updated_at?: string
        }
        Relationships: []
      }
      worker_chat_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_chat_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "worker_chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_path: string | null
          channel_id: string
          content: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_path?: string | null
          channel_id: string
          content?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_path?: string | null
          channel_id?: string
          content?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "worker_chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_leave_audit: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          details: Json
          id: string
          request_id: string | null
          request_owner_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: Json
          id?: string
          request_id?: string | null
          request_owner_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: Json
          id?: string
          request_id?: string | null
          request_owner_id?: string
        }
        Relationships: []
      }
      worker_leave_balances: {
        Row: {
          created_at: string
          id: string
          permit_hours_total: number
          permit_hours_used: number
          updated_at: string
          user_id: string
          vacation_days_total: number
          vacation_days_used: number
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          permit_hours_total?: number
          permit_hours_used?: number
          updated_at?: string
          user_id: string
          vacation_days_total?: number
          vacation_days_used?: number
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          permit_hours_total?: number
          permit_hours_used?: number
          updated_at?: string
          user_id?: string
          vacation_days_total?: number
          vacation_days_used?: number
          year?: number
        }
        Relationships: []
      }
      worker_leave_requests: {
        Row: {
          attachment_path: string | null
          created_at: string
          end_date: string
          hours: number | null
          id: string
          reason: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: Database["public"]["Enums"]["leave_request_status"]
          type: Database["public"]["Enums"]["leave_request_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_path?: string | null
          created_at?: string
          end_date: string
          hours?: number | null
          id?: string
          reason?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["leave_request_status"]
          type: Database["public"]["Enums"]["leave_request_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_path?: string | null
          created_at?: string
          end_date?: string
          hours?: number | null
          id?: string
          reason?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["leave_request_status"]
          type?: Database["public"]["Enums"]["leave_request_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      worker_notification_prefs: {
        Row: {
          notify_balance: boolean
          notify_decision: boolean
          notify_new_request: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          notify_balance?: boolean
          notify_decision?: boolean
          notify_new_request?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          notify_balance?: boolean
          notify_decision?: boolean
          notify_new_request?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      worker_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          meta: Json
          read_at: string | null
          request_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          meta?: Json
          read_at?: string | null
          request_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          meta?: Json
          read_at?: string | null
          request_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      qr_codes_public: {
        Row: {
          document_id: string | null
          expires_at: string | null
          id: string | null
          is_active: boolean | null
          public_url: string | null
        }
        Insert: {
          document_id?: string | null
          expires_at?: string | null
          id?: string | null
          is_active?: boolean | null
          public_url?: string | null
        }
        Update: {
          document_id?: string | null
          expires_at?: string | null
          id?: string | null
          is_active?: boolean | null
          public_url?: string | null
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
      is_channel_member: {
        Args: { _channel_id: string; _user_id: string }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      log_audit_event: {
        Args: {
          p_action: string
          p_details?: Json
          p_target_user_id?: string
          p_user_id: string
        }
        Returns: string
      }
      resolve_my_note_shares: { Args: never; Returns: undefined }
      worker_pref: {
        Args: { _kind: string; _user_id: string }
        Returns: boolean
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
      contact_request_status: "nuovo" | "in_lavorazione" | "risolto"
      document_category:
        | "dvr"
        | "neo_assunzione"
        | "consegna"
        | "formazione"
        | "sorveglianza_sanitaria"
        | "contratti"
        | "altro"
      leave_request_status: "in_attesa" | "approvata" | "rifiutata"
      leave_request_type:
        | "ferie"
        | "permesso_rol"
        | "malattia"
        | "permesso_retribuito"
        | "altro"
      worker_channel_type: "general" | "role" | "direct"
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
      contact_request_status: ["nuovo", "in_lavorazione", "risolto"],
      document_category: [
        "dvr",
        "neo_assunzione",
        "consegna",
        "formazione",
        "sorveglianza_sanitaria",
        "contratti",
        "altro",
      ],
      leave_request_status: ["in_attesa", "approvata", "rifiutata"],
      leave_request_type: [
        "ferie",
        "permesso_rol",
        "malattia",
        "permesso_retribuito",
        "altro",
      ],
      worker_channel_type: ["general", "role", "direct"],
    },
  },
} as const
