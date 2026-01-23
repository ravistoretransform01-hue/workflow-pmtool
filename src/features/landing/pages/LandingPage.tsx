import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { BarChart3, Users, FolderKanban, ArrowRight } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/home");
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-screen w-full bg-gradient-dark flex items-center justify-center">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center animate-fade-in w-full">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 border border-primary/20 rounded-3xl shadow-elegant mb-8 animate-slide-up backdrop-blur-sm">
          <BarChart3 className="w-10 h-10 text-primary" />
        </div>

        <h1
          className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-slide-up"
          style={{ animationDelay: "0.1s" }}
        >
          Project Manager
        </h1>

        <p
          className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl animate-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          Streamline your workflow, collaborate with your team, and deliver
          projects on time
        </p>

        <div
          className="flex flex-col sm:flex-row gap-4 mb-16 animate-slide-up"
          style={{ animationDelay: "0.3s" }}
        >
          <Link to="/signup">
            <Button
              size="lg"
              className="h-14 px-8 text-lg font-medium shadow-elegant"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/login">
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-lg font-medium border-2 border-border hover:bg-card/50"
            >
              Sign In
            </Button>
          </Link>
        </div>

        {/* Features Grid */}
        <div
          className="grid md:grid-cols-3 gap-6 w-full max-w-5xl animate-slide-up"
          style={{ animationDelay: "0.4s" }}
        >
          <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-card border border-border">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <FolderKanban className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Project Tracking</h3>
            <p className="text-muted-foreground">
              Keep track of all your projects in one centralized dashboard
            </p>
          </div>

          <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-card border border-border">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Team Collaboration</h3>
            <p className="text-muted-foreground">
              Work seamlessly with your team members in real-time
            </p>
          </div>

          <div className="bg-card/95 backdrop-blur-sm rounded-2xl p-6 shadow-card border border-border">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Analytics & Reports</h3>
            <p className="text-muted-foreground">
              Get insights into project progress and team performance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
