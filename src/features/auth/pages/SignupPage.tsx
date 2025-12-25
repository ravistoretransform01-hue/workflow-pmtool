// import { useState, useEffect } from "react";
// import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
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
// import { useToast } from "@/app/hooks/use-toast";
// import { useAuth } from "@/hooks/useAuth";
// import { useToast } from "@/hooks/use-toast";

const SignupPage = () => {
  // const navigate = useNavigate();
  //   const { signUp, user, loading: authLoading } = useAuth();
  // const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitting] = useState(false);

  //   useEffect(() => {
  //     if (user && !authLoading) {
  //       navigate("/dashboard");
  //     }
  //   }, [user, authLoading, navigate]);

  //   const handleSubmit = async (e: React.FormEvent) => {
  //     e.preventDefault();

  //     if (password !== confirmPassword) {
  //       toast({
  //         title: "Passwords don't match",
  //         description: "Please make sure your passwords match.",
  //         variant: "destructive",
  //       });
  //       return;
  //     }

  //     if (password.length < 6) {
  //       toast({
  //         title: "Password too short",
  //         description: "Password must be at least 6 characters long.",
  //         variant: "destructive",
  //       });
  //       return;
  //     }

  //     setIsSubmitting(true);

  //     const { error } = await signUp(email, password, name);

  //     if (error) {
  //       let errorMessage = error.message;
  //       if (error.message.includes("already registered")) {
  //         errorMessage = "An account with this email already exists. Please sign in instead.";
  //       }

  //       toast({
  //         title: "Sign up failed",
  //         description: errorMessage,
  //         variant: "destructive",
  //       });
  //       setIsSubmitting(false);
  //     } else {
  //       toast({
  //         title: "Account created!",
  //         description: "You can now sign in with your credentials.",
  //       });
  //       navigate("/login");
  //     }
  //   };

  //   if (authLoading) {
  //     return (
  //       <div className="min-h-screen w-full flex items-center justify-center bg-background">
  //         <Loader2 className="h-8 w-8 animate-spin text-primary" />
  //       </div>
  //     );
  //   }

  // const handleSubmit = async (e: React.FormEvent) => {};
  const handleSubmit = async () => {};
  
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
              Create your account to get started
            </p>
          </div>
        </div>

        {/* Signup Card */}
        <Card className="shadow-card border-border bg-card">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-semibold">
              Create Account
            </CardTitle>
            <CardDescription>
              Enter your details to create your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="h-12 bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                  className="h-12 bg-background border-border"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="h-12 bg-background border-border"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base font-medium shadow-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-primary font-medium hover:underline"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SignupPage;
