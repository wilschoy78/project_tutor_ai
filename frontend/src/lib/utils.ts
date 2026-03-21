import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type ActionButtonVariant = "primary" | "info" | "success" | "secondary" | "neutral" | "danger";

export function actionButtonClass(variant: ActionButtonVariant) {
  const base =
    "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  switch (variant) {
    case "primary":
      return cn(base, "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500");
    case "info":
      return cn(base, "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500");
    case "success":
      return cn(base, "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500");
    case "secondary":
      return cn(base, "bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500");
    case "danger":
      return cn(base, "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500");
    case "neutral":
    default:
      return cn(base, "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-400");
  }
}
