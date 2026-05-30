import { Timestamp } from "firebase/firestore";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  plan: "free" | "pro";
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
  source: "android" | "mercadopago" | "webhook";
  app: string;
  text: string;
  amount: number | null;
  timestamp: Timestamp;
}

export interface WebhookSource {
  id: string;
  userId: string;
  name: string;
  type: "mercadopago" | "custom";
  secret: string;
  createdAt: Timestamp;
}
