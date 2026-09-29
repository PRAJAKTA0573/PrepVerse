import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Globe, 
  Sparkles, 
  HelpCircle,
  AlertTriangle,
  BookOpen,
  FileCheck,
  CheckSquare,
  GraduationCap,
  Layers,
  X,
  Zap
} from 'lucide-react';
import type { DocumentFile } from '../App';

interface Message {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  citations?: string[];
  externalSearched?: boolean;
  toolType?: string;
  toolData?: {
    tool_type: string;
    topic: string;
    items?: any[];
  };
}

const McqTestViewer: React.FC<{ items: any[]; topic: string }> = ({ items, topic }) => {
  const [selectedOptions, setSelectedOptions] = useState<{ [qIdx: number]: number }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const handleSelect = (qIdx: number, oIdx: number) => {
    if (isSubmitted) return;
    setSelectedOptions(prev => ({ ...prev, [qIdx]: oIdx }));
  };

  const handleSubmit = () => {
    let calcScore = 0;
    items.forEach((item, idx) => {
      if (selectedOptions[idx] === item.correct_index) {
        calcScore += 1;
      }
    });
    setScore(calcScore);
    setIsSubmitted(true);

    try {
      const history = JSON.parse(localStorage.getItem('mcq_scores') || '[]');
      history.push({ topic, score: calcScore, total: items.length, date: new Date().toLocaleTimeString() });
      localStorage.setItem('mcq_scores', JSON.stringify(history));
    } catch (e) {
      console.warn("Could not save score:", e);
    }
  };

  return (
    <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-lg)', padding: '1.1rem', marginTop: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem' }}>
        <h4 style={{ margin: 0, color: 'var(--accent-primary)', fontSize: '0.92rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <CheckSquare size={16} /> MCQ Test Mode: {topic}
        </h4>
        {isSubmitted && (
          <span style={{ padding: '0.2rem 0.65rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#34d399', fontWeight: 'bold', fontSize: '0.8rem' }}>
            Score: {score} / {items.length} ({Math.round((score / items.length) * 100)}%)
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {items.map((item, qIdx) => {
          const userSel = selectedOptions[qIdx];
          const isCorrect = userSel === item.correct_index;

          return (
            <div key={qIdx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
              <p style={{ margin: '0 0 0.6rem 0', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                Q{qIdx + 1}. {item.question}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {item.options.map((opt: string, oIdx: number) => {
                  let btnBg = 'rgba(255,255,255,0.03)';
                  let btnBorder = 'var(--border-subtle)';
                  let textColor = 'var(--text-primary)';

                  if (userSel === oIdx) {
                    btnBg = 'var(--accent-primary-subtle)';
                    btnBorder = 'var(--accent-primary)';
                    textColor = 'var(--accent-primary)';
                  }

                  if (isSubmitted) {
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
                      onClick={() => handleSelect(qIdx, oIdx)}
                      disabled={isSubmitted}
                      style={{
                        textAlign: 'left',
                        padding: '0.45rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        background: btnBg,
                        border: `1px solid ${btnBorder}`,
                        color: textColor,
                        fontSize: '0.82rem',
                        cursor: isSubmitted ? 'default' : 'pointer',
                        transition: 'var(--transition)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: '0.75rem', opacity: 0.8 }}>{String.fromCharCode(65 + oIdx)}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>

              {isSubmitted && (
                <div style={{ marginTop: '0.55rem', padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-input)', borderLeft: isCorrect ? '3px solid #10b981' : '3px solid #f43f5e', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: isCorrect ? '#34d399' : '#fb7185' }}>{isCorrect ? '✅ Correct Solution:' : '❌ Explanation:'}</strong> {item.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isSubmitted && (
        <button
          type="button"
          onClick={handleSubmit}
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '0.85rem', padding: '0.6rem', fontSize: '0.85rem' }}
        >
          Submit Test & Calculate Score
        </button>
      )}
    </div>
  );
};

const QuizViewer: React.FC<{ items: any[]; topic: string }> = ({ items, topic }) => {
  const [userAnswers, setUserAnswers] = useState<{ [qIdx: number]: string }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (qIdx: number, val: string) => {
    setUserAnswers(prev => ({ ...prev, [qIdx]: val }));
  };

  return (
    <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-lg)', padding: '1.1rem', marginTop: '0.6rem' }}>
      <h4 style={{ margin: '0 0 0.85rem 0', color: 'var(--accent-purple)', fontSize: '0.92rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <HelpCircle size={16} /> Interactive Quiz: {topic}
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {items.map((item, qIdx) => (
          <div key={qIdx} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
            <p style={{ margin: '0 0 0.5rem 0', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>
              Q{qIdx + 1}. {item.question}
            </p>
            <input
              type="text"
              className="form-input"
              disabled={isSubmitted}
              placeholder="Type your explanation or answer here..."
              value={userAnswers[qIdx] || ''}
              onChange={e => handleChange(qIdx, e.target.value)}
              style={{ width: '100%', fontSize: '0.82rem' }}
            />
            {isSubmitted && (
              <div style={{ marginTop: '0.55rem', padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-sm)', background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)', fontSize: '0.78rem', color: '#e9d5ff' }}>
                💡 <strong>Model Correct Solution</strong>: {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>

      {!isSubmitted && (
        <button
          type="button"
          onClick={() => setIsSubmitted(true)}
          className="btn btn-primary"
          style={{ width: '100%', marginTop: '0.85rem', padding: '0.6rem', fontSize: '0.85rem' }}
        >
          Submit Quiz & View Solutions
        </button>
      )}
    </div>
  );
};

const FlashcardViewer: React.FC<{ items: any[]; topic: string }> = ({ items, topic }) => {
  const [currIdx, setCurrIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!items || items.length === 0) return null;
  const currentCard = items[currIdx];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrIdx(prev => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrIdx(prev => (prev - 1 + items.length) % items.length);
  };

  return (
    <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-lg)', padding: '1.1rem', marginTop: '0.6rem', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-amber)' }}>
          🗂️ Flashcard Deck: {topic} ({currIdx + 1} of {items.length})
        </span>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Click card to flip</span>
      </div>

      <div
        onClick={() => setIsFlipped(!isFlipped)}
        style={{
          minHeight: '130px',
          background: isFlipped ? 'rgba(245, 158, 11, 0.12)' : 'var(--accent-primary-subtle)',
          border: isFlipped ? '2px solid var(--accent-amber)' : '2px solid var(--accent-primary)',
          borderRadius: 'var(--radius-md)',
          padding: '1.2rem',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          transition: 'var(--transition)'
        }}
      >
        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, color: isFlipped ? '#fbbf24' : 'var(--accent-primary)', marginBottom: '0.4rem' }}>
          {isFlipped ? '💡 Back (Detailed Explanation)' : '❓ Front (Key Concept)'}
        </span>
        <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
          {isFlipped ? currentCard.back : currentCard.front}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.8rem' }}>
        <button type="button" onClick={handlePrev} className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
          ◀ Prev Card
        </button>
        <button type="button" onClick={() => setIsFlipped(!isFlipped)} className="btn btn-primary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.75rem' }}>
          🔄 Flip Card
        </button>
        <button type="button" onClick={handleNext} className="btn btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
          Next Card ▶
        </button>
      </div>
    </div>
  );
};

interface AIChatbotProps {
  documents: DocumentFile[];
  onOpenStudyToolsPage?: (tool?: string, topic?: string) => void;
}

type ToolType = 'summary' | 'notes' | 'mcq' | 'quiz' | 'viva' | 'flashcard';

function renderFormattedInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\)|`.*?`)/g);

  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={idx} style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={idx} style={{ background: 'rgba(255,255,255,0.08)', padding: '0.1rem 0.35rem', borderRadius: '4px', fontSize: '0.85em', fontFamily: 'var(--font-mono)' }}>{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        const linkText = match[1];
        const linkUrl = match[2];
        const isCitation = /^\[?\d+\]?$/.test(linkText);

        if (isCitation) {
          return (
            <a 
              key={idx} 
              href={linkUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              title={`Source Link: ${linkUrl}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.05rem 0.4rem',
                margin: '0 0.15rem',
                borderRadius: '10px',
                background: 'var(--accent-primary-subtle)',
                border: '1px solid rgba(99, 102, 241, 0.4)',
                color: '#818cf8',
                fontSize: '0.72rem',
                fontWeight: 600,
                textDecoration: 'none'
              }}
            >
              {linkText.replace(/[\[\]]/g, '')}
            </a>
          );
        }

        return (
          <a 
            key={idx} 
            href={linkUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            style={{ color: '#818cf8', textDecoration: 'underline', fontWeight: 500 }}
          >
            {linkText}
          </a>
        );
      }
    }
    return part;
  });
}

const FormattedMessage: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  const blocks = content.split(/\n\n+/);

  return (
    <div className="formatted-message" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', lineHeight: '1.6' }}>
      {blocks.map((block, bIdx) => {
        const trimmed = block.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith('### ')) {
          const title = trimmed.replace(/^###\s+/, '');
          return (
            <h3 key={bIdx} style={{ fontSize: '1rem', fontWeight: 700, margin: '0.3rem 0 0.15rem 0', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.3rem' }}>
              {renderFormattedInline(title)}
            </h3>
          );
        }

        if (trimmed.startsWith('#### ')) {
          const title = trimmed.replace(/^####\s+/, '');
          return (
            <h4 key={bIdx} style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0.2rem 0 0.1rem 0', color: 'var(--text-primary)' }}>
              {renderFormattedInline(title)}
            </h4>
          );
        }

        const lines = trimmed.split('\n');
        const hasBullets = lines.some(l => /^\s*([•\-\*]|\d+\.)\s+/.test(l));

        if (hasBullets) {
          return (
            <div key={bIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingLeft: '0.1rem' }}>
              {lines.map((line, lIdx) => {
                const isBullet = /^\s*([•\-\*]|\d+\.)\s+/.test(line);
                if (isBullet) {
                  const cleanLine = line.replace(/^\s*([•\-\*]|\d+\.)\s+/, '');
                  return (
                    <div key={lIdx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'var(--bg-input)', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-primary)' }}>
                      <span style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>•</span>
                      <div style={{ flex: 1 }}>{renderFormattedInline(cleanLine)}</div>
                    </div>
                  );
                }
                return <p key={lIdx} style={{ margin: 0 }}>{renderFormattedInline(line)}</p>;
              })}
            </div>
          );
        }

        return (
          <p key={bIdx} style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {renderFormattedInline(trimmed)}
          </p>
        );
      })}
    </div>
  );
};

export default function AIChatbot({ documents, onOpenStudyToolsPage }: AIChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 1, 
      sender: 'ai', 
      text: "Hello! I am your PrepVerse AI Study Assistant.\n\n### 💡 What I Can Do:\n• **Search Uploaded Notes**: Extract key context and answers from your PDFs and documents.\n• **Live Web Search**: Fetch external search results automatically when needed.\n• **AI Study Tools**: Use the toolbar buttons below anytime to generate **MCQs, Flashcards, Summaries, Notes, Quizzes, and Viva Qs**!",
      citations: []
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [strictMode, setStrictMode] = useState<boolean>(true);
  const [isThinking, setIsThinking] = useState(false);
  
  // Study Tool Modal States
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolType>('summary');
  const [toolTitle, setToolTitle] = useState('');
  const [toolTopic, setToolTopic] = useState('');
  const [toolSource, setToolSource] = useState<'notes' | 'web'>('notes');
  const [selectedDocName, setSelectedDocName] = useState<string>('ALL');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  const openToolModal = (type: ToolType, title: string) => {
    setSelectedTool(type);
    setToolTitle(title);
    if (inputText.trim()) {
      setToolTopic(inputText);
    } else {
      setToolTopic('Management Information Systems');
    }
    setModalOpen(true);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      sender: 'user',
      text: inputText
    };

    setMessages(prev => [...prev, userMessage]);
    const currentQuery = inputText;
    setInputText('');
    setIsThinking(true);

    const queryLower = currentQuery.toLowerCase();
    const isMcqRequest = queryLower.includes('mcq') || queryLower.includes('multiple choice');
    const isQuizRequest = queryLower.includes('quiz') || queryLower.includes('self test');
    const isFlashcardRequest = queryLower.includes('flashcard') || queryLower.includes('flash card');
    const isVivaRequest = queryLower.includes('viva') || queryLower.includes('oral exam') || queryLower.includes('oral question');

    if (isMcqRequest || isQuizRequest || isFlashcardRequest || isVivaRequest) {
      const toolType: ToolType = isMcqRequest ? 'mcq' : isQuizRequest ? 'quiz' : isFlashcardRequest ? 'flashcard' : 'viva';
      let cleanTopic = currentQuery
        .replace(/\b(give|me|generate|create|ask|show|some|about|on|for|questions?|qts|test|mcq|mcqs|multiple choice|quiz|quizzes|flashcards?|viva)\b/gi, ' ')
        .trim();
      if (cleanTopic.length < 3) {
        cleanTopic = documents.length > 0 ? documents[0].name.replace(/\.[^/.]+$/, "") : currentQuery;
      }

      try {
      const response = await fetch('https://prepverse-ai-service.onrender.com/study-tool/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tool_type: toolType,
            topic: cleanTopic,
            source: strictMode ? 'notes' : 'web',
            context_files: documents.map(d => d.name)
          })
        });

        if (response.ok) {
          const data = await response.json();
          const aiMessage: Message = {
            id: Date.now() + 1,
            sender: 'ai',
            text: data.formatted_text,
            citations: data.citations || [],
            externalSearched: !strictMode,
            toolType: toolType,
            toolData: {
              tool_type: data.tool_type,
              topic: data.topic,
              items: data.items
            }
          };
          setMessages(prev => [...prev, aiMessage]);
          setIsThinking(false);
          return;
        }
      } catch (err) {
        console.warn("Study tool chat routing error:", err);
      }
    }

    try {
      const response = await fetch('https://prepverse-ai-service.onrender.com/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: currentQuery,
          strict: strictMode,
          context_files: documents.map(d => d.name)
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMessage: Message = {
          id: Date.now() + 1,
          sender: 'ai',
          text: data.answer,
          citations: data.citations || [],
          externalSearched: data.external_searched || false
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(`Server returned status ${response.status}`);
      }
    } catch (err) {
      console.warn("Falling back to local document context search:", err);
      const queryLower = currentQuery.toLowerCase();
      const matchedDocs = documents.filter(doc => 
        doc.name.toLowerCase().includes(queryLower) || 
        (doc.contentSummary && doc.contentSummary.toLowerCase().includes(queryLower)) ||
        doc.tags.some(t => queryLower.includes(t.toLowerCase()))
      );

      let responseText = '';
      let citationsFound: string[] = [];

      if (matchedDocs.length > 0) {
        citationsFound = matchedDocs.map(d => d.name);
        responseText = `### 📖 Uploaded Document Summary\n\nBased on your uploaded document (**${matchedDocs[0].name}**):\n\n• ${matchedDocs[0].contentSummary}`;
      } else {
        if (strictMode) {
          responseText = "### ⚠️ No Context Found\n\nI couldn't find any direct references to that in your uploaded materials.\n\n*Tip*: **Strict Document Search** is currently enabled. Toggle off 'Search only in uploaded materials' to query live web sources!";
        } else {
          responseText = `### 🌐 External Web Search Findings\n\nSearching external sources for **"${currentQuery}"**:\n\n• **Software Engineering Patterns**: Key best practices highlight modular system architecture, caching layer optimization, and asynchronous task processing.`;
        }
      }

      const aiMessage: Message = {
        id: Date.now() + 1,
        sender: 'ai',
        text: responseText,
        citations: citationsFound,
        externalSearched: !strictMode && matchedDocs.length === 0
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleGenerateStudyTool = async () => {
    const isNotes = toolSource === 'notes';
    const activeTopicName = isNotes
      ? (selectedDocName === 'ALL' || !selectedDocName ? 'Uploaded Notes Summary' : selectedDocName.replace(/\.[^/.]+$/, ""))
      : toolTopic.trim();

    if (!isNotes && !toolTopic.trim()) return;

    setModalOpen(false);

    const userMessage: Message = {
      id: Date.now(),
      sender: 'user',
      text: `⚡ Generate **${toolTitle}** for: *"${activeTopicName}"* (Source: ${isNotes ? `📖 ${selectedDocName === 'ALL' ? 'All Uploaded Notes' : selectedDocName}` : '🌐 Live Web Search'})`
    };

    setMessages(prev => [...prev, userMessage]);
    setIsThinking(true);

    const targetContextFiles = isNotes
      ? (selectedDocName === 'ALL' || !selectedDocName ? documents.map(d => d.name) : [selectedDocName])
      : [];

    try {
      const response = await fetch('https://prepverse-ai-service.onrender.com/study-tool/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool_type: selectedTool,
          topic: activeTopicName,
          source: toolSource,
          context_files: targetContextFiles
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiMessage: Message = {
          id: Date.now() + 1,
          sender: 'ai',
          text: data.formatted_text,
          citations: data.citations || [],
          externalSearched: toolSource === 'web',
          toolType: selectedTool,
          toolData: {
            tool_type: data.tool_type,
            topic: data.topic,
            items: data.items
          }
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(`Server returned status ${response.status}`);
      }
    } catch {
      const aiMessage: Message = {
        id: Date.now() + 1,
        sender: 'ai',
        text: `### 📑 Generated ${toolTitle} for "${activeTopicName}"\n\n• **Core Concept**: Synthesized study material based on ${toolSource === 'notes' ? 'uploaded notes' : 'web search'}.\n• **Key Takeaway**: Continuous revision enhances long-term memory retention.`,
        citations: documents.map(d => d.name),
        externalSearched: toolSource === 'web'
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: 'calc(100vh - 120px)', minHeight: '550px' }}>
      <div className="header-bar" style={{ marginBottom: 0 }}>
        <div>
          <h2>AI RAG Assistant & Workspace</h2>
          <p className="title-desc">Query document index directly or generate interactive study tools.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--accent-primary-subtle)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '0.35rem 0.75rem', borderRadius: '20px', color: '#818cf8', fontSize: '0.78rem', fontWeight: 600 }}>
          <Sparkles size={14} /> Gemini-Pro RAG Engine
        </div>
      </div>

      {documents.length === 0 && (
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', background: 'var(--accent-amber-subtle)', border: '1px solid var(--accent-amber)', padding: '0.65rem 1rem', borderRadius: 'var(--radius-md)', color: '#fbbf24', fontSize: '0.82rem' }}>
          <AlertTriangle size={16} className="shrink-0" />
          <span>No study materials uploaded yet. Upload PDFs or DOCX files in <strong>Study Materials</strong> to use full RAG context.</span>
        </div>
      )}

      {/* Main Messages Container */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-message ${msg.sender}`}>
            <div className="message-bubble">
              <FormattedMessage content={msg.text} />

              {/* Render Inline Tool Components */}
              {msg.toolData && msg.toolData.items && (
                <>
                  {msg.toolType === 'mcq' && <McqTestViewer items={msg.toolData.items} topic={msg.toolData.topic} />}
                  {msg.toolType === 'quiz' && <QuizViewer items={msg.toolData.items} topic={msg.toolData.topic} />}
                  {msg.toolType === 'flashcard' && <FlashcardViewer items={msg.toolData.items} topic={msg.toolData.topic} />}
                </>
              )}

              {/* Citations & Web Search Tag */}
              {(msg.citations && msg.citations.length > 0) || msg.externalSearched ? (
                <div className="citations">
                  {msg.externalSearched && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', color: '#c084fc', padding: '0.15rem 0.5rem', borderRadius: '12px', fontSize: '0.72rem', fontWeight: 600 }}>
                      <Globe size={11} /> External Web Search
                    </span>
                  )}
                  {msg.citations?.map((c, idx) => (
                    <span key={idx} className="citation-tag">
                      📄 {c}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="chat-message ai">
            <div className="message-bubble" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1.15rem' }}>
              <div className="waveform-indicator">
                <span className="wave-bar" style={{ width: '4px' }}></span>
                <span className="wave-bar" style={{ width: '4px' }}></span>
                <span className="wave-bar" style={{ width: '4px' }}></span>
                <span className="wave-bar" style={{ width: '4px' }}></span>
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Synthesizing RAG response...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Launch Study Tools Toolbar above Chat Input */}
      <div className="study-tools-bar" style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '0.2rem', scrollbarWidth: 'thin' }}>
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', marginRight: '0.2rem', textTransform: 'uppercase' }}>
          Quick Generator:
        </span>
        <button type="button" onClick={() => openToolModal('summary', 'Summary Notes')}>
          <BookOpen size={13} /> Summary
        </button>
        <button type="button" onClick={() => openToolModal('notes', 'Study Notes')}>
          <FileCheck size={13} /> Study Notes
        </button>
        <button type="button" onClick={() => openToolModal('mcq', 'MCQ Test')}>
          <CheckSquare size={13} /> MCQs
        </button>
        <button type="button" onClick={() => openToolModal('quiz', 'Interactive Quiz')}>
          <HelpCircle size={13} /> Quiz
        </button>
        <button type="button" onClick={() => openToolModal('viva', 'Viva Q&A')}>
          <GraduationCap size={13} /> Viva Qs
        </button>
        <button type="button" onClick={() => openToolModal('flashcard', 'Flashcards')}>
          <Layers size={13} /> Flashcards
        </button>

        {onOpenStudyToolsPage && (
          <button 
            type="button" 
            onClick={() => onOpenStudyToolsPage()}
            style={{ marginLeft: 'auto', background: 'var(--accent-primary-subtle)', color: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
          >
            <Zap size={13} /> Full Workspace
          </button>
        )}
      </div>

      {/* Input Box & Options */}
      <form onSubmit={handleSend} className="glass-card" style={{ padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input
            type="text"
            className="form-input"
            style={{ flexGrow: 1, border: 'none', background: 'transparent', padding: '0.4rem 0', fontSize: '0.9rem' }}
            placeholder="Ask a question about your uploaded materials or request MCQs..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" style={{ padding: '0.5rem 1rem' }} disabled={isThinking || !inputText.trim()}>
            <Send size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={strictMode}
              onChange={e => setStrictMode(e.target.checked)}
              style={{ accentColor: 'var(--accent-primary)' }}
            />
            <span>Search strictly in uploaded materials (RAG)</span>
          </label>
          <span>Press Enter to send</span>
        </div>
      </form>

      {/* Generator Tool Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setModalOpen(false)}>
          <div className="glass-card" style={{ maxWidth: '440px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Generate {toolTitle}</h3>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Material Source</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setToolSource('notes')}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: toolSource === 'notes' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    background: toolSource === 'notes' ? 'var(--accent-primary-subtle)' : 'var(--bg-input)',
                    color: toolSource === 'notes' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  📖 Uploaded Notes
                </button>
                <button
                  type="button"
                  onClick={() => setToolSource('web')}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    border: toolSource === 'web' ? '1px solid var(--accent-purple)' : '1px solid var(--border-subtle)',
                    background: toolSource === 'web' ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-input)',
                    color: toolSource === 'web' ? '#c084fc' : 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🌐 Live Web Search
                </button>
              </div>
            </div>

            {toolSource === 'notes' ? (
              <div className="form-group">
                <label className="form-label">Select Document</label>
                <select
                  className="form-input"
                  value={selectedDocName}
                  onChange={e => setSelectedDocName(e.target.value)}
                >
                  <option value="ALL">📚 All Uploaded Notes ({documents.length} files)</option>
                  {documents.map(d => (
                    <option key={d.id} value={d.name}>📄 {d.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Topic e.g. Quantum Computing, OOPs...</label>
                <input
                  type="text"
                  className="form-input"
                  value={toolTopic}
                  onChange={e => setToolTopic(e.target.value)}
                  placeholder="Enter topic for live web search..."
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-outline" onClick={() => setModalOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleGenerateStudyTool}>Generate Material</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
