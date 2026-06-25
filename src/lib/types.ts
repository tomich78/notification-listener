import { Timestamp } from "firebase/firestore";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  plan: "free" | "pro";
  planExpiresAt?: Timestamp | null;
  createdAt: Timestamp;
  publicViewEnabled: boolean;
}

export interface Device {
  id: string;
  userId: string;
  name: string;
  token: string;
  lastSeen: Timestamp | null;
  active: boolean;
  createdAt: Timestamp;
}

export interface Notification {
  id: string;
  userId: string;
  deviceId: string | null;
  deviceName: string | null;
  source: "android" | "mercadopago" | "webhook" | "manual";
  app: string;
  text: string;
  amount: number | null;
  timestamp: Timestamp;
  branchId: string | null;
}

export interface BranchConfig {
  enabled: boolean;
  password: string;
  branches: { id: string; name: string; color: string }[];
}

export interface WebhookSource {
  id: string;
  userId: string;
  name: string;
  type: "mercadopago" | "custom";
  secret: string;
  createdAt: Timestamp;
}
