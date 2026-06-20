import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Login from "./login";

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  mutate: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@workspace/api-client-react", () => ({
  useLogin: () => ({ mutate: mocks.mutate, isPending: false }),
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ login: mocks.login }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("wouter", () => ({
  Link: ({ children, href, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

beforeEach(() => {
  window.history.replaceState({}, "", "/login");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("login form", () => {
  it("blocks invalid credentials before calling the API", async () => {
    render(<Login />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "not-an-email" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByText("Invalid email address")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 6 characters")).toBeInTheDocument();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it("logs in and reports success with valid credentials", async () => {
    const user = { id: 1, name: "Test User", email: "member@example.com" };
    mocks.mutate.mockImplementation((_request, callbacks) => callbacks.onSuccess({ user }));
    render(<Login />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "member@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => expect(mocks.login).toHaveBeenCalledWith(user));
    expect(mocks.mutate).toHaveBeenCalledWith(
      { data: { email: "member@example.com", password: "correct-password" } },
      expect.any(Object),
    );
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Welcome back!" }));
  });
});
