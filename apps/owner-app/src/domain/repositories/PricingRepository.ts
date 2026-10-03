import { Plan } from "../models";
export interface PricingRepository {
  list(roomId: string): Promise<Plan[]>;
  save(input: Plan): Promise<void>;
}
