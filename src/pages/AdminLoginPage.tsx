import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn, checkIsAdmin, signOut } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import bgImage from "@/assets/admin-login-bg.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "vishwa@gmail.com",
      password: "Vishwa@123",
    },
  });

  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, isAdmin, loading, navigate]);

  const onSubmit = async (data: LoginFormData) => {
    setError("");
    setSubmitting(true);
    try {
      const firebaseUser = await signIn(data.email, data.password);
      const adminStatus = await checkIsAdmin(firebaseUser);
      if (!adminStatus) {
        await signOut();
        setError("Access denied. This account does not possess administrator credentials.");
        setSubmitting(false);
        return;
      }
      navigate("/dashboard", { replace: true });
    } catch (err: unknown) {
      const firebaseError = err as { code?: string };
      if (
        firebaseError.code === "auth/user-not-found" ||
        firebaseError.code === "auth/wrong-password" ||
        firebaseError.code === "auth/invalid-credential"
      ) {
        setError("Invalid email address or password. Please verify and try again.");
      } else if (firebaseError.code === "auth/too-many-requests") {
        setError("Too many consecutive attempts. Please pause and try again in a few moments.");
      } else {
        setError("Authentication service unavailable. Please check network connection.");
      }
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f7fb]">
        <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen relative flex items-center justify-center px-4 py-8 overflow-hidden font-sans bg-slate-900 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${bgImage})` }}
    >
      {/* Subtle overlay scrim for contrast */}
      <div className="absolute inset-0 bg-slate-950/25 backdrop-blur-[1px] pointer-events-none" />

      <div className="w-full max-w-110 relative z-10">
        {/* Card */}
        <div className="bg-white/95 backdrop-blur-md border border-white/80 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.35)] rounded-3xl p-6 sm:p-8 space-y-5">
          {/* Brand Header */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-13 w-13 rounded-2xl bg-linear-to-tr from-sky-500 via-sky-500 to-sky-500 shadow-lg shadow-sky-500/25 p-0.5 mb-2.5">
              <div className="h-full w-full bg-white/15 backdrop-blur-xs rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-white" strokeWidth={2.2} />
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Admin Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Mentee Daily Status &amp; Performance Tracking
            </p>
          </div>

          <div className="text-center pb-1">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">
              Administrator Sign In
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your authorized admin credentials to proceed
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-start gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 mt-1 shrink-0" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            {/* Email Address */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700 block">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="vishwa@gmail.com"
                  className="pl-10 h-11 rounded-xl bg-white border-slate-200 hover:border-slate-300 text-xs sm:text-sm transition-all"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700 block">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  className="pl-10 pr-10 h-11 rounded-xl bg-white border-slate-200 hover:border-slate-300 text-xs sm:text-sm tracking-wider transition-all"
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-rose-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 bg-linear-to-r from-sky-500 to-sky-500 hover:from-sky-600 hover:to-sky-600 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-sky-500/25 border-0 transition-all cursor-pointer mt-2"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying Credentials...
                </>
              ) : (
                "Access Admin Workspace"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
