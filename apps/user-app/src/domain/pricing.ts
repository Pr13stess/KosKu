import type { Plan } from "./models";
export function summarizeCost(plan: Plan) {
  return {
    rent: plan.price,
    downPayment: plan.down_payment,
    deposit: plan.security_deposit,
    payNow: plan.down_payment + plan.security_deposit,
    remainingRent: plan.price - plan.down_payment,
    total: plan.price + plan.security_deposit,
  };
}
