import { create } from "zustand";

export interface User {
  id: string;
  email: string;
  name: string;
  mfaEnabled: boolean;
}

export interface Organization {
  id: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  organization: Organization | null;
  organizations: Organization[];
  isAuthenticated: boolean;
  setAuth: (user: User, organization: Organization | null, token: string) => void;
  setOrganizations: (orgs: Organization[]) => void;
  setActiveOrganization: (org: Organization) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null,
  organizations: [],
  isAuthenticated: false,

  setAuth: (user, organization, token) => {
    localStorage.setItem("accessToken", token);
    if (organization) {
      localStorage.setItem("activeOrganizationId", organization.id);
    }
    localStorage.setItem("user", JSON.stringify(user));
    if (organization) {
      localStorage.setItem("organization", JSON.stringify(organization));
    }
    set({ user, organization, isAuthenticated: true });
  },

  setOrganizations: (organizations) => {
    set({ organizations });
  },

  setActiveOrganization: (organization) => {
    localStorage.setItem("activeOrganizationId", organization.id);
    localStorage.setItem("organization", JSON.stringify(organization));
    set({ organization });
    // Reload components requiring org context
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  },

  logout: () => {
    localStorage.clear();
    set({ user: null, organization: null, organizations: [], isAuthenticated: false });
  },

  initialize: () => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user");
      const orgStr = localStorage.getItem("organization");
      const token = localStorage.getItem("accessToken");

      if (token && userStr) {
        set({
          user: JSON.parse(userStr),
          organization: orgStr ? JSON.parse(orgStr) : null,
          isAuthenticated: true,
        });
      }
    }
  },
}));
