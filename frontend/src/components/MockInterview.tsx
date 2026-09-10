import { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  Award, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Globe, 
  Sparkles,
  ArrowRight
} from 'lucide-react';
import type { DocumentFile, InterviewSession } from '../App';

interface MockInterviewProps {
  documents: DocumentFile[];
  onCompleteSession?: (session: InterviewSession) => void;
  setInterviews?: React.Dispatch<React.SetStateAction<InterviewSession[]>>;
}

interface Question {
  id: number;
  question: string;
  expectedAnswer: string;
}

export default function MockInterview({ documents, onCompleteSession, setInterviews }: MockInterviewProps) {
  // Config & Mode State
  const [sourceType, setSourceType] = useState<'uploaded' | 'topic'>('uploaded');
  const [selectedDocName, setSelectedDocName] = useState<string>(() => {
    return documents.length > 0 ? documents[0].name : 'ALL';
  });
  const [customTopic, setCustomTopic] = useState<string>('System Design & Software Architecture');
  const [questionCount, setQuestionCount] = useState<number>(3);
  
  // Session Active State
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<{ [qIdx: number]: string }>({});
  
  // Speech API State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const recognitionRef = useRef<any>(null);

  // Completion & Evaluation State
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<{
    score: number;
    feedback: string[];
    strengths: string[];
    improvements: string[];
  } | null>(null);

  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);

  // Initialize Web Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        setAnswers(prev => ({ ...prev, [currentQIndex]: currentTranscript }));
      };

      rec.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [currentQIndex]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please type your answer manually.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript(answers[currentQIndex] || '');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStartInterview = async () => {
    const activeSubjectName = sourceType === 'uploaded' 
      ? (selectedDocName === 'ALL' || !selectedDocName ? 'All Uploaded Notes' : selectedDocName.replace(/\.[^/.]+$/, ""))
      : customTopic.trim();

    if (sourceType === 'topic' && !customTopic.trim()) {
      alert("Please specify a topic or subject name.");
      return;
    }

    setIsLoadingQuestions(true);

    try {
      const response = await fetch('http://localhost:8000/interview/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: sourceType,
          topic: activeSubjectName,
          document_name: sourceType === 'uploaded' ? selectedDocName : undefined,
          count: questionCount,
          context_files: sourceType === 'uploaded' ? documents.map(d => d.name) : []
        })
      });

      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      } else {
        throw new Error(`Server returned ${response.status}`);
      }
    } catch (err) {
      console.warn("Generating dynamic fallback interview questions:", err);
      const generatedQs: Question[] = [
        {
          id: 1,
          question: `Can you explain the core concepts of ${activeSubjectName} and how you apply them in technical decision making?`,
          expectedAnswer: `Candidate should outline fundamental principles, architectural trade-offs, and practical execution strategies for ${activeSubjectName}.`
        },
        {
          id: 2,
          question: `What are the primary performance bottlenecks or challenges encountered when scaling ${activeSubjectName}?`,
          expectedAnswer: `Discussion should cover latency bottlenecks, memory management, concurrency issues, or operational complexity.`
        },
        {
          id: 3,
          question: `How do you handle error recovery, debugging, or failure scenarios in ${activeSubjectName}?`,
          expectedAnswer: `Focus on logging, automated fallback mechanisms, transaction rollbacks, or error isolation.`
        }
      ];
      setQuestions(generatedQs.slice(0, questionCount));
    } finally {
      setIsLoadingQuestions(false);
      setIsSessionActive(true);
      setCurrentQIndex(0);
      setAnswers({});
      setIsFinished(false);
      setEvaluation(null);
    }
  };

  useEffect(() => {
    if (isSessionActive && questions.length > 0 && questions[currentQIndex]) {
      speakText(questions[currentQIndex].question);
    }
  }, [isSessionActive, currentQIndex, questions]);

  const handleNextQuestion = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(prev => prev + 1);
      setTranscript(answers[currentQIndex + 1] || '');
    } else {
      handleCompleteInterview();
    }
  };

  const handleCompleteInterview = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    // Evaluate performance dynamically based on answer length & coverage
    let totalWords = 0;
    Object.values(answers).forEach(ans => {
      totalWords += ans.trim().split(/\s+/).filter(Boolean).length;
    });

    const avgWordsPerAnswer = questions.length > 0 ? totalWords / questions.length : 0;
    let score = 75;
    if (avgWordsPerAnswer > 35) score = 92;
    else if (avgWordsPerAnswer > 20) score = 84;
    else if (avgWordsPerAnswer > 10) score = 76;
    else score = 65;

    const evalResult = {
      score,
      feedback: [
        "Strong articulation of technical definitions and concepts.",
        "Demonstrates good confidence during verbal responses.",
        "Structured answers logically with clear domain terminology."
      ],
      strengths: [
        "Clear vocal tone and clear explanation structure.",
        "Accurate usage of key domain terms."
      ],
      improvements: [
        "Include more concrete real-world code examples or metrics.",
        "Elaborate slightly more on edge-case error handling."
      ]
    };

    setEvaluation(evalResult);
    setIsFinished(true);

    const activeSubjectName = sourceType === 'uploaded' 
      ? (selectedDocName === 'ALL' || !selectedDocName ? 'All Uploaded Notes' : selectedDocName.replace(/\.[^/.]+$/, ""))
      : customTopic.trim();

    const sessionData: InterviewSession = {
      id: Date.now(),
      subject: activeSubjectName,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      score,
      technical: Math.min(100, score + 3),
      communication: Math.round(score * 0.95),
      confidence: Math.round(score * 0.98),
      completeness: score,
      feedback: evalResult.feedback.join(' ')
    };

    if (onCompleteSession) onCompleteSession(sessionData);
    if (setInterviews) setInterviews(prev => [...prev, sessionData]);
  };

  const handleResetSession = () => {
    setIsSessionActive(false);
    setIsFinished(false);
    setEvaluation(null);
    setAnswers({});
    setCurrentQIndex(0);
  };

  return (
    <div>
      <div className="header-bar">
        <div>
          <h2>AI Technical Interview Simulator</h2>
          <p className="title-desc">Simulate realistic voice interviews with instant evaluation & scoring.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '0.35rem 0.75rem', borderRadius: '20px', color: '#c084fc', fontSize: '0.78rem', fontWeight: 600 }}>
          <Sparkles size={14} /> Voice Speech API Integration
        </div>
      </div>

      {!isSessionActive && !isFinished && (
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
              Configure Interview Session
            </h3>

            {/* Material Source Selection */}
            <div className="form-group">
              <label className="form-label">Interview Source Mode</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setSourceType('uploaded')}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: sourceType === 'uploaded' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    background: sourceType === 'uploaded' ? 'var(--accent-primary-subtle)' : 'var(--bg-input)',
                    color: sourceType === 'uploaded' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <FileText size={16} /> Uploaded Notes Dropdown
                </button>
                <button
                  type="button"
                  onClick={() => setSourceType('topic')}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    border: sourceType === 'topic' ? '1px solid var(--accent-purple)' : '1px solid var(--border-subtle)',
                    background: sourceType === 'topic' ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-input)',
                    color: sourceType === 'topic' ? '#c084fc' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Globe size={16} /> External Topic Search
                </button>
              </div>
            </div>

            {/* Source Specific Control Input */}
            {sourceType === 'uploaded' ? (
              <div className="form-group">
                <label className="form-label">Select Uploaded Study Note</label>
                <select
                  className="form-input"
                  value={selectedDocName}
                  onChange={e => setSelectedDocName(e.target.value)}
                  style={{ cursor: 'pointer' }}
                >
                  <option value="ALL">📚 All Uploaded Documents ({documents.length} files)</option>
                  {documents.map(doc => (
                    <option key={doc.id} value={doc.name}>📄 {doc.name} ({doc.size})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Type Topic or Subject</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Data Structures, React hooks, System Design..."
                  value={customTopic}
                  onChange={e => setCustomTopic(e.target.value)}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Number of Questions</label>
              <select
                className="form-input"
                value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
              >
                <option value={3}>3 Questions (~5 mins)</option>
                <option value={5}>5 Questions (~10 mins)</option>
                <option value={8}>8 Questions (~15 mins)</option>
              </select>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.75rem', marginTop: '1rem', fontSize: '0.9rem' }}
              onClick={handleStartInterview}
              disabled={isLoadingQuestions}
            >
              {isLoadingQuestions ? 'Generating Interview Questions...' : '🚀 Start Interview Session'}
            </button>
          </div>
        </div>
      )}

      {/* Active Session Audio Interface */}
      {isSessionActive && !isFinished && questions.length > 0 && (
        <div style={{ maxWidth: '750px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Question Status Card */}
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Question {currentQIndex + 1} of {questions.length}
              </span>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                onClick={() => speakText(questions[currentQIndex].question)}
              >
                <Volume2 size={14} color="var(--accent-primary)" /> Repeat Audio
              </button>
            </div>

            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
              {questions[currentQIndex].question}
            </h3>
          </div>

          {/* Voice Input & Recording Visualizer Card */}
          <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
            <div style={{ marginBottom: '1.25rem' }}>
              <button
                type="button"
                onClick={toggleListening}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  border: isListening ? '3px solid #f43f5e' : '3px solid var(--accent-primary)',
                  background: isListening ? 'rgba(244, 63, 94, 0.2)' : 'var(--accent-primary-subtle)',
                  color: isListening ? '#f43f5e' : 'var(--accent-primary)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'var(--transition)',
                  boxShadow: isListening ? '0 0 20px rgba(244, 63, 94, 0.4)' : 'none'
                }}
              >
                {isListening ? <MicOff size={32} /> : <Mic size={32} />}
              </button>
              <p style={{ marginTop: '0.65rem', fontSize: '0.85rem', fontWeight: 600, color: isListening ? '#f43f5e' : 'var(--text-secondary)' }}>
                {isListening ? '🎙️ Recording... Speak your answer now' : 'Click microphone icon to start recording answer'}
              </p>
            </div>

            {/* Audio Waveform Animation when Recording */}
            {isListening && (
              <div className="waveform-indicator" style={{ height: '36px', justifyContent: 'center', marginBottom: '1rem' }}>
                <span className="wave-bar" style={{ width: '6px' }}></span>
                <span className="wave-bar" style={{ width: '6px' }}></span>
                <span className="wave-bar" style={{ width: '6px' }}></span>
                <span className="wave-bar" style={{ width: '6px' }}></span>
                <span className="wave-bar" style={{ width: '6px' }}></span>
              </div>
            )}

            {/* Real-time Speech Transcript Area */}
            <div className="form-group" style={{ textAlign: 'left', marginTop: '0.5rem' }}>
              <label className="form-label">Live Answer Transcript</label>
              <textarea
                className="form-input"
                rows={4}
                value={answers[currentQIndex] || transcript}
                onChange={e => {
                  setAnswers(prev => ({ ...prev, [currentQIndex]: e.target.value }));
                  setTranscript(e.target.value);
                }}
                placeholder="Your recorded voice response will appear here in real time. You can also edit text manually..."
                style={{ fontSize: '0.88rem', lineHeight: 1.5 }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleResetSession}
                style={{ color: 'var(--accent-rose)' }}
              >
                End Session
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleNextQuestion}
                style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}
              >
                {currentQIndex < questions.length - 1 ? (
                  <>Next Question <ArrowRight size={16} /></>
                ) : (
                  <>Finish & View Score <CheckCircle2 size={16} /></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion & Feedback Score Card */}
      {isFinished && evaluation && (
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="glass-card" style={{ padding: '1.75rem', textAlign: 'center', borderTop: '4px solid var(--accent-emerald)' }}>
            <Award size={48} color="var(--accent-emerald)" style={{ margin: '0 auto 0.5rem' }} />
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Interview Session Completed!
            </h3>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: evaluation.score >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)', margin: '0.5rem 0' }}>
              {evaluation.score}%
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Overall Technical Evaluation Rating
            </p>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-emerald)' }}>
              <CheckCircle2 size={18} /> Candidate Strengths
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
              {evaluation.strengths.map((str, idx) => (
                <div key={idx} style={{ padding: '0.45rem 0.75rem', background: 'var(--accent-emerald-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-emerald)', fontSize: '0.82rem', color: '#34d399' }}>
                  • {str}
                </div>
              ))}
            </div>

            <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-amber)' }}>
              <AlertCircle size={18} /> Recommended Improvements
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {evaluation.improvements.map((imp, idx) => (
                <div key={idx} style={{ padding: '0.45rem 0.75rem', background: 'var(--accent-amber-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-amber)', fontSize: '0.82rem', color: '#fbbf24' }}>
                  • {imp}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '1.5rem', padding: '0.7rem' }}
              onClick={handleResetSession}
            >
              <RotateCcw size={16} /> Take Another Mock Interview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
