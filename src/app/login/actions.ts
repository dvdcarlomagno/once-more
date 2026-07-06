"use server";

import { signIn } from "@/auth";

export async function sendMagicLink(formData: FormData) {
  await signIn("nodemailer", {
    email: String(formData.get("email") ?? "").trim(),
    redirectTo: "/dashboard",
  });
}
