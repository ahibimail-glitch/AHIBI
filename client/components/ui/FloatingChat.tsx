'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, Headphones } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';

const WHATSAPP_NUMBER = '+919383047671';
const MESSAGE = encodeURIComponent('Hi, I need help with Ahibi.');
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${MESSAGE}`;

const BLOCKED_PATHS = [
  '/annie-musical',
  '/NagalandInfluencerSummit/register',
  '/AhibiFestQRScanner',
  '/admin/booking',
  '/HORNBILL/ManualBooking',
  '/HORNBILL/eventsScanner',
  '/sports/tournaments'
];

export const FloatingChatButton = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  if (BLOCKED_PATHS.includes(pathname)) return null;

  const actions = [
    {
      href: '/support',
      label: 'Support',
      sublabel: 'Get help',
      gradient: 'from-slate-700 to-slate-500',
      icon: <Headphones className="h-4 w-4" />,
    },
    {
      href: WHATSAPP_LINK,
      label: 'WhatsApp',
      sublabel: 'Chat instantly',
      gradient: 'from-emerald-500 to-emerald-400',
      external: true,
      icon: <FaWhatsapp className="h-4 w-4" />, // ✅ REAL WHATSAPP ICON
    },
  ];

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* Actions */}
      {isOpen && (
        <div className="flex flex-col items-end gap-3 animate-fadeInUp">
          {actions.map((action, i) => (
            <a
              key={i}
              href={action.href}
              target={action.external ? '_blank' : undefined}
              rel={action.external ? 'noopener noreferrer' : undefined}
              className="group flex items-center gap-3 rounded-2xl px-4 py-2.5 
              bg-white border border-gray-200 
              shadow-lg hover:shadow-xl 
              transition-all duration-300 hover:scale-105"
            >
              {/* Icon */}
              <div
                className={`h-9 w-9 flex items-center justify-center rounded-xl 
                bg-gradient-to-br ${action.gradient} text-white shadow-sm`}
              >
                {action.icon}
              </div>

              {/* Text */}
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800">
                  {action.label}
                </span>
                <span className="text-xs text-gray-500">
                  {action.sublabel}
                </span>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative h-14 w-14 rounded-full flex items-center justify-center 
        bg-gradient-to-br from-rose-500 to-pink-500 text-white 
        shadow-[0_10px_25px_rgba(244,63,94,0.35)] 
        hover:scale-110 active:scale-90 transition-all duration-300"
      >
        <MessageCircle
          className={`h-6 w-6 transition-transform duration-300 ${
            isOpen ? 'rotate-45 scale-110' : ''
          }`}
        />
      </button>
    </div>
  );
};

export default FloatingChatButton;