// Status contracts from revision 2.0. No booking/payment executors in this commit.
export type UserRole = "USER" | "OWNER" | "ADMIN";
export type AccountStatus = "ACTIVE" | "SUSPENDED" | "DELETED";
export type VerificationStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
export type PublicationStatus =
  "DRAFT" | "ACTIVE" | "INACTIVE" | "SUSPENDED" | "ARCHIVED";
export type GenderType = "MALE" | "FEMALE" | "MIXED";
export type BathroomType = "PRIVATE" | "SHARED";
export type FacilityCategory = "PROPERTY" | "ROOM";
export type DurationUnit = "DAY" | "WEEK" | "MONTH" | "YEAR";
export type AmountType = "NONE" | "FIXED" | "PERCENTAGE";
export type BookingStatus =
  | "DRAFT"
  | "HELD"
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "ACTIVE"
  | "COMPLETED"
  | "CANCELLED";
export type BookingCancelReason =
  | "USER_CANCELLED"
  | "PAYMENT_FAILED"
  | "PAYMENT_EXPIRED"
  | "HOLD_EXPIRED"
  | "OWNER_EXCEPTION"
  | "ADMIN_CANCELLED"
  | "LATE_PAYMENT"
  | "OTHER";
export type AllocationKind = "HOLD" | "RESERVED";
export type PaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "REFUNDED";
export type PaymentProvider = "MIDTRANS_SANDBOX";
export type RefundStatus = "PENDING" | "SUCCESS" | "FAILED";
export type PayoutStatus = "PENDING" | "SIMULATED_PAID" | "CANCELLED";
export type MediaType = "IMAGE";
export type MessageType = "TEXT" | "IMAGE" | "CALL_EVENT";
export type CallType = "VOICE" | "VIDEO";
export type CallStatus =
  | "RINGING"
  | "CONNECTED"
  | "COMPLETED"
  | "MISSED"
  | "DECLINED"
  | "CANCELLED"
  | "FAILED";
export type ModerationStatus = "PENDING" | "APPROVED" | "HIDDEN" | "REJECTED";
export type RestrictionReason = "SPAM" | "BAD_BEHAVIOR" | "OTHER";
export type RestrictionStatus = "ACTIVE" | "REVOKED";
export type VerificationTarget = "OWNER" | "PROPERTY";
export type ReportTarget = "PROPERTY" | "USER" | "MESSAGE" | "REVIEW";
export type ReportCategory =
  | "FALSE_INFORMATION"
  | "WRONG_ADDRESS"
  | "FRAUD"
  | "SPAM"
  | "HARASSMENT"
  | "OTHER";
export type ReportStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "REJECTED";
export type DevicePlatform = "ANDROID" | "IOS" | "WEB";
export type AppKind = "USER_APP" | "OWNER_APP" | "ADMIN_WEB";
export type PolicyType = "PRIVACY_POLICY" | "TERMS_AND_CONDITIONS";
export type DeletionStatus =
  | "REQUESTED"
  | "NEEDS_RESOLUTION"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED_RETRYABLE";
