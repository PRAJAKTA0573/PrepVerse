import os
import uvicorn
import re
import math
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional, Dict
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Automatically load .env file from ai-service directory if it exists
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
if os.path.exists(dotenv_path):
    try:
        with open(dotenv_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, val = line.split('=', 1)
                    os.environ[key.strip()] = val.strip().strip("'\"")
    except Exception as e:
        print(f"[Warning] Could not load .env file: {e}")

# Imports for parsing and web search
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    import docx
except ImportError:
    docx = None

try:
    from duckduckgo_search import DDGS
except ImportError:
    DDGS = None

app = FastAPI(title="PrepVerse AI Service")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    strict: bool = True
    context_files: Optional[List[str]] = []

class InterviewEvaluationRequest(BaseModel):
    subject: str
    question: str
    answer: str

# Document storage: filename -> { "content": str, "chunks": List[dict], "tags": List[str], "summary": str }
doc_store: Dict[str, dict] = {}

PROMPT_META_WORDS = {
    'give', 'answer', 'from', 'notes', 'uploaded', 'instead', 'external', 'web', 'search',
    'please', 'tell', 'me', 'what', 'how', 'why', 'can', 'you', 'show', 'fetch', "don't", 'dont',
    'material', 'materials', 'document', 'documents', 'file', 'files', 'upoaded', 'note', 'page',
    'get', 'find', 'bring', 'online', 'internet', 'google', 'site', 'sources', 'source', 'rag'
}

def chunk_text(text: str, chunk_size: int = 350, overlap: int = 50) -> List[str]:
    """Splits text into overlapping semantic word chunks."""
    words = text.split()
    if not words:
        return []
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i:i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks

def detect_web_search_intent(query: str) -> bool:
    """Detects if user explicitly requests external web search or asks to skip document notes."""
    q_lower = query.lower()
    web_phrases = [
        "web search", "external web", "from web", "fetch from web", "from internet",
        "search the web", "search online", "google", "external search", "dont give from uploaded notes",
        "don't give from uploaded notes", "dont give the answer from", "dont use uploaded notes",
        "don't use notes", "ignore document", "ignore notes", "outside notes", "use web search",
        "fetch it from the web"
    ]
    return any(phrase in q_lower for phrase in web_phrases)

def extract_core_topic(query: str) -> str:
    """Strips meta instructions to extract the actual topic query for web search."""
    meta_pattern = r'\b(dont|don\'t|give|fetch|use|search|the|answer|information|from|using|uploaded|upoaded|external|notes|materials|documents|web search|web|internet|instead|please|it)\b'
    cleaned = re.sub(meta_pattern, ' ', query, flags=re.IGNORECASE)
    cleaned = " ".join(cleaned.split()).strip()
    return cleaned if len(cleaned) >= 3 else query

def calculate_relevance_score(query: str, text: str) -> float:
    """Calculates relevance score between query topic and a text passage, filtering meta-words."""
    raw_tokens = [w.lower() for w in re.findall(r'\w+', query) if len(w) > 2]
    q_tokens = [w for w in raw_tokens if w not in PROMPT_META_WORDS]
    
    if not q_tokens:
        return 0.0
    text_lower = text.lower()
    
    score = 0.0
    clean_query_str = " ".join(q_tokens)
    if clean_query_str and clean_query_str in text_lower:
        score += 5.0
        
    for token in q_tokens:
        count = text_lower.count(token)
        if count > 0:
            score += 1.0 + math.log(count)

    word_count = max(1, len(text.split()))
    normalized_score = score / (1.0 + math.log(word_count / 100 + 1))
    return normalized_score

def perform_web_search(query: str, max_results: int = 4) -> List[dict]:
    """Performs real-time external web search using multi-provider fallback (DuckDuckGo + Wikipedia API)."""
    results = []
    
    # Provider 1: DDGS package
    try:
        try:
            from ddgs import DDGS as DDGS_New
            with DDGS_New() as ddgs:
                raw = list(ddgs.text(query, max_results=max_results))
                for r in raw:
                    if r.get("body") or r.get("title"):
                        results.append({
                            "title": r.get("title", ""),
                            "snippet": r.get("body", "") or r.get("snippet", ""),
                            "url": r.get("href", "") or r.get("link", "")
                        })
        except Exception:
            if DDGS:
                with DDGS() as ddgs:
                    raw = list(ddgs.text(query, max_results=max_results))
                    for r in raw:
                        if r.get("body") or r.get("title"):
                            results.append({
                                "title": r.get("title", ""),
                                "snippet": r.get("body", "") or r.get("snippet", ""),
                                "url": r.get("href", "") or r.get("link", "")
                            })
    except Exception as e:
        print(f"[DDGS Search Warning]: {e}")

    # Provider 2: Wikipedia Search API fallback
    if len(results) < 2:
        try:
            import requests
            resp = requests.get(
                "https://en.wikipedia.org/w/api.php",
                params={
                    "action": "query",
                    "list": "search",
                    "srsearch": query,
                    "format": "json"
                },
                headers={"User-Agent": "PrepVerse-AI-StudyBot/1.0"},
                timeout=5
            )
            if resp.status_code == 200:
                data = resp.json()
                search_items = data.get("query", {}).get("search", [])
                for item in search_items[:max_results]:
                    clean_snippet = re.sub(r'<[^>]+>', '', item.get("snippet", ""))
                    page_id = item.get("pageid")
                    url = f"https://en.wikipedia.org/?curid={page_id}" if page_id else "https://en.wikipedia.org"
                    results.append({
                        "title": item.get("title", ""),
                        "snippet": clean_snippet,
                        "url": url
                    })
        except Exception as e:
            print(f"[Wikipedia API Search Warning]: {e}")

    return results[:max_results]

@app.get("/")
async def root():
    return {"message": "PrepVerse AI Service is running", "indexed_documents": len(doc_store)}

@app.get("/documents")
async def list_documents():
    return [
        {
            "filename": filename,
            "summary": data["summary"],
            "chunks_count": len(data["chunks"]),
            "tags": data["tags"]
        }
        for filename, data in doc_store.items()
    ]

@app.post("/process-document")
async def process_document(file: UploadFile = File(...), tags: str = Form("Notes")):
    content = ""
    file_bytes = await file.read()
    filename = file.filename
    
    # 1. Plain Text parsing
    if filename.lower().endswith(".txt"):
        try:
            content = file_bytes.decode("utf-8", errors="ignore")
        except Exception as e:
            content = f"Error reading text file: {e}"
            
    # 2. PyMuPDF parsing for PDF files
    elif filename.lower().endswith(".pdf"):
        if fitz:
            try:
                doc = fitz.open(stream=file_bytes, filetype="pdf")
                pages_text = []
                for page_num in range(len(doc)):
                    page = doc[page_num]
                    text = page.get_text()
                    if text.strip():
                        pages_text.append(f"[Page {page_num + 1}]\n{text}")
                content = "\n\n".join(pages_text)
                if not content.strip():
                    content = f"PDF {filename} appears to contain scanned images or empty pages."
            except Exception as e:
                content = f"Failed to extract PDF text with PyMuPDF: {str(e)}"
        else:
            content = f"PyMuPDF library is missing. Couldn't extract PDF {filename}."

    # 3. DOCX parsing
    elif filename.lower().endswith((".docx", ".doc")):
        if docx and filename.lower().endswith(".docx"):
            try:
                import io
                doc = docx.Document(io.BytesIO(file_bytes))
                content = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
            except Exception as e:
                content = f"Failed to extract DOCX content: {str(e)}"
        else:
            content = f"Extracted plain text contents from {filename}."
    else:
        # Fallback text decoder
        try:
            content = file_bytes.decode("utf-8", errors="ignore")
        except Exception:
            content = f"Binary content extracted from {filename}."

    # 4. Chunk & Index document
    raw_chunks = chunk_text(content, chunk_size=300, overlap=50)
    chunks_indexed = [{"id": idx + 1, "text": chunk} for idx, chunk in enumerate(raw_chunks)]
    
    # Create auto-summary
    summary = content[:300].strip().replace('\n', ' ') + "..." if len(content) > 300 else content.strip()

    doc_store[filename] = {
        "content": content,
        "chunks": chunks_indexed,
        "tags": [t.strip() for t in tags.split(",") if t.strip()],
        "summary": summary
    }

    print(f"[Indexed Document] '{filename}': {len(chunks_indexed)} chunks indexed.")

    return {
        "filename": filename,
        "summary": summary,
        "chunks_count": len(chunks_indexed),
        "status": "success"
    }

def format_document_text(chunks: List[dict]) -> str:
    """Combines and cleans matching document chunks into full detailed answers without truncation."""
    formatted_blocks = []
    seen_texts = set()

    for chunk in chunks:
        raw_text = chunk["text"].strip()
        clean_text = re.sub(r'\[Page \d+\]\s*', '', raw_text).strip()
        
        if clean_text in seen_texts or len(clean_text) < 10:
            continue
        seen_texts.add(clean_text)

        lines = clean_text.split('\n')
        processed_lines = []
        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue
            if re.match(r'^(Q\d+[\.\)]|\d+\.\s+What|\d+\.\s+Define|\d+\.\s+Explain|\d+\.\s+[A-Z])', line_str, re.IGNORECASE):
                processed_lines.append(f"\n#### 📌 {line_str}\n")
            elif line_str.lower().startswith("example:"):
                processed_lines.append(f"\n💡 **Example**: {line_str[8:].strip()}")
            elif ":" in line_str and len(line_str.split(":")[0]) < 30 and not line_str.startswith("http"):
                parts = line_str.split(":", 1)
                processed_lines.append(f"• **{parts[0].strip()}**: {parts[1].strip()}")
            else:
                processed_lines.append(line_str)

        formatted_blocks.append("\n".join(processed_lines))

    return "\n\n".join(formatted_blocks)

def synthesize_chatgpt_web_response(query: str, web_results: List[dict]) -> str:
    """Synthesizes web search results into a comprehensive ChatGPT-style web response with inline reference links."""
    if not web_results:
        return f"### 🌐 Web Search\n\nNo live internet search results could be retrieved for **\"{query}\"**. Please refine your question."

    blocks = []
    blocks.append(f"### 🌐 Live Web Search: *\"{query}\"*\n")
    
    # 1. Synthesize Main Overview Answer with Inline Citations
    overview_items = []
    for idx, res in enumerate(web_results, 1):
        title = res.get('title', 'Source').strip()
        snippet = res.get('snippet', '').strip().replace('\n', ' ')
        url = res.get('url', '#')
        
        cite_tag = f" [[{idx}]({url})]" if url and url != '#' else ""
        overview_items.append(f"• **{title}**{cite_tag}:\n{snippet}")

    blocks.append("Here is the information fetched from the internet:\n")
    blocks.append("\n\n".join(overview_items))

    # 2. Key Takeaways Section
    takeaways = []
    for idx, res in enumerate(web_results, 1):
        title = res.get('title', '').strip()
        url = res.get('url', '#')
        cite_tag = f" [[{idx}]({url})]" if url and url != '#' else ""
        takeaways.append(f"• Synthesized core insights regarding **{title}**{cite_tag}.")

    blocks.append("\n\n### 🔑 Key Search Summary\n" + "\n".join(takeaways))

    # 3. ChatGPT Style Reference Links & Web Sources
    blocks.append("\n\n---\n### 🌐 References & Web Sources\n")
    ref_list = []
    for idx, res in enumerate(web_results, 1):
        title = res.get('title', 'Web Link').strip()
        url = res.get('url', '#')
        domain = ""
        if "://" in url:
            try:
                domain = url.split("://")[1].split("/")[0]
            except Exception:
                domain = ""
        domain_str = f" (*{domain}*)" if domain else ""
        ref_list.append(f"{idx}. 🔗 [{title}]({url}){domain_str}")

    blocks.append("\n".join(ref_list))

    return "\n\n".join(blocks)

@app.post("/query")
async def query_rag(request: QueryRequest):
    raw_query = request.query.strip()
    if not raw_query:
        raise HTTPException(status_code=400, detail="Query text cannot be empty.")

    strict_mode = request.strict
    explicit_web_requested = detect_web_search_intent(raw_query)
    topic_query = extract_core_topic(raw_query)
    
    citations = []
    external_searched = False
    web_sources = []
    final_answer = ""

    # ROUTING DECISION:
    # If strict_mode is False (Search only in uploaded materials is UNSELECTED) OR user explicitly asks for web search:
    # -> Generate ChatGPT-style Web Search Answer with inline reference links!
    if not strict_mode or explicit_web_requested:
        external_searched = True
        search_term = topic_query if topic_query else raw_query
        web_results = perform_web_search(search_term, max_results=5)
        
        web_sources = [r.get('title', '') for r in web_results if r.get('title')]
        final_answer = synthesize_chatgpt_web_response(search_term, web_results)

    # If strict_mode is True (RAG mode SELECTED):
    # -> Search uploaded document store (PDF / notes)
    else:
        matched_results = []
        target_docs = request.context_files if request.context_files else list(doc_store.keys())
        
        for filename in target_docs:
            if filename not in doc_store:
                continue
            data = doc_store[filename]
            
            for chunk_obj in data["chunks"]:
                score = calculate_relevance_score(raw_query, chunk_obj["text"])
                if score > 0.4:
                    matched_results.append({
                        "filename": filename,
                        "chunk_id": chunk_obj["id"],
                        "text": chunk_obj["text"],
                        "score": score
                    })

        matched_results.sort(key=lambda x: x["score"], reverse=True)

        if matched_results:
            top_matches = matched_results[:5]  # Full coverage of document answer
            citations = list(set([m["filename"] for m in top_matches]))
            
            answer_blocks = []
            answer_blocks.append(f"### 📖 Complete Answer from Uploaded Notes\n")
            full_text_response = format_document_text(top_matches)
            answer_blocks.append(full_text_response)
            final_answer = "\n\n".join(answer_blocks)
        else:
            final_answer = f"### ⚠️ No Document Context Found\n\nNo relevant content was found in your uploaded materials for **\"{raw_query}\"**.\n\n💡 *Tip*: **Search only in uploaded materials (RAG)** is currently selected. Uncheck the checkbox in the chat bar below to switch to **ChatGPT Web Search** and fetch live answers with reference links from the internet!"

    return {
        "answer": final_answer,
        "citations": citations,
        "external_searched": external_searched,
        "web_sources": web_sources,
        "top_matches_count": len(citations)
    }

class StudyToolRequest(BaseModel):
    tool_type: str  # 'summary', 'notes', 'mcq', 'quiz', 'viva', 'flashcard'
    topic: str
    source: str = "notes"  # "notes" or "web"
    context_files: Optional[List[str]] = []

def extract_key_concepts_and_sentences(context: str) -> List[tuple]:
    """Extracts meaningful (concept, explanation) tuples from document or search text."""
    lines = [l.strip() for l in context.split('\n') if len(l.strip()) > 15]
    pairs = []
    
    for line in lines:
        if ':' in line and len(line.split(':')[0]) < 40:
            parts = line.split(':', 1)
            concept = parts[0].strip(' -*•#')
            expl = parts[1].strip()
            if len(concept) > 2 and len(expl) > 10:
                pairs.append((concept, expl))
        elif ' is ' in line or ' refers to ' in line or ' means ' in line:
            for sep in [' is ', ' refers to ', ' means ']:
                if sep in line:
                    parts = line.split(sep, 1)
                    concept = parts[0].strip(' -*•#')
                    expl = parts[1].strip()
                    if len(concept) > 2 and len(expl) > 10 and len(concept.split()) <= 5:
                        pairs.append((concept, expl))
                    break
    return pairs

def build_mcq_items(topic: str, context: str) -> List[dict]:
    lines = [l.strip() for l in context.split('\n') if len(l.strip()) > 20]
    pairs = extract_key_concepts_and_sentences(context)
    
    # Shuffle extracted pairs and lines so every tool invocation gets fresh ordering
    random.shuffle(pairs)
    random.shuffle(lines)
    
    items = []
    topic_clean = topic.strip()
    used_questions = set()

    q_templates = [
        "According to the study material on {topic}, what is {concept}?",
        "Based on your notes for {topic}, which statement accurately defines '{concept}'?",
        "In the context of {topic}, what is the primary function of {concept}?",
        "Which of the following best describes {concept} in {topic}?",
        "Regarding {topic}, how is '{concept}' characterized?"
    ]

    # Method 1: Generate from extracted concept-explanation pairs
    for concept, expl in pairs:
        if len(items) >= 5:
            break
            
        template = random.choice(q_templates)
        q_text = template.format(topic=topic_clean, concept=concept)
        if q_text in used_questions:
            continue
        used_questions.add(q_text)
        
        correct_ans = expl[:130]
        
        # Build 3 plausible distractors from other concepts in the text
        distractors = []
        other_pairs = [p for p in pairs if p[0] != concept]
        random.shuffle(other_pairs)
        
        for c2, e2 in other_pairs:
            if len(e2) > 10 and e2[:130] != correct_ans:
                distractors.append(e2[:130])
        
        # Fallback distractors if needed
        default_distractors = [
            f"It is an indirect constraint mechanism that operates outside {topic_clean}.",
            f"It represents a manual record verification process superseded by automated logs.",
            f"It refers to temporary unindexed buffer memory used during network transit.",
            f"An unvalidated client-side state caching layer susceptible to stale reads.",
            f"A static compilation directive preventing dynamic runtime dispatch."
        ]
        random.shuffle(default_distractors)
        
        while len(distractors) < 3:
            distractors.append(default_distractors[len(distractors) % len(default_distractors)])
            
        selected_distractors = distractors[:3]
        options = [correct_ans] + selected_distractors
        random.shuffle(options)
        correct_index = options.index(correct_ans)
        
        items.append({
            "question": q_text,
            "options": options,
            "correct_index": correct_index,
            "explanation": f"Grounded in study material: '{concept}: {expl[:120]}'"
        })

    # Method 2: Fill remaining slots if pairs were sparse
    idx = 0
    line_q_templates = [
        "Which statement best summarizes the core detail regarding '{keyword}' in {topic}?",
        "What is highlighted in the study material regarding '{keyword}' in {topic}?",
        "Which of the following points accurately reflects '{keyword}' in {topic}?"
    ]

    while len(items) < 5 and idx < len(lines):
        line = lines[idx]
        idx += 1
        words = line.split()
        keyword = " ".join(words[:4]) if len(words) >= 4 else topic_clean
        
        template = random.choice(line_q_templates)
        q_text = template.format(keyword=keyword, topic=topic_clean)
        if q_text in used_questions:
            continue
        used_questions.add(q_text)
        
        correct_ans = line[:130]
        distractors = [
            f"It is a static legacy boundary not utilized in modern {topic_clean} workflows.",
            f"It acts as a temporary fallback mechanism when primary components fail.",
            f"It defines an optional external configuration parameter.",
            f"An unoptimized query pattern causing sequential table scans."
        ]
        random.shuffle(distractors)
        options = [correct_ans] + distractors[:3]
        random.shuffle(options)
        correct_index = options.index(correct_ans)
        
        items.append({
            "question": q_text,
            "options": options,
            "correct_index": correct_index,
            "explanation": f"Source context: {line[:140]}"
        })

    random.shuffle(items)
    return items[:5]

def build_flashcard_items(topic: str, context: str) -> List[dict]:
    pairs = extract_key_concepts_and_sentences(context)
    lines = [l.strip() for l in context.split('\n') if len(l.strip()) > 15]
    items = []
    
    for concept, expl in pairs[:5]:
        items.append({
            "front": f"What is {concept}?",
            "back": expl
        })
        
    while len(items) < 5 and len(lines) > len(items):
        line = lines[len(items)]
        items.append({
            "front": f"Key Principle #{len(items)+1} in {topic}",
            "back": line
        })
    return items[:5]

def build_viva_items(topic: str, context: str) -> List[dict]:
    lines = [l.strip() for l in context.split('\n') if len(l.strip()) > 20]
    pairs = extract_key_concepts_and_sentences(context)
    items = []
    
    # 4 distinct viva oral examination questions
    q1_text = f"Can you define {topic} and explain its main objectives based on your notes?"
    ans1 = lines[0] if lines else f"{topic} represents a core subject focused on systematic organization, clear methodology, and scalable principles."
    if pairs:
        ans1 = f"{pairs[0][0]}: {pairs[0][1]}. Overall, {lines[0] if lines else topic}."
    items.append({"question": q1_text, "answer": ans1})
    
    q2_text = f"What are the key technical components or sub-concepts of {topic}?"
    if len(pairs) >= 2:
        ans2 = "The key components discussed include:\n" + "\n".join([f"• **{c}**: {e}" for c, e in pairs[1:4]])
    elif len(lines) >= 2:
        ans2 = "Primary concepts identified in study material:\n" + "\n".join([f"• {l}" for l in lines[1:4]])
    else:
        ans2 = f"Key components of {topic} involve modular architecture, data validation, and error-resilient design."
    items.append({"question": q2_text, "answer": ans2})

    q3_text = f"How does {topic} address performance, efficiency, or operational trade-offs?"
    ans3 = lines[min(3, len(lines)-1)] if lines else f"Efficiency in {topic} is maintained by minimizing redundant overhead and enforcing clean component boundaries."
    items.append({"question": q3_text, "answer": ans3})

    q4_text = f"What practical or real-world applications rely on {topic}?"
    ans4 = lines[min(4, len(lines)-1)] if len(lines) > 4 else f"Applications of {topic} span software design, data analytics, and enterprise decision-support systems."
    items.append({"question": q4_text, "answer": ans4})

    return items

def build_quiz_items(topic: str, context: str) -> List[dict]:
    lines = [l.strip() for l in context.split('\n') if len(l.strip()) > 20]
    pairs = extract_key_concepts_and_sentences(context)
    items = []
    
    if pairs:
        for idx, (c, e) in enumerate(pairs[:4], 1):
            items.append({
                "question": f"Self-Test Q{idx}: Explain the significance of '{c}' in {topic}.",
                "answer": e
            })
    else:
        for idx, line in enumerate(lines[:4], 1):
            items.append({
                "question": f"Self-Test Q{idx}: What is highlighted in key point #{idx} of {topic}?",
                "answer": line
            })
    return items

def build_notes_text(topic: str, context: str) -> str:
    lines = [l.strip() for l in context.split('\n') if len(l.strip()) > 15]
    pairs = extract_key_concepts_and_sentences(context)
    
    notes = []
    notes.append(f"### 📑 Comprehensive Study Notes: *{topic}*\n")
    notes.append(f"#### 📌 1. Overview & Context\nStudy notes compiled for **\"{topic}\"** from reference materials:\n")
    
    notes.append("#### 📝 2. Core Concepts & Definitions\n")
    if pairs:
        for c, e in pairs:
            notes.append(f"• **{c}**: {e}\n")
    elif lines:
        for idx, line in enumerate(lines[:6], 1):
            notes.append(f"• **Key Concept #{idx}**: {line}\n")
    else:
        notes.append(f"• **Core Objective**: Master foundational principles of {topic}.\n")

    notes.append("\n#### 💡 3. Key Takeaways & Exam Tips\n")
    if len(lines) > 2:
        notes.append(f"• **Important Detail**: {lines[-1]}\n")
    notes.append(f"• **High-Yield Concept**: Always clarify primary definitions and structural boundaries for {topic}.\n")
    notes.append(f"• **Practical Application**: Focus on performance trade-offs, validation, and real-world system architecture.\n")
    return "\n".join(notes)

def build_summary_text(topic: str, context: str) -> str:
    lines = [l.strip() for l in context.split('\n') if len(l.strip()) > 15]
    summary = []
    summary.append(f"### 📝 Executive Summary: *{topic}*\n")
    summary.append(f"#### 📌 1. Topic Overview\nSynthesized executive overview for **\"{topic}\"**:\n")
    
    if lines:
        summary.append(f"{lines[0]}\n")
    else:
        summary.append(f"**{topic}** provides critical domain concepts and structured operational principles.\n")
        
    summary.append("#### 🔑 2. Key Insights & Findings\n")
    for idx, l in enumerate(lines[:5], 1):
        summary.append(f"• **Insight #{idx}**: {l}\n")

    summary.append("\n#### 🎯 3. Core Conclusion\n")
    summary.append(f"Mastery of **{topic}** forms the foundation for academic assessments and practical system design.")
    return "\n".join(summary)

@app.post("/study-tool/generate")
async def generate_study_tool(request: StudyToolRequest):
    tool_type = request.tool_type.lower()
    topic = request.topic.strip()
    source = request.source.lower()
    
    if not topic:
        raise HTTPException(status_code=400, detail="Topic cannot be empty.")

    context_text = ""
    citations = []
    
    # 1. Fetch Context from Notes or Web
    if source == "notes":
        target_docs = request.context_files if request.context_files else list(doc_store.keys())
        matched_chunks = []
        for filename in target_docs:
            if filename not in doc_store:
                continue
            for chunk_obj in doc_store[filename]["chunks"]:
                score = calculate_relevance_score(topic, chunk_obj["text"])
                if score > 0.3:
                    matched_chunks.append((filename, chunk_obj["text"], score))
        
        matched_chunks.sort(key=lambda x: x[2], reverse=True)
        if matched_chunks:
            top_c = matched_chunks[:5]
            citations = list(set([m[0] for m in top_c]))
            context_text = "\n\n".join([m[1] for m in top_c])
        else:
            all_texts = []
            for fname in target_docs[:2]:
                if fname in doc_store:
                    citations.append(fname)
                    all_texts.append(doc_store[fname]["content"][:1500])
            context_text = "\n\n".join(all_texts)
            
        if not context_text.strip():
            return {
                "status": "warning",
                "tool_type": tool_type,
                "topic": topic,
                "source": source,
                "formatted_text": f"### ⚠️ No Document Context Found\n\nCould not find relevant study notes for **\"{topic}\"**. Please upload notes or switch the source to **Live Web Search**!",
                "items": []
            }
    else:
        # Web Search Source
        web_results = perform_web_search(topic, max_results=5)
        if web_results:
            context_text = "\n\n".join([f"{r.get('title')}: {r.get('snippet')}" for r in web_results])
            citations = [r.get('title') for r in web_results if r.get('title')]
        else:
            context_text = f"General subject overview for {topic}."

    # 2. Tool Generators
    formatted_text = ""
    items = []

    if tool_type == "mcq":
        items = build_mcq_items(topic, context_text)
        formatted_text = f"### ❓ Multiple Choice Questions (MCQs): *{topic}*\n\nInteractive test loaded below. Select your options and click **Submit Test & Record Score** to evaluate your answers and view detailed explanations."

    elif tool_type == "flashcard":
        items = build_flashcard_items(topic, context_text)
        formatted_text = f"### 🗂️ Study Flashcards: *{topic}*\n\nInteractive flashcards loaded below. Click on any card to flip between definition and answer."

    elif tool_type == "viva":
        items = build_viva_items(topic, context_text)
        formatted_text = f"### 🎓 Viva Voce / Oral Exam Questions: *{topic}*\n"
        for idx, item in enumerate(items, 1):
            formatted_text += f"\n**Q{idx}. {item['question']}**\n• **Model Answer**: {item['answer']}\n"

    elif tool_type == "quiz":
        items = build_quiz_items(topic, context_text)
        formatted_text = f"### 🧩 Quick Self-Test Quiz: *{topic}*\n\nInteractive quiz loaded below. Enter your answers and submit to check model answers."

    elif tool_type == "notes":
        formatted_text = build_notes_text(topic, context_text)
    else:  # summary
        formatted_text = build_summary_text(topic, context_text)

    return {
        "status": "success",
        "tool_type": tool_type,
        "topic": topic,
        "source": source,
        "citations": citations,
        "formatted_text": formatted_text,
        "items": items
    }

@app.post("/interview/evaluate")
async def evaluate_interview(request: InterviewEvaluationRequest):
    tech_score = 75 if len(request.answer) > 20 else 50
    if any(k in request.answer.lower() for k in ["lock", "interface", "scaling", "class", "thread", "concurrency", "algorithm"]):
        tech_score += 15

    comm_score = 80 if len(request.answer) > 30 else 60
    conf_score = 85 if len(request.answer) > 15 else 65
    completeness = min(100, len(request.answer) * 2)

    overall = int((tech_score + comm_score + conf_score + completeness) / 4)

    return {
        "score": overall,
        "technical": tech_score,
        "communication": comm_score,
        "confidence": conf_score,
        "completeness": completeness,
        "feedback": f"Your explanation of {request.subject} was structured. You scored {tech_score}% in technical accuracy."
    }

# --- Authentication & Email OTP Models & State ---
class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class SendOtpRequest(BaseModel):
    email: str
    purpose: Optional[str] = "verification"

class VerifyOtpRequest(BaseModel):
    email: str
    otp: str
    name: Optional[str] = ""
    password: Optional[str] = ""

# Persistent registered users dictionary
users_db: Dict[str, dict] = {
    "student@university.edu": {
        "name": "Student Demo",
        "password": "password123",
        "verified": True
    }
}

# Active verification OTP storage: email -> { "otp": str, "name": str, "password": str }
otp_storage: Dict[str, dict] = {}

def is_valid_email(email_str: str) -> bool:
    return bool(re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email_str.strip()))

def send_verification_email(to_email: str, otp_code: str):
    """
    Sends verification email via SMTP if credentials are set in environment variables.
    """
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = os.getenv("SMTP_PORT", "587")
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    sender_email = os.getenv("SMTP_FROM_EMAIL", smtp_username or "noreply@prepverse.ai")

    print(f"[PrepVerse Email Service] Dispatching verification email for {to_email} (server={smtp_server}, user={smtp_username})...", flush=True)

    if smtp_server and smtp_username and smtp_password:
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = f"PrepVerse AI - Email Verification Code: {otp_code}"
            msg["From"] = f"PrepVerse AI <{sender_email}>"
            msg["To"] = to_email

            text_content = f"Hello,\n\nYour 6-digit verification code is: {otp_code}\n\nPlease enter this code to verify your PrepVerse AI account.\n\nBest regards,\nPrepVerse AI Team"
            html_content = f"""
            <html>
              <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px;">
                <div style="max-width: 480px; margin: 0 auto; background-color: #1e293b; border-radius: 12px; padding: 28px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                  <h2 style="color: #818cf8; margin-top: 0; font-size: 22px;">PrepVerse AI</h2>
                  <p style="font-size: 15px; color: #cbd5e1; line-height: 1.5;">Thank you for registering. Please enter the following 6-digit verification code to complete your signup:</p>
                  <div style="background-color: #0f172a; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #38bdf8; padding: 16px; border-radius: 8px; margin: 24px 0; border: 1px dashed #6366f1;">
                    {otp_code}
                  </div>
                  <p style="font-size: 13px; color: #94a3b8;">If you did not request this email, you can safely ignore it.</p>
                </div>
              </body>
            </html>
            """
            msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            port = int(smtp_port)
            if port == 465:
                with smtplib.SMTP_SSL(smtp_server, port) as server:
                    server.login(smtp_username, smtp_password)
                    server.sendmail(sender_email, [to_email], msg.as_string())
            else:
                with smtplib.SMTP(smtp_server, port) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(smtp_username, smtp_password)
                    server.sendmail(sender_email, [to_email], msg.as_string())
            print(f"[PrepVerse Email Service] Verification email successfully sent to {to_email}", flush=True)
        except Exception as e:
            print(f"[PrepVerse Email Service ERROR] Failed to send email to {to_email}: {type(e).__name__} - {e}", flush=True)
    else:
        print(f"==========================================================================", flush=True)
        print(f"[PrepVerse Email Service] Verification Code generated for '{to_email}': {otp_code}", flush=True)
        print(f"(Note: To deliver real emails, configure SMTP_SERVER, SMTP_USERNAME, and SMTP_PASSWORD in your environment.)", flush=True)
        print(f"==========================================================================", flush=True)

@app.post("/api/auth/send-otp")
async def send_email_otp(req: SendOtpRequest, background_tasks: BackgroundTasks):
    email = req.email.strip().lower()
    if not is_valid_email(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email address format.")
    
    otp_code = str(random.randint(100000, 999999))
    otp_storage[email] = {
        "otp": otp_code,
        "email": email
    }

    background_tasks.add_task(send_verification_email, email, otp_code)

    return {
        "status": "success",
        "email": email,
        "message": f"6-digit verification code sent to {email}"
    }

@app.post("/api/auth/signup")
async def auth_signup(req: SignupRequest, background_tasks: BackgroundTasks):
    email = req.email.strip().lower()
    if not is_valid_email(email):
        raise HTTPException(status_code=400, detail="Invalid email format. Please provide a valid email (e.g. user@domain.com).")
    if len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
    if email in users_db:
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please sign in instead.")

    otp_code = str(random.randint(100000, 999999))
    otp_storage[email] = {
        "otp": otp_code,
        "name": req.name.strip(),
        "password": req.password,
        "email": email
    }

    background_tasks.add_task(send_verification_email, email, otp_code)

    return {
        "status": "otp_sent",
        "email": email,
        "message": f"6-digit verification code sent to {email}"
    }

@app.post("/api/auth/verify-otp")
async def auth_verify_otp(req: VerifyOtpRequest):
    email = req.email.strip().lower()
    user_otp = req.otp.strip()

    if email not in otp_storage:
        raise HTTPException(status_code=400, detail="No active verification code found for this email. Please request a new code.")
    
    stored = otp_storage[email]
    if stored["otp"] != user_otp:
        raise HTTPException(status_code=400, detail="Invalid verification code. Please check your email and try again.")
    
    name = stored.get("name") or req.name or email.split("@")[0]
    password = stored.get("password") or req.password or "password123"
    
    users_db[email] = {
        "name": name,
        "password": password,
        "verified": True
    }
    
    del otp_storage[email]

    token = f"prepverse_jwt_{os.urandom(16).hex()}"
    return {
        "status": "verified",
        "token": token,
        "name": name,
        "email": email,
        "message": "Email verified successfully! Logged in."
    }

@app.post("/api/auth/login")
async def auth_login(req: LoginRequest):
    email = req.email.strip().lower()
    if not is_valid_email(email):
        raise HTTPException(status_code=400, detail="Please enter a valid email format.")
    
    if email not in users_db:
        raise HTTPException(status_code=404, detail="No account found with this email address. Please click 'Create one' to sign up first.")
    
    user = users_db[email]
    if user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Incorrect password. Please verify your credentials and try again.")
    
    token = f"prepverse_jwt_{os.urandom(16).hex()}"
    return {
        "status": "success",
        "token": token,
        "name": user["name"],
        "email": email
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

