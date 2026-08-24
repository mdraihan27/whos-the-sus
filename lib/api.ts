import { getFirebaseAuth } from "@/lib/firebase";

/**
 * Calls one of our route handlers with the caller's Firebase ID token attached.
 * Every game mutation goes through the server, so the words and the imposter
 * list never reach a document the players can read.
 */
export async function callApi<T = unknown>(
  path: "/api/groups" | "/api/game",
  body: Record<string, unknown>,
): Promise<T> {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("You are signed out.");

  const token = await user.getIdToken();

  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;

  if (!response.ok) {
    throw new Error(payload.error ?? "Something went wrong.");
  }

  return payload;
}

/** Route handlers return plain strings; this keeps the UI messages tidy. */
export function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
