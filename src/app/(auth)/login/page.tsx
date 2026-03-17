"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { useNDK } from "@/hooks/useNDK";
import { useUIStore } from "@/store/ui";
import { useRouter } from "next/navigation";
import { 
  LogIn, 
  Key, 
  ShieldCheck, 
  AlertTriangle, 
  PlusCircle, 
  Eye, 
  EyeOff, 
  Copy, 
  CheckCircle2, 
  Loader2,
  Database,
  Lock
} from "lucide-react";

export default function LoginPage() {
  const [privateKey, setPrivateKey] = useState("");
  const [password, setPassword] = useState("");
  const [bunkerUri, setBunkerUri] = useState("");
  const [loginMethod, setLoginMethod] = useState<'nsec' | 'ncryptsec' | 'bunker'>('nsec');
  const [showPassword, setShowPassword] = useState(false);
  const [showNcryptPassword, setShowNcryptPassword] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const { 
    login, 
    loginWithPrivateKey, 
    loginWithNcryptsec,
    loginWithBunker,
    generateNewKey, 
    isLoading, 
    isLoggedIn,
    bunkerLocalNsec
  } = useAuthStore();
  
  const { ndk, sessions, isReady } = useNDK();
  const { addToast } = useUIStore();
  const router = useRouter();

  // Redirect if already logged in and not trying to add another account
  // We can use a search param like ?add=true to stay on this page
  useEffect(() => {
    if (isLoggedIn && !window.location.search.includes('add=true')) {
      router.push("/");
    }
  }, [isLoggedIn, router]);

  const handleNip07Login = async () => {
    if (!ndk || !sessions || !isReady) return;
    try {
      await login(ndk, sessions);
      addToast("Account added successfully!", "success");
      router.push("/");
    } catch (err) {
      addToast("NIP-07 Login failed. Check extension.", "error");
    }
  };

  const handleKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ndk || !sessions || !isReady) return;

    try {
      if (loginMethod === 'nsec') {
        if (!privateKey) return;
        await loginWithPrivateKey(ndk, sessions, privateKey);
      } else if (loginMethod === 'ncryptsec') {
        if (!privateKey || !password) return;
        await loginWithNcryptsec(ndk, sessions, privateKey, password);
      } else if (loginMethod === 'bunker') {
        if (!bunkerUri) return;
        await loginWithBunker(ndk, sessions, bunkerUri, bunkerLocalNsec || undefined);
      }
      
      addToast("Account added successfully!", "success");
      router.push("/");
    } catch (err: unknown) {
      console.error(err);
      addToast(err instanceof Error ? err.message : "Login failed.", "error");
    }
  };

  const handleGenerateKey = async () => {
    if (!ndk || !sessions || !isReady) return;
    try {
      const k = await generateNewKey(ndk, sessions);
      setNewKey(k);
      setShowOnboarding(true);
      addToast("New identity generated!", "success");
    } catch (err) {
      addToast("Failed to generate key.", "error");
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(newKey);
    setIsCopied(true);
    addToast("Key copied to clipboard!", "success");
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-yellow-100 dark:border-yellow-900/30">
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 rounded-2xl mb-6">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-2xl font-bold mb-4">Save your private key!</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
              We generated a new Nostr identity for you. If you lose this key, you lose your account forever. We don&apos;t store it on our servers.
            </p>

            <div className="bg-gray-100 dark:bg-black p-4 rounded-2xl mb-6 relative group">
              <p className="font-mono text-xs break-all pr-10 text-left">
                {newKey}
              </p>
              <button 
                onClick={copyToClipboard}
                aria-label="Copy private key"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
              >
                {isCopied ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
              </button>
            </div>

            <div className="flex flex-col space-y-3">
              <button
                onClick={() => router.push("/onboarding")}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-500/20"
              >
                I&apos;ve saved it, let&apos;s go!
              </button>
              <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">
                No recovery possible if lost
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800">
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 text-white rounded-2xl mb-6 shadow-lg shadow-blue-500/30">
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Tell it!</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Whatever it is, just Tell It.</p>

          <div className="space-y-4">
            {isLoggedIn && (
              <button
                onClick={() => router.back()}
                className="w-full text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 font-medium py-2 transition-colors mb-2"
              >
                ← Back
              </button>
            )}
            <button
              onClick={handleNip07Login}
              disabled={isLoading || !isReady}
              className="w-full flex items-center justify-center space-x-3 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 text-gray-900 dark:text-white font-bold py-4 px-6 rounded-2xl transition-all group disabled:opacity-50"
            >
              <LogIn size={20} className="group-hover:text-blue-500" />
              <span aria-live="polite">
                {!isReady ? "Initializing…" : (isLoading ? "Connecting…" : "Use browser extension")}
              </span>
            </button>

            <button
              onClick={handleGenerateKey}
              disabled={isLoading || !isReady}
              className="w-full flex items-center justify-center space-x-3 bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              <div aria-live="polite" className="flex items-center gap-2">
                {isLoading ? <Loader2 className="animate-spin" /> : <PlusCircle size={20} />}
                <span>{!isReady ? "Please wait…" : "Create new identity"}</span>
              </div>
            </button>
          </div>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">Manual Login</span>
            </div>
          </div>

          <div className="flex p-1 bg-gray-100 dark:bg-black rounded-xl mb-6">
            <button
              onClick={() => setLoginMethod('nsec')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold transition-all ${loginMethod === 'nsec' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-500' : 'text-gray-500'}`}
              aria-pressed={loginMethod === 'nsec'}
            >
              <Key size={14} />
              <span>nsec</span>
            </button>
            <button
              onClick={() => setLoginMethod('ncryptsec')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold transition-all ${loginMethod === 'ncryptsec' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-500' : 'text-gray-500'}`}
              aria-pressed={loginMethod === 'ncryptsec'}
            >
              <Lock size={14} />
              <span>ncryptsec</span>
            </button>
            <button
              onClick={() => setLoginMethod('bunker')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold transition-all ${loginMethod === 'bunker' ? 'bg-white dark:bg-gray-800 shadow-sm text-blue-500' : 'text-gray-500'}`}
              aria-pressed={loginMethod === 'bunker'}
            >
              <Database size={14} />
              <span>Bunker</span>
            </button>
          </div>

          <form onSubmit={handleKeyLogin} className="space-y-4">
            {loginMethod !== 'bunker' && (
              <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-xl border border-red-100 dark:border-red-900/30 flex items-start space-x-3 mb-2">
                <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-600 dark:text-red-400 text-left">
                  Security warning: Pasting your private key is risky. Use a browser extension like Alby for better security.
                </p>
              </div>
            )}
            
            {loginMethod === 'bunker' ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Database className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="bunker://… or user@provider.com"
                  aria-label="Bunker URI or handle"
                  value={bunkerUri}
                  onChange={(e) => setBunkerUri(e.target.value)}
                  className="block w-full pl-12 pr-4 py-4 border border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder={loginMethod === 'ncryptsec' ? "ncryptsec1…" : "nsec1… or hex key"}
                    aria-label={loginMethod === 'ncryptsec' ? "Encrypted private key" : "Private key"}
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    className="block w-full pl-12 pr-12 py-4 border border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide private key" : "Show private key"}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {loginMethod === 'ncryptsec' && (
                  <div className="relative animate-in slide-in-from-top-2 duration-200">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type={showNcryptPassword ? "text" : "password"}
                      placeholder="Enter decryption password"
                      aria-label="Decryption password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-12 pr-12 py-4 border border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNcryptPassword(!showNcryptPassword)}
                      aria-label={showNcryptPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showNcryptPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !isReady || (loginMethod === 'nsec' && !privateKey) || (loginMethod === 'ncryptsec' && (!privateKey || !password)) || (loginMethod === 'bunker' && !bunkerUri)}
              className="w-full bg-gray-900 dark:bg-white text-white dark:text-black font-bold py-4 px-6 rounded-2xl hover:opacity-90 transition-all disabled:opacity-50 shadow-lg"
            >
              <span aria-live="polite">
                {!isReady ? "Initializing…" : (isLoading ? "Please wait…" : "Login")}
              </span>
            </button>
          </form>

          <p className="mt-8 text-[10px] text-gray-400 leading-relaxed uppercase tracking-tighter">
            By logging in, you connect directly to Nostr relays.<br />Your keys never leave your device.
          </p>
        </div>
      </div>
    </div>
  );
}
