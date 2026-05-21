import { Header } from "@/components/Header";
import { AuthForm } from "@/components/auth/AuthForm";

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-base)] px-4 py-10 text-[var(--text-primary)] sm:px-6 lg:px-8 lg:py-14">
        <div className="mx-auto max-w-2xl">
          <AuthForm mode="login" />
        </div>
      </main>
    </>
  );
}
