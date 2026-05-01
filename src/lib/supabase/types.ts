export type UserRole = 'admin' | 'member' | 'developer'

export type Database = {
  public: {
    Tables: {
      users: {
        Row: { id: string; name: string; role: UserRole; created_at: string }
        Insert: { id: string; name: string; role?: UserRole }
        Update: { name?: string; role?: UserRole }
        Relationships: []
      }
      incidents: {
        Row: {
          id: string
          title: string
          general_contractor: string
          site_name: string
          site_contact: string | null
          phone_number: string | null
          content: string
          created_by: string | null
          created_at: string
          tags: string[]
          status: 'open' | 'in_progress' | 'closed'
          closed_at: string | null
          closed_by: string | null
          category: string | null
          device: string | null
          incident_type: 'trouble' | 'other'
        }
        Insert: {
          title: string
          general_contractor: string
          site_name: string
          site_contact?: string | null
          phone_number?: string | null
          content: string
          created_by: string
          tags?: string[]
          status?: 'open' | 'in_progress' | 'closed'
          category?: string | null
          device?: string | null
          incident_type?: 'trouble' | 'other'
        }
        Update: {
          title?: string
          general_contractor?: string
          site_name?: string
          site_contact?: string | null
          phone_number?: string | null
          content?: string
          tags?: string[]
          status?: 'open' | 'in_progress' | 'closed'
          closed_at?: string | null
          closed_by?: string | null
          category?: string | null
          device?: string | null
          incident_type?: 'trouble' | 'other'
        }
        Relationships: []
      }
      responses: {
        Row: {
          id: string
          incident_id: string
          content: string
          responder_id: string | null
          created_at: string
          tags: string[]
        }
        Insert: {
          incident_id: string
          content: string
          responder_id: string
          tags?: string[]
        }
        Update: { content?: string; tags?: string[] }
        Relationships: []
      }
      categories: {
        Row: { id: string; name: string; sort_order: number; created_at: string }
        Insert: { name: string; sort_order?: number }
        Update: { name?: string; sort_order?: number }
        Relationships: []
      }
      systems: {
        Row: { id: string; category_id: string; name: string; sort_order: number; created_at: string }
        Insert: { category_id: string; name: string; sort_order?: number }
        Update: { name?: string; sort_order?: number }
        Relationships: []
      }
      incident_files: {
        Row: {
          id: string
          incident_id: string | null
          response_id: string | null
          storage_path: string
          name: string
          mime_type: string
          size: number
          uploaded_by: string
          created_at: string
        }
        Insert: {
          incident_id?: string | null
          response_id?: string | null
          storage_path: string
          name: string
          mime_type: string
          size: number
          uploaded_by: string
        }
        Update: {
          incident_id?: string | null
          response_id?: string | null
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

export type Incident = Database['public']['Tables']['incidents']['Row']
export type Response = Database['public']['Tables']['responses']['Row']
export type AppUser = Database['public']['Tables']['users']['Row']

export type Category = Database['public']['Tables']['categories']['Row']
export type SystemItem = Database['public']['Tables']['systems']['Row']
export type IncidentFile = Database['public']['Tables']['incident_files']['Row']

export type CategoryWithSystems = Category & { systems: SystemItem[] }
