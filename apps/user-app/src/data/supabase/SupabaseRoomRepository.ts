import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoomRepository } from "../../domain/repositories/RoomRepository";
import { array, parseRoom } from "../mappers/catalog";
export class SupabaseRoomRepository implements RoomRepository {
  constructor(private readonly client: SupabaseClient) {}
  async listByProperty(id: string) {
    const { data, error } = await this.client
      .from("room_catalog")
      .select("*")
      .eq("property_id", id)
      .order("available", { ascending: false })
      .order("id");
    if (error) throw new Error(error.message);
    return array(data, parseRoom);
  }
}
