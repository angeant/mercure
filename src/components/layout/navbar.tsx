"use client";

import Image from "next/image";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export function Navbar() {
  return (
    <nav className="h-14 bg-black flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-50">
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/kalia_logos/kalia_logo_white.svg"
          alt="Kalia"
          width={80}
          height={24}
          priority
        />
      </Link>
      
      <div className="flex items-center gap-4">
        <UserButton 
          afterSignOutUrl="/sign-in"
          appearance={{
            elements: {
              avatarBox: "w-8 h-8"
            }
          }}
        />
      </div>
    </nav>
  );
}

