import { RouteIcon, ShieldCheckIcon, UsersIcon } from "./icons";

const FEATURES = [
  {
    icon: UsersIcon,
    text: "Encontre pedais perto de você",
  },
  {
    icon: ShieldCheckIcon,
    text: "Participe com segurança",
  },
  {
    icon: RouteIcon,
    text: "Encontre rotas para seu nível",
  },
] as const;

export function AuthFeatures() {
  return (
    <div className="mt-8 hidden w-full max-w-3xl md:grid md:grid-cols-3 md:gap-6">
      {FEATURES.map(({ icon: Icon, text }) => (
        <div
          key={text}
          className="flex flex-col items-center gap-2 px-3 text-center"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon />
          </span>
          <p className="text-sm font-medium leading-snug text-foreground">{text}</p>
        </div>
      ))}
    </div>
  );
}
