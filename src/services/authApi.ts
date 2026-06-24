import type { User, UserRole } from "../types";
import { api } from "./apiClient";

export interface LoginInput {
  username: string;
  password: string;
}

export interface RegisterInput extends LoginInput {
  role: UserRole;
  inviteCode: string;
}

export function getCurrentUser() {
  return api<{ user: User | null }>("/me.php");
}

export function login(input: LoginInput) {
  return api<{ user: User }>("/login.php", {
    method: "POST",
    body: input,
  });
}

export function register(input: RegisterInput) {
  return api<{ user: User }>("/register.php", {
    method: "POST",
    body: input,
  });
}

export function logout() {
  return api("/logout.php", { method: "POST" });
}
