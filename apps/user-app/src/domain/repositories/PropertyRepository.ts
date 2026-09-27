import type { Listing, Property, SearchQuery } from "../models";
export interface PropertyRepository {
  search(query: SearchQuery): Promise<Listing[]>;
  get(id: string): Promise<Property | null>;
}
