import * as React from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input"> & { obscureText?: boolean }
>(({ className, type = "text", obscureText = false, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);
  const isPassword = obscureText || type === "password";
  const inputType = isPassword ? (visible ? "text" : "password") : type;

  return (
    <div className={cn("relative w-full")}>
      <input
        type={inputType}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          isPassword ? "pr-10" : "",
          className,
        )}
        ref={ref}
        {...props}
      />
      {isPassword && (
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center text-muted-foreground bg-background border border-input rounded-md hover:bg-background/50 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
});
Input.displayName = "Input";

export { Input };

// import * as React from "react";

// import { cn } from "@/lib/utils";

// const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
//   ({ className, type, ...props }, ref) => {
//     return (
//       <input
//         type={type}
//         className={cn(
//           "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
//           className,
//         )}
//         ref={ref}
//         {...props}
//       />
//     );
//   },
// );
// Input.displayName = "Input";

// export { Input };
