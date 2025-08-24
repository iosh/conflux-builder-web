"use client";

import { createContext, useContext } from "react";
import type { useBuildForm } from "@/hooks/useBuildForm";

export const FormContext = createContext<ReturnType<
  typeof useBuildForm
> | null>(null);

export const useFormContext = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useFormContext must be used within a FormProvider");
  }
  return context;
};
