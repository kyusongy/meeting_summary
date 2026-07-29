/**
 * The API routes return a human-readable `error` on every failure path.
 * Surfacing it beats the generic "request failed" the UI used to show.
 */
async function unwrap(res: Response) {
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Signed out");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || `Something went wrong (${res.status}).`);
  }
  return res.json();
}

export async function postForm(url: string, form: FormData) {
  return unwrap(await fetch(url, { method: "POST", body: form }));
}

export async function postJson(url: string, body: unknown) {
  return unwrap(
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}
