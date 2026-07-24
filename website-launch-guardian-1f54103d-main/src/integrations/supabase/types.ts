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
      addresses: {
        Row: {
          address: string
          code: string | null
          created_at: string
          district: string
          full_name: string
          id: string
          is_default: boolean
          label: string | null
          phone: string
          store_name: string | null
          store_slug: string | null
          thana: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          code?: string | null
          created_at?: string
          district: string
          full_name: string
          id?: string
          is_default?: boolean
          label?: string | null
          phone: string
          store_name?: string | null
          store_slug?: string | null
          thana: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          code?: string | null
          created_at?: string
          district?: string
          full_name?: string
          id?: string
          is_default?: boolean
          label?: string | null
          phone?: string
          store_name?: string | null
          store_slug?: string | null
          thana?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          from_value: string | null
          id: string
          metadata: Json | null
          note: string | null
          to_value: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          from_value?: string | null
          id?: string
          metadata?: Json | null
          note?: string | null
          to_value?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          from_value?: string | null
          id?: string
          metadata?: Json | null
          note?: string | null
          to_value?: string | null
        }
        Relationships: []
      }
      affiliate_clicks: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          landing_path: string | null
          product_id: string | null
          referer: string | null
          user_agent: string | null
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          landing_path?: string | null
          product_id?: string | null
          referer?: string | null
          user_agent?: string | null
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          landing_path?: string | null
          product_id?: string | null
          referer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount: number
          commission_pct: number
          created_at: string
          id: string
          notes: string | null
          order_id: string | null
          order_total: number
          product_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          affiliate_id: string
          amount: number
          commission_pct: number
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          order_total: number
          product_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          commission_pct?: number
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          order_total?: number
          product_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_payouts: {
        Row: {
          admin_notes: string | null
          affiliate_id: string
          amount: number
          created_at: string
          details: string | null
          id: string
          method: string | null
          status: string
          txn_ref: string | null
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          affiliate_id: string
          amount: number
          created_at?: string
          details?: string | null
          id?: string
          method?: string | null
          status?: string
          txn_ref?: string | null
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          affiliate_id?: string
          amount?: number
          created_at?: string
          details?: string | null
          id?: string
          method?: string | null
          status?: string
          txn_ref?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_payouts_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_referrals: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          referred_user_id: string | null
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          referred_user_id?: string | null
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          referred_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_settings: {
        Row: {
          commission_pct: number
          cookie_days: number
          id: number
          is_enabled: boolean
          min_payout: number
          terms: string | null
          updated_at: string
        }
        Insert: {
          commission_pct?: number
          cookie_days?: number
          id?: number
          is_enabled?: boolean
          min_payout?: number
          terms?: string | null
          updated_at?: string
        }
        Update: {
          commission_pct?: number
          cookie_days?: number
          id?: number
          is_enabled?: boolean
          min_payout?: number
          terms?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          code: string
          commission_pct: number | null
          created_at: string
          id: string
          payout_details: string | null
          payout_method: string | null
          status: string
          total_clicks: number
          total_earned: number
          total_orders: number
          total_paid: number
          total_signups: number
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          commission_pct?: number | null
          created_at?: string
          id?: string
          payout_details?: string | null
          payout_method?: string | null
          status?: string
          total_clicks?: number
          total_earned?: number
          total_orders?: number
          total_paid?: number
          total_signups?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          commission_pct?: number | null
          created_at?: string
          id?: string
          payout_details?: string | null
          payout_method?: string | null
          status?: string
          total_clicks?: number
          total_earned?: number
          total_orders?: number
          total_paid?: number
          total_signups?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          props: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          props?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          props?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          active: boolean
          button_label: string
          button_link: string
          created_at: string
          gradient_from: string
          gradient_to: string
          id: string
          image_url: string
          link_url: string
          placement: string
          sort_order: number
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          button_label?: string
          button_link?: string
          created_at?: string
          gradient_from?: string
          gradient_to?: string
          id?: string
          image_url?: string
          link_url?: string
          placement?: string
          sort_order?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          button_label?: string
          button_link?: string
          created_at?: string
          gradient_from?: string
          gradient_to?: string
          id?: string
          image_url?: string
          link_url?: string
          placement?: string
          sort_order?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          min_order: number
          product_ids: string[] | null
          updated_at: string
          usage_limit: number | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          product_ids?: string[] | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          min_order?: number
          product_ids?: string[] | null
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
        }
        Relationships: []
      }
      dropshipper_clicks: {
        Row: {
          created_at: string
          dropshipper_id: string
          id: string
          landing_path: string | null
          product_id: string | null
          referer: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          dropshipper_id: string
          id?: string
          landing_path?: string | null
          product_id?: string | null
          referer?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          dropshipper_id?: string
          id?: string
          landing_path?: string | null
          product_id?: string | null
          referer?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dropshipper_clicks_dropshipper_id_fkey"
            columns: ["dropshipper_id"]
            isOneToOne: false
            referencedRelation: "dropshippers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dropshipper_clicks_dropshipper_id_fkey"
            columns: ["dropshipper_id"]
            isOneToOne: false
            referencedRelation: "dropshippers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      dropshipper_earnings: {
        Row: {
          base_price: number
          created_at: string
          dropshipper_id: string
          id: string
          order_id: string
          product_id: string | null
          profit: number
          qty: number
          retail_price: number
          status: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          dropshipper_id: string
          id?: string
          order_id: string
          product_id?: string | null
          profit?: number
          qty?: number
          retail_price?: number
          status?: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          dropshipper_id?: string
          id?: string
          order_id?: string
          product_id?: string | null
          profit?: number
          qty?: number
          retail_price?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dropshipper_earnings_dropshipper_id_fkey"
            columns: ["dropshipper_id"]
            isOneToOne: false
            referencedRelation: "dropshippers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dropshipper_earnings_dropshipper_id_fkey"
            columns: ["dropshipper_id"]
            isOneToOne: false
            referencedRelation: "dropshippers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dropshipper_earnings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      dropshipper_payouts: {
        Row: {
          account: string
          admin_note: string | null
          amount: number
          created_at: string
          dropshipper_id: string
          id: string
          method: string
          paid_at: string | null
          status: string
          txn_reference: string | null
          updated_at: string
        }
        Insert: {
          account: string
          admin_note?: string | null
          amount: number
          created_at?: string
          dropshipper_id: string
          id?: string
          method: string
          paid_at?: string | null
          status?: string
          txn_reference?: string | null
          updated_at?: string
        }
        Update: {
          account?: string
          admin_note?: string | null
          amount?: number
          created_at?: string
          dropshipper_id?: string
          id?: string
          method?: string
          paid_at?: string | null
          status?: string
          txn_reference?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dropshipper_payouts_dropshipper_id_fkey"
            columns: ["dropshipper_id"]
            isOneToOne: false
            referencedRelation: "dropshippers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dropshipper_payouts_dropshipper_id_fkey"
            columns: ["dropshipper_id"]
            isOneToOne: false
            referencedRelation: "dropshippers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      dropshipper_products: {
        Row: {
          created_at: string
          custom_description: string | null
          custom_title: string | null
          dropshipper_id: string
          id: string
          is_active: boolean
          product_id: string
          retail_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_description?: string | null
          custom_title?: string | null
          dropshipper_id: string
          id?: string
          is_active?: boolean
          product_id: string
          retail_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_description?: string | null
          custom_title?: string | null
          dropshipper_id?: string
          id?: string
          is_active?: boolean
          product_id?: string
          retail_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dropshipper_products_dropshipper_id_fkey"
            columns: ["dropshipper_id"]
            isOneToOne: false
            referencedRelation: "dropshippers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dropshipper_products_dropshipper_id_fkey"
            columns: ["dropshipper_id"]
            isOneToOne: false
            referencedRelation: "dropshippers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dropshipper_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      dropshippers: {
        Row: {
          banner_url: string | null
          bio: string | null
          code: string
          created_at: string
          ga_id: string | null
          id: string
          logo_url: string | null
          notify_email: boolean
          notify_sms: boolean
          payout_method: string
          payout_number: string
          phone: string
          pixel_id: string | null
          rejection_reason: string | null
          status: string
          store_name: string
          store_slug: string
          total_earned: number
          total_orders: number
          total_paid: number
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          banner_url?: string | null
          bio?: string | null
          code: string
          created_at?: string
          ga_id?: string | null
          id?: string
          logo_url?: string | null
          notify_email?: boolean
          notify_sms?: boolean
          payout_method?: string
          payout_number: string
          phone: string
          pixel_id?: string | null
          rejection_reason?: string | null
          status?: string
          store_name: string
          store_slug: string
          total_earned?: number
          total_orders?: number
          total_paid?: number
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          banner_url?: string | null
          bio?: string | null
          code?: string
          created_at?: string
          ga_id?: string | null
          id?: string
          logo_url?: string | null
          notify_email?: boolean
          notify_sms?: boolean
          payout_method?: string
          payout_number?: string
          phone?: string
          pixel_id?: string | null
          rejection_reason?: string | null
          status?: string
          store_name?: string
          store_slug?: string
          total_earned?: number
          total_orders?: number
          total_paid?: number
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      dropshipping_announcements: {
        Row: {
          body_md: string | null
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          starts_at: string | null
          title: string
          tone: string
          updated_at: string
        }
        Insert: {
          body_md?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          title: string
          tone?: string
          updated_at?: string
        }
        Update: {
          body_md?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          title?: string
          tone?: string
          updated_at?: string
        }
        Relationships: []
      }
      dropshipping_settings: {
        Row: {
          allowed_payout_methods: string[]
          auto_approve_apps: boolean
          auto_approve_earnings: boolean
          cookie_days: number
          default_commission_pct: number
          hero_subtitle: string | null
          hero_title: string | null
          id: number
          is_enabled: boolean
          min_payout: number
          terms_md: string | null
          updated_at: string
        }
        Insert: {
          allowed_payout_methods?: string[]
          auto_approve_apps?: boolean
          auto_approve_earnings?: boolean
          cookie_days?: number
          default_commission_pct?: number
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: number
          is_enabled?: boolean
          min_payout?: number
          terms_md?: string | null
          updated_at?: string
        }
        Update: {
          allowed_payout_methods?: string[]
          auto_approve_apps?: boolean
          auto_approve_earnings?: boolean
          cookie_days?: number
          default_commission_pct?: number
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: number
          is_enabled?: boolean
          min_payout?: number
          terms_md?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      order_status_history: {
        Row: {
          created_at: string
          id: string
          note: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          affiliate_code: string | null
          affiliate_id: string | null
          coupon_code: string | null
          courier_name: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivery_fee: number
          discount: number
          district: string | null
          dropshipper_code: string | null
          dropshipper_id: string | null
          id: string
          items: Json
          notes: string | null
          order_number: string
          paid_amount: number | null
          payment_method: string
          payment_type: string | null
          sender_phone: string | null
          status: string
          subtotal: number
          thana: string | null
          total: number
          tracking_number: string | null
          tracking_url: string | null
          txn_id: string | null
          updated_at: string
          user_id: string | null
          vendor_id: string | null
        }
        Insert: {
          address: string
          affiliate_code?: string | null
          affiliate_id?: string | null
          coupon_code?: string | null
          courier_name?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          delivery_fee?: number
          discount?: number
          district?: string | null
          dropshipper_code?: string | null
          dropshipper_id?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_number?: string
          paid_amount?: number | null
          payment_method?: string
          payment_type?: string | null
          sender_phone?: string | null
          status?: string
          subtotal?: number
          thana?: string | null
          total?: number
          tracking_number?: string | null
          tracking_url?: string | null
          txn_id?: string | null
          updated_at?: string
          user_id?: string | null
          vendor_id?: string | null
        }
        Update: {
          address?: string
          affiliate_code?: string | null
          affiliate_id?: string | null
          coupon_code?: string | null
          courier_name?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_fee?: number
          discount?: number
          district?: string | null
          dropshipper_code?: string | null
          dropshipper_id?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_number?: string
          paid_amount?: number | null
          payment_method?: string
          payment_type?: string | null
          sender_phone?: string | null
          status?: string
          subtotal?: number
          thana?: string | null
          total?: number
          tracking_number?: string | null
          tracking_url?: string | null
          txn_id?: string | null
          updated_at?: string
          user_id?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_affiliate_fk"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_dropshipper_id_fkey"
            columns: ["dropshipper_id"]
            isOneToOne: false
            referencedRelation: "dropshippers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_dropshipper_id_fkey"
            columns: ["dropshipper_id"]
            isOneToOne: false
            referencedRelation: "dropshippers_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          identifier: string
          method: string
          new_password_hash: string
          requester_ip: string | null
          requester_ua: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          identifier: string
          method: string
          new_password_hash: string
          requester_ip?: string | null
          requester_ua?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          identifier?: string
          method?: string
          new_password_hash?: string
          requester_ip?: string | null
          requester_ua?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          badge: string | null
          brand: string | null
          category_name: string | null
          category_slug: string | null
          cod_available: boolean | null
          colors: Json | null
          created_at: string
          description: string | null
          discount_percent: number | null
          dropshipper_price: number | null
          dropshipping_enabled: boolean
          free_shipping: boolean | null
          gallery: Json
          id: string
          image: string
          is_active: boolean
          is_featured: boolean
          meta_description: string | null
          meta_title: string | null
          name: string
          offer_ends_at: string | null
          offer_starts_at: string | null
          option_name: string | null
          option_slug: string | null
          original_price: number | null
          price: number
          rating: number
          return_days: number | null
          short_description: string | null
          sizes: Json | null
          sku: string | null
          slug: string
          sold_count: number
          specifications: Json | null
          stock: number
          subcategory_name: string | null
          subcategory_slug: string | null
          tags: string[] | null
          updated_at: string
          variants: Json | null
          vendor_id: string | null
          video_url: string | null
          warranty: string | null
          weight: number | null
        }
        Insert: {
          badge?: string | null
          brand?: string | null
          category_name?: string | null
          category_slug?: string | null
          cod_available?: boolean | null
          colors?: Json | null
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          dropshipper_price?: number | null
          dropshipping_enabled?: boolean
          free_shipping?: boolean | null
          gallery?: Json
          id?: string
          image?: string
          is_active?: boolean
          is_featured?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name: string
          offer_ends_at?: string | null
          offer_starts_at?: string | null
          option_name?: string | null
          option_slug?: string | null
          original_price?: number | null
          price: number
          rating?: number
          return_days?: number | null
          short_description?: string | null
          sizes?: Json | null
          sku?: string | null
          slug: string
          sold_count?: number
          specifications?: Json | null
          stock?: number
          subcategory_name?: string | null
          subcategory_slug?: string | null
          tags?: string[] | null
          updated_at?: string
          variants?: Json | null
          vendor_id?: string | null
          video_url?: string | null
          warranty?: string | null
          weight?: number | null
        }
        Update: {
          badge?: string | null
          brand?: string | null
          category_name?: string | null
          category_slug?: string | null
          cod_available?: boolean | null
          colors?: Json | null
          created_at?: string
          description?: string | null
          discount_percent?: number | null
          dropshipper_price?: number | null
          dropshipping_enabled?: boolean
          free_shipping?: boolean | null
          gallery?: Json
          id?: string
          image?: string
          is_active?: boolean
          is_featured?: boolean
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          offer_ends_at?: string | null
          offer_starts_at?: string | null
          option_name?: string | null
          option_slug?: string | null
          original_price?: number | null
          price?: number
          rating?: number
          return_days?: number | null
          short_description?: string | null
          sizes?: Json | null
          sku?: string | null
          slug?: string
          sold_count?: number
          specifications?: Json | null
          stock?: number
          subcategory_name?: string | null
          subcategory_slug?: string | null
          tags?: string[] | null
          updated_at?: string
          variants?: Json | null
          vendor_id?: string | null
          video_url?: string | null
          warranty?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          full_name: string | null
          gender: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean
          bg_color: string
          button_label: string | null
          created_at: string
          ends_at: string | null
          id: string
          link_url: string | null
          message: string
          placement: string
          sort_order: number
          starts_at: string | null
          text_color: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          bg_color?: string
          button_label?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          link_url?: string | null
          message?: string
          placement?: string
          sort_order?: number
          starts_at?: string | null
          text_color?: string
          title?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          bg_color?: string
          button_label?: string | null
          created_at?: string
          ends_at?: string | null
          id?: string
          link_url?: string | null
          message?: string
          placement?: string
          sort_order?: number
          starts_at?: string | null
          text_color?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_approved: boolean
          product_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: number
          settings: Json
          updated_at: string
        }
        Insert: {
          id?: number
          settings?: Json
          updated_at?: string
        }
        Update: {
          id?: number
          settings?: Json
          updated_at?: string
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
      vendor_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string | null
          period_end: string | null
          period_start: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_payouts_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          address: string | null
          agreed_terms: boolean
          alt_phone: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_branch: string | null
          bank_name: string | null
          bank_routing: string | null
          banner_url: string | null
          business_type: string | null
          city: string | null
          commission_pct: number
          country: string | null
          created_at: string
          date_of_birth: string | null
          description: string | null
          district: string | null
          email: string | null
          expected_products: number | null
          facebook: string | null
          footer: Json
          full_name: string | null
          id: string
          instagram: string | null
          logo_url: string | null
          main_category: string | null
          mobile_banking_number: string | null
          mobile_banking_type: string | null
          nid_back_url: string | null
          nid_front_url: string | null
          nid_number: string | null
          phone: string | null
          postal_code: string | null
          rejection_reason: string | null
          slug: string
          status: string
          store_name: string
          thana: string | null
          tin_number: string | null
          total_orders: number
          total_sales: number
          trade_license: string | null
          updated_at: string
          user_id: string
          vat_number: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          address?: string | null
          agreed_terms?: boolean
          alt_phone?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_routing?: string | null
          banner_url?: string | null
          business_type?: string | null
          city?: string | null
          commission_pct?: number
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          description?: string | null
          district?: string | null
          email?: string | null
          expected_products?: number | null
          facebook?: string | null
          footer?: Json
          full_name?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          main_category?: string | null
          mobile_banking_number?: string | null
          mobile_banking_type?: string | null
          nid_back_url?: string | null
          nid_front_url?: string | null
          nid_number?: string | null
          phone?: string | null
          postal_code?: string | null
          rejection_reason?: string | null
          slug: string
          status?: string
          store_name: string
          thana?: string | null
          tin_number?: string | null
          total_orders?: number
          total_sales?: number
          trade_license?: string | null
          updated_at?: string
          user_id: string
          vat_number?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string | null
          agreed_terms?: boolean
          alt_phone?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_branch?: string | null
          bank_name?: string | null
          bank_routing?: string | null
          banner_url?: string | null
          business_type?: string | null
          city?: string | null
          commission_pct?: number
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          description?: string | null
          district?: string | null
          email?: string | null
          expected_products?: number | null
          facebook?: string | null
          footer?: Json
          full_name?: string | null
          id?: string
          instagram?: string | null
          logo_url?: string | null
          main_category?: string | null
          mobile_banking_number?: string | null
          mobile_banking_type?: string | null
          nid_back_url?: string | null
          nid_front_url?: string | null
          nid_number?: string | null
          phone?: string | null
          postal_code?: string | null
          rejection_reason?: string | null
          slug?: string
          status?: string
          store_name?: string
          thana?: string | null
          tin_number?: string | null
          total_orders?: number
          total_sales?: number
          trade_license?: string | null
          updated_at?: string
          user_id?: string
          vat_number?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      affiliate_settings_public: {
        Row: {
          commission_pct: number | null
          cookie_days: number | null
          id: number | null
          is_enabled: boolean | null
        }
        Insert: {
          commission_pct?: number | null
          cookie_days?: number | null
          id?: number | null
          is_enabled?: boolean | null
        }
        Update: {
          commission_pct?: number | null
          cookie_days?: number | null
          id?: number | null
          is_enabled?: boolean | null
        }
        Relationships: []
      }
      dropshippers_public: {
        Row: {
          banner_url: string | null
          bio: string | null
          code: string | null
          id: string | null
          logo_url: string | null
          status: string | null
          store_name: string | null
          store_slug: string | null
        }
        Insert: {
          banner_url?: string | null
          bio?: string | null
          code?: string | null
          id?: string | null
          logo_url?: string | null
          status?: string | null
          store_name?: string | null
          store_slug?: string | null
        }
        Update: {
          banner_url?: string | null
          bio?: string | null
          code?: string | null
          id?: string | null
          logo_url?: string | null
          status?: string | null
          store_name?: string | null
          store_slug?: string | null
        }
        Relationships: []
      }
      site_settings_public: {
        Row: {
          id: number | null
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          id?: number | null
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          id?: number | null
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_get_user_email: { Args: { _user_id: string }; Returns: string }
      get_my_vendor_id: { Args: never; Returns: string }
      get_public_vendor: {
        Args: { _slug: string }
        Returns: {
          address: string
          banner_url: string
          commission_pct: number
          created_at: string
          description: string
          footer: Json
          id: string
          logo_url: string
          phone: string
          slug: string
          status: string
          store_name: string
          total_orders: number
          total_sales: number
          updated_at: string
          user_id: string
        }[]
      }
      get_public_vendor_by_id: {
        Args: { _id: string }
        Returns: {
          address: string
          banner_url: string
          commission_pct: number
          created_at: string
          description: string
          footer: Json
          id: string
          logo_url: string
          phone: string
          slug: string
          status: string
          store_name: string
          total_orders: number
          total_sales: number
          updated_at: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      lookup_order: {
        Args: { _order_number: string; _phone: string }
        Returns: {
          address: string
          affiliate_code: string | null
          affiliate_id: string | null
          coupon_code: string | null
          courier_name: string | null
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivery_fee: number
          discount: number
          district: string | null
          dropshipper_code: string | null
          dropshipper_id: string | null
          id: string
          items: Json
          notes: string | null
          order_number: string
          paid_amount: number | null
          payment_method: string
          payment_type: string | null
          sender_phone: string | null
          status: string
          subtotal: number
          thana: string | null
          total: number
          tracking_number: string | null
          tracking_url: string | null
          txn_id: string | null
          updated_at: string
          user_id: string | null
          vendor_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      place_order: {
        Args: { _payload: Json }
        Returns: {
          id: string
          order_number: string
        }[]
      }
      validate_coupon: {
        Args: { _code: string; _items?: Json; _subtotal: number }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user" | "vendor" | "dropshipper"
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
      app_role: ["admin", "user", "vendor", "dropshipper"],
    },
  },
} as const
