import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

interface GoogleConnection {
  id: string;
  google_account_id: string;
  token_expires_at: string;
}

interface Location {
  id: string;
  business_name: string;
  address: string | null;
  auto_reply_enabled: boolean;
}

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const params = await searchParams;

  const { data: connections } = await supabase
    .from("google_connections")
    .select("id, google_account_id, token_expires_at")
    .eq("user_id", user!.id);

  const { data: locations } = await supabase
    .from("locations")
    .select("id, business_name, address, auto_reply_enabled")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const hasConnection = (connections?.length ?? 0) > 0;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-black transition-colors mb-3"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-black tracking-tight text-black">
          Connected Locations
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your Google Business Profile connection and auto-reply status.
        </p>
      </div>

      {/* Alerts */}
      {params.success === "true" && (
        <div className="alert alert-success" role="alert">
          <svg className="w-5 h-5 text-black shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Google Business Profile connected successfully!</span>
        </div>
      )}
      {params.error && (
        <div className="alert alert-error" role="alert">
          <svg className="w-5 h-5 text-red-650 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span>Connection failed: {params.error.replace(/_/g, " ")}</span>
        </div>
      )}

      {/* Connect Google card */}
      <div className="card">
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-11 h-11 bg-gray-100 border border-gray-200 rounded flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-black">
              <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0L12 2.65l7.5 6.7m-9 11.65v-6a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v6" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm text-black">Google Business Profile</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {hasConnection
                ? `${connections!.length} account${connections!.length !== 1 ? "s" : ""} connected`
                : "Not connected yet"}
            </p>
          </div>
        </div>
        <Link
          href="/api/auth/google-business"
          className={`btn btn-block ${hasConnection ? "btn-outline text-xs h-10 min-h-0" : "btn-primary h-11"}`}
        >
          {hasConnection ? "Re-connect / Add Account" : "Connect Google Account"}
        </Link>
      </div>

      {/* Location list */}
      {(locations as Location[] | null)?.length ? (
        <div className="space-y-3.5">
          <h2 className="font-extrabold text-xs text-gray-450 uppercase tracking-wider">
            Your Locations
          </h2>
          <div className="space-y-3">
            {(locations as Location[]).map((loc) => (
              <div key={loc.id} className="card flex items-start gap-4 p-4">
                <div className="w-9 h-9 rounded bg-gray-100 border border-gray-250 flex items-center justify-center shrink-0">
                  <svg className="w-4.5 h-4.5 text-black" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-sm text-black leading-tight">
                        {loc.business_name}
                      </p>
                      {loc.address && (
                        <p className="text-xs text-gray-500 mt-1 leading-normal">{loc.address}</p>
                      )}
                    </div>
                    <span
                      className={`badge shrink-0 text-[10px] ${
                        loc.auto_reply_enabled ? "badge-success" : "badge-outline"
                      }`}
                    >
                      {loc.auto_reply_enabled ? "Auto ON" : "Auto OFF"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : hasConnection ? (
        <div className="alert alert-info text-xs">
          <svg className="w-5 h-5 text-black shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <div>
            <p className="font-bold mb-0.5">Locations syncing…</p>
            <p className="text-gray-600 leading-normal">
              Your connected profile locations will appear here after the first sync completes (typically within a few minutes).
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
