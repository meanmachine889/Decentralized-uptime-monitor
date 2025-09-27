import Globe1 from "@/components/mvpblocks/globe1";
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';

export default function Home() {
  return (
    <main className="flex items-center max-h-[97vh] overflow-hidden w-full bg-cover bg-center bg-no-repeat flex flex-col">
      <div className="flex flex-col items-center justify-center py-12 text-center z-10 w-full min-w-screen">
        <h1 className="text-7xl font-medium mb-6 mt-6 syne-font">
          Best Way To Monitor<br /> Your Websites
        </h1>
        <p className="mb-7 text-2xl w-[50%] inter-tight-font">
          Distributed validators interact with our hub to track uptime, latency, and performance so you know issues before your users do.
        </p>
      </div>

      <div className="absolute bottom-0 left-0 w-full h-[55%] overflow-hidden">
        <Globe1 />
      </div>
    </main>
  );
}
