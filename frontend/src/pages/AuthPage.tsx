import { AuthView } from "@daveyplate/better-auth-ui";
import { useParams, useSearchParams } from "react-router-dom";

export default function AuthPage() {
  const { pathname } = useParams();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? undefined;

  return (
    <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      <AuthView pathname={pathname} redirectTo={redirectTo} />
    </main>
  );
}
