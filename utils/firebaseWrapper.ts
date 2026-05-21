import {
  get as fbGet,
  push as fbPush,
  ref as fbRef,
  remove as fbRemove,
  set as fbSet,
  update as fbUpdate,
  query as fbQuery,
  orderByChild as fbOrderByChild,
  equalTo as fbEqualTo,
  DataSnapshot,
  DatabaseReference,
  Query,
} from "firebase/database";
import { auditoriaService } from "../services/auditoriaService";

export const ref = fbRef;
export const query = fbQuery;
export const orderByChild = fbOrderByChild;
export const equalTo = fbEqualTo;

function getPath(queryRef: any): string {
  try {
    return queryRef.toString().replace(/.*\/\/[^\/]+\//, "");
  } catch (e) {
    return "desconocido";
  }
}

export async function get(query: Query): Promise<DataSnapshot> {
  const path = getPath(query);
  auditoriaService.registrarAcceso("Firebase", "CONSULTA", `Nodo: ${path}`);
  return fbGet(query);
}

export function push(query: DatabaseReference, value?: any) {
  const path = getPath(query);
  if (value !== undefined) {
    auditoriaService.registrarAcceso("Firebase", "INSERCION", `Nodo: ${path}`);
  }
  return fbPush(query, value);
}

export async function set(query: DatabaseReference, value: any): Promise<void> {
  const path = getPath(query);
  auditoriaService.registrarAcceso("Firebase", "INSERCION", `Nodo: ${path}`);
  return fbSet(query, value);
}

export async function update(query: DatabaseReference, values: object): Promise<void> {
  const path = getPath(query);
  auditoriaService.registrarAcceso("Firebase", "MODIFICACION", `Nodo: ${path}`);
  return fbUpdate(query, values);
}

export async function remove(query: DatabaseReference): Promise<void> {
  const path = getPath(query);
  auditoriaService.registrarAcceso("Firebase", "ELIMINACION", `Nodo: ${path}`);
  return fbRemove(query);
}
