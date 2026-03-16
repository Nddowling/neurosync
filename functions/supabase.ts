import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function supabaseQuery(method, path, body = null) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": method === "POST" ? "return=representation" : "return=representation",
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

    let result;

    switch (action) {
      case "select": {
        // v2 - query = { column: value, ... } for filtering
        let path = `${table}?select=*`;
        if (query) {
          for (const [key, val] of Object.entries(query)) {
            path += `&${key}=eq.${encodeURIComponent(val)}`;
          }
        }
        result = await supabaseQuery("GET", path);
        break;
      }

      case "insert": {
        result = await supabaseQuery("POST", table, data);
        break;
      }

      case "update": {
        // query = { id: "..." } to identify the row
        let path = `${table}?`;
        for (const [key, val] of Object.entries(query)) {
          path += `${key}=eq.${encodeURIComponent(val)}&`;
        }
        result = await supabaseQuery("PATCH", path, data);
        break;
      }

      case "delete": {
        let path = `${table}?`;
        for (const [key, val] of Object.entries(query)) {
          path += `${key}=eq.${encodeURIComponent(val)}&`;
        }
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