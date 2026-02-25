import { useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";

export interface CopilotAuthConfig {
  sellerToken: string;
  sellerWorkspaceId: string;
  waConfigId?: string;
  sellerDetails?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    mobile?: string;
  };
}

interface MiniLoginProps {
  currentConfig: CopilotAuthConfig | null;
  onLoginSuccess: (config: CopilotAuthConfig) => void;
  onLogout: () => void;
}

export function MiniLogin({ currentConfig, onLoginSuccess, onLogout }: MiniLoginProps) {
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [timer, setTimer] = useState(120);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const isLoggedIn = Boolean(currentConfig?.sellerToken && currentConfig?.sellerWorkspaceId);

  useEffect(() => {
    if (!showOtpInput || timer <= 0) return;
    const interval = window.setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => window.clearInterval(interval);
  }, [showOtpInput, timer]);

  const timerText = useMemo(() => {
    const mins = Math.floor(timer / 60);
    const secs = timer % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }, [timer]);

  const handleSendOtp = async () => {
    if (mobile.length !== 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const response = await authService.sendOTP(`+91${mobile}`);
      if ((response.mobile?.resendAttemptsLeft ?? 0) > 0) {
        setShowOtpInput(true);
        if (response.mobile?.otp) {
          setOtp(String(response.mobile.otp));
        }
        setTimer(120);
      } else {
        setError(response.mobile?.status || "Failed to send OTP");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 4) {
      setError("Enter a valid 4-digit OTP");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const userData = await authService.verifyOTP(`+91${mobile}`, otp);
      const workspaces = await authService.getWorkspaces(userData.token);
      const sellerWorkspace = workspaces.find((w) => w.isSeller);
      if (!sellerWorkspace) {
        throw new Error("No seller workspace found");
      }

      const waConfigs = await authService.getWhatsAppConfigs(
        userData.token,
        sellerWorkspace.id,
      );
      const activeConfig = waConfigs.find(
        (c) => c.isDefault && c.status === "WORKING" && c.provider === "redington",
      );

      const sellerDetails = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        mobile: userData.mobile || `+91${mobile}`,
      };

      const config: CopilotAuthConfig = {
        sellerToken: userData.token,
        sellerWorkspaceId: sellerWorkspace.id,
        waConfigId: activeConfig?.id,
        sellerDetails,
      };

      localStorage.setItem("seller_token", config.sellerToken);
      localStorage.setItem("seller_refresh_token", userData.refreshToken);
      localStorage.setItem("seller_workspace_id", config.sellerWorkspaceId);
      localStorage.setItem("seller_mobile", mobile);
      if (config.waConfigId) {
        localStorage.setItem("wa_config_id", config.waConfigId);
      }
      if (config.sellerDetails) {
        localStorage.setItem("seller_details", JSON.stringify(config.sellerDetails));
      }

      onLoginSuccess(config);
      setShowOtpInput(false);
      setOtp("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "OTP verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      if (currentConfig?.sellerToken) {
        await authService.logout(currentConfig.sellerToken);
      }
    } finally {
      localStorage.removeItem("seller_token");
      localStorage.removeItem("seller_refresh_token");
      localStorage.removeItem("seller_workspace_id");
      localStorage.removeItem("seller_mobile");
      localStorage.removeItem("wa_config_id");
      localStorage.removeItem("seller_details");
      onLogout();
      setMobile("");
      setOtp("");
      setShowOtpInput(false);
      setError("");
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-slate-900">Mini Login</h2>
        <p className="text-xs text-slate-500">Authenticate seller token for AssistantUI runtime</p>
      </div>

      {isLoggedIn && currentConfig ? (
        <div className="space-y-3">
          <div className="rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
            Logged in
          </div>
          <div className="text-xs text-slate-600">
            <div className="truncate">Workspace: {currentConfig.sellerWorkspaceId}</div>
            <div>Mobile: +91 {localStorage.getItem("seller_mobile") || "-"}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoading}
            className="w-full rounded bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isLoading ? "Logging out..." : "Logout"}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {!showOtpInput ? (
            <>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="10-digit mobile"
                value={mobile}
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, "").slice(0, 10);
                  setMobile(next);
                  setError("");
                }}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isLoading || mobile.length !== 10}
                className="w-full rounded bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {isLoading ? "Sending OTP..." : "Send OTP"}
              </button>
            </>
          ) : (
            <>
              <input
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                placeholder="4-digit OTP"
                value={otp}
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setOtp(next);
                  setError("");
                }}
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isLoading || otp.length !== 4}
                className="w-full rounded bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {isLoading ? "Verifying..." : "Verify OTP"}
              </button>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isLoading || timer > 0}
                className="w-full rounded border border-slate-300 px-3 py-2 text-xs text-slate-700 disabled:opacity-60"
              >
                {timer > 0 ? `Resend in ${timerText}` : "Resend OTP"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOtpInput(false);
                  setOtp("");
                  setError("");
                }}
                className="w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-600"
              >
                Change mobile number
              </button>
            </>
          )}

          {error ? (
            <div className="rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">{error}</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
