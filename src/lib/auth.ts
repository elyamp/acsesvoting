import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "acses_session";

export function isSameOriginRequest(origin: string | null, referer: string | null, host: string | null): boolean {
  if (!origin && !referer) return false;
  const candidates = [origin, referer].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (!host || url.host === host) {
        return true;
      }
    } catch {
      // Ignore malformed origins and continue checking the remaining candidates.
    }
  }

  return false;
}

export async function hasValidRequestOrigin(): Promise<boolean> {
  const incomingHeaders = await headers();
  const host = incomingHeaders.get("host");
  const origin = incomingHeaders.get("origin");
  const referer = incomingHeaders.get("referer");
  return isSameOriginRequest(origin, referer, host);
}

export type SessionPayload = {
  sub: string;
  kind: "voter" | "admin";
  role?: "ADMIN" | "SUPERADMIN";
  email: string;
  name: string;
  indexNumber?: string;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET must be set to a strong value (min 16 chars)");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload, hours = 8) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${hours}h`)
    .sign(getSecret());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: hours * 3600,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const session = payload as Partial<SessionPayload>;
    if (!session.sub || !session.kind || !session.email) return null;

    if (session.kind === "admin") {
      const user = await prisma.user.findUnique({
        where: { id: String(session.sub) },
        select: { id: true, email: true, name: true, role: true, active: true },
      });

      if (!user || !user.active || user.email !== session.email) return null;
      if (session.role && user.role !== session.role) return null;

      return {
        sub: user.id,
        kind: "admin",
        role: user.role as "ADMIN" | "SUPERADMIN",
        email: user.email,
        name: user.name,
      };
    }

    const voter = await prisma.voter.findUnique({
      where: { id: String(session.sub) },
      select: { id: true, email: true, name: true, indexNumber: true },
    });

    if (!voter || voter.email !== session.email || voter.name !== session.name) return null;
    if (session.indexNumber && voter.indexNumber !== session.indexNumber) return null;

    return {
      sub: voter.id,
      kind: "voter",
      email: voter.email,
      name: voter.name,
      indexNumber: voter.indexNumber,
    };
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(COOKIE_NAME);
}
