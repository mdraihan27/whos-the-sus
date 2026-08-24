import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const ADMIN_APP = "whos-the-sus-admin";

function loadCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!raw) {
    throw new HttpError(
      503,
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Download a service account key from " +
        "Firebase console -> Project settings -> Service accounts, and paste the JSON " +
        "into .env.local as a single line.",
    );
  }

  let parsed: { project_id?: string; client_email?: string; private_key?: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(
      503,
      "FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON. It must be the whole service " +
        "account file on one line, wrapped in single quotes.",
    );
  }

  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new HttpError(
      503,
      "FIREBASE_SERVICE_ACCOUNT_KEY is missing project_id, client_email or private_key.",
    );
  }

  return cert({
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    // .env files keep newlines escaped, so restore them before use.
    privateKey: parsed.private_key.replace(/\n/g, "\n"),
  });
}

function adminApp(): App {
  const existing = getApps().find((app) => app.name === ADMIN_APP);
  if (existing) return existing;

  return initializeApp({ credential: loadCredential() }, ADMIN_APP);
}

export function adminDb(): Firestore {
  return getFirestore(adminApp());
}

/** Verifies the caller's Firebase ID token and returns their uid. */
export async function requireUid(request: Request): Promise<string> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";

  if (!token) throw new HttpError(401, "Not signed in.");

  // Built outside the try on purpose: a bad service account key must not be
  // reported to the player as an expired session.
  const auth = getAuth(adminApp());

  try {
    const decoded = await auth.verifyIdToken(token);
    return decoded.uid;
  } catch {
    throw new HttpError(401, "Your session expired. Refresh and try again.");
  }
}

/** Turns thrown HttpErrors into JSON responses and hides anything unexpected. */
export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error("[api]", error);
  return Response.json({ error: "Something went wrong." }, { status: 500 });
}
