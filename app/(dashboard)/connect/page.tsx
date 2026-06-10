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
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-xs text-gray-500 hover:text-black transition-colors mb-3 inline-block"
        >
          ← Back to dashboard
        </Link>
        <h1 className="text-2xl font-black tracking-tight text-black">
          Connected Locations
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your Google Business Profile connections.
        </p>
      </div>

      {/* Alerts */}
      {params.success === "true" && (
        <div className="alert alert-success mb-4">
          ✓ Google Business Profile connected successfully!
        </div>
      )}
      {params.error && (
        <div className="alert alert-error mb-4">
          Connection failed: {params.error.replace(/_/g, " ")}
        </div>
      )}

      {/* Connect Google button */}
      <div className="card mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm text-black">Google Business Profile</p>
            <p className="text-xs text-gray-500">
              {hasConnection
                ? `${connections!.length} account${connections!.length !== 1 ? "s" : ""} connected`
                : "Not connected yet"}
            </p>
          </div>
        </div>
        <Link
          href="/api/auth/google-business"
          className="btn btn-outline btn-block"
        >
          {hasConnection ? "Re-connect / Add account" : "Connect Google Account"}
        </Link>
      </div>

      {/* Location list */}
      {(locations as Location[] | null)?.length ? (
        <div>
          <h2 className="font-bold text-base mb-3 text-black">
            Your Locations
          </h2>
          <div className="space-y-3">
            {(locations as Location[]).map((loc) => (
              <div key={loc.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-sm text-black">
                      {loc.business_name}
                    </p>
                    {loc.address && (
                      <p className="text-xs text-gray-500 mt-0.5">{loc.address}</p>
                    )}
                  </div>
                  <span
                    className={`badge shrink-0 ${
                      loc.auto_reply_enabled ? "badge-success" : "badge-outline"
                    }`}
                  >
                    {loc.auto_reply_enabled ? "Auto ON" : "Auto OFF"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : hasConnection ? (
        <div className="alert alert-info text-sm">
          <p className="font-semibold mb-1">Locations loading…</p>
          <p className="text-xs text-gray-600">
            Your locations will appear here after the first sync (up to 1 hour).
          </p>
        </div>
      ) : null}
    </div>
  );
}
