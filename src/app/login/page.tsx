import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  async function login(formData: FormData) {
    "use server";
    const callbackUrl = (formData.get("callbackUrl") as string) || "/dashboard";
    try {
      await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirectTo: callbackUrl,
      });
    } catch (error) {
      if (error instanceof AuthError) {
        redirect(`/login?error=1`);
      }
      throw error;
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        action={login}
        className="w-full max-w-sm space-y-5 rounded-xl border bg-white p-8 shadow-sm"
      >
        <div className="space-y-1 text-center">
          <div className="mx-auto mb-2 inline-block bg-gaba px-4 py-2 text-xl font-bold tracking-wide text-white">
            GA BA
          </div>
          <h1 className="text-lg font-semibold">Regieberichte</h1>
          <p className="text-sm text-neutral-500">Gandola &amp; Battaini AG</p>
        </div>

        <LoginField name="email" type="email" label="E-Mail" autoComplete="username" />
        <LoginField
          name="password"
          type="password"
          label="Passwort"
          autoComplete="current-password"
        />

        <ErrorBanner searchParams={searchParams} />
        <CallbackField searchParams={searchParams} />

        <button
          type="submit"
          className="w-full rounded-md bg-gaba py-2 font-medium text-white hover:bg-gaba-dark"
        >
          Anmelden
        </button>
      </form>
    </main>
  );
}

function LoginField(props: {
  name: string;
  type: string;
  label: string;
  autoComplete?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{props.label}</span>
      <input
        name={props.name}
        type={props.type}
        autoComplete={props.autoComplete}
        required
        className="w-full rounded-md border px-3 py-2 outline-none focus:border-gaba focus:ring-1 focus:ring-gaba"
      />
    </label>
  );
}

async function ErrorBanner({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  if (!error) return null;
  return (
    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      E-Mail oder Passwort ist falsch.
    </p>
  );
}

async function CallbackField({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  return <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/dashboard"} />;
}
