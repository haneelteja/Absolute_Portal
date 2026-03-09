export default async function handler(req: any, res: any) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const token = process.env.SUPABASE_ACTIVITY_TOKEN;
  if (token) {
    const provided = req.headers["x-ping-secret"] || req.query?.token;
    if (provided !== token) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({
      ok: false,
      error: "Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY",
    });
  }

  const tables = ["customers", "profiles", "user_management"];
  let lastError = "No table ping attempted";

  for (const table of tables) {
    try {
      const url = `${supabaseUrl}/rest/v1/${table}?select=id&limit=1`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      });

      if (response.ok) {
        res.setHeader("Cache-Control", "no-store");
        if (req.method === "HEAD") {
          return res.status(200).end();
        }
        return res.status(200).json({
          ok: true,
          table,
          timestamp: new Date().toISOString(),
        });
      }

      if (response.status === 404) {
        lastError = `Table ${table} not found`;
        continue;
      }

      lastError = `Supabase responded ${response.status} for table ${table}`;
    } catch (error: any) {
      lastError = error?.message || `Failed pinging table ${table}`;
    }
  }

  return res.status(502).json({
    ok: false,
    error: lastError,
    timestamp: new Date().toISOString(),
  });
}
