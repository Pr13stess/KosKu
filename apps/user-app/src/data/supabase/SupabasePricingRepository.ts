import type { SupabaseClient } from "@supabase/supabase-js";
import type { PricingRepository } from "../../domain/repositories/PricingRepository";
import { array, parsePlan } from "../mappers/catalog";
export class SupabasePricingRepository implements PricingRepository {
  constructor(private readonly client: SupabaseClient) {}
  async listByRoom(id: string) {
    const { data, error } = await this.client
      .from("plan_catalog")
      .select("*")
      .eq("room_type_id", id)
      .order("price")
      .order("id");
    if (error) throw new Error(error.message);
    return array(data, parsePlan);
  }
}
