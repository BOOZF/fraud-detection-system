"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoginDialog } from "@/components/LoginDialog";
import { useAuthenticated } from "@/hooks/use-authenticated";
import { EchoText } from "./EchoText";

export function LandingHero() {
  const router = useRouter();
  const authed = useAuthenticated() === true;
  const [open, setOpen] = useState(false);
  const label = authed ? "Open dashboard" : "Login";

  function onLogin() {
    if (authed) router.push("/dashboard");
    else setOpen(true);
  }

  return (
    <section className="sw-hero relative flex min-h-svh flex-col overflow-hidden border-b">
      <div className="sw-reveal absolute inset-0">
        {/* Served as-is: the filename contains a space, so skip the optimizer's URL round trip. */}
        <Image
          src="/photo/Fraud%20Detection.webp"
          alt=""
          fill
          priority
          unoptimized
          sizes="100vw"
          className="sw-img object-cover object-right"
        />
      </div>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(90deg, #f2f2f2 0%, #f2f2f2 32%, rgba(242,242,242,0.82) 52%, rgba(242,242,242,0) 85%)",
        }}
      />

      <nav className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-3">
          <Image
            src="/photo/Flag-Malaysia.webp"
            alt="Flag of Malaysia"
            width={32}
            height={16}
            className="h-4 w-8 border object-cover"
          />
          <span className="text-lg font-bold tracking-tight">Malaysia XX Bank</span>
        </div>
        <button type="button" onClick={onLogin} className="sw-btn sw-btn-primary">
          {label}
        </button>
      </nav>

      <div className="relative z-10 flex flex-1 flex-col justify-end px-6 pb-12 pt-10 sm:px-10 sm:pb-16">
        <p className="sw-muted mb-6 text-sm font-bold uppercase tracking-widest">Fraud Copilot / Powered by Teradata</p>
        <h1 className="sw-display max-w-[14ch] text-[clamp(3.25rem,10.5vw,10rem)] uppercase">
          <EchoText>Catch card fraud where the data lives.</EchoText>
        </h1>
        <p className="mt-10 max-w-xl text-lg leading-snug sm:text-xl">
          In-database machine learning scores every transaction inside Teradata. A policy-grounded GenAI copilot
          explains each alert and cites the SOP. Customer data stays in-country.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={onLogin} className="sw-btn sw-btn-primary">
            {label}
          </button>
          <a href="#how-it-works" className="sw-btn sw-btn-outline">
            See how it works
          </a>
        </div>
      </div>
      <LoginDialog open={open} onOpenChange={setOpen} />
    </section>
  );
}
