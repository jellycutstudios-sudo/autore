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
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/90 backdrop-blur-md">
        <nav className="page-container flex items-center justify-between h-16">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded bg-black flex items-center justify-center text-white font-extrabold text-xs group-hover:bg-gray-800 transition-colors">
              AR
            </div>
            <span className="font-extrabold text-lg tracking-tight text-black group-hover:text-gray-800 transition-colors">
              AutoRe
            </span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/connect"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm font-semibold text-gray-700 hover:text-black hover:bg-gray-100 transition-all duration-150"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              <span className="hidden xs:inline">Locations</span>
            </Link>
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-sm font-semibold text-gray-550 hover:text-red-650 hover:bg-red-50 transition-all duration-150 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                <span className="hidden xs:inline">Sign out</span>
              </button>
            </form>
          </div>
        </nav>
      </header>

      {/* Page content */}
      <main className="flex-1 page-container py-6 sm:py-8 safe-bottom">
        {children}
      </main>
    </div>
  );
}
