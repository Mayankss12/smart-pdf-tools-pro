import { redirect } from "next/navigation";

import { Header } from "@/components/Header";
import { DocumentWorkspaceClient } from "@/components/workspace/DocumentWorkspaceClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) redirect("/login?next=/dashboard");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const displayName =
    typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : user.email?.split("@")[0] ?? "My";

  return (
    <>
      <Header />
      <DocumentWorkspaceClient displayName={displayName} />
    </>
  );
}
