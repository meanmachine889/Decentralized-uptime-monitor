"use client";

import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import { ModeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AppBar() {
  const pathname = usePathname();

  return (
    <div className="flex justify-between items-center w-full p-7 z-10 px-9">
      <ModeToggle />
      <div style={{ fontFamily: "var(--font-geist-mono)" }}>
        <SignedOut>
          <div className="flex gap-3">
            <SignInButton>
              <Button variant={"outline"} className="font-medium text-md">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton>
              <Button className="font-medium text-md">Sign Up</Button>
            </SignUpButton>
          </div>
        </SignedOut>
        <SignedIn>
          <div className="flex gap-3 items-center">
            <Button className="font-medium text-md">
              <Link href={pathname === "/dashboard" ? "/" : "/dashboard"}>
                {pathname === "/dashboard" ? "Home" : "Dashboard"}
              </Link>
            </Button>
            <UserButton />
          </div>
        </SignedIn>
      </div>
    </div>
  );
}
