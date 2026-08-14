"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <span className="w-12 h-12 border-4 border-violet-600/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );
}

