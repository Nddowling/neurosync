import { base44 } from "@/api/base44Client";

// Best-effort persistence to the clinical database (Supabase via backend function).
// Returns the saved note id, or null when the clinical database is unavailable
// (e.g. backend functions restricted on the current plan) so callers can
// degrade gracefully instead of losing the generated note.
export async function saveClinicalNoteContent(fields) {
  try {
    const res = await base44.functions.invoke("supabase", {
      action: "insert",
      table: "patient_notes",
      data: fields,
    });
    return res?.data?.data?.[0]?.id || null;
  } catch (e) {
    console.warn("Clinical database unavailable — note content not persisted:", e?.response?.status || e);
    return null;
  }
}

// Fetches the full clinical content for a saved note, or null when unavailable.
export async function fetchClinicalNoteContent(noteId) {
  try {
    const res = await base44.functions.invoke("supabase", {
      action: "select",
      table: "patient_notes",
      query: { id: noteId },
    });
    return res?.data?.data?.[0] || null;
  } catch (e) {
    console.warn("Clinical database unavailable — note content could not be loaded:", e?.response?.status || e);
    return null;
  }
}