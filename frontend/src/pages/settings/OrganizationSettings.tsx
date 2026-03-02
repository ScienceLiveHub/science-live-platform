import { authClient } from "@/lib/auth-client";
import {
  OrganizationMembersCard,
  OrganizationSettingsCards,
} from "@daveyplate/better-auth-ui";

export default function OrganizationSettings() {
  const { data: org } = authClient.useActiveOrganization();
  return (
    <main className="container mx-auto flex grow flex-col gap-3 self-center p-4 md:p-6 md:max-w-300">
      <div className="flex-col gap-4 flex-wrap">
        <h1 className="mb-10 text-xl text-muted-foreground font-black">
          ORGANIZATION SETTINGS
        </h1>
        <h1 className="text-2xl font-bold mb-8">{org?.name}</h1>
      </div>

      <OrganizationSettingsCards />
      <OrganizationMembersCard />
    </main>
  );
}
