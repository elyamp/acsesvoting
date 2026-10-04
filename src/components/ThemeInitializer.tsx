"use client";

import { useEffect } from "react";
import { applySavedTheme } from "@/lib/theme";

export default function ThemeInitializer() {
  useEffect(() => {
    applySavedTheme();
  }, []);

  return null;
}