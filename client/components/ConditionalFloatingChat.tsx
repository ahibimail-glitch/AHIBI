"use client";

import { usePathname } from "next/navigation";
import FloatingChatButton from "@/components/ui/FloatingChat";

export default function ConditionalFloatingChat() {
  const pathname = usePathname();
  
  // Hide floating chat on admin pages
  const isAdminPage = pathname?.startsWith('/admin');
  const isChatPage = pathname?.startsWith('/support/chat');
  const isScannerPage = pathname === '/scanner' || pathname?.startsWith('/scanner/');
  
  if (isAdminPage || isChatPage || isScannerPage) {
    return null;
  }
  
  return <FloatingChatButton />;
}
