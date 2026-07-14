import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const ALLOWED_TABLES = [
  "patients",
  "patient_notes",
  "patient_appointments",
  "patient_billing",
  "patient_goals",
  "patient_medications",
  "patient_sessions",
];

// Strip keys with empty-string values so empty date/numeric form fields don't fail Postgres casts
function stripEmptyStrings(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v !== "") out[k] = v;
  }
  return out;
}

async function supabaseQuery(method, path, body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
    },
    body: body ? JSON.stringify(body) : null,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase error ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { action, table, data, query } = await req.json();

    if (!ALLOWED_TABLES.includes(table)) {
      return Response.json({ error: `Table not allowed: ${table}` }, { status: 403 });
    }

    let result;

    switch (action) {
      case "select": {
        let path = `${table}?select=*`;
        const q = { ...(query || {}) };
        delete q.user_id;
        for (const [key, val] of Object.entries(q)) {
          path += `&${key}=eq.${encodeURIComponent(val)}`;
        }
        path += `&user_id=eq.${encodeURIComponent(user.id)}`;
        result = await supabaseQuery("GET", path);
        break;
      }

      case "insert": {
        // Stamp user_id server-side; ignore any client-supplied user_id
        const payload = Array.isArray(data)
          ? data.map((row) => ({ ...stripEmptyStrings(row), user_id: user.id }))
          : { ...stripEmptyStrings(data), user_id: user.id };
        result = await supabaseQuery("POST", table, payload);
        break;
      }

      case "update": {
        if (!query?.id) {
          return Response.json({ error: "Update requires an id in query" }, { status: 400 });
        }
        let path = `${table}?`;
        const q = { ...query };
        delete q.user_id;
        for (const [key, val] of Object.entries(q)) {
          path += `${key}=eq.${encodeURIComponent(val)}&`;
        }
        path += `user_id=eq.${encodeURIComponent(user.id)}`;
        result = await supabaseQuery("PATCH", path, stripEmptyStrings(data));
        break;
      }

      case "delete": {
        if (!query?.id) {
          return Response.json({ error: "Delete requires an id in query" }, { status: 400 });
        }
        let path = `${table}?`;
        const q = { ...query };
        delete q.user_id;
        for (const [key, val] of Object.entries(q)) {
          path += `${key}=eq.${encodeURIComponent(val)}&`;
        }
        path += `user_id=eq.${encodeURIComponent(user.id)}`;
        result = await supabaseQuery("DELETE", path);
        break;
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return Response.json({ data: result });
  } catch (error) {
    console.error("Supabase function error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});