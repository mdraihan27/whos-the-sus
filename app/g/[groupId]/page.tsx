import { AppGate } from "@/components/app-gate";
import { GroupRoom } from "@/components/group-room";

export default async function GroupPage(props: PageProps<"/g/[groupId]">) {
  const { groupId } = await props.params;

  return (
    <AppGate>
      <GroupRoom groupId={groupId} />
    </AppGate>
  );
}
