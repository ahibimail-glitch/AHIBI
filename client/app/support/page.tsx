"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SupportPage(): null {
  const router = useRouter();

  useEffect(() => {
    router.replace("/support/chat");
  }, [router]);

  return null;
}

