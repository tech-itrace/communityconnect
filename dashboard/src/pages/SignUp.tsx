import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type UserCredential,
} from "firebase/auth";
import { doc, getDoc, } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

// interface UserData {
//   name: string | null;
//   email: string | null;
//   photo: string | null;
//   phone: string;
//   about: string;
//   purpose: string;
//   createdAt: Date;
// }

interface UserFormData {
  name: string;
  phone: string;
  email: string;
  password: string;
  about: string;
  purpose: string;
}


export function SignUp() {

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEmailSignup, setIsEmailSignup] = useState(false);
  const [showSignInForm, setShowSignInForm] = useState(false);
  const [googleUid, setGoogleUid] = useState<string | null>(null);

  const [formData, setFormData] = useState<UserFormData>({
    name: "",
    phone: "",
    email: "",
    password: "",
    about: "",
    purpose: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Reset form state
  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      password: "",
      about: "",
      purpose: "",
    });
    setShowForm(false);
    setIsEmailSignup(false);
    setGoogleUid(null);
    setShowPassword(false);
  };

  // 🔹 Google Sign-In
  const handleGoogleSignIn = async (): Promise<void> => {
    const provider = new GoogleAuthProvider();
    try {
      setLoading(true);
      const result: UserCredential = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const existing = await getDoc(userRef);

      if (!existing.exists()) {
        // New user - show form to collect additional info
        setGoogleUid(user.uid);
        setFormData({
          name: user.displayName || "",
          email: user.email || "",
          phone: "",
          password: "",
          about: "",
          purpose: "",
        });
        setIsEmailSignup(false);
        setShowForm(true);
      } else {
        // Existing user - redirect directly
        const userData = existing.data();
        alert(`✅ Welcome back ${userData.name || user.displayName}!`); 
        navigate("/");
      }
    } catch (error) {
      console.error("Google Sign-In Error:", error);
      alert("❌ Google Sign-In Failed!");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Sign-Up Submit
const handleSubmit = async (e: React.FormEvent): Promise<void> => {
  e.preventDefault();
  setLoading(true);

  try {
    let uid: string;

    // 1. Authenticate with Firebase
    if (isEmailSignup) {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      uid = userCredential.user.uid;
    } else {
      uid = googleUid || auth.currentUser?.uid || "";
    }

    // 2. Save to PostgreSQL via your backend
    const userData = {
      firebase_uid: uid, // Store Firebase UID
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      about: formData.about,
      purpose: formData.purpose,
      photo: auth.currentUser?.photoURL || null,
    };

    const response = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (!response.ok) throw new Error('Failed to save user data');

    alert(`🎉 Welcome ${userData.name}!`);
    navigate("/");
  } catch (error) {
    console.error("Error:", error);
    // alert(`❌ ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  // 🔹 Sign-In Submit
  const handleSignIn = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const userRef = doc(db, "users", userCredential.user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        alert("⚠️ No account found. Please sign up first.");
      } else {
        const userData = snap.data();
        alert(`✅ Welcome back ${userData.name}!`);
        navigate("/");
      }
    } catch (error) {
      console.error("Sign-In Error:", error);
      
      // Better error handling
      // if (error.code === "auth/invalid-credential") {
      //   alert("❌ Invalid email or password. Please try again.");
      // } else if (error.code === "auth/too-many-requests") {
      //   alert("❌ Too many failed attempts. Please try again later.");
      // } else if (error.code === "auth/user-not-found") {
      //   alert("❌ No account found with this email.");
      // } else {
      //   alert(`❌ ${error.message}`);
      // }
    } finally {
      setLoading(false);
    }
  };

  // 🔹 UI
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {showSignInForm
              ? "Sign In"
              : showForm
              ? isEmailSignup
                ? "Create Account"
                : "Complete Your Profile"
              : "Welcome"}
          </h1>
          <p className="text-gray-600">
            {showSignInForm
              ? "Access your account"
              : showForm
              ? isEmailSignup
                ? "Complete your details to continue"
                : "Update your account details"
              : "Sign up to get started"}
          </p>
        </div>

        {/* 🔹 Sign-In Form */}
        {showSignInForm ? (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <form onSubmit={handleSignIn} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  autoComplete="email"
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 pr-10 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  disabled={loading}
                  className="absolute right-3 top-9 text-gray-500 disabled:cursor-not-allowed"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSignInForm(false);
                    resetForm();
                  }}
                  disabled={loading}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 flex justify-center items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Signing In...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : !showForm ? (
          // --- START PAGE ---
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-4 text-sm text-gray-500">OR</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            <button
              onClick={() => {
                setIsEmailSignup(true);
                setShowForm(true);
              }}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sign Up with Email
            </button>

            <p className="text-center text-sm text-gray-600 mt-6">
              Already have an account?{" "}
              <button
                onClick={() => setShowSignInForm(true)}
                disabled={loading}
                className="text-purple-600 font-semibold hover:underline disabled:cursor-not-allowed"
              >
                Sign In
              </button>
            </p>
          </div>
        ) : (
          // --- SIGN-UP/UPDATE FORM ---
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  autoComplete="name"
                  placeholder="John Doe"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={!isEmailSignup || loading}
                  autoComplete="email"
                  placeholder="your@email.com"
                  className={`w-full px-4 py-3 border border-gray-300 rounded-lg ${
                    !isEmailSignup
                      ? "bg-gray-100 cursor-not-allowed"
                      : "focus:ring-2 focus:ring-purple-500"
                  } outline-none disabled:opacity-50`}
                />
              </div>

              {/* Password (Email only) */}
              {isEmailSignup && (
                <div className="relative">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                    placeholder="At least 6 characters"
                    minLength={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 pr-10 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    disabled={loading}
                    className="absolute right-3 top-9 text-gray-500 disabled:cursor-not-allowed"
                  >
                    {showPassword ? "🙈" : "👁️"}
                  </button>
                </div>
              )}

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  autoComplete="tel"
                  placeholder="1234567890"
                  pattern="[0-9]{10}"
                  title="Please enter a 10-digit phone number"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* About */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  About You
                </label>
                <textarea
                  name="about"
                  value={formData.about}
                  onChange={handleInputChange}
                  rows={3}
                  required
                  disabled={loading}
                  placeholder="Tell us about yourself..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 resize-none outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Purpose {!isEmailSignup && <span className="text-gray-400">(Optional)</span>}
                </label>
                <input
                  type="text"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  required={isEmailSignup}
                  disabled={loading}
                  placeholder="What brings you here?"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 flex justify-center items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : (
                    "Finish"
                  )}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  disabled={loading}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}