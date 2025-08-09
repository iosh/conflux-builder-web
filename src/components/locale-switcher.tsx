"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { i18n } from "@/i18n-config";

export default function LocaleSwitcher() {
  const pathName = usePathname();

  return (
    <div className="absolute top-4 right-4 z-20 flex space-x-2 rounded-md bg-white/50 p-1 backdrop-blur-sm dark:bg-black/50">
      {i18n.locales.map((locale) => {
        const isActive = pathName.startsWith(`/${locale}`);
        return (
          <Link
            key={locale}
            href={`/${locale}`}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? "bg-neutral-200 text-neutral-900 dark:bg-neutral-700 dark:text-neutral-100"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            }`}
          >
            {locale === "en" ? "EN" : "中"}
          </Link>
        );
      })}
    </div>
  );
}
