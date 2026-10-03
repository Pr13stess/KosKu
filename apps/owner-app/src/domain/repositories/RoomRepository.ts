import { Inventory, Room } from "../models";
export interface RoomRepository {
  list(propertyId: string): Promise<Room[]>;
  save(room: Room): Promise<string>;
  updateInventory(id: string, input: Inventory, reason: string): Promise<void>;
}
