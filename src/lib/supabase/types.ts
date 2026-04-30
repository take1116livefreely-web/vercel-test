export type UserRole = 'admin' | 'member'

export type Database = {
  public: {
    Tables: {
      users: {
        Row: { id: string; name: string; role: UserRole; created_at: string }
        Insert: { id: string; name: string; role?: UserRole }
        Update: { name?: string; role?: UserRole }
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
        }
        Update: { tags?: string[] }
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
        Update: never
      }
    }
  }
}

export type Incident = Database['public']['Tables']['incidents']['Row']
export type Response = Database['public']['Tables']['responses']['Row']
export type AppUser = Database['public']['Tables']['users']['Row']
