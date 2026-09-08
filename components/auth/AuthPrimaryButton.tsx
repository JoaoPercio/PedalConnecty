import { ArrowRightIcon } from "./icons";

type AuthPrimaryButtonProps = {
  children: React.ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
  showArrow?: boolean;
  className?: string;
};

export function AuthPrimaryButton({
  children,
  type = "submit",
  disabled,
  onClick,
  showArrow = true,
  className = "",
}: AuthPrimaryButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 font-medium text-white transition-opacity hover:opacity-95 active:opacity-90 disabled:opacity-70 ${className}`}
    >
      <span>{children}</span>
      {showArrow ? <ArrowRightIcon className="h-5 w-5 shrink-0" /> : null}
    </button>
  );
}
