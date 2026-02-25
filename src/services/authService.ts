/**
 * Minimal authentication service for login/logout flow
 */

const AUTH_API_BASE =
  import.meta.env.VITE_AUTH_API_URL || "https://api.zotok.ai";

export interface SendOTPResponse {
  mobile: {
    resendAttemptsLeft: number;
    sendOtp: boolean;
    otp?: number;
    status?: string;
  };
  temptoken?: string;
}

export interface VerifyOTPResponse {
  token: string;
  refreshToken: string;
  workspaceId?: string;
  id: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  email?: string;
}

export interface WorkspaceResponse {
  id: string;
  spaceName: string;
  isSeller: boolean;
  role: string;
}

export interface WhatsAppConfig {
  id: string;
  workspaceId: string;
  status: string;
  isDefault: boolean;
  provider?: string;
}

class AuthService {
  private tempToken: string | null = null;

  async sendOTP(mobile: string): Promise<SendOTPResponse> {
    const response = await fetch(`${AUTH_API_BASE}/sendotp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mobile,
        authChannel: "mobile",
        doCreateUser: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Failed to send OTP");
    }

    const data = (await response.json()) as SendOTPResponse;
    if (data.temptoken) {
      this.tempToken = data.temptoken;
    }
    return data;
  }

  async verifyOTP(mobile: string, otp: string): Promise<VerifyOTPResponse> {
    const response = await fetch(`${AUTH_API_BASE}/verifyotp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.tempToken ? { Authorization: `Bearer ${this.tempToken}` } : {}),
      },
      body: JSON.stringify({
        mobile,
        authChannel: "mobile",
        otp,
        mfaStatus: false,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || "Invalid OTP");
    }

    const data = (await response.json()) as VerifyOTPResponse;
    return data;
  }

  async getWorkspaces(token: string): Promise<WorkspaceResponse[]> {
    const response = await fetch(`${AUTH_API_BASE}/workspaces`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch workspaces");
    }

    return (await response.json()) as WorkspaceResponse[];
  }

  async getWhatsAppConfigs(token: string, workspaceId: string): Promise<WhatsAppConfig[]> {
    const response = await fetch(
      `${AUTH_API_BASE}/hub/orgs/api/whatsapp-config?sellerWorkspaceId=${workspaceId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch WhatsApp configs");
    }

    return (await response.json()) as WhatsAppConfig[];
  }

  async logout(token: string): Promise<void> {
    try {
      await fetch(`${AUTH_API_BASE}/logout`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch {
      // ignore
    }
  }
}

export const authService = new AuthService();
