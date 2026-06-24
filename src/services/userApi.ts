import type { ManagedUser, UserRole } from "../types";
import { api } from "./apiClient";

export interface CreateManagedUserInput {
  username: string;
  password: string;
  role: UserRole;
}

export function fetchManagedUsers() {
  return api<{ users: ManagedUser[] }>("/users.php");
}

export function createManagedUser(input: CreateManagedUserInput) {
  return api("/users.php", {
    method: "POST",
    body: input,
  });
}
