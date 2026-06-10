import { redirect } from "next/navigation";

// Root route → always redirect to login
export default function RootPage() {
  redirect("/login");
}
