import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";

/**
 * Lecturas de sesión compartidas dentro de UNA misma petición (React cache()).
 * El layout del panel y la página piden lo mismo; con esto la ida y vuelta a
 * Supabase se hace una sola vez en vez de repetirse.
 */

/** Un solo cliente de Supabase por petición. */
export const getSupabase = cache(() => createClient());

/**
 * Usuario verificado por el servidor de Auth (red). Es la comprobación fuerte:
 * úsala para decidir acceso, mostrar datos de otra persona o escribir.
 */
export const getVerifiedUser = cache(async () => {
  const supabase = await getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Identidad mínima a partir de los claims del JWT, con la firma verificada
 * localmente (getClaims). Sin ida y vuelta a Auth cuando el proyecto firma con
 * llaves asimétricas; si no, getClaims cae solo a getUser. Solo para LEER datos
 * del propio usuario: las políticas RLS validan el mismo JWT en cada consulta.
 */
export const getClaimsUser = cache(async () => {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

export type OrganizerProfile = Pick<Profile, "organizer_name" | "mp_connected">;

/** Perfil del productor (una consulta por petición aunque lo pidan layout y página). */
export const getOrganizerProfile = cache(async (userId: string) => {
  const supabase = await getSupabase();
  const { data } = await supabase
    .from("profiles")
    .select("organizer_name, mp_connected")
    .eq("id", userId)
    .single<OrganizerProfile>();
  return data;
});
