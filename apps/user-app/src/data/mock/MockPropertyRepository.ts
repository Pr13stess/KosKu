import type { PropertyRepository } from "../../domain/repositories/PropertyRepository";
import type { SearchQuery } from "../../domain/models";
import { searchCatalog } from "../../domain/search";
import { mockProperties, mockRooms } from "./fixtures";
export class MockPropertyRepository implements PropertyRepository {
  async search(query: SearchQuery) {
    return searchCatalog(mockProperties, mockRooms, query);
  }
  async get(id: string) {
    return mockProperties.find((p) => p.id === id) ?? null;
  }
}
