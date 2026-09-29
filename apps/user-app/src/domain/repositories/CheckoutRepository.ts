import type { Checkout } from "../models";
export interface CheckoutRepository {
  /** Holds one unit and opens a payment session. Safe to repeat. */
  start(planId: string): Promise<{ bookingId: string }>;
  /** Server truth: status, hold deadline and server clock. */
  get(bookingId: string): Promise<Checkout>;
  cancel(bookingId: string): Promise<void>;
  /** Mock mode only: stands in for the Xendit test-mode simulator. */
  simulatePayment?(bookingId: string): Promise<void>;
}
