import type { Plan } from "../models";
export interface PricingRepository {
  listByRoom(roomId: string): Promise<Plan[]>;
}
