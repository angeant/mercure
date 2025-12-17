"use client";

import { useKaliaImprovements } from "@/lib/contexts/kalia-improvements-context";
import { X, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";

const ROTATING_TEXTS = [
  "¿Algo no funciona?",
  "¿Tenés una sugerencia?",
  "Escribime directo",
];

export function ChatButton() {
  const { isOpen, toggleChat, messages, ticketCreated } = useKaliaImprovements();
  const [textIndex, setTextIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Rotate text every 4 seconds
  useEffect(() => {
    if (isOpen) return;
    
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setTextIndex((prev) => (prev + 1) % ROTATING_TEXTS.length);
        setIsAnimating(false);
      }, 200);
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Show badge if there's a conversation in progress
  const showBadge = !isOpen && messages.length > 0 && !ticketCreated;

  if (isOpen) {
    return null; // El X está en el modal
  }

  return (
    <button
      onClick={toggleChat}
      className="
        fixed bottom-4 right-4 z-50
        flex items-center gap-2
        px-4 py-2.5
        bg-neutral-900 hover:bg-neutral-800
        text-white text-sm
        rounded-full
        shadow-lg hover:shadow-xl
        transition-all duration-200
        border border-neutral-700
      "
      aria-label="Abrir chat de feedback"
    >
      <MessageCircle className="w-4 h-4 flex-shrink-0" />
      <span 
        className={`
          transition-all duration-200 
          ${isAnimating ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}
        `}
      >
        {ROTATING_TEXTS[textIndex]}
      </span>
      {showBadge && (
        <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
      )}
    </button>
  );
}

