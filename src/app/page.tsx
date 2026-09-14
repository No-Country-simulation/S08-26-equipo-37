import { DesktopCommandCenter } from "./_components/desktop-command-center";
import { MobileCommandCenter } from "./_components/mobile-command-center";

export default function Home() {
  return (
    <>
      <DesktopCommandCenter />
      <MobileCommandCenter />
    </>
  );
}
