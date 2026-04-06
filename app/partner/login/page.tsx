// Replace ONLY the handleLogin function (find it by "async function handleLogin"):

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    clearStaleSupabaseLocks();
    try {
      const signInPromise = supabase.auth.signInWithPassword({ email: email.trim(), password });
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Login timed out. Please try again.")), 30000)
      );
      const { error: signInError } = await Promise.race([signInPromise, timeoutPromise]);
      if (signInError) throw signInError;

      // Check if admin
      let nextRole = "partner";
      try {
        const meRes = await fetch("/api/admin/me", { cache: "no-store", credentials: "include" });
        if (meRes.ok) { const meJson = await safeJson(meRes); nextRole = meJson?.role || "partner"; }
      } catch { nextRole = "partner"; }

      if (nextRole === "admin" || nextRole === "super_admin") {
        router.replace("/admin/approvals");
        router.refresh();
        return;
      }

      // Check if partner is already live — if so skip onboarding
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: app } = await supabase
            .from("partner_applications")
            .select("status")
            .eq("email", email.trim().toLowerCase())
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const status = String(app?.status || "").toLowerCase();
          if (status === "live") {
            router.replace("/partner/dashboard");
            router.refresh();
            return;
          }
        }
      } catch { /* fall through to onboarding */ }

      // Non-live partners go to onboarding
      router.replace("/partner/onboarding");
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Login failed. Please try again.");
      setLoading(false);
    }
  }