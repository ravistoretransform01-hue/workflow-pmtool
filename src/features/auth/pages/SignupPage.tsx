import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
import { BarChart3, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/axios";

const SignupPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Get token from URL
  const inviteToken = searchParams.get('token');

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invitation validation state
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [invitationData, setInvitationData] = useState<any>(null);

  // Redirect to login if no invite token
  useEffect(() => {
    if (!inviteToken) {
      navigate('/login', { replace: true });
    }
  }, [inviteToken, navigate]);

  // Validate invitation token on mount
  useEffect(() => {
    if (inviteToken) {
      validateInvitationToken(inviteToken);
    }
  }, [inviteToken]);

  const validateInvitationToken = async (token: string) => {
    setIsValidatingToken(true);
    try {
const response = await api.post(
  "/validate-invitation-token",
  { token },
  {
    transformRequest: [(data, headers) => {
      delete headers.Authorization;
      return JSON.stringify(data);
    }],
  }
);



      if (response.data && response.data.code === 200) {
        setTokenValid(true);
        setInvitationData(response.data.data);

        // Pre-fill email if available in response
        if (response.data.data?.email) {
          setEmail(response.data.data.email);
        }

        toast({
          title: "Invitation verified",
          description: "Please complete your registration below.",
        });
      } else {
        setTokenValid(false);
        toast({
          title: "Invalid invitation",
          description: "This invitation link is invalid or has expired.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Token validation error:', error);
      setTokenValid(false);
      toast({
        title: "Validation failed",
        description: error.response?.data?.message || "Failed to validate invitation token.",
        variant: "destructive",
      });
    } finally {
      setIsValidatingToken(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your first and last name.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (inviteToken && tokenValid) {
        // Register with invitation
        const response = await api.post('/register-with-invitation', {
          token: inviteToken,
          email: email,
          password: password,
          first_name: firstName,
          last_name: lastName,
          board_id: invitationData?.board_id || "",
        });

        if (response.data && response.data.code === 200) {
          toast({
            title: "Registration successful!",
            description: "Your account has been created. Redirecting to login...",
          });

          // Redirect to login after 2 seconds
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        } else {
          throw new Error(response.data?.message || "Registration failed");
        }
      } else {
        // Regular signup (if you want to support it)
        toast({
          title: "Registration not available",
          description: "Please use an invitation link to register.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration failed",
        description: error.response?.data?.message || error.message || "Failed to create account.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while validating token
  if (inviteToken && isValidatingToken) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Validating invitation...</p>
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
            <CardTitle className="text-2xl font-semibold">Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has expired. Please contact the person who invited you for a new link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => navigate('/login')}
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
              {inviteToken ? "Complete your registration" : "Create your account to get started"}
            </p>
          </div>
        </div>

        {/* Invitation Success Banner */}
        {inviteToken && tokenValid && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">You've been invited!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Complete the form below to join the project.
              </p>
            </div>
          </div>
        )}

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
              <div className="grid grid-cols-2 gap-4">
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
                    className="h-12 bg-background border-border"
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
                    className="h-12 bg-background border-border"
                  />
                </div>
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
                  disabled={isSubmitting || (!!inviteToken && !!invitationData?.email)}
                  className="h-12 bg-background border-border"
                />
                {inviteToken && invitationData?.email && (
                  <p className="text-xs text-muted-foreground">
                    Email is pre-filled from your invitation
                  </p>
                )}
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
                disabled={isSubmitting || (!!inviteToken && tokenValid === false)}
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


// // import { useState, useEffect } from "react";
// // import { Link, useNavigate } from "react-router-dom";
// import { useState } from "react";
// import { Link } from "react-router-dom";
// import { Button } from "@/shared/components/ui/button";
// import { Input } from "@/shared/components/ui/input";
// import { Label } from "@/shared/components/label";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/shared/components/card";
// import { BarChart3, Loader2 } from "lucide-react";
// // import { useToast } from "@/app/hooks/use-toast";
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
