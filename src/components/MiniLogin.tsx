import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
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

  useEffect(() => {
    if (!showOtpInput || timer === 0) return;
    const interval = window.setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => window.clearInterval(interval);
  }, [showOtpInput, timer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendOTP = async () => {
    if (mobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await authService.sendOTP(`+91${mobile}`);
      if (response.mobile.resendAttemptsLeft > 0) {
        setShowOtpInput(true);
        setOtp(String(response.mobile.otp ?? ""));
        setTimer(120);
      } else {
        setError(response.mobile.status || "Too many attempts. Try later.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 4) {
      setError("Please enter 4-digit OTP");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const userData = await authService.verifyOTP(`+91${mobile}`, otp);
      const workspaces = await authService.getWorkspaces(userData.token);
      const sellerWorkspace = workspaces.find((w) => w.isSeller);

      if (!sellerWorkspace) {
        setError("No seller workspace found");
        setIsLoading(false);
        return;
      }

      const waConfigs = await authService.getWhatsAppConfigs(
        userData.token,
        sellerWorkspace.id,
      );
      const activeConfig = waConfigs.find(
        (c) => c.isDefault && c.status === "WORKING" && c.provider === "redington",
      );

      const sellerDetails = {
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        email: userData.email || "",
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
    } catch (err: any) {
      setError(err.message || "Invalid OTP");
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

  if (currentConfig?.sellerToken) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-xs text-green-900">
        <p className="font-semibold">Logged In</p>
        <p className="mt-2 text-[11px] text-green-700">
          Workspace: {currentConfig.sellerWorkspaceId}
        </p>
        <p className="text-[11px] text-green-700">
          Mobile: +91 {localStorage.getItem("seller_mobile") || "-"}
        </p>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoading}
          className="mt-3 w-full rounded border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
        >
          {isLoading ? "Logging out..." : "Logout"}
        </button>
      </div>
    );
  }

  const handleMobileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 10);
    setMobile(digits);
    setError("");
  };

  const handleOtpChange = (event: ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
    setOtp(digits);
    setError("");
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-slate-800">
      <p className="mb-2 text-xs font-semibold text-blue-900">Login Required</p>
      {!showOtpInput ? (
        <>
          <input
            type="tel"
            value={mobile}
            onChange={handleMobileChange}
            placeholder="Mobile Number"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            maxLength={10}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleSendOTP}
            disabled={mobile.length !== 10 || isLoading}
            className="mt-3 w-full rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isLoading ? "Sending OTP..." : "Send OTP"}
          </button>
        </>
      ) : (
        <>
          <input
            type="text"
            value={otp}
            onChange={handleOtpChange}
            placeholder="4-digit OTP"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={handleVerifyOTP}
            disabled={otp.length !== 4 || isLoading}
            className="mt-3 w-full rounded bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isLoading ? "Verifying..." : "Verify OTP"}
          </button>
          <button
            type="button"
            onClick={handleSendOTP}
            disabled={isLoading || timer > 0}
            className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
          >
            {timer > 0 ? `Resend in ${formatTime(timer)}` : "Resend OTP"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowOtpInput(false);
              setOtp("");
              setError("");
            }}
            className="mt-1 w-full rounded border border-slate-200 px-3 py-2 text-xs text-slate-600"
          >
            Change mobile
          </button>
        </>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
