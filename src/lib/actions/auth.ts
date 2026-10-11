"use server";

import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/ratelimit";
import { sendOtpEmail } from "@/lib/email";
import { audit } from "@/lib/audit";
import {
  voterLoginSchema,
  adminLoginSchema,
  requestOtpSchema,
  activateSchema,
  firstError,
} from "@/lib/validation";

export type ActionResult = { ok: boolean; error?: string; redirectTo?: string; summary?: string };

export async function voterLogin(input: unknown): Promise<ActionResult> {
  const ip = await clientIp();
  if (!rateLimit(`login:voter:${ip}`, 10, 5 * 60_000)) {
    return { ok: false, error: "Too many attempts. Try again in a few minutes." };
  }
  const parsed = voterLoginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const { indexNumber, email, password } = parsed.data;
  const voter = await prisma.voter.findUnique({ where: { indexNumber } });

  if (!voter || voter.email.toLowerCase() !== email || !voter.passwordHash) {
    return { ok: false, error: "Invalid index number, email, or password." };
  }
  const valid = await bcrypt.compare(password, voter.passwordHash);
  if (!valid) {
    return { ok: false, error: "Invalid index number, email, or password." };
  }

  await createSession({
    sub: voter.id,
    kind: "voter",
    email: voter.email,
    name: voter.name,
    indexNumber: voter.indexNumber,
  });

  return { ok: true, redirectTo: voter.hasVoted ? "/voted" : "/vote" };
}

export async function adminLogin(input: unknown): Promise<ActionResult> {
  const ip = await clientIp();
  if (!rateLimit(`login:admin:${ip}`, 8, 5 * 60_000)) {
    return { ok: false, error: "Too many attempts. Try again in a few minutes." };
  }
  const parsed = adminLoginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    return { ok: false, error: "Invalid email or password." };
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Invalid email or password." };
  }

  await createSession(
    {
      sub: user.id,
      kind: "admin",
      role: user.role as "ADMIN" | "SUPERADMIN",
      email: user.email,
      name: user.name,
    },
    12
  );
  await audit("ADMIN_LOGIN", { userId: user.id });

  return { ok: true, redirectTo: "/admin" };
}

export async function requestOtp(input: unknown): Promise<ActionResult> {
  const ip = await clientIp();
  if (!rateLimit(`otp:${ip}`, 6, 10 * 60_000)) {
    return { ok: false, error: "Too many requests. Try again later." };
  }
  const parsed = requestOtpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const { indexNumber, email } = parsed.data;
  const voter = await prisma.voter.findUnique({ where: { indexNumber } });

  if (!voter || voter.email.toLowerCase() !== email) {
    return { ok: false, error: "You are not an eligible voter. Your index number and school email are not listed together in the voter register. Contact an electoral official if you believe this is a mistake." };
  }
  if (voter.passwordHash) {
    return { ok: false, error: "This account is already activated. Please sign in." };
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.otpCode.upsert({
    where: { voterId: voter.id },
    create: {
      voterId: voter.id,
      codeHash: await bcrypt.hash(code, 10),
      expiresAt: new Date(Date.now() + 10 * 60_000),
    },
    update: {
      codeHash: await bcrypt.hash(code, 10),
      expiresAt: new Date(Date.now() + 10 * 60_000),
      attempts: 0,
    },
  });

  try {
    await sendOtpEmail(voter.email, voter.name, code);
  } catch (e) {
    console.error("Email send failed:", e);
    return { ok: false, error: "Could not send the activation email. Try again later." };
  }

  return { ok: true };
}

export async function activateAccount(input: unknown): Promise<ActionResult> {
  const ip = await clientIp();
  if (!rateLimit(`activate:${ip}`, 10, 10 * 60_000)) {
    return { ok: false, error: "Too many attempts. Try again later." };
  }
  const parsed = activateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };

  const { indexNumber, email, code, password } = parsed.data;
  const voter = await prisma.voter.findUnique({
    where: { indexNumber },
    include: { otp: true },
  });

  if (!voter || voter.email.toLowerCase() !== email) {
    return { ok: false, error: "You are not an eligible voter. Your index number and school email are not listed together in the voter register. Contact an electoral official if you believe this is a mistake." };
  }
  if (voter.passwordHash) {
    return { ok: false, error: "This account is already activated. Please sign in." };
  }
  const otp = voter.otp;
  if (!otp || otp.expiresAt < new Date()) {
    return { ok: false, error: "Code expired or not found. Request a new code." };
  }
  if (otp.attempts >= 5) {
    return { ok: false, error: "Too many wrong codes. Request a new code." };
  }

  const valid = await bcrypt.compare(code, otp.codeHash);
  if (!valid) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return { ok: false, error: "Incorrect code." };
  }

  await prisma.$transaction([
    prisma.voter.update({
      where: { id: voter.id },
      data: {
        passwordHash: await bcrypt.hash(password, 12),
        activatedAt: new Date(),
      },
    }),
    prisma.otpCode.delete({ where: { id: otp.id } }),
  ]);

  await createSession({
    sub: voter.id,
    kind: "voter",
    email: voter.email,
    name: voter.name,
    indexNumber: voter.indexNumber,
  });

  return { ok: true, redirectTo: "/vote" };
}

export async function logout(): Promise<ActionResult> {
  await destroySession();
  return { ok: true, redirectTo: "/" };
}
