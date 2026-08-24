const REQUIRED_VARS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

export function FirebaseSetupNotice() {
  return (
    <div className="w-full max-w-lg rounded-3xl border-2 border-amber-400 bg-white/90 p-8 shadow-2xl shadow-black/50 backdrop-blur">
      <h1 className="text-2xl font-black tracking-tight text-amber-600">
        Connect Firebase first
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-sky-700">
        Copy <code className="rounded bg-bubble px-1.5 py-0.5 font-mono text-xs">.env.local.example</code>{" "}
        to <code className="rounded bg-bubble px-1.5 py-0.5 font-mono text-xs">.env.local</code>, paste
        your Firebase web app config, then restart <code className="font-mono text-xs">npm run dev</code>.
      </p>
      <ul className="mt-5 space-y-1.5 font-mono text-xs text-sky-600">
        {REQUIRED_VARS.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      <p className="mt-5 text-xs text-sky-600">
        In the Firebase console, enable <strong>Authentication &rarr; Google</strong> and create a{" "}
        <strong>Cloud Firestore</strong> database.
      </p>
    </div>
  );
}
