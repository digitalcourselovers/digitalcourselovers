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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      auth_attempts: {
        Row: {
          created_at: string
          id: string
          ip_hash: string
          kind: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_hash: string
          kind: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_hash?: string
          kind?: string
        }
        Relationships: []
      }
      calls: {
        Row: {
          answered_at: string | null
          callee_id: string
          caller_id: string
          conversation_id: string
          created_at: string
          duration_ms: number | null
          ended_at: string | null
          id: string
          kind: string
          started_at: string
          status: string
        }
        Insert: {
          answered_at?: string | null
          callee_id: string
          caller_id: string
          conversation_id: string
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          id?: string
          kind?: string
          started_at?: string
          status?: string
        }
        Update: {
          answered_at?: string | null
          callee_id?: string
          caller_id?: string
          conversation_id?: string
          created_at?: string
          duration_ms?: number | null
          ended_at?: string | null
          id?: string
          kind?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      chat_settings: {
        Row: {
          conversation_id: string
          theme: string
          updated_at: string
        }
        Insert: {
          conversation_id: string
          theme?: string
          updated_at?: string
        }
        Update: {
          conversation_id?: string
          theme?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_settings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: true
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          edited_at: string | null
          id: string
          media_kind: string | null
          media_path: string | null
          read_at: string | null
          reply_to_id: string | null
          sender_id: string
          voice_duration_ms: number | null
          voice_path: string | null
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          media_kind?: string | null
          media_path?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_id: string
          voice_duration_ms?: number | null
          voice_path?: string | null
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          media_kind?: string | null
          media_path?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_id?: string
          voice_duration_ms?: number | null
          voice_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          created_at: string
          entered_at: string
          id: string
          path: string
          seconds: number
          session_id: string
          title: string | null
          updated_at: string
          visitor_id: string
        }
        Insert: {
          created_at?: string
          entered_at?: string
          id?: string
          path: string
          seconds?: number
          session_id: string
          title?: string | null
          updated_at?: string
          visitor_id: string
        }
        Update: {
          created_at?: string
          entered_at?: string
          id?: string
          path?: string
          seconds?: number
          session_id?: string
          title?: string | null
          updated_at?: string
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_views_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "visitor_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_views_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          last_seen_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          last_seen_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          last_seen_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string
          endpoint: string
          id: string
          p256dh: string | null
          user_id: string
        }
        Insert: {
          auth?: string | null
          created_at?: string
          endpoint: string
          id?: string
          p256dh?: string | null
          user_id: string
        }
        Update: {
          auth?: string | null
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visitor_sessions: {
        Row: {
          browser: string | null
          city: string | null
          country: string | null
          created_at: string
          current_path: string | null
          device_type: string | null
          id: string
          ip: string | null
          ip_hash: string | null
          isp: string | null
          language: string | null
          last_seen_at: string
          os: string | null
          page_count: number
          referrer: string | null
          region: string | null
          screen: string | null
          session_key: string
          started_at: string
          timezone: string | null
          total_seconds: number
          updated_at: string
          user_agent: string | null
          visitor_id: string
        }
        Insert: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_path?: string | null
          device_type?: string | null
          id?: string
          ip?: string | null
          ip_hash?: string | null
          isp?: string | null
          language?: string | null
          last_seen_at?: string
          os?: string | null
          page_count?: number
          referrer?: string | null
          region?: string | null
          screen?: string | null
          session_key: string
          started_at?: string
          timezone?: string | null
          total_seconds?: number
          updated_at?: string
          user_agent?: string | null
          visitor_id: string
        }
        Update: {
          browser?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          current_path?: string | null
          device_type?: string | null
          id?: string
          ip?: string | null
          ip_hash?: string | null
          isp?: string | null
          language?: string | null
          last_seen_at?: string
          os?: string | null
          page_count?: number
          referrer?: string | null
          region?: string | null
          screen?: string | null
          session_key?: string
          started_at?: string
          timezone?: string | null
          total_seconds?: number
          updated_at?: string
          user_agent?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visitor_sessions_visitor_id_fkey"
            columns: ["visitor_id"]
            isOneToOne: false
            referencedRelation: "visitors"
            referencedColumns: ["id"]
          },
        ]
      }
      visitors: {
        Row: {
          created_at: string
          first_seen_at: string
          id: string
          last_seen_at: string
          total_page_views: number
          total_seconds: number
          updated_at: string
          visitor_key: string
        }
        Insert: {
          created_at?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          total_page_views?: number
          total_seconds?: number
          updated_at?: string
          visitor_key: string
        }
        Update: {
          created_at?: string
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          total_page_views?: number
          total_seconds?: number
          updated_at?: string
          visitor_key?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      shares_conversation_with: {
        Args: { _a: string; _b: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
