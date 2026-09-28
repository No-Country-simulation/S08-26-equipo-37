import { DesktopCommandCenter } from "./_components/desktop-command-center";
import { MobileCommandCenter } from "./_components/mobile-command-center";
import { UserMenu } from "./_components/user-menu";
import { requireAuthenticatedUser } from "@/modules/identity/auth";
import { getDashboardReadModel } from "@/modules/maintenance/read-model";

export default async function Home() {
  const actor = await requireAuthenticatedUser();
  const data = await getDashboardReadModel(actor);
  return (
    <>
      <DesktopCommandCenter data={data} userMenu={<UserMenu />} />
      <MobileCommandCenter data={data} key={actor.id} userMenu={<UserMenu />} />
    </>
  );
}
