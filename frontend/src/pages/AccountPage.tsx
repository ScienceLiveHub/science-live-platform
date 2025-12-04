import { AccountView } from "@daveyplate/better-auth-ui";
import { useParams } from "react-router-dom";

export default function AccountPage() {
  const { pathname } = useParams();

  return (
    <main className="container mx-auto flex grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6 md:max-w-300">
      <AccountView pathname={pathname} />
    </main>
  );
}
