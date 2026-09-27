import type { Room } from "../models";
export interface RoomRepository {
  listByProperty(propertyId: string): Promise<Room[]>;
}
