import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../../hooks/useAuth";
import type { LoginCredentials } from "../../types/auth";
import { getRoleBasedRedirect } from "../../utils/roleBasedRedirect";
import { NotificationPermissionPrompt } from "../../components/notifications/NotificationPermissionPrompt";
import { shouldShowPermissionPrompt } from "../../utils/notificationPermission";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearAuthError } = useAuth();

  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: "",
    password: "",
    rememberMe: false,
  });

  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  const from = (location.state as any)?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (error) {
      clearAuthError();
    }
  }, []);

  const handleInputChange =
    (field: keyof LoginCredentials) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setCredentials((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
      if (error) clearAuthError();
    };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials((prev) => ({
      ...prev,
      rememberMe: e.target.checked,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!credentials.username || !credentials.password) return;

    try {
      const result = await login(credentials);

      if (result.type === "auth/login/fulfilled") {
        const payload = result.payload as any;
        const role = payload?.role || null;
        const userRoles = payload?.user?.roles || [];

        if (shouldShowPermissionPrompt()) {
          setShowPermissionPrompt(true);
          setTimeout(() => {
            const redirectPath = getRoleBasedRedirect(role, userRoles);
            navigate(redirectPath, { replace: true });
          }, 1000);
        } else {
          const redirectPath = getRoleBasedRedirect(role, userRoles);
          navigate(redirectPath, { replace: true });
        }
      }
    } catch (err) {
      console.log("Login failed:", err);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - Medical Imaging Viewer</title>
      </Helmet>

      <NotificationPermissionPrompt
        autoShow={showPermissionPrompt}
        onGranted={() => console.log("Notification permission granted")}
        onDenied={() => console.log("Notification permission denied")}
        onDismiss={() => setShowPermissionPrompt(false)}
      />

      {/* FULL PAGE LAYOUT (NO OVERFLOW BUG ANYWHERE) */}
      <div
        className="
        min-h-screen 
        w-full 
        bg-gray-50 
        flex flex-col 
        lg:flex-row 
        overflow-y-auto
      "
      >
        {/* LEFT BRAND PANEL */}
        <div
          className="
          hidden lg:flex 
          flex-col justify-between 
          w-1/2 
          bg-gradient-to-br from-indigo-600 to-purple-700 
          text-white p-14
        "
        >
          <div>
            <h1 className="text-5xl font-extrabold tracking-tight">ScanFlowAI</h1>
            <p className="text-indigo-100 text-lg mt-4 leading-relaxed">
              AI-powered medical imaging, simplified and revolutionized.
            </p>
          </div>

          <p className="text-indigo-200 text-sm">
            © 2025 ScanFlowAI — All rights reserved.
          </p>
        </div>

        {/* RIGHT SIDE LOGIN PANEL */}
        <div
          className="
          w-full lg:w-1/2 
          flex 
          items-start lg:items-center   /* MOBILE = TOP, DESKTOP = CENTER */
          justify-center 
          p-6
        "
        >
          {/* LOGIN CARD */}
          <div
            className="
            bg-white 
            rounded-2xl 
            shadow-xl 
            p-8 
            w-full max-w-md
            
            max-h-[95vh] 
            overflow-y-auto
            scrollbar-thin scrollbar-thumb-gray-300

            animate-[fadeIn_0.4s_ease]
          "
          >
            {/* HEADER */}
            <h2 className="text-3xl font-bold text-gray-900 text-center">
              Welcome Back
            </h2>
            <p className="text-gray-600 text-center text-sm mt-1">
              Sign in to your ScanFlowAI workspace
            </p>

            {/* ERROR */}
            {error && (
              <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* LOGIN FORM */}
            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username or Email
                </label>
                <input
                  type="text"
                  value={credentials.username}
                  onChange={handleInputChange("username")}
                  required
                  className="
                    w-full px-4 py-3 rounded-lg bg-gray-100 
                    border border-gray-300 text-sm 
                    focus:ring-2 focus:ring-indigo-500
                    focus:bg-white transition
                  "
                  placeholder="Enter your username"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={credentials.password}
                  onChange={handleInputChange("password")}
                  required
                  className="
                    w-full px-4 py-3 rounded-lg bg-gray-100 
                    border border-gray-300 text-sm 
                    focus:ring-2 focus:ring-indigo-500
                    focus:bg-white transition
                  "
                  placeholder="Enter your password"
                />
              </div>

              {/* REMEMBER ME */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={credentials.rememberMe}
                  onChange={handleCheckboxChange}
                  className="h-4 w-4"
                />
                <span className="text-sm text-gray-700">Remember me</span>
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={
                  isLoading ||
                  !credentials.username ||
                  !credentials.password
                }
                className={`
                w-full py-3 rounded-lg text-white font-semibold text-sm shadow-md 
                transition active:scale-[0.97]
                ${
                  isLoading
                    ? "bg-indigo-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }
              `}
              >
                {isLoading ? "Processing..." : "Sign In"}
              </button>

              {/* Forgot Password */}
              <div className="text-center mt-1">
                <button className="text-sm text-indigo-600 hover:underline">
                  Forgot your password?
                </button>
              </div>

              {/* Register Link */}
              <p className="text-center text-sm text-gray-700 mt-2">
                New here?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/app/register")}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  Create an account
                </button>
              </p>
            </form>

            {/* FOOTER */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500">
                Medical Imaging Platform — v1.0.0
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
