import type { PricingRepository } from "../../domain/repositories/PricingRepository";
import { mockRooms } from "./fixtures";
export class MockPricingRepository implements PricingRepository {
  async listByRoom(id: string) {
    return mockRooms.find((r) => r.id === id)?.plans ?? [];
  }
}
