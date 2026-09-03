import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/card";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  LogIn,
  UserPlus,
  LogOut,
  Eye,
  EyeOff,
} from "lucide-react";
import { Logo } from "@/shared/components/Logo";
import { toast } from "sonner";
import api from "@/config/axios";
import { appName } from "@/constants";
import { useAuth } from "@/hooks/useAuth";
import { useDispatch } from "react-redux";
import { switchOrganization } from "@/features/auth/services/authSlice";
import { loginThunk } from "@/features/auth/services/authThunks";
import type { AppDispatch } from "@/store";

interface InvitationData {
  email: string;
  user_exists: boolean;
  organization_id: number;
  organization_name?: string;
  board_id?: number;
  board_name?: string;
  role_id: number;
  role_label?: string;
  invited_by?: string;
  expires_at?: string;
  days_remaining?: number;
}

const SignupPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { login, logout, user, isAuthenticated } = useAuth();

  // Get token from URL
  const inviteToken = searchParams.get("token");

  // Form state
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invitation validation state
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [tokenErrorMessage, setTokenErrorMessage] = useState<string>("");
  const [isRedirectingLoggedIn, setIsRedirectingLoggedIn] = useState(false);

  // Redirect to login if no invite token
  useEffect(() => {
    if (!inviteToken) {
      navigate("/login", { replace: true });
    }
  }, [inviteToken, navigate]);

  // Validate invitation token on mount
  useEffect(() => {
    if (inviteToken) {
      validateInvitationToken(inviteToken);
    }
  }, [inviteToken]);

  // Helper to compute target redirect URL after accepting invite / logging in
  const getTargetRedirectUrl = (data: InvitationData) => {
    if (data.board_id) {
      return `/org/${data.organization_id}/board/${data.board_id}`;
    }
    return `/org/${data.organization_id}/home`;
  };

  const validateInvitationToken = async (token: string) => {
    setIsValidatingToken(true);
    try {
      const response = await api.post(
        "/validate-invitation-token",
        { token },
        {
          skipAuth: true,
        },
      );

      if (response.data && response.data.code === 200) {
        const data: InvitationData = response.data.data;
        setTokenValid(true);
        setInvitationData(data);
        setTokenErrorMessage("");

        if (data.email) {
          setEmail(data.email);
        }

        // Check if user is ALREADY authenticated
        if (isAuthenticated && user) {
          const userEmail = (user.email || user.username || "").toLowerCase();
          const inviteEmail = (data.email || "").toLowerCase();

          // If logged in as the invited user (or if already authenticated)
          if (!inviteEmail || userEmail === inviteEmail) {
            setIsRedirectingLoggedIn(true);

            // Call accept-invitation on the backend to assign roles & set status to accepted
            try {
              await api.post("/accept-invitation", { token });
            } catch (acceptErr) {
              console.warn("accept-invitation error:", acceptErr);
            }

            // Synchronize organization if different
            if (data.organization_id && user.organization_id !== data.organization_id) {
              dispatch(switchOrganization(data.organization_id));
            }

            const targetUrl = getTargetRedirectUrl(data);
            toast.success("Welcome!", {
              description: `You have joined ${data.board_name ? `board "${data.board_name}"` : data.organization_name || "the workspace"}.`,
            });

            setTimeout(() => {
              navigate(targetUrl, { replace: true });
            }, 800);
            return;
          }
        }

        // If user already exists in DB -> default to login mode
        if (data.user_exists) {
          setMode("login");
          toast.info("Welcome Back!", {
            description: "Please sign in to accept your invitation.",
          });
        } else {
          setMode("signup");
          toast.success("Invitation Verified", {
            description: "Please complete your registration below to join.",
          });
        }
      } else {
        setTokenValid(false);
        setTokenErrorMessage(
          response.data?.message ||
            "This invitation link is invalid or has expired.",
        );
        toast.error("Invalid Invitation", {
          description: "This invitation link is invalid or has expired.",
        });
      }
    } catch (error: any) {
      console.error("Token validation error:", error);
      setTokenValid(false);
      const errorMsg =
        error.response?.data?.message || "Failed to validate invitation token.";
      setTokenErrorMessage(errorMsg);
      toast.error("Validation Failed", {
        description: errorMsg,
      });
    } finally {
      setIsValidatingToken(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Email required", { description: "Please enter your email." });
      return;
    }

    if (!password) {
      toast.error("Password required", {
        description: "Please enter your password.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login({
        username: email.trim(),
        password,
      });

      if (loginThunk.fulfilled.match(result)) {
        const loggedUser = result.payload.user;
        toast.success("Login Successful!", {
          description: "Welcome back!",
        });

        // Accept invitation now that user is logged in
        if (inviteToken) {
          try {
            await api.post("/accept-invitation", { token: inviteToken });
          } catch (acceptErr) {
            console.warn("accept-invitation after login error:", acceptErr);
          }
        }

        // Switch to the invited organization if specified
        if (
          invitationData?.organization_id &&
          loggedUser.organization_id !== invitationData.organization_id
        ) {
          dispatch(switchOrganization(invitationData.organization_id));
        }

        const targetUrl = invitationData
          ? getTargetRedirectUrl(invitationData)
          : `/org/${loggedUser.organization_id}/home`;

        navigate(targetUrl, { replace: true });
      }
    } catch (error: any) {
      console.error("Login submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (password !== confirmPassword) {
      toast.error("Passwords Don't Match", {
        description: "Please make sure your passwords match.",
      });
      return;
    }

    if (password.length < 8) {
      toast.error("Password Too Short", {
        description: "Password must be at least 8 characters long.",
      });
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Name Required", {
        description: "Please enter your first and last name.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (inviteToken && tokenValid) {
        // Register with invitation
        const response = await api.post(
          "/register-with-invitation",
          {
            token: inviteToken,
            email: email,
            password: password,
            first_name: firstName,
            last_name: lastName,
            board_id: invitationData?.board_id || "",
          },
          {
            skipAuth: true,
          },
        );

        if (response.data && response.data.code === 200) {
          toast.success("Account Created!", {
            description: "Signing you in...",
          });

          // Automatically log the user in after registration
          try {
            const loginResult = await login({
              username: email.trim(),
              password: password,
            });

            if (loginThunk.fulfilled.match(loginResult)) {
              const loggedUser = loginResult.payload.user;
              if (
                invitationData?.organization_id &&
                loggedUser.organization_id !== invitationData.organization_id
              ) {
                dispatch(switchOrganization(invitationData.organization_id));
              }

              const targetUrl = invitationData
                ? getTargetRedirectUrl(invitationData)
                : `/org/${loggedUser.organization_id}/home`;

              navigate(targetUrl, { replace: true });
              return;
            }
          } catch (loginErr) {
            console.warn("Auto-login failed, redirecting to login:", loginErr);
          }

          // Fallback if auto-login didn't complete
          setMode("login");
        } else {
          throw new Error(response.data?.message || "Registration Failed");
        }
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      const errMsg =
        error.response?.data?.message ||
        error.message ||
        "Failed to create account.";

      // If account already exists, prompt them to sign in
      if (
        errMsg.toLowerCase().includes("already exists") ||
        error.response?.data?.error_type === "email_exists"
      ) {
        toast.info("Account Already Exists", {
          description: "An account with this email already exists. Please sign in with your password.",
        });
        setMode("login");
      } else {
        toast.error("Registration Failed", {
          description: errMsg,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while validating token
  if (inviteToken && isValidatingToken) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-9 w-9 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-medium">Validating invitation link...</p>
        </div>
      </div>
    );
  }

  // Redirecting state if already logged in
  if (isRedirectingLoggedIn) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-9 w-9 animate-spin text-primary mx-auto" />
          <p className="text-foreground font-semibold text-lg">
            Accepting invitation & redirecting to dashboard...
          </p>
          <p className="text-muted-foreground text-sm">
            {invitationData?.board_name
              ? `Joining ${invitationData.board_name}`
              : `Joining ${invitationData?.organization_name || "workspace"}`}
          </p>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (inviteToken && tokenValid === false) {
    return (
      <div className="min-h-screen w-full bg-gradient-dark flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-card border-border bg-card">
          <CardHeader className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 border border-destructive/20 rounded-2xl mx-auto">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-semibold">
              Invalid Invitation
            </CardTitle>
            <CardDescription>
              {tokenErrorMessage ||
                "This invitation link is invalid or has expired. Please contact the person who invited you for a new link."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate("/login")}
              className="w-full"
              variant="outline"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if logged in under a DIFFERENT email than invited email
  const isDifferentUserLoggedIn =
    isAuthenticated &&
    user &&
    invitationData?.email &&
    (user.email || user.username || "").toLowerCase() !==
      invitationData.email.toLowerCase();

  return (
    <div className="min-h-screen w-full bg-gradient-dark flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md space-y-6 animate-slide-up">
        {/* Logo and Title */}
        <div className="text-center space-y-3">
          <Logo size={56} rounded="rounded-xl" className="mx-auto" bgColor="bg-white" />
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              {appName}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {mode === "login"
                ? "Sign in to accept your invitation"
                : "Create your account to accept your invitation"}
            </p>
          </div>
        </div>

        {/* Invitation Info Banner */}
        {inviteToken && tokenValid && invitationData && (
          <div className="bg-primary/10 border border-primary/25 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm font-semibold text-foreground">
                You've been invited!
              </span>
              {invitationData.role_label && (
                <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium border border-primary/30">
                  {invitationData.role_label}
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {invitationData.invited_by && (
                <span>
                  <strong>{invitationData.invited_by}</strong> invited you to join{" "}
                </span>
              )}
              {invitationData.board_name ? (
                <span>
                  board <strong>{invitationData.board_name}</strong>
                  {invitationData.organization_name
                    ? ` in ${invitationData.organization_name}`
                    : ""}
                </span>
              ) : (
                <span>
                  organization <strong>{invitationData.organization_name || "Workspace"}</strong>
                </span>
              )}
              .
            </p>
          </div>
        )}

        {/* Logged-in as different user warning */}
        {isDifferentUserLoggedIn && (
          <Card className="shadow-card border-amber-500/30 bg-amber-500/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold text-amber-500 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Signed in as another user
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                You are currently signed in as <strong>{user?.email || user?.username}</strong>. This invitation was sent to <strong>{invitationData?.email}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2 flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  if (invitationData) {
                    const target = getTargetRedirectUrl(invitationData);
                    navigate(target);
                  }
                }}
              >
                Continue as {user?.email || user?.username}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="w-full text-xs gap-1.5"
                onClick={async () => {
                  await logout();
                  if (invitationData?.user_exists) {
                    setMode("login");
                  } else {
                    setMode("signup");
                  }
                }}
              >
                <LogOut className="w-3.5 h-3.5" /> Sign out & accept as {invitationData?.email}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Main Card */}
        {(!isDifferentUserLoggedIn || !isAuthenticated) && (
          <Card className="shadow-card border-border bg-card">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-semibold">
                  {mode === "login" ? "Sign In" : "Create Account"}
                </CardTitle>
                {invitationData && (
                  <button
                    type="button"
                    onClick={() => setMode(mode === "login" ? "signup" : "login")}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    {mode === "login" ? "Need to Register?" : "Already have account?"}
                  </button>
                )}
              </div>
              <CardDescription className="text-xs">
                {mode === "login"
                  ? "Enter your password to sign in and access the board"
                  : "Enter your details to create your account and access the board"}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {mode === "login" ? (
                /* LOGIN FORM */
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="loginEmail">Email Address</Label>
                    <Input
                      id="loginEmail"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isSubmitting || (!!inviteToken && !!invitationData?.email)}
                      className="h-11 bg-background border-border"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="loginPassword">Password</Label>
                      <Link
                        to="/forgot-password"
                        className="text-xs text-primary hover:underline font-medium"
                      >
                        Forgot Password?
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="loginPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="h-11 bg-background border-border pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-medium shadow-lg gap-2"
                    disabled={isSubmitting || (!!inviteToken && tokenValid === false)}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4" />
                        Sign In & Join
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                /* SIGNUP FORM */
                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="h-11 bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="h-11 bg-background border-border"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signupEmail">Email Address</Label>
                    <Input
                      id="signupEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={
                        isSubmitting || (!!inviteToken && !!invitationData?.email)
                      }
                      className="h-11 bg-background border-border"
                    />
                    {inviteToken && invitationData?.email && (
                      <p className="text-xs text-muted-foreground">
                        Pre-filled from your invitation
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signupPassword">Password</Label>
                    <div className="relative">
                      <Input
                        id="signupPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="•••••••• (min 8 chars)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="h-11 bg-background border-border pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="h-11 bg-background border-border"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 text-base font-medium shadow-lg gap-2"
                    disabled={
                      isSubmitting || (!!inviteToken && tokenValid === false)
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Create Account & Join
                      </>
                    )}
                  </Button>
                </form>
              )}

              <div className="mt-5 text-center">
                <p className="text-xs text-muted-foreground">
                  {mode === "login" ? (
                    <>
                      Don't have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("signup")}
                        className="text-primary font-medium hover:underline inline"
                      >
                        Create Account
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("login")}
                        className="text-primary font-medium hover:underline inline"
                      >
                        Sign In
                      </button>
                    </>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SignupPage;

// // import { useState, useEffect } from "react";
// // import { Link, useNavigate } from "react-router-dom";
// import { useState } from "react";
// import { Link } from "react-router-dom";
// import { Button } from "@/shared/ui/button";
// import { Input } from "@/shared/ui/input";
// import { Label } from "@/shared/components/label";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/shared/components/card";
// import { BarChart3, Loader2 } from "lucide-react";
// // import { useToast } from "@/hooks/use-toast";
// // import { useAuth } from "@/hooks/useAuth";
// // import { useToast } from "@/hooks/use-toast";

// const SignupPage = () => {
//   // const navigate = useNavigate();
//   //   const { signUp, user, loading: authLoading } = useAuth();
//   // const { toast } = useToast();
//   const [name, setName] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   // const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isSubmitting] = useState(false);

//   //   useEffect(() => {
//   //     if (user && !authLoading) {
//   //       navigate("/dashboard");
//   //     }
//   //   }, [user, authLoading, navigate]);

//   //   const handleSubmit = async (e: React.FormEvent) => {
//   //     e.preventDefault();

//   //     if (password !== confirmPassword) {
//   //       toast({
//   //         title: "Passwords don't match",
//   //         description: "Please make sure your passwords match.",
//   //         variant: "destructive",
//   //       });
//   //       return;
//   //     }

//   //     if (password.length < 6) {
//   //       toast({
//   //         title: "Password too short",
//   //         description: "Password must be at least 6 characters long.",
//   //         variant: "destructive",
//   //       });
//   //       return;
//   //     }

//   //     setIsSubmitting(true);

//   //     const { error } = await signUp(email, password, name);

//   //     if (error) {
//   //       let errorMessage = error.message;
//   //       if (error.message.includes("already registered")) {
//   //         errorMessage = "An account with this email already exists. Please sign in instead.";
//   //       }

//   //       toast({
//   //         title: "Sign up failed",
//   //         description: errorMessage,
//   //         variant: "destructive",
//   //       });
//   //       setIsSubmitting(false);
//   //     } else {
//   //       toast({
//   //         title: "Account created!",
//   //         description: "You can now sign in with your credentials.",
//   //       });
//   //       navigate("/login");
//   //     }
//   //   };

//   //   if (authLoading) {
//   //     return (
//   //       <div className="min-h-screen w-full flex items-center justify-center bg-background">
//   //         <Loader2 className="h-8 w-8 animate-spin text-primary" />
//   //       </div>
//   //     );
//   //   }

//   // const handleSubmit = async (e: React.FormEvent) => {};
//   const handleSubmit = async () => {};

//   return (
//     <div className="min-h-screen w-full bg-gradient-dark flex items-center justify-center p-4 animate-fade-in">
//       <div className="w-full max-w-md space-y-8 animate-slide-up">
//         {/* Logo and Title */}
//         <div className="text-center space-y-4">
//           <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl shadow-elegant backdrop-blur-sm">
//             <BarChart3 className="w-8 h-8 text-primary" />
//           </div>
//           <div>
//             <h1 className="text-3xl font-bold text-foreground mb-2">
//               Project Manager
//             </h1>
//             <p className="text-muted-foreground text-lg">
//               Create your account to get started
//             </p>
//           </div>
//         </div>

//         {/* Signup Card */}
//         <Card className="shadow-card border-border bg-card">
//           <CardHeader className="space-y-1">
//             <CardTitle className="text-2xl font-semibold">
//               Create Account
//             </CardTitle>
//             <CardDescription>
//               Enter your details to create your account
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <form onSubmit={handleSubmit} className="space-y-4">
//               <div className="space-y-2">
//                 <Label htmlFor="name">Full Name</Label>
//                 <Input
//                   id="name"
//                   type="text"
//                   placeholder="John Doe"
//                   value={name}
//                   onChange={(e) => setName(e.target.value)}
//                   required
//                   disabled={isSubmitting}
//                   className="h-12 bg-background border-border"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="email">Email Address</Label>
//                 <Input
//                   id="email"
//                   type="email"
//                   placeholder="you@example.com"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   required
//                   disabled={isSubmitting}
//                   className="h-12 bg-background border-border"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="password">Password</Label>
//                 <Input
//                   id="password"
//                   type="password"
//                   placeholder="••••••••"
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   required
//                   disabled={isSubmitting}
//                   className="h-12 bg-background border-border"
//                 />
//               </div>
//               <div className="space-y-2">
//                 <Label htmlFor="confirmPassword">Confirm Password</Label>
//                 <Input
//                   id="confirmPassword"
//                   type="password"
//                   placeholder="••••••••"
//                   value={confirmPassword}
//                   onChange={(e) => setConfirmPassword(e.target.value)}
//                   required
//                   disabled={isSubmitting}
//                   className="h-12 bg-background border-border"
//                 />
//               </div>
//               <Button
//                 type="submit"
//                 className="w-full h-12 text-base font-medium shadow-lg"
//                 disabled={isSubmitting}
//               >
//                 {isSubmitting ? (
//                   <>
//                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
//                     Creating account...
//                   </>
//                 ) : (
//                   "Create Account"
//                 )}
//               </Button>
//             </form>

//             <div className="mt-6 text-center">
//               <p className="text-sm text-muted-foreground">
//                 Already have an account?{" "}
//                 <Link
//                   to="/login"
//                   className="text-primary font-medium hover:underline"
//                 >
//                   Sign In
//                 </Link>
//               </p>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// };

// export default SignupPage;
