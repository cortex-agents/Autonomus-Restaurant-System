'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated using our auth system
    if (isAuthenticated()) {
      // Redirect to dashboard if authenticated
      router.push("/dashboard");
    } else {
      // Redirect to login if not authenticated
      router.push("/login");
    }
  }, [router]);

  return null; // This page will redirect immediately
}