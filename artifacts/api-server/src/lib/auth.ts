import type { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

export type AuthTokenPayload = {
  sub: string;
  email?: string;
};

function getSupabaseUrl() {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL must be set");
  return url.replace(/\/$/, "");
}

function getSupabaseIssuer() {
  return `${getSupabaseUrl()}/auth/v1`;
}

function getSupabaseAudience() {
  return process.env.SUPABASE_JWT_AUD ?? "authenticated";
}

const jwks = createRemoteJWKSet(new URL(`${getSupabaseUrl()}/auth/v1/keys`));

async function verifySupabaseJwt(token: string): Promise<AuthTokenPayload> {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: getSupabaseIssuer(),
    audience: getSupabaseAudience(),
  });

  const p = payload as JWTPayload & { email?: string };
  if (!p.sub) throw new Error("Invalid token payload");
  return { sub: p.sub, email: p.email };
}

export type AuthenticatedRequest = Request & { auth?: AuthTokenPayload };

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.toLowerCase().startsWith("bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const token = header.slice("bearer ".length).trim();
    const payload = await verifySupabaseJwt(token);
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}
