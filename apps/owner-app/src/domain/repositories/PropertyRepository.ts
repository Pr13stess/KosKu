import { Dashboard, Property, PropertyInput, Review } from "../models";
export interface PropertyRepository {
  dashboard(): Promise<Dashboard>;
  list(): Promise<Property[]>;
  save(input: PropertyInput): Promise<string>;
  submitVerification(id: string, evidence: string): Promise<void>;
  reviews(propertyId: string): Promise<Review[]>;
}
