import catalog from "./catalog.json";
import { array, parseProperty, parseRoom } from "../mappers/catalog";
export const mockProperties = array(catalog.properties, parseProperty);
export const mockRooms = array(catalog.rooms, parseRoom);
