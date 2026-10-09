"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AccoladesPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/artist/dashboard/tech-rider");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-32">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" />
    </div>
  );
}
