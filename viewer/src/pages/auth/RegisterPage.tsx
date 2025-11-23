import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import axios from "axios";

interface RegisterPayload {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  hospitalName: string;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState<RegisterPayload>({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    hospitalName: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange =
    (field: keyof RegisterPayload) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
      setError(null);
      setSuccess(null);
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post("/auth/register", form, {
        headers: { "Content-Type": "application/json" },
      });

      if (response.data?.success) {
        setSuccess("Registration successful! Redirecting...");
        setTimeout(() => navigate("/app/login"), 2000);
      } else {
        setError(response.data?.message || "Registration failed");
      }
    } catch (err: any) {
      setError(
        err?.response?.data?.message || err?.message || "Registration failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Register - Medical Imaging Viewer</title>
      </Helmet>

      {/* FULL PAGE WITH ALL FIXES */}
      <div className="
        min-h-screen 
        w-full 
        bg-gray-50 
        flex flex-col 
        lg:flex-row 
        overflow-y-auto   /* MAIN FIX #1 */
      ">
        
        {/* LEFT PANEL (LARGE SCREENS ONLY) */}
        <div className="
          hidden lg:flex 
          flex-col justify-between 
          w-1/2 
          bg-gradient-to-br from-indigo-600 to-purple-700 
          text-white p-14
        ">
          <div>
            <h1 className="text-5xl font-extrabold tracking-tight">ScanFlowAI</h1>
            <p className="text-indigo-100 text-lg mt-4 leading-relaxed">
              Advanced AI-driven medical imaging workflow platform.
            </p>
          </div>

          <p className="text-indigo-200 text-sm">
            © 2025 ScanFlowAI — All rights reserved.
          </p>
        </div>

        {/* RIGHT SIDE FORM PANEL */}
        <div className="
          w-full lg:w-1/2 
          flex 
          justify-center 
          items-start lg:items-center   /* MAIN FIX #2 (mobile start, desktop center) */
          p-6
        ">
          
          {/* FORM CARD */}
          <div className="
            bg-white 
            rounded-2xl 
            shadow-xl 
            p-8 
            w-full max-w-xl
            
            max-h-[95vh]        /* MAIN FIX #3 */
            overflow-y-auto     /* MAIN FIX #4 */
            scrollbar-thin scrollbar-thumb-gray-300

            animate-[fadeIn_0.4s_ease]
          ">

            {/* HEADER */}
            <h2 className="text-3xl font-bold text-gray-900 text-center">
              Create Your Account
            </h2>
            <p className="text-gray-600 text-center text-sm mt-1">
              Join the AI-powered healthcare imaging ecosystem
            </p>

            {/* ALERTS */}
            {error && (
              <div className="mt-4 bg-red-100 border border-red-300 text-red-700 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 bg-green-100 border border-green-300 text-green-700 p-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            {/* FORM */}
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">

              {/* USERNAME */}
              <div>
                <label className="text-sm text-gray-700 mb-1 block">Username</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={handleChange("username")}
                  required
                  className="
                    w-full px-4 py-3 rounded-lg bg-gray-100 
                    border border-gray-300 
                    text-sm 
                    focus:ring-2 focus:ring-indigo-500
                    focus:bg-white transition
                  "
                />
              </div>

              {/* EMAIL */}
              <div>
                <label className="text-sm text-gray-700 mb-1 block">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={handleChange("email")}
                  required
                  className="
                    w-full px-4 py-3 rounded-lg bg-gray-100 
                    border border-gray-300 
                    text-sm 
                    focus:ring-2 focus:ring-indigo-500
                    focus:bg-white transition
                  "
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label className="text-sm text-gray-700 mb-1 block">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={handleChange("password")}
                  required
                  className="
                    w-full px-4 py-3 rounded-lg bg-gray-100 
                    border border-gray-300 
                    text-sm 
                    focus:ring-2 focus:ring-indigo-500
                    focus:bg-white transition
                  "
                />
              </div>

              {/* NAME ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-gray-700 mb-1 block">First Name</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={handleChange("firstName")}
                    required
                    className="
                      w-full px-4 py-3 rounded-lg bg-gray-100 
                      border border-gray-300 
                      text-sm 
                      focus:ring-2 focus:ring-indigo-500
                      focus:bg-white transition
                    "
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-700 mb-1 block">Last Name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={handleChange("lastName")}
                    required
                    className="
                      w-full px-4 py-3 rounded-lg bg-gray-100 
                      border border-gray-300 
                      text-sm 
                      focus:ring-2 focus:ring-indigo-500
                      focus:bg-white transition
                    "
                  />
                </div>
              </div>

              {/* HOSPITAL NAME */}
              <div>
                <label className="text-sm text-gray-700 mb-1 block">Hospital Name</label>
                <input
                  type="text"
                  value={form.hospitalName}
                  onChange={handleChange("hospitalName")}
                  required
                  className="
                    w-full px-4 py-3 rounded-lg bg-gray-100 
                    border border-gray-300 
                    text-sm 
                    focus:ring-2 focus:ring-indigo-500
                    focus:bg-white transition
                  "
                />
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={isLoading}
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
                {isLoading ? "Processing..." : "Register"}
              </button>

              {/* REDIRECT */}
              <p className="text-center text-sm text-gray-700">
                Already have an account?
                <button
                  type="button"
                  onClick={() => navigate("/app/login")}
                  className="text-indigo-600 font-semibold hover:underline ml-1"
                >
                  Sign In
                </button>
              </p>

            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;
