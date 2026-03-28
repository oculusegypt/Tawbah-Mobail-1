import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, requireAuth, signJwt, type AuthenticatedRequest } from "../lib/auth";
import { verifyPassword } from "../lib/auth";

const router: IRouter = Router();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

router.post("/auth/register", async (req, res) => {
  const emailRaw = req.body?.email;
  const password = req.body?.password;

  if (typeof emailRaw !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "email and password required" });
  }

  const email = normalizeEmail(emailRaw);
  if (!email.includes("@") || password.length < 6) {
    return res.status(400).json({ error: "invalid email or password" });
  }

  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    return res.status(409).json({ error: "email already exists" });
  }

  const { salt, hash } = hashPassword(password);
  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordSalt: salt, passwordHash: hash })
    .returning({ id: usersTable.id, email: usersTable.email });

  const token = signJwt({ sub: String(user!.id), email: user!.email });
  return res.json({ token, user });
});

router.post("/auth/login", async (req, res) => {
  const emailRaw = req.body?.email;
  const password = req.body?.password;

  if (typeof emailRaw !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "email and password required" });
  }

  const email = normalizeEmail(emailRaw);
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, passwordSalt: usersTable.passwordSalt, passwordHash: usersTable.passwordHash })
    .from(usersTable)
    .where(eq(usersTable.email, email));

  if (!user) return res.status(401).json({ error: "invalid credentials" });

  const ok = verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "invalid credentials" });

  const token = signJwt({ sub: String(user.id), email: user.email });
  return res.json({ token, user: { id: user.id, email: user.email } });
});

router.get("/auth/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  const sub = req.auth!.sub;
  const userId = Number(sub);
  const [user] = await db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable).where(eq(usersTable.id, userId));
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  return res.json({ user });
});

export default router;
