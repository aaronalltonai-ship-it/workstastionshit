type User = { slug: string; name: string; passcode: string };

function env(value: string | undefined) {
  return value ? value.trim() : "";
}

const users: User[] = [
  {
    slug: "cody-rose",
    name: "Cody Rose",
    passcode: env(process.env.PASSCODE_CODY),
  },
  {
    slug: "aaron-allton",
    name: "Aaron Allton (iLL)",
    passcode: env(process.env.PASSCODE_ILL),
  },
].filter((u) => u.passcode.length > 0);

const secret = env(process.env.PASSCODE_SECRET) || "set-a-strong-passcode-secret";

export async function hashPasscode(passcode: string) {
  const data = new TextEncoder().encode(passcode + secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function validatePasscode(
  passcode: string,
): Promise<{ slug: string; name: string; token: string } | null> {
  const user = users.find((u) => u.passcode === passcode.trim());
  if (!user) return null;
  const token = `${user.slug}:${await hashPasscode(passcode)}`;
  return { slug: user.slug, name: user.name, token };
}

export async function parseSession(cookieValue: string | undefined) {
  if (!cookieValue) return null;
  const [slug, token] = cookieValue.split(":");
  if (!slug || !token) return null;
  const user = users.find((u) => u.slug === slug);
  if (!user) return null;
  const expected = await hashPasscode(user.passcode);
  if (expected !== token) return null;
  return { slug: user.slug, name: user.name };
}

export function getUsers() {
  return users;
}
