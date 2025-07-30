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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      daily_upload_attempts: {
        Row: {
          attempt_count: number
          attempt_date: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          attempt_date?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          attempt_date?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          created_at: string
          id: string
          payment_amount: number
          payment_date: string
          status: string
          submission_ids: string[]
          total_views: number
          updated_at: string
          user_email: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_amount?: number
          payment_date?: string
          status?: string
          submission_ids?: string[]
          total_views?: number
          updated_at?: string
          user_email: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_amount?: number
          payment_date?: string
          status?: string
          submission_ids?: string[]
          total_views?: number
          updated_at?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      upload_configs: {
        Row: {
          allowed_formats: string[]
          created_at: string
          id: string
          max_file_size_mb: number
          updated_at: string
        }
        Insert: {
          allowed_formats?: string[]
          created_at?: string
          id?: string
          max_file_size_mb?: number
          updated_at?: string
        }
        Update: {
          allowed_formats?: string[]
          created_at?: string
          id?: string
          max_file_size_mb?: number
          updated_at?: string
        }
        Relationships: []
      }
      upload_sessions: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          file_name: string
          file_size: number
          file_type: string
          id: string
          is_verified: boolean
          upload_token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          file_name: string
          file_size: number
          file_type: string
          id?: string
          is_verified?: boolean
          upload_token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          is_verified?: boolean
          upload_token?: string
          user_id?: string | null
        }
        Relationships: []
      }
      video_submissions: {
        Row: {
          clip_type: string | null
          created_at: string
          file_path: string | null
          file_size_bytes: number | null
          id: string
          original_filename: string | null
          payment_amount: number | null
          submission_type: string
          updated_at: string
          user_email: string | null
          user_id: string
          video_url: string | null
          views: number | null
        }
        Insert: {
          clip_type?: string | null
          created_at?: string
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          original_filename?: string | null
          payment_amount?: number | null
          submission_type: string
          updated_at?: string
          user_email?: string | null
          user_id: string
          video_url?: string | null
          views?: number | null
        }
        Update: {
          clip_type?: string | null
          created_at?: string
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          original_filename?: string | null
          payment_amount?: number | null
          submission_type?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
          video_url?: string | null
          views?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_increment_upload_attempts: {
        Args: { user_uuid: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
