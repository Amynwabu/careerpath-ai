import { useEffect, useState, createContext, useContext } from "react";
import { useLocation } from "wouter";
import {
  getGetMeQueryKey,
  logout as logoutRequest,
  useGetMe,
  setAuthTokenGetter,
} from "@workspace/api-client-react";

const TOKEN_KEY = "careerpath_token";

// Setup token getter for API client
setAuthTokenGetter(() => localStorage.getItem(TOKEN_KEY));

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(
    localStorage.getItem(TOKEN_KEY),
  );
  const [, setLocation] = useLocation();

  const {
    data: user,
    isLoading: isUserLoading,
    isError,
  } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: true,
      retry: false,
    },
  });

  useEffect(() => {
    if (isError) {
      localStorage.removeItem(TOKEN_KEY);
      setTokenState(null);
    }
  }, [isError]);

  const login = (newToken: string) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    setTokenState(newToken);
    setLocation("/dashboard");
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      setTokenState(null);
      setLocation("/login");
    }
  };

  const isLoading = isUserLoading;
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function ProtectedRoute({ component: Component, ...rest }: any) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isLoading, isAuthenticated, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-t-2 border-primary animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <Component {...rest} />;
}
