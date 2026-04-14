import Image from "next/image";
import logoSrc from "@/assets/logo.png";

type AppLogoProps = {
  /** Tamanho do círculo (largura = altura). */
  className?: string;
  priority?: boolean;
};

export function AppLogo({
  className = "h-14 w-14 sm:h-16 sm:w-16",
  priority,
}: AppLogoProps) {
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden rounded-full bg-surface ring-1 ring-gray-100 ${className}`}
    >
      <Image
        src={logoSrc}
        alt=""
        width={256}
        height={256}
        className="h-full w-full object-contain"
        priority={priority}
      />
    </span>
  );
}
