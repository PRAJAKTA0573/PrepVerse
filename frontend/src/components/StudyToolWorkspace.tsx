import { useState } from 'react';
import { 
  Zap, 
  BookOpen, 
  FileCheck, 
  CheckSquare, 
  HelpCircle, 
  GraduationCap, 
  Layers, 
  FileText, 
  Globe, 
  CheckCircle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import type { DocumentFile } from '../App';

type ToolType = 'summary' | 'notes' | 'mcq' | 'quiz' | 'viva' | 'flashcard';

interface StudyToolWorkspaceProps {
  documents: DocumentFile[];
  initialTool?: ToolType;
  initialTopic?: string;
}

export default function StudyToolWorkspace({ 
  documents, 
  initialTool = 'mcq', 
  initialTopic = 'Management Information Systems' 
}: StudyToolWorkspaceProps) {
  const [activeTool, setActiveTool] = useState<ToolType>(initialTool);
  const [topic, setTopic] = useState(initialTopic);
  const [source, setSource] = useState<'notes' | 'web'>('notes');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedData, setGeneratedData] = useState<any>(null);

  // MCQ Test State
  const [mcqSelected, setMcqSelected] = useState<{ [qIdx: number]: number }>({});
  const [mcqSubmitted, setMcqSubmitted] = useState(false);
  const [mcqScore, setMcqScore] = useState(0);

  // Quiz State
  const [quizUserAnswers, setQuizUserAnswers] = useState<{ [qIdx: number]: string }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Flashcards State
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  // Viva State
  const [vivaRevealed, setVivaRevealed] = useState<{ [qIdx: number]: boolean }>({});

  const [selectedDocName, setSelectedDocName] = useState<string>(() => {
    return documents.length > 0 ? documents[0].name : 'ALL';
  });

  const handleGenerate = async (targetTool: ToolType = activeTool) => {
    const isNotes = source === 'notes';
    const activeTopicName = isNotes 
      ? (selectedDocName === 'ALL' || !selectedDocName ? 'Uploaded Notes Summary' : selectedDocName.replace(/\.[^/.]+$/, ""))
      : topic.trim();

    if (!isNotes && !topic.trim()) return;

    setIsLoading(true);
    setMcqSelected({});
    setMcqSubmitted(false);
    setMcqScore(0);
    setQuizUserAnswers({});
    setQuizSubmitted(false);
    setFlashcardIdx(0);
    setFlashcardFlipped(false);
    setVivaRevealed({});

    const targetContextFiles = isNotes
      ? (selectedDocName === 'ALL' || !selectedDocName ? documents.map(d => d.name) : [selectedDocName])
      : [];

    try {
      const response = await fetch('http://localhost:8000/study-tool/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_type: targetTool,
          topic: activeTopicName,
          source: source,
          context_files: targetContextFiles
        })
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedData(data);
      } else {
        throw new Error(`Server status ${response.status}`);
      }
    } catch (err) {
      console.warn("Generating mock fallback tool data:", err);
      setGeneratedData({
        tool_type: targetTool,
        topic: topic,
        formatted_text: `### 📑 Generated ${targetTool.toUpperCase()} Material for "${topic}"\n\n#### 📌 Overview\nSynthesized study material based on ${source === 'notes' ? 'uploaded notes' : 'web search'}.\n\n• Focus on core definitions.\n• Understand key system interactions.`,
        citations: documents.map(d => d.name),
        items: targetTool === 'mcq' ? [
          {
            question: `What is the primary function of ${topic}?`,
            options: [
              `To act as a legacy database backup protocol.`,
              `To replace hardware infrastructure completely.`,
              `To streamline data flow and operational decision making.`,
              `An unoptimized search query algorithm.`
            ],
            correct_index: 2,
            explanation: `Primary function of ${topic} focuses on data flow optimization and structured decision support.`
          },
          {
            question: `Which pressure forces organizations to adapt ${topic}?`,
            options: [
              `Decreasing network bandwidth.`,
              `Global competition and rapidly shifting market demands.`,
              `Static memory allocation rules.`,
              `Obsolete hardware drivers.`
            ],
            correct_index: 1,
            explanation: `Market dynamics and business pressures drive continuous adoption of ${topic}.`
          }
        ] : targetTool === 'flashcard' ? [
          { front: `Core Definition of ${topic}`, back: `${topic} is a structured system designed to collect, process, store, and disseminate information.` },
          { front: `Key Benefit of ${topic}`, back: `Enhances decision-making efficiency and operational agility across enterprise layers.` }
        ] : [
          { question: `Define ${topic} in your own words.`, answer: `${topic} provides organized frameworks for system architecture and management analysis.` }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToolChange = (tool: ToolType) => {
    setActiveTool(tool);
    handleGenerate(tool);
  };

  const handleMcqSubmit = () => {
    if (!generatedData || !generatedData.items) return;
    let score = 0;
    generatedData.items.forEach((item: any, idx: number) => {
      if (mcqSelected[idx] === item.correct_index) {
        score += 1;
      }
    });
    setMcqScore(score);
    setMcqSubmitted(true);

    try {
      const history = JSON.parse(localStorage.getItem('prepverse_mcq_scores') || '[]');
      history.push({
        topic,
        score,
        total: generatedData.items.length,
        date: new Date().toLocaleTimeString()
      });
      localStorage.setItem('prepverse_mcq_scores', JSON.stringify(history));
    } catch (e) {
      console.warn("Could not save score history:", e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', minHeight: '85vh' }}>
      {/* Top Header & Tool Switcher Bar */}
      <div className="glass-card" style={{ padding: '1.15rem 1.4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: 700 }}>
              <Zap size={20} color="var(--accent-primary)" /> Dedicated AI Study Workspace
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', margin: '0.15rem 0 0 0' }}>
              Practice tests without pre-revealed answers, review flippable flashcards, and generate structured notes.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--accent-primary-subtle)', padding: '0.35rem 0.75rem', borderRadius: '20px', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <Sparkles size={14} color="#818cf8" />
            <span style={{ fontSize: '0.78rem', color: '#818cf8', fontWeight: 600 }}>Interactive Test Center</span>
          </div>
        </div>

        {/* Tool Navigation Tabs */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
          <button 
            type="button"
            onClick={() => handleToolChange('mcq')} 
            className={`btn ${activeTool === 'mcq' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
          >
            <CheckSquare size={15} /> MCQ Test Mode
          </button>
          <button 
            type="button"
            onClick={() => handleToolChange('quiz')} 
            className={`btn ${activeTool === 'quiz' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
          >
            <HelpCircle size={15} /> Interactive Quiz
          </button>
          <button 
            type="button"
            onClick={() => handleToolChange('flashcard')} 
            className={`btn ${activeTool === 'flashcard' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
          >
            <Layers size={15} /> Flippable Flashcards
          </button>
          <button 
            type="button"
            onClick={() => handleToolChange('viva')} 
            className={`btn ${activeTool === 'viva' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
          >
            <GraduationCap size={15} /> Viva Q&A
          </button>
          <button 
            type="button"
            onClick={() => handleToolChange('notes')} 
            className={`btn ${activeTool === 'notes' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
          >
            <FileCheck size={15} /> Study Notes
          </button>
          <button 
            type="button"
            onClick={() => handleToolChange('summary')} 
            className={`btn ${activeTool === 'summary' ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: '0.82rem', padding: '0.45rem 0.85rem' }}
          >
            <BookOpen size={15} /> Summary
          </button>
        </div>
      </div>

      {/* Input & Source Controls Panel */}
      <div className="glass-card" style={{ padding: '0.85rem 1.15rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          {source === 'notes' ? (
            <div>
              <label className="form-label" style={{ marginBottom: '0.25rem' }}>
                Select Uploaded Note / Document:
              </label>
              <select
                className="form-input"
                value={selectedDocName}
                onChange={e => setSelectedDocName(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="ALL">📚 All Uploaded Notes ({documents.length} files)</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.name}>
                    📄 {doc.name} ({doc.size})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="form-label" style={{ marginBottom: '0.25rem' }}>
                Type Topic or Subject (Web Search):
              </label>
              <input 
                type="text" 
                className="form-input" 
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Enter topic e.g. Neural Networks, Quantum Computing..."
              />
            </div>
          )}
        </div>

        <div style={{ minWidth: '220px' }}>
          <label className="form-label" style={{ marginBottom: '0.25rem' }}>
            Material Source:
          </label>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              onClick={() => setSource('notes')}
              style={{
                flex: 1,
                padding: '0.45rem 0.65rem',
                borderRadius: 'var(--radius-md)',
                border: source === 'notes' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                background: source === 'notes' ? 'var(--accent-primary-subtle)' : 'var(--bg-input)',
                color: source === 'notes' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem'
              }}
            >
              <FileText size={13} /> Uploaded Notes
            </button>
            <button
              type="button"
              onClick={() => setSource('web')}
              style={{
                flex: 1,
                padding: '0.45rem 0.65rem',
                borderRadius: 'var(--radius-md)',
                border: source === 'web' ? '1px solid var(--accent-purple)' : '1px solid var(--border-subtle)',
                background: source === 'web' ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-input)',
                color: source === 'web' ? '#c084fc' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem'
              }}
            >
              <Globe size={13} /> Live Web Search
            </button>
          </div>
        </div>

        <div style={{ alignSelf: 'flex-end' }}>
          <button 
            type="button"
            onClick={() => handleGenerate(activeTool)} 
            disabled={isLoading}
            className="btn btn-primary"
            style={{ padding: '0.55rem 1.2rem', fontSize: '0.85rem' }}
          >
            {isLoading ? 'Generating...' : '⚡ Generate Material'}
          </button>
        </div>
      </div>

      {/* Main Workspace Display Content */}
      <div className="glass-card" style={{ minHeight: '450px', padding: '1.25rem 1.6rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '320px', gap: '1rem' }}>
            <div className="waveform-indicator" style={{ height: '32px' }}>
              <span className="wave-bar" style={{ width: '5px' }}></span>
              <span className="wave-bar" style={{ width: '5px' }}></span>
              <span className="wave-bar" style={{ width: '5px' }}></span>
              <span className="wave-bar" style={{ width: '5px' }}></span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>Synthesizing {activeTool.toUpperCase()} content for "{topic}"...</p>
          </div>
        )}

        {!isLoading && !generatedData && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '320px', gap: '0.85rem', color: 'var(--text-muted)' }}>
            <Zap size={40} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: '0.9rem' }}>Click <strong>Generate Material</strong> above to load test questions or study notes!</p>
          </div>
        )}

        {!isLoading && generatedData && (
          <div style={{ width: '100%' }}>
            {/* MCQ TEST VIEW */}
            {activeTool === 'mcq' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.65rem' }}>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-primary)', margin: 0, fontWeight: 600 }}>📝 MCQ Examination Test: {topic}</h3>
                  {mcqSubmitted && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', padding: '0.35rem 0.85rem', borderRadius: '20px', color: '#34d399', fontWeight: 'bold', fontSize: '0.85rem' }}>
                      <CheckCircle size={16} /> Test Score: {mcqScore} / {generatedData.items?.length || 0} ({Math.round((mcqScore / (generatedData.items?.length || 1)) * 100)}%)
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {generatedData.items?.map((item: any, qIdx: number) => {
                    const userSel = mcqSelected[qIdx];
                    const isCorrect = userSel === item.correct_index;

                    return (
                      <div key={qIdx} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                        <p style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.65rem' }}>
                          Q{qIdx + 1}. {item.question}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {item.options?.map((opt: string, oIdx: number) => {
                            let btnBg = 'rgba(255,255,255,0.03)';
                            let btnBorder = 'var(--border-subtle)';
                            let textColor = 'var(--text-primary)';

                            if (userSel === oIdx) {
                              btnBg = 'var(--accent-primary-subtle)';
                              btnBorder = 'var(--accent-primary)';
                              textColor = 'var(--accent-primary)';
                            }

                            if (mcqSubmitted) {
                              if (oIdx === item.correct_index) {
                                btnBg = 'rgba(16, 185, 129, 0.15)';
                                btnBorder = '#10b981';
                                textColor = '#34d399';
                              } else if (userSel === oIdx && !isCorrect) {
                                btnBg = 'rgba(244, 63, 94, 0.15)';
                                btnBorder = '#f43f5e';
                                textColor = '#fb7185';
                              }
                            }

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => !mcqSubmitted && setMcqSelected(prev => ({ ...prev, [qIdx]: oIdx }))}
                                disabled={mcqSubmitted}
                                style={{
                                  textAlign: 'left',
                                  padding: '0.55rem 0.85rem',
                                  borderRadius: 'var(--radius-sm)',
                                  background: btnBg,
                                  border: `1px solid ${btnBorder}`,
                                  color: textColor,
                                  fontSize: '0.85rem',
                                  cursor: mcqSubmitted ? 'default' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.55rem',
                                  transition: 'var(--transition)'
                                }}
                              >
                                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.72rem' }}>
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {mcqSubmitted && (
                          <div style={{ marginTop: '0.65rem', padding: '0.55rem 0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', borderLeft: isCorrect ? '3px solid #10b981' : '3px solid #f43f5e', fontSize: '0.82rem' }}>
                            <strong style={{ color: isCorrect ? '#34d399' : '#fb7185' }}>
                              {isCorrect ? '✅ Correct Solution:' : '❌ Incorrect:'}
                            </strong> {item.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!mcqSubmitted ? (
                  <button
                    type="button"
                    onClick={handleMcqSubmit}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '1.5rem', padding: '0.75rem', fontSize: '0.9rem' }}
                  >
                    Submit Test & Calculate Score
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setMcqSubmitted(false); setMcqSelected({}); }}
                    className="btn btn-outline"
                    style={{ width: '100%', marginTop: '1.5rem', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <RotateCcw size={16} /> Retake MCQ Test
                  </button>
                )}
              </div>
            )}

            {/* QUIZ VIEW */}
            {activeTool === 'quiz' && (
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-purple)', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', fontWeight: 600 }}>
                  🧩 Interactive Self-Test Quiz: {topic}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  {generatedData.items?.map((item: any, qIdx: number) => (
                    <div key={qIdx} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                        Q{qIdx + 1}. {item.question}
                      </p>
                      <textarea
                        className="form-input"
                        rows={2}
                        disabled={quizSubmitted}
                        placeholder="Type your explanation or answer here..."
                        value={quizUserAnswers[qIdx] || ''}
                        onChange={e => setQuizUserAnswers(prev => ({ ...prev, [qIdx]: e.target.value }))}
                        style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical' }}
                      />
                      {quizSubmitted && (
                        <div style={{ marginTop: '0.65rem', padding: '0.55rem 0.85rem', borderRadius: 'var(--radius-sm)', background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)', fontSize: '0.82rem', color: '#e9d5ff' }}>
                          💡 <strong>Model Correct Solution</strong>: {item.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {!quizSubmitted ? (
                  <button
                    type="button"
                    onClick={() => setQuizSubmitted(true)}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '1.5rem', padding: '0.75rem', fontSize: '0.9rem' }}
                  >
                    Submit Quiz & View Solutions
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setQuizSubmitted(false); setQuizUserAnswers({}); }}
                    className="btn btn-outline"
                    style={{ width: '100%', marginTop: '1.5rem', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <RotateCcw size={16} /> Retry Quiz
                  </button>
                )}
              </div>
            )}

            {/* FLIPPABLE FLASHCARDS VIEW */}
            {activeTool === 'flashcard' && generatedData.items && (
              <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-amber)' }}>
                    🗂️ Study Flashcards ({flashcardIdx + 1} of {generatedData.items.length})
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Click card to flip</span>
                </div>

                <div
                  onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                  style={{
                    minHeight: '200px',
                    background: flashcardFlipped ? 'rgba(245, 158, 11, 0.12)' : 'var(--accent-primary-subtle)',
                    border: flashcardFlipped ? '2px solid var(--accent-amber)' : '2px solid var(--accent-primary)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    transition: 'var(--transition)',
                    boxShadow: 'var(--shadow-card)'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, color: flashcardFlipped ? '#fbbf24' : 'var(--accent-primary)', marginBottom: '0.65rem' }}>
                    {flashcardFlipped ? '💡 Back (Detailed Explanation)' : '❓ Front (Key Concept)'}
                  </span>
                  <p style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5, margin: 0 }}>
                    {flashcardFlipped ? generatedData.items[flashcardIdx]?.back : generatedData.items[flashcardIdx]?.front}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem' }}>
                  <button 
                    type="button" 
                    onClick={() => { setFlashcardFlipped(false); setFlashcardIdx(prev => (prev - 1 + generatedData.items.length) % generatedData.items.length); }} 
                    className="btn btn-secondary"
                  >
                    ◀ Prev Card
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setFlashcardFlipped(!flashcardFlipped)} 
                    className="btn btn-primary"
                  >
                    🔄 Flip Card
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setFlashcardFlipped(false); setFlashcardIdx(prev => (prev + 1) % generatedData.items.length); }} 
                    className="btn btn-secondary"
                  >
                    Next Card ▶
                  </button>
                </div>
              </div>
            )}

            {/* VIVA VIEW */}
            {activeTool === 'viva' && (
              <div>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-emerald)', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', fontWeight: 600 }}>
                  🎓 Oral Examination Viva Questions: {topic}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {generatedData.items?.map((item: any, qIdx: number) => {
                    const isRevealed = vivaRevealed[qIdx];

                    return (
                      <div key={qIdx} style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                          Q{qIdx + 1}. {item.question}
                        </p>

                        {!isRevealed ? (
                          <button
                            type="button"
                            onClick={() => setVivaRevealed(prev => ({ ...prev, [qIdx]: true }))}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                          >
                            👁️ Reveal Ideal Answer
                          </button>
                        ) : (
                          <div style={{ marginTop: '0.55rem', padding: '0.55rem 0.85rem', borderRadius: 'var(--radius-sm)', background: 'var(--accent-emerald-subtle)', border: '1px solid var(--accent-emerald)', fontSize: '0.82rem', color: '#34d399' }}>
                            💬 <strong>Model Oral Answer</strong>: {item.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STUDY NOTES & SUMMARY VIEWS */}
            {(activeTool === 'notes' || activeTool === 'summary') && (
              <div style={{ lineHeight: 1.6 }}>
                <h3 style={{ fontSize: '1.1rem', color: 'var(--accent-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', fontWeight: 600 }}>
                  📑 {activeTool.toUpperCase()} Content for "{topic}"
                </h3>
                <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '1.25rem', fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                  {generatedData.formatted_text}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
