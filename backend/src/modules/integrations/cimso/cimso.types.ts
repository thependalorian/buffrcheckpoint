/**
 * CiMSO INNterchange types — from package INNterchange_Specifications_3_June_2026_a.
 * Transport is TCP binary framing + JSON payloads (not REST).
 * See docs/cimso-innterchange/NDA_PACKAGE_NOTES.md.
 */

/** Registration interface-type IDs (CiMSO developer form). */
export const CIMSO_INTERFACE_TYPES = {
  CUSTOMER_DATA_PLATFORM: 1,
  CUSTOMER_SATISFACTION: 2,
  LODGING_RESERVATIONS: 3,
  FRONT_DESK_SERVICES: 4,
  HOUSEKEEPING: 5,
  WORKSHOP: 6,
  RESTAURANT_BAR: 7,
  GOLF_T_BOOKINGS: 8,
  ACTIVITY_SCHEDULING: 9,
  STAFF_TASKS: 10,
  BUSINESS_INTELLIGENCE: 11,
} as const;

export type CimsoInterfaceTypeId =
  (typeof CIMSO_INTERFACE_TYPES)[keyof typeof CIMSO_INTERFACE_TYPES];

/** Beachhead interface types for hospitality PMS (registration 1+3+4). */
export const CIMSO_HOSPITALITY_DEFAULT_TYPES: CimsoInterfaceTypeId[] = [
  CIMSO_INTERFACE_TYPES.CUSTOMER_DATA_PLATFORM,
  CIMSO_INTERFACE_TYPES.LODGING_RESERVATIONS,
  CIMSO_INTERFACE_TYPES.FRONT_DESK_SERVICES,
];

/** Wire protocol message type IDs (spec § Message Types). */
export const CIMSO_MESSAGE_TYPE = {
  ERROR: 1,
  WARNING: 2,
  KEEPALIVE: 3,
  SERVER_HANDSHAKE: 4,
  CLIENT_HANDSHAKE: 5,
  GET_BOOKINGS_REQUEST: 1101,
  GET_BOOKINGS_RESPONSE: 1102,
  GET_BOOKING_REQUEST: 1103,
  GET_BOOKING_RESPONSE: 1104,
  SET_BOOKING_REQUEST: 1105,
  SET_BOOKING_RESPONSE: 1106,
  SET_BOOKING_STATUS_REQUEST: 1107,
  SET_BOOKING_STATUS_RESPONSE: 1108,
  GET_BOOKING_ROOM_LIST_REQUEST: 1115,
  GET_BOOKING_ROOM_LIST_RESPONSE: 1116,
  GET_CLIENT_REQUEST: 2001,
  GET_CLIENT_RESPONSE: 2002,
  SET_CLIENT_REQUEST: 2003,
  SET_CLIENT_RESPONSE: 2004,
  GET_CLIENTS_REQUEST: 2019,
  GET_CLIENTS_RESPONSE: 2020,
} as const;

/** Booking Status enumeration (spec Enumerations). */
export const CIMSO_BOOKING_STATUS = {
  QUOTE: "Q",
  QUOTE_REJECTED: "E",
  WAITING_LIST: "W",
  INTERNET: "I",
  PROVISIONAL: "P",
  CONFIRMED: "C",
  DEPOSIT_PAID: "D",
  FULLY_PAID: "U",
  ACTIVE: "A",
  LEFT: "L",
  NO_SHOW: "N",
  FAULTY: "F",
  CANCELLED: "X",
  CLOSED: "O",
  RESTRICTED: "R",
} as const;

export type CimsoBookingStatusCode =
  (typeof CIMSO_BOOKING_STATUS)[keyof typeof CIMSO_BOOKING_STATUS];

/** Statuses from which Set Booking Status may request check-in (→ Active). */
export const CIMSO_CHECK_IN_ALLOWED_FROM: readonly CimsoBookingStatusCode[] = [
  CIMSO_BOOKING_STATUS.INTERNET,
  CIMSO_BOOKING_STATUS.PROVISIONAL,
  CIMSO_BOOKING_STATUS.CONFIRMED,
  CIMSO_BOOKING_STATUS.DEPOSIT_PAID,
  CIMSO_BOOKING_STATUS.FULLY_PAID,
];

export const CIMSO_HEADER_SIZE_BYTES = 32;
export const CIMSO_PROTOCOL_VERSION = 1;

export type CimsoConnectionStatusCode =
  | "not_configured"
  | "awaiting_nda_package"
  | "awaiting_property_credentials"
  | "configured"
  | "sync_error";

export interface CimsoConnectionStatus {
  provider: "cimso_innterchange";
  statusCode: CimsoConnectionStatusCode;
  enabledInterfaceTypes: CimsoInterfaceTypeId[];
  /** True when host+port+login are set (TCP ready to attempt). */
  transportConfigured: boolean;
  lastSyncAt: string | null;
  lastErrorCode: string | null;
  /** True until property credentials + live handshake succeed. */
  afterNdaRequired: boolean;
  notes: string;
}

/** Opaque reservation reference mapped from Get Booking(s) JSON. */
export interface CimsoReservationRef {
  externalReservationId: string;
  siteExternalId?: string;
  arrivalDate?: string;
  departureDate?: string;
  guestDisplayName?: string;
  roomCode?: string;
  bookingStatus?: CimsoBookingStatusCode | string;
  raw?: unknown;
}

/** Front-desk event — typically Set Booking Status (1107). */
export interface CimsoFrontDeskEvent {
  externalEventId: string;
  eventType: "check_in" | "check_out" | "unknown";
  externalReservationId?: string;
  occurredAt?: string;
  bookingStatus?: CimsoBookingStatusCode | string;
  raw?: unknown;
}
