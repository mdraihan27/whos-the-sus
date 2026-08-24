import { AppGate } from "@/components/app-gate";
import { GroupsHome } from "@/components/groups-home";

export default function Home() {
  return (
    <AppGate>
      <GroupsHome />
    </AppGate>
  );
}
