import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/card";
import { BarChart3, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/shared/components/ui/button";

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading, error, isAuthenticated, clearAuthError } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/home");
    }
  }, [isAuthenticated, navigate]);

  // Show error toast if login fails
  useEffect(() => {
    if (error) {
      // Determine error title based on error message
      let title = "Login failed";
      let description = error;

      if (error.toLowerCase().includes("unknown email") || error.toLowerCase().includes("email address")) {
        title = "Invalid email";
        description = "The email address you entered is not registered. Please check and try again.";
      } else if (error.toLowerCase().includes("incorrect password") || error.toLowerCase().includes("password")) {
        title = "Invalid password";
        description = "The password you entered is incorrect. Please try again.";
      }

      toast.error(title, {
        description: description,
      });
      clearAuthError();
    }
  }, [error, clearAuthError]);

  // Validation helper
  const validateForm = (): boolean => {
    // Check if username is empty
    if (!username || username.trim() === "") {
      toast.error("Validation error", {
        description: "Username or email is required",
      });
      return false;
    }

    // Check if username is valid email or has minimum length
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidEmail = emailRegex.test(username);
    const isValidUsername = username.trim().length >= 3;

    if (!isValidEmail && !isValidUsername) {
      toast.error("Validation error", {
        description: "Username must be at least 3 characters or a valid email",
      });
      return false;
    }

    // Check if password is empty
    if (!password || password.trim() === "") {
      toast.error("Validation error", {
        description: "Password is required",
      });
      return false;
    }

    // Check if password has minimum length
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

    // Validate form
    if (!validateForm()) {
      return;
    }

    const result = await login({
      username: username.trim(),
      password,
    });

    if (result.type === "auth/login/fulfilled") {
      toast.success("Login successful!", {
        description: "Welcome back!",
      });
      navigate("/home");
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-dark flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl shadow-elegant backdrop-blur-sm">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Project Manager
            </h1>
            <p className="text-muted-foreground text-lg">
              Welcome back! Sign in to continue
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-card border-border bg-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold">Sign In</CardTitle>
            <CardDescription>
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
                  disabled={loading}
                  className="h-12 bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-12 bg-background border-border"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium shadow-lg"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="text-primary font-medium hover:underline"
                >
                  Create Account
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
