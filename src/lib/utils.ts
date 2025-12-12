import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formato de fecha relativa amigable
 * "hace 5 min", "hace 2 horas", "ayer 4pm", "lun 3pm", "12 dic"
 */
export function timeAgo(date: string | Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Menos de 1 hora
  if (diffMin < 60) {
    return diffMin <= 1 ? 'ahora' : `hace ${diffMin} min`;
  }

  // Menos de 24 horas
  if (diffHours < 24) {
    return `hace ${diffHours}h`;
  }

  // Ayer
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return `ayer ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  // Esta semana (menos de 7 días)
  if (diffDays < 7) {
    const dias = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    return `${dias[d.getDay()]} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  // Más de una semana
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${d.getDate()} ${meses[d.getMonth()]}`;
}
