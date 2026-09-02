import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/card";
import { Loader2, Eye, EyeOff, CheckCircle2, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/shared/ui/button";
import { requestNotificationPermission } from "@/config/firebase";
import { authApi } from "@/features/auth/api/authApi";
import { debugLog } from "@/utils/debugLog";
import { appName } from "@/constants";
import { Logo } from "@/shared/components/Logo";
import loginLogo from "@/assets/login-logo.png";
import api from "@/config/axios";
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
}

const LoginPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { login, loading, error, isAuthenticated, user, clearAuthError } = useAuth();

  const inviteToken = searchParams.get("token");
  const redirectParam = searchParams.get("redirect");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);

  // Helper to compute target redirect URL after accepting invite / logging in
  const getTargetRedirectUrl = (data?: InvitationData | null) => {
    if (data?.board_id && data?.organization_id) {
      return `/org/${data.organization_id}/board/${data.board_id}`;
    }
    if (data?.organization_id) {
      return `/org/${data.organization_id}/home`;
    }
    if (redirectParam) {
      return redirectParam;
    }
    return "/";
  };

  // Check invitation token if present
  useEffect(() => {
    if (inviteToken) {
      const validateToken = async () => {
        setIsValidatingToken(true);
        try {
          const response = await api.post(
            "/validate-invitation-token",
            { token: inviteToken },
            { skipAuth: true },
          );

          if (response.data && response.data.code === 200) {
            const data: InvitationData = response.data.data;
            setInvitationData(data);

            if (data.email) {
              setUsername(data.email);
            }

            // If user doesn't exist yet, redirect to signup
            if (!data.user_exists) {
              navigate(`/signup?token=${inviteToken}`, { replace: true });
              return;
            }

            // If user is ALREADY authenticated
            if (isAuthenticated && user) {
              // Accept invitation on backend
              try {
                await api.post("/accept-invitation", { token: inviteToken });
              } catch (acceptErr) {
                console.warn("accept-invitation error:", acceptErr);
              }

              if (data.organization_id && user.organization_id !== data.organization_id) {
                dispatch(switchOrganization(data.organization_id));
              }

              const targetUrl = getTargetRedirectUrl(data);
              toast.success("Welcome!", {
                description: `You have joined ${data.board_name ? `board "${data.board_name}"` : data.organization_name || "the workspace"}.`,
              });

              navigate(targetUrl, { replace: true });
            }
          }
        } catch (err) {
          console.error("Login page invitation check error:", err);
        } finally {
          setIsValidatingToken(false);
        }
      };

      validateToken();
    }
  }, [inviteToken, isAuthenticated, user, navigate, dispatch]);

  // Redirect to home or target if already authenticated and no pending invite check
  useEffect(() => {
    if (isAuthenticated && !inviteToken) {
      const target = redirectParam || "/";
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, inviteToken, redirectParam, navigate]);

  // Show error toast if login fails
  useEffect(() => {
    if (error) {
      let title = "Login failed";
      let description = error;

      if (
        error.toLowerCase().includes("unknown email") ||
        error.toLowerCase().includes("email address")
      ) {
        title = "Invalid email";
        description =
          "The email address you entered is not registered. Please check and try again.";
      } else if (
        error.toLowerCase().includes("incorrect password") ||
        error.toLowerCase().includes("password")
      ) {
        title = "Invalid password";
        description =
          error ?? "The password you entered is incorrect. Please try again.";
      }

      toast.error(title, {
        description: description,
      });
      clearAuthError();
    }
  }, [error, clearAuthError]);

  // Validation helper
  const validateForm = (): boolean => {
    if (!username || username.trim() === "") {
      toast.error("Validation error", {
        description: "Username or email is required",
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidEmail = emailRegex.test(username);
    const isValidUsername = username.trim().length >= 3;

    if (!isValidEmail && !isValidUsername) {
      toast.error("Validation error", {
        description: "Username must be at least 3 characters or a valid email",
      });
      return false;
    }

    if (!password || password.trim() === "") {
      toast.error("Validation error", {
        description: "Password is required",
      });
      return false;
    }

    if (password.length < 6) {
      toast.error("Validation error", {
        description: "Password must be at least 6 characters",
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const result = await login({
      username: username.trim(),
      password,
    });

    if (loginThunk.fulfilled.match(result)) {
      const loggedUser = result.payload.user;
      toast.success("Login Successful!", {
        description: "Welcome Back!",
      });

      // Accept invitation after login if token is present
      if (inviteToken) {
        try {
          await api.post("/accept-invitation", { token: inviteToken });
        } catch (acceptErr) {
          console.warn("accept-invitation after login error:", acceptErr);
        }
      }

      if (
        invitationData?.organization_id &&
        loggedUser.organization_id !== invitationData.organization_id
      ) {
        dispatch(switchOrganization(invitationData.organization_id));
      }

      const targetUrl = getTargetRedirectUrl(invitationData);
      navigate(targetUrl, { replace: true });

      // Register FCM token in the background (non-blocking)
      requestNotificationPermission().then((token) => {
        if (token) {
          debugLog("FCM Token:", token);
          authApi.saveFcmToken(token);
        }
      });
    }
  };

  if (isValidatingToken) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Checking invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-dark flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md space-y-6 animate-slide-up">
        {/* Logo and Title */}
        <div className="text-center space-y-3">
          <img src={loginLogo} alt={appName} className="mx-auto h-16 object-contain" />
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              {appName}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {invitationData
                ? "Sign in to accept your invitation"
                : "Welcome back! Sign in to continue"}
            </p>
          </div>
        </div>

        {/* Invitation Info Banner */}
        {invitationData && (
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
              . Please enter your password to sign in.
            </p>
          </div>
        )}

        {/* Login Card */}
        <Card className="shadow-card border-border bg-card">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold">Sign In</CardTitle>
            <CardDescription className="text-xs">
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username or Email</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="your@email.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={loading || (!!inviteToken && !!invitationData?.email)}
                  className="h-11 bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 bg-background border-border"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium shadow-lg gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    {invitationData ? "Sign In & Join" : "Sign In"}
                  </>
                )}
              </Button>
            </form>

            {inviteToken && (
              <div className="mt-5 text-center">
                <p className="text-xs text-muted-foreground">
                  Need to create a new account?{" "}
                  <Link
                    to={`/signup?token=${inviteToken}`}
                    className="text-primary font-medium hover:underline"
                  >
                    Create Account
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
