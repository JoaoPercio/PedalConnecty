import { AppLogo } from "@/components/AppLogo";

type AuthBrandProps = {
  subtitle: string;
  priority?: boolean;
};

export function AuthBrand({ subtitle, priority }: AuthBrandProps) {
  return (
    <div className="mb-8 flex flex-col items-center gap-3 text-center">
      <AppLogo className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]" priority={priority} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">
          <span className="text-foreground">Pedal</span>
          <span className="text-primary">Connect</span>
        </h1>
        <p className="mt-1 text-sm text-text-secondary">{subtitle}</p>
      </div>
    </div>
  );
}
