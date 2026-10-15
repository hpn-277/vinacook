
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "customers": {
                  Row: {
                    "created_at": string,"default_address": string | null,"default_district": string | null,"id": number,"name": string,"phone": string,"sale_id": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"default_address"?: string | null,"default_district"?: string | null,"id"?: never,"name": string,"phone": string,"sale_id"?: number | null
                  }
                  Update: {
                    "created_at"?: string,"default_address"?: string | null,"default_district"?: string | null,"id"?: never,"name"?: string,"phone"?: string,"sale_id"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "customers_default_district_fkey"
      columns: ["default_district"]
isOneToOne: false
      referencedRelation: "districts"
      referencedColumns: ["name"]
    },{
      foreignKeyName: "customers_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"districts": {
                  Row: {
                    "name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "name": string
                  }
                  Update: {
                    "name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"factories": {
                  Row: {
                    "active": boolean,"address": string | null,"capacity_kg_per_day": number,"id": number,"name": string,"phone": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"address"?: string | null,"capacity_kg_per_day": number,"id"?: never,"name": string,"phone"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"address"?: string | null,"capacity_kg_per_day"?: number,"id"?: never,"name"?: string,"phone"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"order_items": {
                  Row: {
                    "id": number,"kg_per_unit": number,"line_total": number,"order_id": number,"pack_id": number,"pack_name": string,"pack_qty": number,"price_per_kg": number,"product_id": number,"qty_kg": number,"wholesale_price_per_kg": number
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: never,"kg_per_unit": number,"line_total": number,"order_id": number,"pack_id": number,"pack_name": string,"pack_qty": number,"price_per_kg": number,"product_id": number,"qty_kg"?: never,"wholesale_price_per_kg": number
                  }
                  Update: {
                    "id"?: never,"kg_per_unit"?: number,"line_total"?: number,"order_id"?: number,"pack_id"?: number,"pack_name"?: string,"pack_qty"?: number,"price_per_kg"?: number,"product_id"?: number,"qty_kg"?: never,"wholesale_price_per_kg"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "order_items_order_id_fkey"
      columns: ["order_id"]
isOneToOne: false
      referencedRelation: "orders"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "order_items_pack_fkey"
      columns: ["pack_id","product_id"]
isOneToOne: false
      referencedRelation: "product_packs"
      referencedColumns: ["id","product_id"]
    },{
      foreignKeyName: "order_items_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"orders": {
                  Row: {
                    "address": string,"code": string,"created_at": string,"created_by": Database["public"]['Enums']["order_creator"],"created_by_staff_id": number | null,"customer_id": number,"delivered_at": string | null,"district": string,"driver_id": number | null,"fail_reason": string | null,"id": number,"note": string | null,"payment_status": Database["public"]['Enums']["payment_status"],"phone": string,"price_tier": Database["public"]['Enums']["price_tier"],"production_date": string,"retail_markup_pct": number,"sale_id": number | null,"status": Database["public"]['Enums']["order_status"],"total": number,"wholesale_min_kg": number,"wholesale_min_total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "address": string,"code"?: string,"created_at"?: string,"created_by": Database["public"]['Enums']["order_creator"],"created_by_staff_id"?: number | null,"customer_id": number,"delivered_at"?: string | null,"district": string,"driver_id"?: number | null,"fail_reason"?: string | null,"id"?: never,"note"?: string | null,"payment_status"?: Database["public"]['Enums']["payment_status"],"phone": string,"price_tier": Database["public"]['Enums']["price_tier"],"production_date": string,"retail_markup_pct": number,"sale_id"?: number | null,"status"?: Database["public"]['Enums']["order_status"],"total": number,"wholesale_min_kg": number,"wholesale_min_total": number
                  }
                  Update: {
                    "address"?: string,"code"?: string,"created_at"?: string,"created_by"?: Database["public"]['Enums']["order_creator"],"created_by_staff_id"?: number | null,"customer_id"?: number,"delivered_at"?: string | null,"district"?: string,"driver_id"?: number | null,"fail_reason"?: string | null,"id"?: never,"note"?: string | null,"payment_status"?: Database["public"]['Enums']["payment_status"],"phone"?: string,"price_tier"?: Database["public"]['Enums']["price_tier"],"production_date"?: string,"retail_markup_pct"?: number,"sale_id"?: number | null,"status"?: Database["public"]['Enums']["order_status"],"total"?: number,"wholesale_min_kg"?: number,"wholesale_min_total"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "orders_created_by_staff_id_fkey"
      columns: ["created_by_staff_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_customer_id_fkey"
      columns: ["customer_id"]
isOneToOne: false
      referencedRelation: "customers"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_district_fkey"
      columns: ["district"]
isOneToOne: false
      referencedRelation: "districts"
      referencedColumns: ["name"]
    },{
      foreignKeyName: "orders_driver_id_fkey"
      columns: ["driver_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "orders_sale_id_fkey"
      columns: ["sale_id"]
isOneToOne: false
      referencedRelation: "staff"
      referencedColumns: ["id"]
    }
                  ]
                },"product_packs": {
                  Row: {
                    "active": boolean,"id": number,"kg_per_unit": number,"name": string,"product_id": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"id"?: never,"kg_per_unit": number,"name": string,"product_id": number
                  }
                  Update: {
                    "active"?: boolean,"id"?: never,"kg_per_unit"?: number,"name"?: string,"product_id"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "product_packs_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    }
                  ]
                },"production_days": {
                  Row: {
                    "closed_at": string | null,"date": string,"status": Database["public"]['Enums']["day_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "closed_at"?: string | null,"date": string,"status"?: Database["public"]['Enums']["day_status"]
                  }
                  Update: {
                    "closed_at"?: string | null,"date"?: string,"status"?: Database["public"]['Enums']["day_status"]
                  }
                  Relationships: [
                    
                  ]
                },"production_jobs": {
                  Row: {
                    "created_at": string,"date": string,"factory_id": number,"id": number,"product_id": number,"qty_kg": number,"received_kg": number | null,"rejected_reason": string | null,"replaced_by": number | null,"status": Database["public"]['Enums']["job_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"date": string,"factory_id": number,"id"?: never,"product_id": number,"qty_kg": number,"received_kg"?: number | null,"rejected_reason"?: string | null,"replaced_by"?: number | null,"status"?: Database["public"]['Enums']["job_status"],"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"date"?: string,"factory_id"?: number,"id"?: never,"product_id"?: number,"qty_kg"?: number,"received_kg"?: number | null,"rejected_reason"?: string | null,"replaced_by"?: number | null,"status"?: Database["public"]['Enums']["job_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "production_jobs_date_fkey"
      columns: ["date"]
isOneToOne: false
      referencedRelation: "production_days"
      referencedColumns: ["date"]
    },{
      foreignKeyName: "production_jobs_factory_id_fkey"
      columns: ["factory_id"]
isOneToOne: false
      referencedRelation: "factories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "production_jobs_product_id_fkey"
      columns: ["product_id"]
isOneToOne: false
      referencedRelation: "products"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "production_jobs_replaced_by_fkey"
      columns: ["replaced_by"]
isOneToOne: false
      referencedRelation: "production_jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"products": {
                  Row: {
                    "active": boolean,"id": number,"image_url": string | null,"name": string,"price_per_kg": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"id"?: never,"image_url"?: string | null,"name": string,"price_per_kg": number
                  }
                  Update: {
                    "active"?: boolean,"id"?: never,"image_url"?: string | null,"name"?: string,"price_per_kg"?: number
                  }
                  Relationships: [
                    
                  ]
                },"settings": {
                  Row: {
                    "cutoff_time": string,"id": boolean,"retail_markup_pct": number,"timezone": string,"wholesale_min_kg": number,"wholesale_min_total": number
                  }
                  ComputedFields: never
                  Insert: {
                    "cutoff_time"?: string,"id"?: boolean,"retail_markup_pct"?: number,"timezone"?: string,"wholesale_min_kg"?: number,"wholesale_min_total"?: number
                  }
                  Update: {
                    "cutoff_time"?: string,"id"?: boolean,"retail_markup_pct"?: number,"timezone"?: string,"wholesale_min_kg"?: number,"wholesale_min_total"?: number
                  }
                  Relationships: [
                    
                  ]
                },"staff": {
                  Row: {
                    "active": boolean,"auth_user_id": string,"commission_pct": number | null,"factory_id": number | null,"id": number,"name": string,"phone": string | null,"ref_code": string | null,"role": Database["public"]['Enums']["staff_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"auth_user_id": string,"commission_pct"?: number | null,"factory_id"?: number | null,"id"?: never,"name": string,"phone"?: string | null,"ref_code"?: string | null,"role": Database["public"]['Enums']["staff_role"]
                  }
                  Update: {
                    "active"?: boolean,"auth_user_id"?: string,"commission_pct"?: number | null,"factory_id"?: number | null,"id"?: never,"name"?: string,"phone"?: string | null,"ref_code"?: string | null,"role"?: Database["public"]['Enums']["staff_role"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "staff_factory_id_fkey"
      columns: ["factory_id"]
isOneToOne: false
      referencedRelation: "factories"
      referencedColumns: ["id"]
    }
                  ]
                },"status_transitions": {
                  Row: {
                    "from_status": string,"machine": string,"to_status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "from_status": string,"machine": string,"to_status": string
                  }
                  Update: {
                    "from_status"?: string,"machine"?: string,"to_status"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "close_production_day":
{ Args: { "p_alloc": Json,"p_date": string }; Returns: undefined
                           },
"commission_report":
{ Args: { "p_month": string }; Returns: {
              "commission": number,"commission_pct": number,"delivered_count": number,"delivered_total": number,"name": string,"ref_code": string,"sale_id": number
            }[]
                           },
"daily_overview":
{ Args: { "p_from": string,"p_to": string }; Returns: {
              "cancelled": number,"day": string,"kg": number,"orders": number,"paid": number,"revenue": number,"unpaid": number
            }[]
                           },
"place_order":
{ Args: { "p_address": string,"p_claim_sale_id"?: number,"p_created_by": Database["public"]['Enums']["order_creator"],"p_created_by_staff_id"?: number,"p_district": string,"p_items": Json,"p_name": string,"p_note": string,"p_phone": string,"p_price_tier": Database["public"]['Enums']["price_tier"],"p_production_date": string,"p_retail_markup_pct": number,"p_wholesale_min_kg": number,"p_wholesale_min_total": number }; Returns: Json
                           },
"reassign_job":
{ Args: { "p_factory_id": number,"p_job_id": number }; Returns: number
                           },
"receive_day":
{ Args: { "p_date": string }; Returns: number
                           },
"recompute_order_total":
{ Args: { "p_order_id": number }; Returns: undefined
                           }
          }
          Enums: {
            "day_status": "open"|"closed","job_status": "assigned"|"accepted"|"rejected"|"shipped"|"received","order_creator": "customer"|"sale"|"manager","order_status": "placed"|"approved"|"in_production"|"ready"|"assigned"|"delivered"|"failed"|"cancelled","payment_status": "unpaid"|"paid","price_tier": "si"|"le","staff_role": "manager"|"sale"|"factory"|"driver"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "day_status": ["open", "closed"],"job_status": ["assigned", "accepted", "rejected", "shipped", "received"],"order_creator": ["customer", "sale", "manager"],"order_status": ["placed", "approved", "in_production", "ready", "assigned", "delivered", "failed", "cancelled"],"payment_status": ["unpaid", "paid"],"price_tier": ["si", "le"],"staff_role": ["manager", "sale", "factory", "driver"]
          }
        }
} as const
