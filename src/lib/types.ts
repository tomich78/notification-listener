import { Timestamp } from "firebase/firestore";

export interface User {
  uid: string;
  email: string;
  displayName: string;
  plan: "free" | "pro";
  planExpiresAt?: Timestamp | null;
  createdAt: Timestamp;
  publicViewEnabled: boolean;
  publicFilter?: PublicFilter;
}

/**
 * Filtro de visibilidad de la vista pública (lo que ven los empleados).
 * No afecta el panel del dueño, que siempre ve todo.
 *
 * Dos cosas independientes:
 * - `blacklist`: términos que se ocultan a TODOS los empleados (lo personal /
 *   no-ventas). Siempre aplica, incluso a los grupos que "ven todo".
 * - `groups`: cómo ve cada grupo. "full" = ve todo lo no oculto (ej: la caja);
 *   "restricted" = ve solo los clientes de su lista (+ la lista general).
 * - `sharedWhitelist`: clientes que TODOS los grupos restringidos pueden ver,
 *   además de los suyos.
 *
 * Si algún grupo es "restricted", la vista pública abierta se desactiva: solo
 * entra quien tiene contraseña de su grupo.
 */
export interface GroupVisibility {
  visibility: "full" | "restricted";
  /** Clientes propios del grupo. Solo se usa si visibility === "restricted". */
  whitelist?: string[];
}

export interface PublicFilter {
  enabled: boolean;
  blacklist: string[];
  sharedWhitelist?: string[];
  /** branchId → configuración de visibilidad. Si un grupo falta, se asume "full". */
  groups?: Record<string, GroupVisibility>;
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

export interface Branch {
  id: string;
  name: string;
  color: string;
}

/**
 * Configuración de grupos. Se llama "branch" por historia, pero el dueño elige
 * cómo se muestran: sucursales, vendedores, turnos, cajas, etc.
 *
 * IMPORTANTE: este objeto vive en users/{uid} y lo lee cualquiera que abra la
 * vista pública. NO debe contener contraseñas. Los secretos van en la colección
 * privada branchAuth/{uid}, que solo se lee desde el servidor.
 */
export interface BranchConfig {
  enabled: boolean;
  branches: Branch[];
  /** Cómo llamar a los grupos en la interfaz. Por defecto "Sucursal". */
  label?: string;
  /**
   * "shared"   — una contraseña para todos; cualquiera puede marcar a nombre de cualquiera.
   * "perGroup" — una contraseña por grupo; cada uno solo puede marcar lo suyo.
   */
  authMode?: "shared" | "perGroup";
  /** @deprecated Contraseña vieja en texto plano. Se migra a branchAuth al guardar. */
  password?: string;
}

export interface WebhookSource {
  id: string;
  userId: string;
  name: string;
  type: "mercadopago" | "custom";
  secret: string;
  createdAt: Timestamp;
}
