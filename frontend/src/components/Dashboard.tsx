import { 
  Database, 
  Award, 
  Calendar, 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  BookOpen,
  ChevronRight,
  Zap,
  TrendingUp
} from 'lucide-react';
import type { DocumentFile, InterviewSession } from '../App';

interface DashboardProps {
  documents: DocumentFile[];
  interviews: InterviewSession[];
  setActiveTab: (tab: 'dashboard' | 'documents' | 'chatbot' | 'interview' | 'study-tools') => void;
}

export default function Dashboard({ documents, interviews, setActiveTab }: DashboardProps) {
  // Calculate average score dynamically across all completed mock interviews and MCQ tests
  const completedScores = interviews.map(i => i.score);
  const avgScore = completedScores.length > 0
    ? Math.round(completedScores.reduce((acc, curr) => acc + curr, 0) / completedScores.length)
    : 0;

  // Calculate dynamic prep health benchmark
  const getPrepHealth = () => {
    if (completedScores.length === 0) return { label: 'Not Started', color: 'var(--text-muted)', sub: 'Complete a test or interview to evaluate' };
    if (avgScore >= 80) return { label: 'Exam Ready', color: 'var(--accent-emerald)', sub: 'Target benchmark 80% achieved!' };
    if (avgScore >= 60) return { label: 'In Progress', color: 'var(--accent-purple)', sub: 'Keep practicing to reach 80% target' };
    return { label: 'Needs Practice', color: 'var(--accent-rose)', sub: 'Review uploaded notes & retake tests' };
  };

  const prepHealth = getPrepHealth();

  return (
    <div>
      <div className="header-bar">
        <div>
          <h2>Student Dashboard</h2>
          <p className="title-desc">Monitor your preparation metrics, uploaded materials, and interview scores.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.35rem 0.75rem', borderRadius: '20px', color: '#34d399', fontSize: '0.78rem', fontWeight: 600 }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34d399' }} />
          Real-time sync: Active
        </div>
      </div>

      {/* Metric Cards */}
      <div className="stats-grid">
        <div className="glass-card" style={{ borderLeft: '3px solid var(--accent-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Materials Catalog</span>
            <Database size={18} color="var(--accent-primary)" />
          </div>
          <div className="stat-val">{documents.length}</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {documents.length === 0 ? 'No uploaded notes yet' : `${documents.length} uploaded files indexed`}
          </p>
        </div>

        <div className="glass-card" style={{ borderLeft: '3px solid var(--accent-purple)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mock Interviews</span>
            <Award size={18} color="var(--accent-purple)" />
          </div>
          <div className="stat-val">{interviews.length}</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {interviews.length === 0 ? '0 interview sessions taken' : `${interviews.length} interview sessions completed`}
          </p>
        </div>

        <div className="glass-card" style={{ borderLeft: '3px solid var(--accent-emerald)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Average Score</span>
            <CheckCircle size={18} color="var(--accent-emerald)" />
          </div>
          <div className="stat-val">{avgScore}%</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            {completedScores.length === 0 ? 'No evaluation data yet' : `Average across ${completedScores.length} sessions`}
          </p>
        </div>

        <div className="glass-card" style={{ borderLeft: `3px solid ${prepHealth.color}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Prep Health</span>
            <Clock size={18} style={{ color: prepHealth.color }} />
          </div>
          <div className="stat-val" style={{ fontSize: '1.3rem', color: prepHealth.color }}>{prepHealth.label}</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{prepHealth.sub}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {/* Recent Interviews History */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <TrendingUp size={18} color="var(--accent-primary)" /> Recent Interview Performances
            </h3>
            <span 
              style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}
              onClick={() => setActiveTab('interview')}
            >
              Start New <ChevronRight size={14} />
            </span>
          </div>

          {interviews.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)' }}>
              <Award size={32} style={{ opacity: 0.3, margin: '0 auto 0.5rem' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No mock interviews recorded yet. Take an interview session to assess your readiness!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {interviews.map((session) => (
                <div 
                  key={session.id} 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
                >
                  <div>
                    <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>{session.subject}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <Calendar size={12} /> {session.date}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 800, fontSize: '1rem', color: session.score >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                        {session.score}%
                      </p>
                      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Score</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Launch & Suggestions Sidebar Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(6, 182, 212, 0.08))', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-primary)' }}>AI RAG Assistant</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', lineHeight: 1.45 }}>
              Ask questions directly from your notes. PrepVerse AI restricts queries strictly to your uploaded documents unless web search is toggled.
            </p>
            <button className="btn btn-primary" style={{ width: '100%', fontSize: '0.82rem' }} onClick={() => setActiveTab('chatbot')}>
              Chat with Docs <ArrowRight size={15} />
            </button>
          </div>

          <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(99, 102, 241, 0.08))', border: '1px solid rgba(168, 85, 247, 0.25)' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Zap size={16} color="#c084fc" /> AI Study Tools Page
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.85rem', lineHeight: 1.45 }}>
              Practice interactive MCQs, self-test quizzes, flippable flashcards, viva questions, and structured study notes in one dedicated workspace.
            </p>
            <button className="btn btn-secondary" style={{ width: '100%', fontSize: '0.82rem' }} onClick={() => setActiveTab('study-tools')}>
              Open Study Workspace <ArrowRight size={15} />
            </button>
          </div>

          <div className="glass-card">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Latest Uploads</h3>
            {documents.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>No materials cataloged yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {documents.slice(0, 3).map((doc) => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '0.35rem 0.5rem', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
                    <BookOpen size={13} color="var(--accent-primary)" className="shrink-0" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1 }}>{doc.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
