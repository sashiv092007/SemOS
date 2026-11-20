"use client";

/**
 * Class Rooms: one shared space per course. Members join with a 6-letter invite code,
 * share PYQ analyses, notes, mastersheets, links and deadlines, and see each other's
 * workload weather. Row-level security limits everything to the room's members.
 */

import { currentPlan, devotedHours, deadlineOf } from "./plan";
import { supabase } from "./supabase";
import { weatherFromPlan, type AssignmentStatus } from "./weather";

export type Room = { id: string; code: string; name: string; course: string; created_by: string; created_at: string };
export type Member = {
  room_id: string;
  user_id: string;
  display_name: string;
  weather: AssignmentStatus;
  weather_note: string;
  weather_at: string | null;
  joined_at: string;
};
export type ItemKind = "pyq" | "notes" | "mastersheet" | "deadline" | "link" | "post";
export type RoomItem = {
  id: string;
  room_id: string;
  user_id: string;
  author: string;
  kind: ItemKind;
  title: string;
  body: string;
  due_at: string | null;
  created_at: string;
};

const ITEM_COLUMNS = "id, room_id, user_id, author, kind, title, body, due_at, created_at";

function friendly(e: { message?: string; code?: string } | null, fallback: string) {
  if (!e) return fallback;
  const m = e.message ?? "";
  if (/No room has that code/i.test(m)) return "No room has that code. Check the letters and try again.";
  if (/room is full/i.test(m)) return "This room is full.";
  if (/at most 20 rooms/i.test(m)) return "You can create at most 20 rooms.";
  if (/Sign in/i.test(m) || e.code === "28000") return "Sign in first.";
  if (/fetch|network/i.test(m)) return "No connection. Check your internet and try again.";
  return fallback;
}

/** "abcd 23" -> "ABCD23"; null if it cannot be a room code. */
export function normaliseCode(raw: string) {
  const c = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z2-9]{6}$/.test(c) ? c : null;
}

export const inviteLink = (code: string) => `${window.location.origin}/rooms?join=${code}`;

export async function listMyRooms(): Promise<Room[]> {
  const { data, error } = await supabase.from("rooms").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(friendly(error, "Your rooms could not be loaded."));
  return (data ?? []) as Room[];
}

export async function createRoom(name: string, course: string, displayName: string): Promise<Room> {
  const { data, error } = await supabase.rpc("create_room", { p_name: name, p_course: course, p_display_name: displayName });
  if (error || !data) throw new Error(friendly(error, "The room could not be created. Try again."));
  return data as Room;
}

export async function joinRoom(code: string, displayName: string): Promise<string> {
  const { data, error } = await supabase.rpc("join_room", { p_code: code, p_display_name: displayName });
  if (error || !data) throw new Error(friendly(error, "Could not join the room. Try again."));
  return data as string;
}

export async function previewRoom(code: string): Promise<{ name: string; course: string; members: number } | null> {
  const { data, error } = await supabase.rpc("room_preview", { p_code: code });
  if (error) return null;
  return (Array.isArray(data) ? data[0] : data) ?? null;
}

export async function loadRoom(id: string) {
  const [room, members, items] = await Promise.all([
    supabase.from("rooms").select("*").eq("id", id).maybeSingle(),
    supabase.from("room_members").select("*").eq("room_id", id).order("joined_at"),
    supabase.from("room_items").select(ITEM_COLUMNS).eq("room_id", id).order("created_at", { ascending: false }).limit(200),
  ]);
  const err = room.error || members.error || items.error;
  if (err) throw new Error(friendly(err, "This room could not be loaded."));
  if (!room.data) return null; // not a member (or deleted)
  return { room: room.data as Room, members: (members.data ?? []) as Member[], items: (items.data ?? []) as RoomItem[] };
}

export async function postItem(
  roomId: string,
  author: string,
  item: { kind: ItemKind; title: string; body?: string; data?: unknown; due_at?: string | null },
) {
  const { error } = await supabase.from("room_items").insert({
    room_id: roomId,
    author: author.slice(0, 60),
    kind: item.kind,
    title: item.title.trim().slice(0, 200),
    body: (item.body ?? "").trim().slice(0, 2000),
    data: item.data ?? null,
    due_at: item.due_at ?? null,
  });
  if (error) throw new Error(friendly(error, "That could not be shared. Try again."));
}

export async function itemData<T = unknown>(id: string): Promise<T | null> {
  const { data, error } = await supabase.from("room_items").select("data").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data.data as T;
}

export async function deleteItem(id: string) {
  const { error } = await supabase.from("room_items").delete().eq("id", id);
  if (error) throw new Error(friendly(error, "That could not be deleted."));
}

export async function leaveRoom(roomId: string, userId: string) {
  const { error } = await supabase.from("room_members").delete().eq("room_id", roomId).eq("user_id", userId);
  if (error) throw new Error(friendly(error, "Could not leave the room."));
}

export async function deleteRoom(roomId: string) {
  const { error } = await supabase.from("rooms").delete().eq("id", roomId);
  if (error) throw new Error(friendly(error, "Could not delete the room."));
}

export async function renameMe(userId: string, displayName: string) {
  const name = displayName.trim().slice(0, 60);
  if (!name) return;
  await supabase.from("room_members").update({ display_name: name }).eq("user_id", userId);
}

/* ---------- Weather ---------- */

/** This browser's roadmap weather, with a short line for classmates ("3 left · 12h to go"). */
export function myWeather(now = Date.now()) {
  const plan = currentPlan();
  const w = weatherFromPlan(plan, now);
  let note = "No assignments planned";
  if (plan && plan.items.length) {
    const open = plan.items.filter((a) => !a.done);
    const hoursLeft = open.reduce((s, a) => s + Math.max(0, a.hours - devotedHours(a)), 0);
    const days = Math.max(0, Math.ceil((deadlineOf(plan) - now) / 86_400_000));
    note = open.length
      ? `${open.length} assignment${open.length === 1 ? "" : "s"} left · ${Math.round(hoursLeft)}h of work · ${days}d to go`
      : "All assignments done";
  }
  return { status: w.status, reason: w.reason, note };
}

/** Send this browser's weather to every room the student is in. */
export async function syncMyWeather(userId: string) {
  const w = myWeather();
  await supabase
    .from("room_members")
    .update({ weather: w.status, weather_note: w.note.slice(0, 160), weather_at: new Date().toISOString() })
    .eq("user_id", userId);
}
