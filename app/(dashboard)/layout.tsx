import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <nav className="page-container flex items-center justify-between h-14">
          <Link
            href="/dashboard"
            className="font-black text-lg tracking-tight text-black"
          >
            AutoRe
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/connect"
              className="btn btn-ghost text-sm py-2 px-3 min-h-0 h-9"
            >
              Locations
            </Link>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="btn btn-ghost text-sm py-2 px-3 min-h-0 h-9 text-gray-500"
              >
                Sign out
              </button>
            </form>
          </div>
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1 page-container py-6 safe-bottom">
        {children}
      </main>
    </div>
  );
}
