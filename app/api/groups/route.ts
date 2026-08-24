import { errorResponse, requireUid } from "@/lib/firebase-admin";
import { runGroupAction } from "@/lib/groups-engine";

export async function POST(request: Request) {
  try {
    const uid = await requireUid(request);
    const body = (await request.json()) as Record<string, unknown>;

    return Response.json(await runGroupAction(uid, body));
  } catch (error) {
    return errorResponse(error);
  }
}
