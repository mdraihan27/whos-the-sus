import { errorResponse, requireUid } from "@/lib/firebase-admin";
import { runGameAction } from "@/lib/game-engine";

export async function POST(request: Request) {
  try {
    const uid = await requireUid(request);
    const body = (await request.json()) as Record<string, unknown>;

    return Response.json(await runGameAction(uid, body));
  } catch (error) {
    return errorResponse(error);
  }
}
