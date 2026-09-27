import type { SupabaseClient } from "@supabase/supabase-js";
import type { PropertyRepository } from "../../domain/repositories/PropertyRepository";
import type { SearchQuery } from "../../domain/models";
import { array, parseProperty, parseSearchRow } from "../mappers/catalog";
export class SupabasePropertyRepository implements PropertyRepository {
  constructor(private readonly client: SupabaseClient) {}
  async search(q: SearchQuery) {
    const { data, error } = await this.client.rpc("search_properties", {
      q: q.text,
      period_unit: q.durationUnit,
      period_value: q.durationValue,
      gender: q.gender,
      min_price: q.minPrice,
      max_price: q.maxPrice,
      min_rating: q.minRating,
      room_facilities: q.roomFacilities,
      property_facilities: q.propertyFacilities,
      ref_lat: q.reference?.latitude ?? null,
      ref_lon: q.reference?.longitude ?? null,
      max_distance: q.maxDistance,
      sort_by: q.sort,
      page_number: q.page,
    });
    if (error) throw new Error(`Katalog gagal dimuat: ${error.message}`);
    return array(data, parseSearchRow);
  }
  async get(id: string) {
    const { data, error } = await this.client
      .from("property_catalog")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? parseProperty(data) : null;
  }
}
