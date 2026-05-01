export type UserRole = 'admin' | 'member'

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
          created_by: string
          created_at: string
          tags: string[]
          status: 'open' | 'in_progress' | 'closed'
          closed_at: string | null
          closed_by: string | null
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
        }
        Relationships: []
      }
      responses: {
        Row: {
          id: string
          incident_id: string
          content: string
          responder_id: string
          created_at: string
          tags: string[]
        }
        Insert: {
          incident_id: string
          content: string
          responder_id: string
          tags?: string[]
        }
        Update: {
          content?: string
          tags?: string[]
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

export type IncidentFile = {
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
