# admin-create-rep patch (deployed 2026-10-06)

Replaced:
    const { data: existingByEmail } = await supabaseAdmin.auth.admin.listUsers();
    const dupEmail = (existingByEmail?.users || []).find(...)
    if (dupEmail) return json({ error: "A user with that email already exists" }, 409);
(listUsers() returns only the first 50 users, so duplicates were missed past 50.)

With:
    - exact-match lookup on profiles.email (lowercased)
    - createUser error handling: email_exists / 422 / "already registered" -> 409
Auth enforces email uniqueness, so createUser is the authoritative check.
Rep-number rule (6-12 digits) intentionally unchanged.
