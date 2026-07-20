import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/button";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-xl text-muted-foreground">Page not found</p>
      <Button onClick={() => navigate("/home")} className="mt-4">
        Go to Home
      </Button>
    </div>
  );
};

export default NotFound;
