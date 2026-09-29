import React, { useState } from 'react';
import { 
  FileText, 
  UploadCloud, 
  Search, 
  Trash2, 
  Plus, 
  FolderPlus, 
  Eye, 
  X, 
  Tag, 
  Folder,
  FileCheck,
  Edit3,
  Check,
  LayoutGrid,
  List
} from 'lucide-react';
import type { DocumentFile } from '../App';

interface DocManagerProps {
  documents: DocumentFile[];
  setDocuments: React.Dispatch<React.SetStateAction<DocumentFile[]>>;
}

export default function DocManager({ documents, setDocuments }: DocManagerProps) {
  const [activeSubject, setActiveSubject] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDoc, setSelectedDoc] = useState<DocumentFile | null>(null);
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Custom Subject Folders
  const [customSubjects, setCustomSubjects] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('prepverse_custom_subjects');
      return saved ? JSON.parse(saved) : ['Artificial Intelligence', 'Machine Learning', 'Python', 'System Design', 'Java'];
    } catch {
      return ['Artificial Intelligence', 'Machine Learning', 'Python', 'System Design', 'Java'];
    }
  });

  const [showSubjectModal, setShowSubjectModal] = useState<boolean>(false);
  const [newSubjectName, setNewSubjectName] = useState<string>('');

  // Add Manual Note Modal
  const [showAddNote, setShowAddNote] = useState<boolean>(false);
  const [newNoteTitle, setNewNoteTitle] = useState<string>('');
  const [newNoteContent, setNewNoteContent] = useState<string>('');
  const [newNoteSubject, setNewNoteSubject] = useState<string>('General');

  // Document Editing / Renaming
  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const [editDocName, setEditDocName] = useState<string>('');

  // Uploading state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string>('');

  const saveCustomSubjects = (subjects: string[]) => {
    setCustomSubjects(subjects);
    try {
      localStorage.setItem('prepverse_custom_subjects', JSON.stringify(subjects));
    } catch (e) {
      console.warn("Could not save custom subjects:", e);
    }
  };

  const handleCreateSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    const trimmed = newSubjectName.trim();
    if (!customSubjects.includes(trimmed)) {
      const updated = [...customSubjects, trimmed];
      saveCustomSubjects(updated);
      setActiveSubject(trimmed);
    }
    setNewSubjectName('');
    setShowSubjectModal(false);
  };

  const handleDeleteSubject = (subjToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customSubjects.filter(s => s !== subjToDelete);
    saveCustomSubjects(updated);
    if (activeSubject === subjToDelete) {
      setActiveSubject('ALL');
    }
  };

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgressMsg(`Processing & parsing ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tags', activeSubject !== 'ALL' ? activeSubject : 'General');

      const response = await fetch('https://prepverse-ai-service.onrender.com/process-document', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const newDoc: DocumentFile = {
          id: Date.now(),
          name: result.filename || file.name,
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          uploadDate: new Date().toISOString().split('T')[0],
          tags: activeSubject !== 'ALL' ? [activeSubject, file.name.split('.').pop()?.toUpperCase() || 'DOC'] : [file.name.split('.').pop()?.toUpperCase() || 'DOC'],
          contentSummary: result.summary || 'Content indexed and parsed into vector chunks.'
        };
        setDocuments(prev => [newDoc, ...prev]);
        setUploadProgressMsg('');
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.warn("Server unavailable. Saving document locally:", err);
      const newDoc: DocumentFile = {
        id: Date.now(),
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
        uploadDate: new Date().toISOString().split('T')[0],
        tags: activeSubject !== 'ALL' ? [activeSubject, 'Local'] : ['General', 'Local'],
        contentSummary: 'Document added to local catalog workspace.'
      };
      setDocuments(prev => [newDoc, ...prev]);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim() || !newNoteContent.trim()) return;

    setIsUploading(true);
    const noteFileName = `${newNoteTitle.trim().replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;

    try {
      const blob = new Blob([newNoteContent], { type: 'text/plain' });
      const file = new File([blob], noteFileName, { type: 'text/plain' });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tags', newNoteSubject);

      const response = await fetch('https://prepverse-ai-service.onrender.com/process-document', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const newDoc: DocumentFile = {
          id: Date.now(),
          name: result.filename || noteFileName,
          size: `${(blob.size / 1024).toFixed(1)} KB`,
          uploadDate: new Date().toISOString().split('T')[0],
          tags: [newNoteSubject, 'NOTE'],
          contentSummary: result.summary || newNoteContent.slice(0, 200)
        };
        setDocuments(prev => [newDoc, ...prev]);
      } else {
        throw new Error('Note upload failed');
      }
    } catch {
      const newDoc: DocumentFile = {
        id: Date.now(),
        name: noteFileName,
        size: `${(newNoteContent.length / 1024).toFixed(1)} KB`,
        uploadDate: new Date().toISOString().split('T')[0],
        tags: [newNoteSubject, 'NOTE'],
        contentSummary: newNoteContent.slice(0, 200)
      };
      setDocuments(prev => [newDoc, ...prev]);
    } finally {
      setIsUploading(false);
      setShowAddNote(false);
      setNewNoteTitle('');
      setNewNoteContent('');
    }
  };

  const handleDeleteDoc = (id: number) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
    if (selectedDoc && selectedDoc.id === id) setSelectedDoc(null);
  };

  const handleSaveDocName = (id: number) => {
    if (!editDocName.trim()) return;
    setDocuments(prev => prev.map(doc => doc.id === id ? { ...doc, name: editDocName.trim() } : doc));
    if (selectedDoc && selectedDoc.id === id) setSelectedDoc(prev => prev ? { ...prev, name: editDocName.trim() } : null);
    setEditingDocId(null);
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSubject = activeSubject === 'ALL' || doc.tags.includes(activeSubject);
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (doc.contentSummary && doc.contentSummary.toLowerCase().includes(searchQuery.toLowerCase()));
    
    let matchesType = true;
    if (fileTypeFilter === 'PDF') matchesType = doc.name.toLowerCase().endsWith('.pdf');
    if (fileTypeFilter === 'DOCX') matchesType = doc.name.toLowerCase().endsWith('.docx') || doc.name.toLowerCase().endsWith('.doc');
    if (fileTypeFilter === 'NOTES') matchesType = doc.tags.includes('NOTE') || doc.name.toLowerCase().endsWith('.txt');

    return matchesSubject && matchesSearch && matchesType;
  });

  return (
    <div>
      <div className="header-bar">
        <div>
          <h2>Study Material Hub</h2>
          <p className="title-desc">Catalog, organize, and inspect notes for RAG querying & test generation.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button 
            type="button"
            className="btn btn-secondary" 
            onClick={() => setShowSubjectModal(true)}
            style={{ fontSize: '0.82rem' }}
          >
            <FolderPlus size={15} /> New Subject Folder
          </button>
          <button 
            type="button"
            className="btn btn-primary" 
            onClick={() => setShowAddNote(true)}
            style={{ fontSize: '0.82rem' }}
          >
            <Plus size={15} /> Create Note
          </button>
        </div>
      </div>

      {/* Subject Folders Horizontal Pill Bar */}
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.85rem', marginBottom: '1.25rem', scrollbarWidth: 'thin' }}>
        <button
          type="button"
          onClick={() => setActiveSubject('ALL')}
          style={{
            padding: '0.45rem 0.85rem',
            borderRadius: '20px',
            border: activeSubject === 'ALL' ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
            background: activeSubject === 'ALL' ? 'var(--accent-primary-subtle)' : 'var(--bg-card)',
            color: activeSubject === 'ALL' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontSize: '0.82rem',
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'var(--transition)'
          }}
        >
          <Folder size={14} /> All Materials ({documents.length})
        </button>

        {customSubjects.map(subj => {
          const count = documents.filter(d => d.tags.includes(subj)).length;
          const isActive = activeSubject === subj;

          return (
            <button
              key={subj}
              type="button"
              onClick={() => setActiveSubject(subj)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '20px',
                border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                background: isActive ? 'var(--accent-primary-subtle)' : 'var(--bg-card)',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'var(--transition)'
              }}
            >
              <Folder size={14} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
              {subj} ({count})
              <Trash2 
                size={12} 
                style={{ marginLeft: '4px', opacity: 0.5 }} 
                onClick={(e) => handleDeleteSubject(subj, e)}
              />
            </button>
          );
        })}
      </div>

      {/* Toolbar: Search, Filters & View Toggle */}
      <div className="glass-card" style={{ marginBottom: '1.25rem', padding: '0.85rem 1.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.85rem' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '9px', color: 'var(--text-muted)' }} size={16} />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
            placeholder="Search documents by name or summary content..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* File Type Filter Pills */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            {['ALL', 'PDF', 'DOCX', 'NOTES'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setFileTypeFilter(t)}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: fileTypeFilter === t ? 'var(--accent-primary)' : 'transparent',
                  color: fileTypeFilter === t ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '2px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              style={{
                padding: '0.35rem 0.55rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: viewMode === 'grid' ? 'var(--bg-card-hover)' : 'transparent',
                color: viewMode === 'grid' ? 'var(--accent-primary)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                padding: '0.35rem 0.55rem',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: viewMode === 'list' ? 'var(--bg-card-hover)' : 'transparent',
                color: viewMode === 'list' ? 'var(--accent-primary)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Drag & Drop File Upload Area */}
      <div className="glass-card" style={{ border: '2px dashed var(--border-medium)', textAlign: 'center', padding: '1.5rem', marginBottom: '1.5rem', cursor: 'pointer', background: 'var(--bg-input)' }}>
        <input 
          type="file" 
          id="doc-file-input"
          style={{ display: 'none' }} 
          accept=".pdf,.docx,.doc,.pptx,.ppt,.txt"
          onChange={handleUploadFile}
        />
        <label htmlFor="doc-file-input" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem' }}>
          <UploadCloud size={32} color="var(--accent-primary)" />
          <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0 }}>
            {isUploading ? uploadProgressMsg : 'Click or Drag & Drop Study Material Here'}
          </p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
            Supports PDF, DOCX, PPTX, and TXT (Max 50MB). Auto-indexed for RAG querying.
          </p>
        </label>
      </div>

      {/* Documents Library Content Display */}
      {filteredDocs.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
          <FileText size={40} style={{ opacity: 0.3, margin: '0 auto 0.75rem' }} />
          <p style={{ fontSize: '0.95rem', fontWeight: 600 }}>No documents found matching criteria.</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Upload a study note or create a new subject folder above.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.15rem' }}>
          {filteredDocs.map((doc) => {
            const isSelected = Boolean(selectedDoc && selectedDoc.id === doc.id);
            return (
              <div 
                key={doc.id}
                className="glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'var(--accent-primary-subtle)' : 'var(--bg-card)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.65rem' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-md)', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                      <FileCheck size={18} />
                    </div>

                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        title="Rename document"
                        onClick={() => { setEditingDocId(doc.id); setEditDocName(doc.name); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        type="button"
                        title="Delete document"
                        onClick={() => handleDeleteDoc(doc.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {editingDocId === doc.id ? (
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '0.4rem' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
                        value={editDocName}
                        onChange={e => setEditDocName(e.target.value)}
                      />
                      <button type="button" onClick={() => handleSaveDocName(doc.id)} className="btn btn-primary" style={{ padding: '0.2rem 0.5rem' }}>
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.name}>
                      {doc.name}
                    </p>
                  )}

                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>{doc.size}</span> • <span>{doc.uploadDate}</span>
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {doc.tags.map((t, idx) => (
                      <span key={idx} style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                        #{t}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedDoc(doc)}
                    className="btn btn-secondary"
                    style={{ width: '100%', fontSize: '0.78rem', padding: '0.45rem' }}
                  >
                    <Eye size={14} /> Inspect Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Row View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filteredDocs.map((doc) => {
            const isSelected = Boolean(selectedDoc && selectedDoc.id === doc.id);
            return (
              <div
                key={doc.id}
                className="glass-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1.15rem',
                  border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                  <FileCheck size={20} color="var(--accent-primary)" className="shrink-0" />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.name}
                    </p>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{doc.size} • Uploaded {doc.uploadDate}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {doc.tags.map((t, idx) => (
                      <span key={idx} style={{ fontSize: '0.68rem', padding: '1px 5px', borderRadius: '4px', background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                  <button type="button" onClick={() => setSelectedDoc(doc)} className="btn btn-outline" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}>
                    <Eye size={13} /> View
                  </button>
                  <button type="button" onClick={() => handleDeleteDoc(doc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Slide-Over Panel Drawer */}
      {selectedDoc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 150, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setSelectedDoc(null)}>
          <div 
            style={{ width: '420px', maxWidth: '90vw', height: '100vh', background: 'var(--bg-sidebar)', borderLeft: '1px solid var(--border-medium)', padding: '1.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Document Details</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>RAG vector catalog entry</p>
              </div>
              <button type="button" onClick={() => setSelectedDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="glass-card" style={{ background: 'var(--bg-input)' }}>
              <p style={{ fontSize: '0.95rem', fontWeight: 600, wordBreak: 'break-all', marginBottom: '0.5rem' }}>{selectedDoc.name}</p>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span>Size: {selectedDoc.size}</span>
                <span>Date: {selectedDoc.uploadDate}</span>
              </div>
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FileText size={14} color="var(--accent-primary)" /> AI Content Index Summary
              </label>
              <div style={{ padding: '0.85rem 1rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                {selectedDoc.contentSummary || 'No AI summary generated yet for this file.'}
              </div>
            </div>

            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Tag size={14} color="var(--accent-primary)" /> Indexed Subject Tags
              </label>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {selectedDoc.tags.map((t, idx) => (
                  <span key={idx} style={{ padding: '0.25rem 0.65rem', borderRadius: '12px', background: 'var(--accent-primary-subtle)', color: 'var(--accent-primary)', fontSize: '0.78rem', fontWeight: 600 }}>
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
              <button 
                type="button"
                className="btn btn-outline"
                style={{ width: '100%', color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                onClick={() => handleDeleteDoc(selectedDoc.id)}
              >
                <Trash2 size={15} /> Remove File from Catalog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Subject Modal */}
      {showSubjectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowSubjectModal(false)}>
          <div className="glass-card" style={{ maxWidth: '380px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.85rem' }}>Create Subject Folder</h3>
            <form onSubmit={handleCreateSubject}>
              <div className="form-group">
                <label className="form-label">Folder Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Data Structures, Operating Systems..."
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowSubjectModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Folder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Note Modal */}
      {showAddNote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowAddNote(false)}>
          <div className="glass-card" style={{ maxWidth: '520px', width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.85rem' }}>Create Written Study Note</h3>
            <form onSubmit={handleCreateNote}>
              <div className="form-group">
                <label className="form-label">Note Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Title of note..."
                  value={newNoteTitle}
                  onChange={e => setNewNoteTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Subject Category</label>
                <select
                  className="form-input"
                  value={newNoteSubject}
                  onChange={e => setNewNoteSubject(e.target.value)}
                >
                  <option value="General">General</option>
                  {customSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Content Body</label>
                <textarea
                  className="form-input"
                  rows={6}
                  placeholder="Paste or write detailed study notes..."
                  value={newNoteContent}
                  onChange={e => setNewNoteContent(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddNote(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Index Note</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
