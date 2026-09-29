import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  MessageSquare,
  Award,
  Database,
  LayoutDashboard,
  LogOut,
  User,
  Lock,
  Mail,
  AlertCircle,
  Settings,
  Moon,
  Sun,
  Compass,
  X,
  Check,
  Zap,
  Menu
} from 'lucide-react';
import Dashboard from './components/Dashboard';
import DocManager from './components/DocManager';
import AIChatbot from './components/AIChatbot';
import MockInterview from './components/MockInterview';
import StudyToolWorkspace from './components/StudyToolWorkspace';

export interface DocumentFile {
  id: number;
  name: string;
  size: string;
  uploadDate: string;
  tags: string[];
  contentSummary?: string;
}

export interface InterviewSession {
  id: number;
  subject: string;
  date: string;
  score: number;
  technical: number;
  communication: number;
  confidence: number;
  completeness: number;
  feedback: string;
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light' | 'navy'>(() => {
    const saved = localStorage.getItem('prepverse_theme');
    if (saved === 'light' || saved === 'navy' || saved === 'dark') {
      return saved;
    }
    return 'dark';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState<boolean>(false);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('prepverse_theme', theme);
  }, [theme]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('prepverse_token');
  });
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'documents' | 'chatbot' | 'interview' | 'study-tools'>('dashboard');
  const [selectedToolState, setSelectedToolState] = useState<{ tool?: string; topic?: string }>({});
  
  const [documents, setDocuments] = useState<DocumentFile[]>(() => {
    try {
      const saved = localStorage.getItem('prepverse_documents');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("Could not load saved documents:", e);
      return [];
    }
  });

  const [interviews, setInterviews] = useState<InterviewSession[]>(() => {
    try {
      const saved = localStorage.getItem('prepverse_interviews');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("Could not load saved interviews:", e);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('prepverse_documents', JSON.stringify(documents));
    } catch (e) {
      console.warn("Could not save documents to localStorage:", e);
    }
  }, [documents]);

  useEffect(() => {
    try {
      localStorage.setItem('prepverse_interviews', JSON.stringify(interviews));
    } catch (e) {
      console.warn("Could not save interviews to localStorage:", e);
    }
  }, [interviews]);

  const [errorMsg, setErrorMsg] = useState('');
  const [signupStep, setSignupStep] = useState<'details' | 'otp'>('details');
  const [otpCode, setOtpCode] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleOpenStudyToolWorkspace = (tool?: string, topic?: string) => {
    setSelectedToolState({ tool, topic });
    setActiveTab('study-tools');
    setIsMobileSidebarOpen(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setErrorMsg('');
    setInfoMsg('');

    try {
      const response = await fetch('https://prepverse-ai-service.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password: password.trim() })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('prepverse_token', data.token);
        localStorage.setItem('prepverse_user_name', data.name || email.split('@')[0]);
        setIsAuthenticated(true);
      } else {
        setErrorMsg(data.detail || data.message || 'Invalid email or password.');
      }
    } catch {
      setErrorMsg('Backend server unavailable. Please make sure main.py is running.');
    }
  };

  const handleSendSignupOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setErrorMsg('All fields (Full Name, Email, Password) are required.');
      return;
    }
    setErrorMsg('');
    setInfoMsg('');

    try {
      const response = await fetch('https://prepverse-ai-service.onrender.com/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password: password.trim() })
      });
      const data = await response.json();
      if (response.ok) {
        setSignupStep('otp');
        setInfoMsg(data.message || `Verification code sent to ${email}`);
      } else {
        setErrorMsg(data.detail || 'Signup failed. Please try a valid email address.');
      }
    } catch {
      setErrorMsg('Could not connect to authentication service.');
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setErrorMsg('Please enter the 6-digit verification code sent to your email.');
      return;
    }
    setErrorMsg('');
    setInfoMsg('');

    try {
      const response = await fetch('https://prepverse-ai-service.onrender.com/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otp: otpCode.trim(),
          name: name.trim(),
          password: password.trim()
        })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('prepverse_token', data.token);
        localStorage.setItem('prepverse_user_name', data.name || name);
        setIsAuthenticated(true);
      } else {
        setErrorMsg(data.detail || 'Invalid verification code. Please check your email.');
      }
    } catch {
      setErrorMsg('Could not verify code. Please check server status.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('prepverse_token');
    localStorage.removeItem('prepverse_user_name');
    setIsAuthenticated(false);
    setSignupStep('details');
    setOtpCode('');
    setErrorMsg('');
    setInfoMsg('');
  };

  const currentUserName = localStorage.getItem('prepverse_user_name') || 'Student User';

  // Unauthenticated View
  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="logo-container" style={{ justifyContent: 'center', marginBottom: '1.25rem' }}>
            <div className="logo-icon-wrapper">
              <BookOpen size={18} color="#ffffff" />
            </div>
            <span className="logo-text">PrepVerse AI</span>
          </div>

          <h2 style={{ textAlign: 'center', marginBottom: '0.4rem', fontSize: '1.35rem', fontWeight: 700 }}>
            {authMode === 'login' 
              ? 'Welcome Back' 
              : signupStep === 'otp' ? 'Verify Your Email' : 'Create Student Profile'}
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            {authMode === 'login' 
              ? 'Sign in to access your study materials & AI workspace' 
              : signupStep === 'otp' ? `Enter the 6-digit code sent to ${email}` : 'Join PrepVerse to generate study tools & practice mock interviews'}
          </p>

          {errorMsg && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', color: 'var(--accent-rose)', fontSize: '0.82rem' }}>
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem', color: '#34d399', fontSize: '0.82rem' }}>
              <Check size={16} className="shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          {authMode === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Registered Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} size={16} />
                  <input
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                    placeholder="student@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} size={16} />
                  <input
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.75rem', padding: '0.7rem' }}>
                Sign In to Secured Workspace
              </button>
            </form>
          )}

          {authMode === 'signup' && signupStep === 'details' && (
            <form onSubmit={handleSendSignupOtp}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                  <User style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} size={16} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} size={16} />
                  <input
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                    placeholder="name@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Create Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} size={16} />
                  <input
                    type="password"
                    className="form-input"
                    style={{ paddingLeft: '2.4rem' }}
                    placeholder="At least 6 characters..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.75rem', padding: '0.7rem' }}>
                Send Verification Code 📩
              </button>
            </form>
          )}

          {authMode === 'signup' && signupStep === 'otp' && (
            <form onSubmit={handleVerifyOtp}>
              <div className="form-group">
                <label className="form-label">Enter 6-Digit Code</label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }} size={16} />
                  <input
                    type="text"
                    maxLength={6}
                    className="form-input"
                    style={{ paddingLeft: '2.4rem', letterSpacing: '4px', fontSize: '1.05rem', fontWeight: 700 }}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.75rem', padding: '0.7rem' }}>
                Verify Code & Create Profile ✅
              </button>

              <button 
                type="button" 
                onClick={() => setSignupStep('details')} 
                className="btn btn-outline" 
                style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.8rem' }}
              >
                ◀ Change Email / Re-enter Details
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {authMode === 'login' ? "Don't have an account?" : "Already registered?"}{' '}
            <span
              style={{ color: 'var(--accent-primary)', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => {
                setErrorMsg('');
                setInfoMsg('');
                setSignupStep('details');
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
              }}
            >
              {authMode === 'login' ? 'Create profile' : 'Sign in instead'}
            </span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Mobile Drawer Overlay */}
      <div 
        className={`mobile-sidebar-overlay ${isMobileSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsMobileSidebarOpen(false)}
      />

      {/* Sidebar navigation */}
      <aside className={`sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
        <div>
          <div className="logo-container" style={{ cursor: 'pointer' }} onClick={() => { setActiveTab('dashboard'); setIsMobileSidebarOpen(false); }}>
            <div className="logo-icon-wrapper">
              <BookOpen size={17} color="#ffffff" />
            </div>
            <span className="logo-text">PrepVerse</span>
            <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '4px', background: 'var(--accent-primary-subtle)', color: 'var(--accent-primary)', fontWeight: 700, marginLeft: 'auto' }}>v2.4</span>
          </div>

          <nav className="nav-links">
            <div className="sidebar-section-title">WORKSPACE</div>
            <div 
              className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} 
              onClick={() => { setActiveTab('dashboard'); setIsMobileSidebarOpen(false); }}
            >
              <LayoutDashboard size={17} />
              <span>Dashboard</span>
            </div>

            <div className="sidebar-section-title">STUDY HUB</div>
            <div 
              className={`nav-item ${activeTab === 'documents' ? 'active' : ''}`} 
              onClick={() => { setActiveTab('documents'); setIsMobileSidebarOpen(false); }}
            >
              <Database size={17} />
              <span>Study Materials</span>
            </div>

            <div 
              className={`nav-item ${activeTab === 'chatbot' ? 'active' : ''}`} 
              onClick={() => { setActiveTab('chatbot'); setIsMobileSidebarOpen(false); }}
            >
              <MessageSquare size={17} />
              <span>AI Chatbot</span>
            </div>

            <div 
              className={`nav-item ${activeTab === 'study-tools' ? 'active' : ''}`} 
              onClick={() => handleOpenStudyToolWorkspace('mcq')}
            >
              <Zap size={17} />
              <span>AI Study Tools Page</span>
            </div>

            <div className="sidebar-section-title">PRACTICE</div>
            <div 
              className={`nav-item ${activeTab === 'interview' ? 'active' : ''}`} 
              onClick={() => { setActiveTab('interview'); setIsMobileSidebarOpen(false); }}
            >
              <Award size={17} />
              <span>Mock Interview</span>
            </div>

            <div className="sidebar-section-title">PREFERENCES</div>
            <div 
              className={`nav-item ${isSettingsOpen ? 'active' : ''}`} 
              onClick={() => { setIsSettingsOpen(true); setIsMobileSidebarOpen(false); }}
            >
              <Settings size={17} />
              <span>Settings / Theme</span>
            </div>
          </nav>
        </div>

        <div>
          <div className="user-profile-section">
            <div className="user-avatar">
              {currentUserName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flexGrow: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUserName}
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Student Workspace</p>
            </div>
            <button
              type="button"
              title="Settings & Themes"
              onClick={() => setIsSettingsOpen(true)}
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '4px', 
                display: 'flex', 
                alignItems: 'center', 
                color: 'var(--text-muted)',
                borderRadius: '6px'
              }}
            >
              <Settings size={17} />
            </button>
            <button
              type="button"
              title="Sign Out"
              onClick={() => setIsLogoutConfirmOpen(true)}
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                padding: '4px', 
                display: 'flex', 
                alignItems: 'center', 
                color: 'var(--text-muted)',
                borderRadius: '6px'
              }}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content pane */}
      <main className="main-content">
        {/* Mobile Header Bar */}
        <div style={{ display: 'none', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }} className="mobile-header">
          <button className="mobile-menu-btn" onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}>
            <Menu size={22} />
          </button>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>PrepVerse AI</span>
          <div style={{ width: '22px' }} />
        </div>

        {activeTab === 'dashboard' && <Dashboard documents={documents} interviews={interviews} setActiveTab={setActiveTab} />}
        {activeTab === 'documents' && <DocManager documents={documents} setDocuments={setDocuments} />}
        {activeTab === 'chatbot' && <AIChatbot documents={documents} onOpenStudyToolsPage={handleOpenStudyToolWorkspace} />}
        {activeTab === 'study-tools' && <StudyToolWorkspace documents={documents} initialTool={(selectedToolState.tool as any) || 'mcq'} initialTopic={selectedToolState.topic || 'Management Information Systems'} />}
        {activeTab === 'interview' && <MockInterview documents={documents} setInterviews={setInterviews} />}
      </main>

      {/* Theme Settings Modal */}
      {isSettingsOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setIsSettingsOpen(false)}>
          <div className="glass-card" style={{ maxWidth: '440px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'var(--accent-primary-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                  <Settings size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Theme Preferences</h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Select interface appearance mode</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.25rem' }}>
              {/* Dark Mode */}
              <div 
                className={`theme-card-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
              >
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#090a0f', border: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                  <Moon size={16} />
                </div>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Dark Mode</span>
                    <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontWeight: 600 }}>Obsidian</span>
                  </div>
                  <p style={{ margin: '1px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    High-contrast dark obsidian palette optimized for focus
                  </p>
                </div>
                {theme === 'dark' && <Check size={16} color="#6366f1" />}
              </div>

              {/* Light Mode */}
              <div 
                className={`theme-card-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => setTheme('light')}
              >
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#ffffff', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                  <Sun size={16} />
                </div>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Light Mode</span>
                    <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(0, 0, 0, 0.06)', color: 'var(--text-secondary)', fontWeight: 600 }}>Porcelain</span>
                  </div>
                  <p style={{ margin: '1px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Bright crisp layout for daytime reading
                  </p>
                </div>
                {theme === 'light' && <Check size={16} color="#6366f1" />}
              </div>

              {/* Midnight Navy Mode */}
              <div 
                className={`theme-card-option ${theme === 'navy' ? 'active' : ''}`}
                onClick={() => setTheme('navy')}
              >
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: '#0b152c', border: '1px solid #00b4d8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#00b4d8' }}>
                  <Compass size={16} />
                </div>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Midnight Navy</span>
                    <span style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(0, 180, 216, 0.15)', color: '#00b4d8', fontWeight: 600 }}>Oceanic</span>
                  </div>
                  <p style={{ margin: '1px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Deep oceanic navy with cyan glow accents
                  </p>
                </div>
                {theme === 'navy' && <Check size={16} color="#00b4d8" />}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => setIsSettingsOpen(false)}
                style={{ padding: '0.45rem 1.25rem', fontSize: '0.82rem' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Logout Confirmation Modal */}
      {isLogoutConfirmOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setIsLogoutConfirmOpen(false)}>
          <div className="glass-card" style={{ maxWidth: '380px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-rose)', flexShrink: 0 }}>
                <LogOut size={18} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Sign Out</h3>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Are you sure you want to log out?</p>
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Your study materials and interview history are saved locally and will be available when you sign back in.
            </p>
            <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setIsLogoutConfirmOpen(false)}
                style={{ padding: '0.45rem 1.1rem', fontSize: '0.82rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setIsLogoutConfirmOpen(false); handleLogout(); }}
                style={{ padding: '0.45rem 1.1rem', fontSize: '0.82rem', background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', color: 'var(--accent-rose)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600 }}
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
