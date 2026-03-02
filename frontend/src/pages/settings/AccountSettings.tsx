import SettingsLayout from "@/components/settings-layout";
import { AccountView } from "@daveyplate/better-auth-ui";
import { useParams } from "react-router-dom";

export default function AccountSettings() {
  const { pathname } = useParams();

  return (
    <SettingsLayout>
      <AccountView pathname={pathname} hideNav />
    </SettingsLayout>
  );
}
