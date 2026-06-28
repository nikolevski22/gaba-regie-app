import Link from "next/link";
import { auth, signOut } from "@/auth";
import { AdminMenu } from "@/components/AdminMenu";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="bg-gaba px-3 py-1 font-bold text-white">
              GA BA
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/dashboard" className="text-neutral-700 hover:text-gaba">
                Rapporte
              </Link>
              <Link href="/statistik" className="text-neutral-700 hover:text-gaba">
                Auswertungen
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-neutral-500">
            <AdminMenu />
            <span className="hidden sm:inline">{session?.user?.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button className="rounded border px-2 py-1 hover:bg-neutral-50">
                Abmelden
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
