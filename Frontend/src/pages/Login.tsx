import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Function to ensure redirection happens
  const ensureRedirect = () => {
    // Add a small delay to ensure redirect happens
    setTimeout(() => {
      if (currentUser) {
        console.log("Forcing navigation to dashboard");
        navigate("/");
      }
    }, 500);
  };

  // Check if user is already logged in and redirect if so
  useEffect(() => {
    if (currentUser) {
      console.log("User already logged in, redirecting to dashboard");
      navigate("/");
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    
    try {
      setError("");
      setLoading(true);
      const user = await login(email, password);
      
      toast({
        title: "Login successful",
        description: "Welcome back!",
        variant: "default",
      });
      
      // Explicitly navigate after successful login
      navigate("/");
      
      // Ensure redirect happens
      ensureRedirect();
    } catch (error: any) {
      setError(
        error.code === "auth/user-not-found" || error.code === "auth/wrong-password"
          ? "Invalid email or password"
          : "Failed to log in"
      );
      toast({
        title: "Login failed",
        description: error.code === "auth/user-not-found" || error.code === "auth/wrong-password"
          ? "Invalid email or password"
          : "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            CRM Pro Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access your account
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 p-4 rounded text-red-500 text-sm">
                  {error}
                </div>
              )}
              
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1"
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1"
                  placeholder="Enter your password"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <Link to="/forgot-password" className="text-blue-600 hover:text-blue-500">
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </div>
          
          <div className="text-center text-sm">
            <p>
              Don't have an account?{" "}
              <Link to="/signup" className="text-blue-600 hover:text-blue-500">
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login; 