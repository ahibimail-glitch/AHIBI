'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

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
];

export const FloatingChatButton = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  if (BLOCKED_PATHS.includes(pathname)) return null;

  const actions = [
    {
      href: '/support',
      label: 'Support',
      sublabel: 'Get help',
      bg: 'bg-slate-900',
      hover: 'hover:bg-slate-800',
      border: 'border-slate-700',
      delay: 'delay-75',
      icon: (
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
          <path d="M12 3C7.03 3 3 6.58 3 11c0 2.24 1.03 4.27 2.7 5.72V21l3.4-1.86c.92.25 1.89.38 2.9.38 4.97 0 9-3.58 9-8s-4.03-8.52-9-8.52z" fill="currentColor" />
        </svg>
      ),
    },
    {
      href: WHATSAPP_LINK,
      label: 'WhatsApp',
      sublabel: 'Chat now',
      bg: 'bg-emerald-500',
      hover: 'hover:bg-emerald-400',
      border: 'border-emerald-400',
      delay: 'delay-0',
      external: true,
      icon: (
        <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.488" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fixed bottom-10 right-6 z-50 flex flex-col items-end gap-2">

      {/* Action cards */}
      <div className={`flex flex-col items-end gap-2 transition-all duration-300 ${isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        {actions.map((action) => (
          <a
            key={action.label}
            href={action.href}
            target={action.external ? '_blank' : undefined}
            rel={action.external ? 'noopener noreferrer' : undefined}
            aria-label={action.label}
            className={`group flex items-center gap-3 rounded-2xl ${action.bg} ${action.hover} border ${action.border} border-opacity-30 pl-3 pr-4 py-2.5 shadow-2xl transition-all duration-200 hover:scale-105 active:scale-95 ${action.delay}`}
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${action.bg} text-white ring-1 ring-white ring-opacity-10`}>
              {action.icon}
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-xs font-bold text-white tracking-wide">{action.label}</span>
              <span className="text-xs text-white text-opacity-60">{action.sublabel}</span>
            </span>
          </a>
        ))}
      </div>

      {/* Ping ring behind FAB */}
      {!isOpen && (
        <span className="absolute bottom-0 right-0 h-14 w-14 rounded-full bg-rose-600 opacity-30 animate-ping" />
      )}

      {/* FAB toggle */}
      <button
        type="button"
        aria-label={isOpen ? 'Close support menu' : 'Open support options'}
        onClick={() => setIsOpen((p) => !p)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-2xl ring-4 ring-rose-600 ring-opacity-20 transition-all duration-300 hover:bg-rose-500 hover:ring-opacity-40 active:scale-90 focus:outline-none"
      >
        {/* Chat icon */}
        <svg
          className={`h-6 w-6 transition-transform duration-300 ${isOpen ? 'scale-110' : 'scale-100'}`}
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2z"/>
          <circle cx="7" cy="10" r="1"/>
          <circle cx="12" cy="10" r="1"/>
          <circle cx="17" cy="10" r="1"/>
        </svg>
      </button>
    </div>
  );
};

export default FloatingChatButton;