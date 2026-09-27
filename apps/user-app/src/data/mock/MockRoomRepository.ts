import type { RoomRepository } from "../../domain/repositories/RoomRepository";
import { mockRooms } from "./fixtures";
export class MockRoomRepository implements RoomRepository {
  async listByProperty(id: string) {
    return mockRooms
      .filter((r) => r.property_id === id)
      .sort((a, b) => b.available - a.available || a.id.localeCompare(b.id));
  }
}
