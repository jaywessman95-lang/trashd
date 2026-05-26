export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      leads: {
        Row: {
          id: string;
          raw_listing_id: string | null;
          source: string;
          title: string;
          description: string | null;
          city: string | null;
          state: string | null;
          url: string;
          price: string | null;
          image_count: number;
          event_start: string | null;
          event_end: string | null;
          posted_at: string | null;
          score: number;
          priority: string;
          job_size: string;
          lead_type: string;
          ai_reason: string | null;
          scoring_version: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["leads"]["Row"]> & {
          source: string;
          title: string;
          url: string;
        };
        Update: Partial<Database["public"]["Tables"]["leads"]["Row"]>;
        Relationships: [];
      };
      raw_listings: {
        Row: {
          id: string;
          source: string;
          source_listing_id: string | null;
          url: string;
          raw_data: Json;
          content_hash: string | null;
          scrape_run_id: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["raw_listings"]["Row"]> & {
          source: string;
          url: string;
        };
        Update: Partial<Database["public"]["Tables"]["raw_listings"]["Row"]>;
        Relationships: [];
      };
      scrape_runs: {
        Row: {
          id: string;
          source: string;
          status: string;
          started_at: string;
          finished_at: string | null;
          listings_found: number;
          error_message: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["scrape_runs"]["Row"]> & {
          source: string;
        };
        Update: Partial<Database["public"]["Tables"]["scrape_runs"]["Row"]>;
        Relationships: [];
      };
      user_settings: {
        Row: {
          user_id: string;
          cities: string[];
          radius: number;
          min_score: number;
          min_job_size: string;
          enabled_sources: string[];
          urgency_preference: string;
          lead_types: string[];
          included_keywords: string[];
          excluded_keywords: string[];
          max_leads_per_day: number;
          scrape_coverage: string;
          max_listings_per_source: number | null;
          max_pages_per_source: number | null;
          lookback_hours: number | null;
          scanning_enabled: boolean;
          instant_alert_threshold: number;
          hide_duplicates: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["user_settings"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Row"]>;
        Relationships: [];
      };
      lead_actions: {
        Row: {
          id: string;
          user_id: string;
          lead_id: string;
          contacted: boolean;
          booked: boolean;
          dismissed: boolean;
          not_a_fit: boolean;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["lead_actions"]["Row"]> & {
          user_id: string;
          lead_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["lead_actions"]["Row"]>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]> & {
          user_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["subscriptions"]["Row"]>;
        Relationships: [];
      };
      alerts: {
        Row: {
          id: string;
          user_id: string;
          lead_id: string | null;
          alert_type: string;
          status: string;
          subject: string | null;
          body: string | null;
          sent_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["alerts"]["Row"]> & {
          user_id: string;
          alert_type: string;
        };
        Update: Partial<Database["public"]["Tables"]["alerts"]["Row"]>;
        Relationships: [];
      };
      realtor_contacts: {
        Row: {
          id: string;
          name: string | null;
          phone: string | null;
          email: string | null;
          brokerage: string | null;
          profile_url: string | null;
          source: string;
          scraped_at: string;
          created_at: string;
          image_url: string | null;
          ai_bio: string | null;
          profile_status: string;
          onboarding_email_sent_at: string | null;
          verification_token: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["realtor_contacts"]["Row"]> & {
          id: string;
          source: string;
        };
        Update: Partial<Database["public"]["Tables"]["realtor_contacts"]["Row"]>;
        Relationships: [];
      };
      realtor_sold_listings: {
        Row: {
          id: string;
          address: string;
          city: string;
          state: string;
          zip: string | null;
          sale_price: number;
          sold_date: string;
          property_type: string;
          sale_type: string;
          cash_sale: boolean;
          score: number;
          priority: string;
          score_reason: string | null;
          listing_url: string | null;
          source: string;
          agent_name: string | null;
          agent_phone: string | null;
          agent_email: string | null;
          agent_brokerage: string | null;
          agent_image_url: string | null;
          agent_ai_bio: string | null;
          agent_profile_status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["realtor_sold_listings"]["Row"]> & {
          id: string;
          address: string;
          city: string;
          sale_price: number;
          sold_date: string;
          source: string;
        };
        Update: Partial<Database["public"]["Tables"]["realtor_sold_listings"]["Row"]>;
        Relationships: [];
      };
      service_operators: {
        Row: {
          id: string;
          name: string | null;
          company: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          city: string | null;
          state: string;
          zip: string | null;
          service_type: string;
          website_url: string | null;
          source: string;
          score: number;
          priority: string;
          profile_status: string;
          ai_bio: string | null;
          image_url: string | null;
          outreach_sent_at: string | null;
          verification_token: string | null;
          scraped_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["service_operators"]["Row"]> & {
          id: string;
          source: string;
        };
        Update: Partial<Database["public"]["Tables"]["service_operators"]["Row"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
