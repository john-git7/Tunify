import React, { useState } from 'react';
import axios from 'axios';
import { X, Mail, Lock, ToggleLeft as Google } from 'lucide-react';
import { auth } from '../firebase';
import { toast } from 'react-toastify';
import {
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';

function AuthModal({ isOpen, onClose }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const endpoint = isSignUp ? '/api/auth/register' : '/api/auth/login';
    const payload = isSignUp ? { name, email, password } : { email, password };

    try {
      const { data } = await axios.post(endpoint, payload);
      localStorage.setItem('token', data.token);
      toast.success('Authentication successful!');
      onClose();
    } catch (error) {
      const message = error.response?.data?.message || 'Something went wrong';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

 const handleGoogleSignIn = async () => {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const idToken = await user.getIdToken();

    const currentSignUpMode = isSignUp;

    const { data } = await axios.post('http://localhost:5000/api/auth/auth', {
      idToken,
      isSignUp: currentSignUpMode,
    });

    localStorage.setItem('token', data.token);
    setUser(user);
    toast.success(currentSignUpMode ? 'Signed up successfully!' : 'Signed in successfully!');
    onClose();
  } catch (error) {
    console.error('Google Sign-In Error:', error);

    const backendError = error?.response?.data?.error;

    if (backendError === 'Invalid firebase token') {
      toast.error('Google token is invalid or expired. Please try again.');
    } else if (backendError === 'User not found') {
      toast.error('Google account not found. Please sign up first.');
    } else {
      toast.error(backendError || 'Something went wrong with Google Sign-In.');
    }
  }
};



  const toggleSignUpSignIn = () => {
    setIsSignUp(!isSignUp);
    setEmail('');
    setPassword('');
    setName('');
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[9999]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-[#F8F3D9] dark:bg-[#3B362C] rounded-2xl w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 hover:bg-[#EBE5C2] dark:hover:bg-[#7A745D] rounded-full"
          aria-label="Close modal"
        >
          <X className="w-5 h-5 text-[#504B38] dark:text-[#F8F3D9]" />
        </button>

        <h2 className="text-2xl font-bold mb-6 text-[#504B38] dark:text-[#F8F3D9]">
          {isSignUp ? 'Create Account' : 'Welcome Back'}
        </h2>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-2 p-3 border border-[#B9B28A] dark:border-[#7A745D] rounded-lg mb-4 hover:bg-[#EBE5C2] dark:hover:bg-[#7A745D]"
        >
          <Google className="w-5 h-5 text-[#504B38] dark:text-[#F8F3D9]" />
          <span className="text-[#504B38] dark:text-[#F8F3D9]">Continue with Google</span>
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#B9B28A] dark:border-[#7A745D]"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-[#F8F3D9] dark:bg-[#3B362C] text-[#504B38] dark:text-[#EBE5C2]">or</span>
          </div>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium mb-1 text-[#504B38] dark:text-[#F8F3D9]">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
                className="w-full px-4 py-2 border border-[#B9B28A] dark:border-[#7A745D] rounded-lg bg-[#F8F3D9] dark:bg-[#504B38] text-[#504B38] dark:text-[#F8F3D9]"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1 text-[#504B38] dark:text-[#F8F3D9]">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#B9B28A] dark:text-[#7A745D] w-5 h-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#B9B28A] dark:border-[#7A745D] rounded-lg bg-[#F8F3D9] dark:bg-[#504B38] text-[#504B38] dark:text-[#F8F3D9]"
                placeholder="Enter your email"
                required
                autoComplete="email"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[#504B38] dark:text-[#F8F3D9]">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#B9B28A] dark:text-[#7A745D] w-5 h-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-[#B9B28A] dark:border-[#7A745D] rounded-lg bg-[#F8F3D9] dark:bg-[#504B38] text-[#504B38] dark:text-[#F8F3D9]"
                placeholder="Enter your password"
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#504B38] dark:bg-[#7A745D] text-[#F8F3D9] rounded-lg hover:bg-[#B9B28A] dark:hover:bg-[#9B9477]"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-[#504B38] dark:text-[#B9B28A]">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={toggleSignUpSignIn}
            className="text-[#504B38] dark:text-[#EBE5C2] hover:text-[#B9B28A] dark:hover:text-[#9B9477]"
            type="button"
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}

export { AuthModal };
