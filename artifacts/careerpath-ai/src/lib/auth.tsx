import { useEffect, useState, createContext, useContext } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, logout as logoutRequest, getGetMeQueryKey } from "@workspace/api-client-react";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionVersion, setSessionVersion] = useState(0);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: user, isLoading: isUserLoading, isError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  useEffect(() => {
    if (isError) {
      setSessionVersion((version) => version + 1);
    }
  }, [isError]);

  const login = async () => {
    setSessionVersion((version) => version + 1);
    await queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    await queryClient.refetchQueries({ queryKey: getGetMeQueryKey(), type: "active" });
    setLocation("/dashboard");
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } finally {
      setSessionVersion((version) => version + 1);
      queryClient.removeQueries({ queryKey: getGetMeQueryKey() });
      setLocation("/login");
    }
  };

  const isLoading = isUserLoading && sessionVersion >= 0;
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
