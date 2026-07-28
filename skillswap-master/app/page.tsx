import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { Hero } from "@/components/Hero";

export const runtime = "nodejs";

export default function Landing() {
  const user = getCurrentUser();
  if (user) redirect("/home");
  return <Hero />;
}
