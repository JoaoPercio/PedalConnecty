import Image from "next/image";
import bgSrc from "@/assets/ImagemFundoLogin.png";
import { AuthFeatures } from "./AuthFeatures";

type AuthLayoutProps = {
  children: React.ReactNode;
  /** Largura máxima do cartão (ex.: cadastro com mais campos). */
  maxWidthClass?: string;
  showFeatures?: boolean;
};

export function AuthLayout({
  children,
  maxWidthClass = "max-w-[420px]",
  showFeatures = true,
}: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-[100dvh] flex-col">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <Image
          src={bgSrc}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_bottom] md:object-center"
        />
      </div>

      <div className="relative md:hidden">
        <div className="h-[min(28vh,220px)] bg-gradient-to-b from-[#C8E6C9]/90 via-[#E8F5E9]/70 to-transparent" />
        <svg
          className="absolute -bottom-px left-0 w-full text-surface"
          viewBox="0 0 1440 48"
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M0,32 C240,48 480,8 720,24 C960,40 1200,16 1440,32 L1440,48 L0,48 Z"
          />
        </svg>
      </div>

      <main className="flex flex-1 flex-col items-center px-5 pb-10 pt-0 md:justify-center md:px-6 md:py-12">
        <div
          className={`relative z-10 -mt-8 w-full ${maxWidthClass} rounded-2xl bg-surface p-6 shadow-lg shadow-black/5 sm:p-8 md:mt-0 md:shadow-xl`}
        >
          {children}
        </div>
        {showFeatures ? <AuthFeatures /> : null}
      </main>
    </div>
  );
}
