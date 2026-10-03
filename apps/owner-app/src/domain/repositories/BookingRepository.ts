import { Booking, Finance } from "../models";
export interface BookingRepository {
  list(): Promise<Booking[]>;
  transition(
    id: string,
    action: "checkin" | "checkout",
    reason: string,
  ): Promise<void>;
  requestCancellation(id: string, reason: string): Promise<void>;
  finance(): Promise<Finance>;
}
