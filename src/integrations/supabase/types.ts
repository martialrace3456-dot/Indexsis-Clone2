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
      ad_bid_slots: {
        Row: {
          bid_id: string
          charged: boolean
          created_at: string
          id: string
          owner_id: string | null
          rate: number
          slot_end: string
          slot_start: string
          state: string
          updated_at: string
          used_at: string | null
          used_by_campaign: string | null
        }
        Insert: {
          bid_id: string
          charged?: boolean
          created_at?: string
          id?: string
          owner_id?: string | null
          rate?: number
          slot_end: string
          slot_start: string
          state?: string
          updated_at?: string
          used_at?: string | null
          used_by_campaign?: string | null
        }
        Update: {
          bid_id?: string
          charged?: boolean
          created_at?: string
          id?: string
          owner_id?: string | null
          rate?: number
          slot_end?: string
          slot_start?: string
          state?: string
          updated_at?: string
          used_at?: string | null
          used_by_campaign?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_bid_slots_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "ad_bids"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_bid_slots_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_bids: {
        Row: {
          age_target: string
          contest_targets: string[]
          country_targets: string[]
          created_at: string
          id: string
          identifier: string
          name: string
          owner_id: string | null
          rate_per_slot: number
          resolved_at: string | null
          runtime_minutes: number
          status: string
          window_end: string
          window_start: string
        }
        Insert: {
          age_target?: string
          contest_targets?: string[]
          country_targets?: string[]
          created_at?: string
          id?: string
          identifier?: string
          name?: string
          owner_id?: string | null
          rate_per_slot: number
          resolved_at?: string | null
          runtime_minutes: number
          status?: string
          window_end: string
          window_start: string
        }
        Update: {
          age_target?: string
          contest_targets?: string[]
          country_targets?: string[]
          created_at?: string
          id?: string
          identifier?: string
          name?: string
          owner_id?: string | null
          rate_per_slot?: number
          resolved_at?: string | null
          runtime_minutes?: number
          status?: string
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_bids_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_campaigns: {
        Row: {
          advertiser_id: string | null
          age_target: string
          amount: number
          contest_targets: string[]
          country_targets: string[]
          created_at: string
          crop_data: Json | null
          crop_ratio: string
          crypto_currency: string | null
          ends_at: string | null
          from_address: string | null
          id: string
          link_url: string | null
          overlay_id: string
          payment_method: string | null
          payment_status: string
          placement: string
          reserved_slot_ids: string[]
          runtime_minutes: number
          served_seconds: number
          starts_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          advertiser_id?: string | null
          age_target?: string
          amount?: number
          contest_targets?: string[]
          country_targets?: string[]
          created_at?: string
          crop_data?: Json | null
          crop_ratio?: string
          crypto_currency?: string | null
          ends_at?: string | null
          from_address?: string | null
          id?: string
          link_url?: string | null
          overlay_id: string
          payment_method?: string | null
          payment_status?: string
          placement?: string
          reserved_slot_ids?: string[]
          runtime_minutes?: number
          served_seconds?: number
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          advertiser_id?: string | null
          age_target?: string
          amount?: number
          contest_targets?: string[]
          country_targets?: string[]
          created_at?: string
          crop_data?: Json | null
          crop_ratio?: string
          crypto_currency?: string | null
          ends_at?: string | null
          from_address?: string | null
          id?: string
          link_url?: string | null
          overlay_id?: string
          payment_method?: string | null
          payment_status?: string
          placement?: string
          reserved_slot_ids?: string[]
          runtime_minutes?: number
          served_seconds?: number
          starts_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_campaigns_advertiser_id_fkey"
            columns: ["advertiser_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_exposure_intervals: {
        Row: {
          campaign_id: string
          ended_at: string
          id: string
          interval_id: string
          seconds: number
          started_at: string
        }
        Insert: {
          campaign_id: string
          ended_at: string
          id?: string
          interval_id: string
          seconds: number
          started_at: string
        }
        Update: {
          campaign_id?: string
          ended_at?: string
          id?: string
          interval_id?: string
          seconds?: number
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_exposure_intervals_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_exposure_intervals_interval_id_fkey"
            columns: ["interval_id"]
            isOneToOne: false
            referencedRelation: "gameplay_intervals"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_reports: {
        Row: {
          campaign_id: string | null
          campaign_title: string
          content_type: string | null
          created_at: string
          description: string
          id: string
          link_url: string | null
          media_url: string | null
          overlay_id: string | null
          status: string
        }
        Insert: {
          campaign_id?: string | null
          campaign_title?: string
          content_type?: string | null
          created_at?: string
          description: string
          id?: string
          link_url?: string | null
          media_url?: string | null
          overlay_id?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string | null
          campaign_title?: string
          content_type?: string | null
          created_at?: string
          description?: string
          id?: string
          link_url?: string | null
          media_url?: string | null
          overlay_id?: string | null
          status?: string
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      admin_wallet: {
        Row: {
          addresses: Json
          id: string
          updated_at: string
        }
        Insert: {
          addresses?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          addresses?: Json
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      advertiser_balances: {
        Row: {
          held_amount: number
          id: string
          identifier: string
          load_amount: number
          owner_id: string | null
          player_id: string | null
          reserved_minutes: number
          spent_amount: number
          updated_at: string
        }
        Insert: {
          held_amount?: number
          id?: string
          identifier?: string
          load_amount?: number
          owner_id?: string | null
          player_id?: string | null
          reserved_minutes?: number
          spent_amount?: number
          updated_at?: string
        }
        Update: {
          held_amount?: number
          id?: string
          identifier?: string
          load_amount?: number
          owner_id?: string | null
          player_id?: string | null
          reserved_minutes?: number
          spent_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_balances_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_history: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json
          owner_id: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json
          owner_id?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json
          owner_id?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_history_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_links: {
        Row: {
          created_at: string
          id: string
          owner_id: string | null
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id?: string | null
          title?: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string | null
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_links_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      advertiser_load_payments: {
        Row: {
          amount: number
          approved_at: string | null
          created_at: string
          crypto_currency: string | null
          from_address: string | null
          id: string
          identifier: string
          owner_id: string | null
          payment_method: string
          payment_status: string
          source: string
          to_address: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          created_at?: string
          crypto_currency?: string | null
          from_address?: string | null
          id?: string
          identifier?: string
          owner_id?: string | null
          payment_method: string
          payment_status?: string
          source?: string
          to_address?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          created_at?: string
          crypto_currency?: string | null
          from_address?: string | null
          id?: string
          identifier?: string
          owner_id?: string | null
          payment_method?: string
          payment_status?: string
          source?: string
          to_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advertiser_load_payments_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          message: string
          targets: string[] | null
          type: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          targets?: string[] | null
          type?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          targets?: string[] | null
          type?: string
        }
        Relationships: []
      }
      contest_scores: {
        Row: {
          contest_id: string
          created_at: string
          game_date: string
          id: string
          player_id: string | null
          player_name: string
          total_score: number
        }
        Insert: {
          contest_id: string
          created_at?: string
          game_date?: string
          id?: string
          player_id?: string | null
          player_name: string
          total_score: number
        }
        Update: {
          contest_id?: string
          created_at?: string
          game_date?: string
          id?: string
          player_id?: string | null
          player_name?: string
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "contest_scores_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contest_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          admin_notes: string | null
          approval_status: Database["public"]["Enums"]["contest_approval_status"]
          created_at: string
          description: string | null
          duration_minutes: number
          ends_at: string
          id: string
          name: string
          participant_limit: number
          passcode_hash: string
          starts_at: string
          status: string
        }
        Insert: {
          admin_notes?: string | null
          approval_status?: Database["public"]["Enums"]["contest_approval_status"]
          created_at?: string
          description?: string | null
          duration_minutes: number
          ends_at: string
          id?: string
          name: string
          participant_limit?: number
          passcode_hash: string
          starts_at?: string
          status?: string
        }
        Update: {
          admin_notes?: string | null
          approval_status?: Database["public"]["Enums"]["contest_approval_status"]
          created_at?: string
          description?: string | null
          duration_minutes?: number
          ends_at?: string
          id?: string
          name?: string
          participant_limit?: number
          passcode_hash?: string
          starts_at?: string
          status?: string
        }
        Relationships: []
      }
      gameplay_intervals: {
        Row: {
          age_group: string | null
          contest_id: string | null
          country: string | null
          ended_at: string
          id: string
          match_id: string
          player_id: string | null
          player_key: string
          round_completed: boolean
          round_number: number
          seconds: number
          started_at: string
        }
        Insert: {
          age_group?: string | null
          contest_id?: string | null
          country?: string | null
          ended_at: string
          id: string
          match_id: string
          player_id?: string | null
          player_key: string
          round_completed?: boolean
          round_number: number
          seconds: number
          started_at: string
        }
        Update: {
          age_group?: string | null
          contest_id?: string | null
          country?: string | null
          ended_at?: string
          id?: string
          match_id?: string
          player_id?: string | null
          player_key?: string
          round_completed?: boolean
          round_number?: number
          seconds?: number
          started_at?: string
        }
        Relationships: []
      }
      link_clicks: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          owner_id: string | null
          url: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          owner_id?: string | null
          url: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          owner_id?: string | null
          url?: string
        }
        Relationships: []
      }
      overlay_content: {
        Row: {
          content_type: string
          created_at: string
          display_end: string | null
          display_start: string | null
          id: string
          is_active: boolean
          owner_id: string | null
          position: string
          title: string
          updated_at: string
          url: string
        }
        Insert: {
          content_type?: string
          created_at?: string
          display_end?: string | null
          display_start?: string | null
          id?: string
          is_active?: boolean
          owner_id?: string | null
          position?: string
          title?: string
          updated_at?: string
          url: string
        }
        Update: {
          content_type?: string
          created_at?: string
          display_end?: string | null
          display_start?: string | null
          id?: string
          is_active?: boolean
          owner_id?: string | null
          position?: string
          title?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "overlay_content_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          age_group: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          password_hash: string
          username: string
        }
        Insert: {
          age_group?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          password_hash: string
          username: string
        }
        Update: {
          age_group?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          password_hash?: string
          username?: string
        }
        Relationships: []
      }
      scores: {
        Row: {
          analytics_match_id: string | null
          contest_id: string | null
          contest_name: string | null
          created_at: string
          duration_seconds: number | null
          game_date: string
          id: string
          player_id: string | null
          player_name: string
          show_contest: boolean
          total_score: number
        }
        Insert: {
          analytics_match_id?: string | null
          contest_id?: string | null
          contest_name?: string | null
          created_at?: string
          duration_seconds?: number | null
          game_date?: string
          id?: string
          player_id?: string | null
          player_name: string
          show_contest?: boolean
          total_score: number
        }
        Update: {
          analytics_match_id?: string | null
          contest_id?: string | null
          contest_name?: string | null
          created_at?: string
          duration_seconds?: number | null
          game_date?: string
          id?: string
          player_id?: string | null
          player_name?: string
          show_contest?: boolean
          total_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
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
      record_gameplay_interval: {
        Args: {
          p_campaign_ids?: string[]
          p_contest_id: string
          p_ended_at: string
          p_id: string
          p_match_id: string
          p_player_id: string
          p_player_key: string
          p_round: number
          p_round_completed: boolean
          p_started_at: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      contest_approval_status: "pending" | "approved" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
      contest_approval_status: ["pending", "approved", "rejected"],
    },
  },
} as const
