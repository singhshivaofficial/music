import React, { useState } from 'react';
import { UserProfile } from '../types';
import { X, User, ShieldCheck, LogIn, Sparkles, Check } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSelectUser: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
}) => {
  const [googleEmail, setGoogleEmail] = useState('600panda009@gmail.com');
  const [googleName, setGoogleName] = useState('Panda');

  if (!isOpen) return null;

  const handleGoogleSignIn = () => {
    onSelectUser({
      id: `google_${googleEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      name: googleName || 'Google User',
      email: googleEmail,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(googleEmail)}`,
      isGuest: false,
    });
    onClose();
  };

  const handleGuestMode = () => {
    const guestId = 'guest_' + Math.random().toString(36).substring(2, 9);
    onSelectUser({
      id: guestId,
      name: 'Guest Listener',
      avatar: `https://api.dicebear.com/7.x/thumbs/svg?seed=${guestId}`,
      isGuest: true,
    });
    onClose();
  };

  return (
    <div
      id="auth-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xl animate-fadeIn"
      onClick={onClose}
    >
      <div
        id="auth-modal-card"
        className="relative w-full max-w-md rounded-3xl glass border border-[rgba(191,192,209,0.15)] shadow-[0_25px_60px_rgba(0,0,0,0.85)] p-6 space-y-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#31323e]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#60519b]" />
            <h3 className="text-lg font-bold text-white">AetherSound Identity</h3>
          </div>
          <button
            id="auth-modal-close"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#bfc0d1]/70 hover:text-white hover:bg-[#31323e] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status */}
        <div className="flex items-center gap-3.5 p-3.5 rounded-2xl glass border border-[rgba(191,192,209,0.1)]">
          <img
            src={currentUser.avatar || 'https://api.dicebear.com/7.x/thumbs/svg?seed=avatar'}
            alt={currentUser.name}
            className="w-11 h-11 rounded-full object-cover border-2 border-[#60519b]"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80';
            }}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-white">{currentUser.name}</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#60519b]/30 text-white border border-[#60519b]/50">
                {currentUser.isGuest ? 'Guest Mode' : 'Connected'}
              </span>
            </div>
            <p className="text-xs opacity-60 truncate">
              {currentUser.email || 'Listening history saved to session memory'}
            </p>
          </div>
        </div>

        {/* Sign-in Options */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider opacity-60">
            Select Account Mode
          </p>

          {/* Google Sign-in Option */}
          <div className="p-4 rounded-2xl glass border border-[rgba(191,192,209,0.12)] hover:border-[#60519b]/60 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
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
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="font-bold text-white text-sm">Google Account</span>
              </div>
              {!currentUser.isGuest && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                  <Check className="w-3.5 h-3.5" /> Active
                </span>
              )}
            </div>

            <div className="space-y-2">
              <input
                type="email"
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                placeholder="Google Email"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#0a0a0f]/60 border border-[#31323e] text-white placeholder-white/30 focus:outline-none focus:border-[#60519b]"
              />
              <input
                type="text"
                value={googleName}
                onChange={(e) => setGoogleName(e.target.value)}
                placeholder="Display Name"
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#0a0a0f]/60 border border-[#31323e] text-white placeholder-white/30 focus:outline-none focus:border-[#60519b]"
              />
            </div>

            <button
              id="auth-google-signin-btn"
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 rounded-full bg-[#60519b] hover:bg-[#7262b3] text-white text-xs font-bold shadow-[0_0_15px_rgba(96,81,155,0.7)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Connect with Google</span>
            </button>
          </div>

          {/* Guest Mode */}
          <button
            id="auth-guest-mode-btn"
            onClick={handleGuestMode}
            className="w-full p-3.5 rounded-2xl glass hover:bg-[#31323e] border border-[rgba(191,192,209,0.1)] hover:border-[#31323e] flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-[#bfc0d1]" />
              <div className="text-left">
                <p className="text-xs font-bold text-white">Instant Guest Mode</p>
                <p className="text-[11px] opacity-60">Zero login friction with local listen memory</p>
              </div>
            </div>
            {currentUser.isGuest && (
              <span className="text-xs text-[#bfc0d1] flex items-center gap-1 font-medium">
                <Check className="w-3.5 h-3.5" /> Current
              </span>
            )}
          </button>
        </div>

        {/* Feature info */}
        <div className="text-center text-[11px] opacity-60 pt-2 border-t border-[#31323e] flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#60519b]" />
          <span>Songs played &gt;15s automatically log to your listening memory</span>
        </div>
      </div>
    </div>
  );
};
