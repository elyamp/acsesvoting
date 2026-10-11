import { z } from "zod";
import { voterClassValues } from "@/lib/voter-classes";

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .max(128)
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const indexNumberSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(
    /^FCM\.\d{2}\.\d{3}\.\d{3}\.\d{2}$/,
    "Index number must look like FCM.00.000.000.00"
  );

export const emailSchema = z.email("Enter a valid email address").transform((e) => e.toLowerCase());

// UMAT student email: cy-name1234@st.umat.edu.gh
export const studentEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z]{2}-[a-z.]+[0-9]+@st\.umat\.edu\.gh$/,
    "School email must look like cy-name1234@st.umat.edu.gh"
  );

export const voterLoginSchema = z.object({
  indexNumber: indexNumberSchema,
  email: studentEmailSchema,
  password: z.string().min(1, "Password is required"),
});

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const requestOtpSchema = z.object({
  indexNumber: indexNumberSchema,
  email: studentEmailSchema,
});

export const activateSchema = requestOtpSchema.extend({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
  password: passwordSchema,
});

export const castBallotSchema = z.object({
  electionId: z.string().min(1),
  selections: z
    .array(z.object({ positionId: z.string().min(1), candidateId: z.string().min(1) }))
    .min(1),
});

export const electionSchema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(120),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  startsAt: z.string().optional().or(z.literal("")),
  endsAt: z.string().optional().or(z.literal("")),
});

export const positionSchema = z.object({
  electionId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  order: z.coerce.number().int().min(0).max(999).default(0),
});

export const candidateSchema = z.object({
  positionId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
  photoUrl: z
    .string()
    .trim()
    .refine(
      (v) =>
        v === "" ||
        /^\/uploads\/[a-zA-Z0-9._-]+$/.test(v) ||
        /^https?:\/\/\S+$/i.test(v),
      "Photo must be an uploaded image or an http(s) URL"
    )
    .optional()
    .or(z.literal("")),
});

export const voterSchema = z.object({
  name: z.string().trim().min(2).max(120),
  indexNumber: indexNumberSchema,
  email: studentEmailSchema,
  classGroup: z.enum(voterClassValues),
});

export const bulkVotersSchema = z.object({
  csv: z.string().min(1, "Choose a file or paste at least one line").max(150_000),
  classGroup: z.enum(voterClassValues),
});

export const adminUserSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: emailSchema,
  password: passwordSchema,
  role: z.enum(["ADMIN", "SUPERADMIN"]),
});

export function isAllowedEmailDomain(email: string): boolean {
  const domains = (process.env.ALLOWED_EMAIL_DOMAINS || "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (domains.length === 0) return true;
  const domain = email.split("@")[1]?.toLowerCase() || "";
  return domains.includes(domain);
}

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message || "Invalid input";
}
