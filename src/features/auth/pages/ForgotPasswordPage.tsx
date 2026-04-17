import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/label";
import { authApi } from "../authApi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { appName } from "@/lib/constants";
import { Logo } from "@/shared/components/Logo";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Invalid Email", {
        description: "Please enter a valid email address",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.forgotPassword(email);
      if (response.success) {
        toast.success("Success", {
          description: response.message || "Reset link has been sent.",
        });
        setEmail(""); // Clear email field on success
      } else {
        toast.error("Error", {
          description:
            response.message || "Something went wrong. Please try again.",
        });
      }
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to send reset link. Please try again.";
      toast.error("Error", {
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-dark flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-md space-y-8 animate-slide-up">
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl shadow-elegant backdrop-blur-sm">
            <Logo
              size={64}
              rounded="rounded-xl"
              className="mx-auto"
              bgColor="bg-white"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {appName}
            </h1>
            <p className="text-muted-foreground text-lg">
              Recover your account
            </p>
          </div>
        </div>

        {/* Card */}
        <Card className="shadow-card border-border bg-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold">
              Forgot Password
            </CardTitle>
            <CardDescription>
              Enter your email address to receive a password reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                    Sending...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>

              <div className="text-center mt-4">
                <Link
                  to="/login"
                  className="text-sm text-muted-foreground hover:text-primary flex items-center justify-center gap-2 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
