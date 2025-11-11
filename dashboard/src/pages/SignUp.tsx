import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import type { User, UserCredential } from "firebase/auth";
import { doc, getDoc, setDoc, type DocumentReference, type DocumentSnapshot } from "firebase/firestore";
import { auth, db } from "../lib/firebase";


// Define the user data structure for Firestore
interface UserData {
  name: string | null;
  email: string | null;
  photo: string | null;
  phone: string;
  about: string;
  purpose: string;
  createdAt: Date;
}

// Define the form data structure
interface UserFormData {
  name: string;
  phone: string;
  email: string;
  about: string;
  purpose: string;
}

export function SignUp() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    phone: '',
    email: '',
    about: '',
    purpose: '',
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

  const handleGoogleSignIn = async (): Promise<void> => {
    const provider: GoogleAuthProvider = new GoogleAuthProvider();
    
    try {
      setLoading(true);
      
      const result: UserCredential = await signInWithPopup(auth, provider);
      const user: User = result.user;

      const userRef: DocumentReference = doc(db, "users", user.uid);
      const docSnap: DocumentSnapshot = await getDoc(userRef);

      // User data with proper typing
      const userData: UserData = {
        name: user.displayName,
        email: user.email,
        photo: user.photoURL,
        phone: formData.phone || "",
        about: "",
        purpose: "",
        createdAt: new Date(),
      };

      if (!docSnap.exists()) {
        await setDoc(userRef, userData);
      } else {
        // Optionally update data if user exists
        await setDoc(userRef, userData, { merge: true });
      }

      alert(`🎉 Welcome ${user.displayName}! Your data is saved to Firestore.`);
      navigate('/');
    } catch (error: unknown) {
      // Type-safe error handling
      if (error instanceof Error) {
        console.error("Google Sign-In Error:", error.message);
      } else {
        console.error("Google Sign-In Error:", error);
      }
      alert("❌ Google Sign-In Failed!");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    
    try {
      setLoading(true);
      console.log('Form submitted:', formData);
      
      // Save to localStorage (you can replace this with Firebase)
      localStorage.setItem('user', JSON.stringify(formData));
      
      alert('✅ Account created successfully!');
      navigate('/');
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Form submission error:", error.message);
      }
      alert("❌ Failed to create account!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {showForm ? 'Create Account' : 'Welcome'}
          </h1>
          <p className="text-gray-600">
            {showForm ? 'Fill in your details to get started' : 'Sign up to continue'}
          </p>
        </div>

        {!showForm ? (
          /* Initial Options */
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            {/* Google Sign In Button */}
<button
  onClick={handleGoogleSignIn}
  disabled={loading}
  className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
>
  {/* Spinner (only shows while loading) */}
  {loading && (
    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
  )}

  {/* Google logo */}
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

  {/* Text stays visible */}
  <span>
    {loading ? "Signing in..." : "Continue with Google"}
  </span>
</button>


            {/* Divider */}
            <div className="flex items-center my-6">
              <div className="flex-1 border-t border-gray-300"></div>
              <span className="px-4 text-sm text-gray-500">OR</span>
              <div className="flex-1 border-t border-gray-300"></div>
            </div>

            {/* Form Sign Up Button */}
            <button
              onClick={() => setShowForm(true)}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-4 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sign Up with Email
            </button>

            {/* Sign In Link */}
            <div className="text-center mt-6">
              <p className="text-gray-600">
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/')}
                  className="text-purple-500 font-semibold hover:text-purple-600 transition-colors"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>
        ) : (
          /* Registration Form */
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name Field */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                  placeholder="Enter your full name"
                  required
                  disabled={loading}
                />
              </div>

              {/* Phone Field */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                  placeholder="Enter your phone number"
                  required
                  disabled={loading}
                />
              </div>

              {/* Email Field */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                  placeholder="Enter your email address"
                  required
                  disabled={loading}
                />
              </div>

              {/* About Field */}
              <div>
                <label
                  htmlFor="about"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  About You
                </label>
                <textarea
                  id="about"
                  name="about"
                  value={formData.about}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none resize-none"
                  placeholder="Tell us about yourself..."
                  required
                  disabled={loading}
                />
              </div>

              {/* Purpose Field */}
              <div>
                <label
                  htmlFor="purpose"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Purpose
                </label>
                <input
                  type="text"
                  id="purpose"
                  name="purpose"
                  value={formData.purpose}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                  placeholder="What brings you here?"
                  required
                  disabled={loading}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={loading}
                  className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}