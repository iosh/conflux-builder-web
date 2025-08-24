"use client";

import { ShimmerButton } from "@/components/magicui/shimmer-button";
import { useFormContext } from "./context";

export default function BuildButton() {
  const { buttonState, handleButtonClick } = useFormContext();

  return (
    <div className="flex flex-col items-end">
      <ShimmerButton
        className="shadow-2xl"
        type={buttonState.isLink ? "button" : "submit"}
        disabled={buttonState.disabled}
        onClick={handleButtonClick}
      >
        <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white dark:from-white dark:to-slate-900/10 lg:text-lg">
          {buttonState.text}
        </span>
      </ShimmerButton>
    </div>
  );
}