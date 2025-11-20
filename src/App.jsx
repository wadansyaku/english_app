import React, { useState, useEffect } from 'react';
import {
  BookOpen, GraduationCap, Settings, Volume2, Sparkles,
  Edit3, Save, Plus, Trash2, Upload, CheckCircle,
  XCircle, Menu, ChevronRight, ChevronLeft, BarChart3,
  Search, Home, PenTool, Users, Database, LogOut,
  AlertCircle, Loader2, User, Shield, Eye, FileText,
  Activity, Star, Book, Filter, PlayCircle, Trophy
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  signOut, createUserWithEmailAndPassword, updateProfile
} from 'firebase/auth';
import {
  getFirestore, collection, doc, getDoc, getDocs,
  setDoc, updateDoc, query, where, writeBatch,
  serverTimestamp, arrayUnion, orderBy, addDoc
} from 'firebase/firestore';
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- Configuration ---

// ⚠️ Firebase Project Config (Replace with your actual config)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// ⚠️ Gemini API Key
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Constants
const APP_ID = "medace_v1"; // Artifact ID for path separation
const PRIORITY_KEYWORDS = ["システム英単語", "ターゲット", "DUO", "鉄壁", "速読英単語"];
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025"; // Or "gemini-1.5-flash" if preview unavail

// --- Helpers & Utilities ---

const speak = (text) => {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  }
};

const generateGeminiSentence = async (word, meaning) => {
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `Create a short, natural English example sentence (max 15 words) using the word "${word}". The context should match this meaning: "${meaning}". Return ONLY the sentence.`;
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};

// --- Components ---

// 1. Login Component
const Login = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student'); // default
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let userCredential;
      if (isRegister) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        // Create User Document
        await setDoc(doc(db, "users", userCredential.user.uid), {
          uid: userCredential.user.uid,
          name: name,
          email: email,
          role: role,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, "users", userCredential.user.uid), {
          lastLogin: serverTimestamp()
        }, { merge: true });
      }
      onLogin(userCredential.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <GraduationCap className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">MedAce Study Pro</h1>
          <p className="text-slate-500">Medical & Academic Excellence</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" /> {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="student">Student</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 flex justify-center items-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            {isRegister ? 'Already have an account? Sign In' : 'Need an account? Register'}
          </button>
        </div>
      </div>
    </div>
  );
};

// 2. Admin Import Component
const AdminImport = () => {
  const [uploading, setUploading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [progress, setProgress] = useState(0);

  const addLog = (msg) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const processCSV = async (file) => {
    setUploading(true);
    setLogs([]);
    setProgress(0);
    addLog("Starting CSV import process...");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      // Split lines and remove header
      const rows = text.split('\n').map(row => row.trim()).filter(row => row);
      const dataRows = rows.slice(1); // Skip header: 単語帳名, 単語番号, 単語, 日本語訳

      if (dataRows.length === 0) {
        addLog("Error: CSV is empty or invalid format.");
        setUploading(false);
        return;
      }

      // Group by Book
      const booksMap = {};
      dataRows.forEach(row => {
        // Parse assuming: BookName, Number, Word, Meaning
        const cols = row.split(',').map(c => c.trim());
        if (cols.length < 4) return;

        const [bookName, num, word, meaning] = cols;

        if (!booksMap[bookName]) booksMap[bookName] = [];
        booksMap[bookName].push({
          number: parseInt(num) || 0,
          word,
          meaning,
          bookName // Keep for ref
        });
      });

      const totalBooks = Object.keys(booksMap).length;
      addLog(`Found ${totalBooks} unique books/courses.`);

      let booksProcessed = 0;

      // Process each book
      for (const [bookName, words] of Object.entries(booksMap)) {
        addLog(`Processing book: "${bookName}" (${words.length} words)...`);

        // 1. Create/Update Book Meta
        // Generate simple ID from name
        const bookId = bookName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const bookRef = doc(db, `artifacts/${APP_ID}/public/data/books/${bookId}`);

        await setDoc(bookRef, {
          id: bookId,
          title: bookName,
          wordCount: words.length,
          updatedAt: serverTimestamp(),
          isPriority: PRIORITY_KEYWORDS.some(k => bookName.includes(k))
        }, { merge: true });

        // 2. Batch Write Words
        const BATCH_SIZE = 450; // Safety margin under 500
        for (let i = 0; i < words.length; i += BATCH_SIZE) {
          const batch = writeBatch(db);
          const chunk = words.slice(i, i + BATCH_SIZE);

          chunk.forEach(item => {
            // Path: /artifacts/{appId}/public/data/words/{docId}
            // DocId convention: bookId_wordNumber
            const docId = `${bookId}_${item.number}`;
            const wordRef = doc(db, `artifacts/${APP_ID}/public/data/words/${docId}`);

            batch.set(wordRef, {
              bookId: bookId,
              number: item.number,
              word: item.word,
              meaning: item.meaning,
              searchKey: item.word.toLowerCase()
            });
          });

          await batch.commit();
          // Freeze prevention
          await new Promise(resolve => setTimeout(resolve, 10));
          addLog(`  - Wrote batch ${i} to ${i + chunk.length}`);
        }

        booksProcessed++;
        setProgress(Math.round((booksProcessed / totalBooks) * 100));
      }

      addLog("All imports completed successfully!");
      setUploading(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
        <Database className="w-5 h-5 mr-2 text-orange-600" />
        Data Import (Admin)
      </h2>

      <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-orange-50 transition-colors">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files?.[0] && processCSV(e.target.files[0])}
          className="hidden"
          id="csv-upload"
          disabled={uploading}
        />
        <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
          <Upload className={`w-12 h-12 mb-2 ${uploading ? 'text-slate-400' : 'text-orange-500'}`} />
          <span className="text-slate-600 font-medium">
            {uploading ? 'Processing...' : 'Click to upload CSV'}
          </span>
          <span className="text-xs text-slate-400 mt-1">Format: Book, No., Word, Meaning</span>
        </label>
      </div>

      {uploading && (
        <div className="mt-4">
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div className="bg-orange-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
          <p className="text-right text-xs text-slate-500 mt-1">{progress}%</p>
        </div>
      )}

      <div className="mt-4 bg-slate-900 text-green-400 p-4 rounded-lg h-48 overflow-y-auto font-mono text-xs">
        {logs.length === 0 ? "Waiting for import..." : logs.map((log, i) => <div key={i}>{log}</div>)}
      </div>
    </div>
  );
};

// 3. Instructor Dashboard Component
const InstructorDashboard = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const q = query(collection(db, "users"), where("role", "==", "student"));
        const snapshot = await getDocs(q);

        const studentData = [];
        for (const docSnap of snapshot.docs) {
          const userData = docSnap.data();
          const progressRef = collection(db, `users/${userData.uid}/progress`);
          const progressSnap = await getDocs(progressRef);

          let totalMastered = 0;
          progressSnap.forEach(p => {
            const data = p.data();
            if (data.learned) totalMastered += data.learned.length;
          });

          studentData.push({
            ...userData,
            masteredWords: totalMastered,
            lastActive: userData.lastLogin?.toDate().toLocaleDateString() || '-'
          });
        }
        setStudents(studentData);
      } catch (error) {
        console.error("Error fetching students:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Student Progress Overview</h2>
      {loading ? (
        <div className="flex justify-center p-10"><Loader2 className="animate-spin text-orange-500" /></div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-sm font-semibold text-slate-600">Name</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Email</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Mastered Words</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(student => (
                <tr key={student.uid} className="hover:bg-orange-50/30 transition-colors">
                  <td className="p-4 flex items-center font-medium text-slate-800">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 mr-3 text-xs">
                      {student.name.substring(0,2).toUpperCase()}
                    </div>
                    {student.name}
                  </td>
                  <td className="p-4 text-slate-500 text-sm">{student.email}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {student.masteredWords} words
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 text-sm">{student.lastActive}</td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400">No students found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// 4. Study Mode (Flashcards)
const StudyMode = ({ book, onBack, userId }) => {
  const [words, setWords] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [geminiSentence, setGeminiSentence] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    const fetchWords = async () => {
      try {
        const q = query(
          collection(db, `artifacts/${APP_ID}/public/data/words`),
          where("bookId", "==", book.id),
          orderBy("number", "asc")
        );
        const snap = await getDocs(q);
        setWords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Failed to load words:", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchWords();
  }, [book.id]);

  const currentWord = words[currentIndex];

  const handleGenerateSentence = async (e) => {
    e.stopPropagation();
    if (!currentWord || geminiSentence) return;

    setLoadingAI(true);
    const sentence = await generateGeminiSentence(currentWord.word, currentWord.meaning);
    setGeminiSentence(sentence);
    setLoadingAI(false);
  };

  const nextCard = () => {
    setFlipped(false);
    setGeminiSentence(null);
    if (currentIndex < words.length - 1) setCurrentIndex(c => c + 1);
  };

  const prevCard = () => {
    setFlipped(false);
    setGeminiSentence(null);
    if (currentIndex > 0) setCurrentIndex(c => c - 1);
  };

  if (loadingData) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-orange-500 w-10 h-10"/></div>;
  if (words.length === 0) return <div className="text-center p-20">No words in this book yet.</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="flex items-center text-slate-600 hover:text-orange-600">
          <ChevronLeft className="w-5 h-5" /> Back
        </button>
        <div className="text-sm font-bold text-orange-600 bg-orange-50 px-3 py-1 rounded-full">
          {currentIndex + 1} / {words.length}
        </div>
      </div>

      {/* Flashcard */}
      <div
        className="relative h-96 perspective-1000 cursor-pointer group"
        onClick={() => setFlipped(!flipped)}
      >
        <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${flipped ? 'rotate-y-180' : ''}`}>

          {/* Front */}
          <div className="absolute w-full h-full bg-white rounded-2xl shadow-xl border-2 border-slate-100 flex flex-col items-center justify-center backface-hidden p-8">
             <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-4">Word</div>
             <h2 className="text-5xl font-bold text-slate-800 mb-6 text-center">{currentWord.word}</h2>
             <button
                onClick={(e) => { e.stopPropagation(); speak(currentWord.word); }}
                className="p-3 rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors"
             >
               <Volume2 className="w-6 h-6" />
             </button>
             <div className="mt-8 text-slate-400 text-sm">Click to flip</div>
          </div>

          {/* Back */}
          <div className="absolute w-full h-full bg-slate-900 rounded-2xl shadow-xl flex flex-col items-center justify-center backface-hidden rotate-y-180 p-8 text-white">
            <div className="text-xs uppercase tracking-wider text-orange-300 font-semibold mb-4">Meaning</div>
            <h2 className="text-3xl font-bold mb-4 text-center leading-snug">{currentWord.meaning}</h2>

            <button
              onClick={handleGenerateSentence}
              disabled={loadingAI || !!geminiSentence}
              className="inline-flex items-center px-4 py-2 mt-4 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors disabled:opacity-50"
            >
              {loadingAI ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {geminiSentence ? 'Generated' : 'AI Sentence'}
            </button>

            {geminiSentence && (
              <div className="mt-6 bg-white/10 border border-orange-300/50 text-orange-50 p-4 rounded-xl text-center">
                <p className="text-lg font-medium leading-relaxed">{geminiSentence}</p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center mt-8 px-4">
        <button
          onClick={prevCard} disabled={currentIndex === 0}
          className="p-3 rounded-full bg-white shadow-md hover:bg-orange-50 disabled:opacity-30 text-slate-700"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextCard} disabled={currentIndex === words.length - 1}
          className="p-3 rounded-full bg-orange-600 shadow-md hover:bg-orange-700 disabled:opacity-50 text-white"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};

// 5. Quiz Mode Component
const QuizMode = ({ book, onBack, userId, onProgressUpdate }) => {
  const [quizQueue, setQuizQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const [masteredIds, setMasteredIds] = useState([]);

  // Load words and prepare quiz
  useEffect(() => {
    const prepareQuiz = async () => {
      try {
        const q = query(collection(db, `artifacts/${APP_ID}/public/data/words`), where("bookId", "==", book.id));
        const snap = await getDocs(q);
        const allWords = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (allWords.length < 4) {
          alert("Not enough words for a quiz!");
          onBack();
          return;
        }

        const shuffled = [...allWords].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, Math.min(10, shuffled.length));

        const queue = selected.map(target => {
          const distractors = allWords
            .filter(w => w.id !== target.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);

          const options = [...distractors, target].sort(() => 0.5 - Math.random());
          return { target, options };
        });

        setQuizQueue(queue);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    if (userId) {
      prepareQuiz();
    }
  }, [book.id, userId, onBack]);

  const persistProgress = async (finalMasteredIds, finalScore) => {
    const progressRef = doc(db, `users/${userId}/progress/${book.id}`);
    const historyRef = collection(db, `users/${userId}/history`);

    try {
      if (finalMasteredIds.length > 0) {
        await setDoc(progressRef, {
          bookId: book.id,
          lastStudied: serverTimestamp(),
          learned: arrayUnion(...finalMasteredIds)
        }, { merge: true });
      } else {
        await setDoc(progressRef, {
          bookId: book.id,
          lastStudied: serverTimestamp()
        }, { merge: true });
      }

      await addDoc(historyRef, {
        bookId: book.id,
        bookTitle: book.title,
        mode: 'quiz',
        correct: finalScore,
        total: quizQueue.length,
        masteredWordIds: finalMasteredIds,
        completedAt: serverTimestamp()
      });

      if (onProgressUpdate) onProgressUpdate();
    } catch (error) {
      console.error("Failed to save progress or history:", error);
    }
  };

  const finishQuiz = async (finalMasteredIds, finalScore) => {
    setShowResult(true);
    await persistProgress(finalMasteredIds, finalScore);
  };

  const handleAnswer = (selectedOption) => {
    if (!quizQueue[currentIndex]) return;

    const currentQ = quizQueue[currentIndex];
    const isCorrect = selectedOption.id === currentQ.target.id;
    const updatedScore = isCorrect ? score + 1 : score;
    const updatedMastered = isCorrect ? [...masteredIds, currentQ.target.id] : masteredIds;

    setScore(updatedScore);
    setMasteredIds(updatedMastered);

    if (currentIndex < quizQueue.length - 1) {
      setCurrentIndex(c => c + 1);
    } else {
      finishQuiz(updatedMastered, updatedScore);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-orange-500" /></div>;

  if (showResult) {
    return (
      <div className="text-center p-10 bg-white rounded-2xl shadow-lg max-w-md mx-auto mt-10">
        <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-slate-800 mb-2">Quiz Complete!</h2>
        <div className="text-5xl font-black text-orange-600 mb-4">{quizQueue.length ? Math.round((score / quizQueue.length) * 100) : 0}%</div>
        <p className="text-slate-500 mb-8">You mastered {score} out of {quizQueue.length} words.</p>
        <button onClick={onBack} className="bg-slate-800 text-white px-6 py-3 rounded-lg hover:bg-slate-700 transition-colors">
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!quizQueue.length) {
    return (
      <div className="text-center p-10 bg-white rounded-2xl shadow-lg max-w-md mx-auto mt-10">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">No questions available</h2>
        <p className="text-slate-500 mb-6">Please try a different book or import more data.</p>
        <button onClick={onBack} className="bg-slate-800 text-white px-6 py-3 rounded-lg hover:bg-slate-700 transition-colors">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const currentQ = quizQueue[currentIndex];

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="mb-8 flex justify-between items-center">
        <span className="text-sm font-semibold text-slate-400">Question {currentIndex + 1} / {quizQueue.length}</span>
        <span className="text-sm font-bold text-orange-600">Score: {score}</span>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-lg border-b-4 border-orange-200 mb-6">
        <h2 className="text-4xl font-bold text-center text-slate-800">{currentQ.target.word}</h2>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {currentQ.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleAnswer(opt)}
            className="p-4 text-left bg-white border border-slate-200 rounded-xl hover:bg-orange-50 hover:border-orange-300 hover:shadow-md transition-all font-medium text-slate-700"
          >
            <span className="inline-block w-6 h-6 bg-slate-100 text-slate-500 rounded-full text-center leading-6 text-xs mr-3">{idx + 1}</span>
            {opt.meaning}
          </button>
        ))}
      </div>
    </div>
  );
};

// 6. Main Dashboard (Student)
const StudentDashboard = ({ user, onSelectBook, refreshToken }) => {
  const [books, setBooks] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const booksSnap = await getDocs(collection(db, `artifacts/${APP_ID}/public/data/books`));
        const booksData = booksSnap.docs.map(d => d.data());

        booksData.sort((a, b) => {
          if (a.isPriority && !b.isPriority) return -1;
          if (!a.isPriority && b.isPriority) return 1;
          return a.title.localeCompare(b.title);
        });

        const progSnap = await getDocs(collection(db, `users/${user.uid}/progress`));
        const progData = {};
        progSnap.forEach(d => {
          progData[d.id] = d.data();
        });

        setBooks(booksData);
        setProgressMap(progData);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.uid, refreshToken]);

  if (loading) return <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {books.map(book => {
        const userProg = progressMap[book.id];
        const learnedCount = userProg?.learned?.length || 0;
        const percent = Math.round((learnedCount / (book.wordCount || 1)) * 100);

        return (
          <div key={book.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${book.isPriority ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                <Book className="w-6 h-6" />
              </div>
              {book.isPriority && <span className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold flex items-center"><Star className="w-3 h-3 mr-1" /> Recommended</span>}
            </div>

            <h3 className="text-xl font-bold text-slate-800 mb-2">{book.title}</h3>
            <p className="text-sm text-slate-500 mb-6">{book.wordCount} Words</p>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                <span>Progress</span>
                <span>{percent}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${percent}%` }}></div>
              </div>
              <p className="text-xs text-slate-400 mt-1">{learnedCount} / {book.wordCount || 0} words mastered</p>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-3">
              <button
                onClick={() => onSelectBook(book, 'study')}
                className="flex items-center justify-center py-2 rounded-lg bg-slate-50 text-slate-700 font-semibold hover:bg-slate-100 transition-colors"
              >
                <Eye className="w-4 h-4 mr-2" /> Study
              </button>
              <button
                onClick={() => onSelectBook(book, 'quiz')}
                className="flex items-center justify-center py-2 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-colors"
              >
                <PlayCircle className="w-4 h-4 mr-2" /> Quiz
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- Main App Container ---
const App = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [view, setView] = useState('dashboard'); // dashboard, study, quiz
  const [selectedBook, setSelectedBook] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [progressRefresh, setProgressRefresh] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          setUserData({ role: 'student', name: currentUser.email });
        }
      } else {
        setUserData(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    signOut(auth);
    setUser(null);
    setUserData(null);
    setView('dashboard');
  };

  const handleSelectBook = (book, mode) => {
    setSelectedBook(book);
    setView(mode);
  };

  if (loadingAuth) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 text-orange-600 animate-spin" /></div>;

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div
            className="flex items-center cursor-pointer"
            onClick={() => { setView('dashboard'); setSelectedBook(null); }}
          >
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center mr-2">
              <GraduationCap className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">MedAce<span className="text-orange-600">Pro</span></span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-sm font-semibold text-slate-700">{userData?.name || user.email}</span>
              <span className="text-xs text-orange-600 font-medium uppercase tracking-wide">{userData?.role}</span>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Admin / Instructor Views */}
        {view === 'dashboard' && userData?.role === 'admin' && (
          <div className="mb-10">
            <AdminImport />
          </div>
        )}

        {view === 'dashboard' && (userData?.role === 'instructor' || userData?.role === 'admin') && (
          <div className="mb-10">
             <InstructorDashboard />
          </div>
        )}

        {/* Student Views */}
        {view === 'dashboard' && userData?.role === 'student' && (
          <>
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Welcome Back, {userData?.name}</h1>
              <p className="text-slate-500">Select a course to continue your journey.</p>
            </div>
            <StudentDashboard user={user} onSelectBook={handleSelectBook} refreshToken={progressRefresh} />
          </>
        )}

        {view === 'study' && selectedBook && (
          <StudyMode
            book={selectedBook}
            userId={user.uid}
            onBack={() => setView('dashboard')}
          />
        )}

        {view === 'quiz' && selectedBook && (
          <QuizMode
            book={selectedBook}
            userId={user.uid}
            onBack={() => { setView('dashboard'); setProgressRefresh(t => t + 1); }}
            onProgressUpdate={() => setProgressRefresh(t => t + 1)}
          />
        )}

      </main>
    </div>
  );
};

export default App;
