import React from "react";

export function Button({ children, variant, className = "", ...props }) {
  const base = "inline-flex items-center justify-center font-medium transition disabled:opacity-50";
  const style =
    variant === "secondary"
      ? "bg-zinc-800 text-white hover:bg-zinc-700"
      : "bg-white text-black hover:bg-zinc-200";

  return (
    <button className={`${base} ${style} ${className}`} {...props}>
      {children}
    </button>
  );
}
