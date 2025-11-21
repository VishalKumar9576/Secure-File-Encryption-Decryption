import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  Plus, Trash2, Save, X, ArrowLeft, Search, Loader, Eye, EyeOff
} from 'lucide-react';
import { noteService } from '../services/noteService';
import { SecureNote } from '../lib/supabase';
import { CryptoUtils } from '../utils/crypto';

export default function Notes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<SecureNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<SecureNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [editingNote, setEditingNote] = useState<SecureNote | null>(null);
  const [viewingNote, setViewingNote] = useState<SecureNote | null>(null);
  const [viewContent, setViewContent] = useState('');
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    initializeEncryption();
  }, [user, navigate]);

  const initializeEncryption = async () => {
    try {
      const key = await CryptoUtils.generateKey();
      setEncryptionKey(key);
      await loadNotes(key);
    } catch (error) {
      console.error('Error initializing encryption:', error);
    }
  };

  const loadNotes = async (key: CryptoKey) => {
    if (!user) return;
    try {
      const userNotes = await noteService.getNotes(user.id);
      setNotes(userNotes);
      setFilteredNotes(userNotes);
    } catch (error) {
      console.error('Error loading notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    filterNotes();
  }, [notes, searchTerm]);

  const filterNotes = () => {
    const filtered = notes.filter(note =>
      note.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredNotes(filtered);
  };

  const handleCreateNote = async () => {
    if (!user || !encryptionKey || !newNote.title || !newNote.content) {
      setError('Please enter title and content');
      return;
    }

    setError('');

    try {
      await noteService.createNote(
        newNote.title,
        newNote.content,
        encryptionKey,
        user.id
      );

      setNewNote({ title: '', content: '' });
      setShowNew(false);
      await loadNotes(encryptionKey);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create note');
    }
  };

  const handleViewNote = async (note: SecureNote) => {
    if (!user || !encryptionKey) return;

    try {
      const content = await noteService.decryptNote(note, encryptionKey, user.id);
      setViewContent(content);
      setViewingNote(note);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to decrypt note');
    }
  };

  const handleUpdateNote = async () => {
    if (!user || !editingNote || !encryptionKey || !newNote.title || !newNote.content) {
      setError('Please enter title and content');
      return;
    }

    setError('');

    try {
      await noteService.updateNote(
        editingNote.id,
        newNote.title,
        newNote.content,
        encryptionKey,
        user.id
      );

      setEditingNote(null);
      setNewNote({ title: '', content: '' });
      await loadNotes(encryptionKey);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!user || !window.confirm('Delete this note?')) return;

    try {
      await noteService.deleteNote(noteId, user.id);
      await loadNotes(encryptionKey!);
    } catch (error) {
      console.error('Error deleting note:', error);
    }
  };

  const handleEdit = (note: SecureNote) => {
    setEditingNote(note);
    setNewNote({ title: note.title, content: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading notes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Secure Notes</h1>
          <p className="text-gray-600 dark:text-gray-400">Create and manage encrypted notes</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <button
              onClick={() => {
                setShowNew(true);
                setEditingNote(null);
                setNewNote({ title: '', content: '' });
              }}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>New Note</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {filteredNotes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center">
            <Plus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {notes.length === 0 ? 'No notes yet' : 'No matching notes'}
            </p>
            <button
              onClick={() => {
                setShowNew(true);
                setEditingNote(null);
                setNewNote({ title: '', content: '' });
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Create Your First Note</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow flex flex-col"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {note.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-1">
                  Created {new Date(note.created_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewNote(note)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => handleEdit(note)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(showNew || editingNote) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingNote ? 'Edit Note' : 'New Note'}
              </h2>
              <button
                onClick={() => {
                  setShowNew(false);
                  setEditingNote(null);
                  setNewNote({ title: '', content: '' });
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) =>
                    setNewNote({ ...newNote, title: e.target.value })
                  }
                  placeholder="Note title"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content
                </label>
                <textarea
                  value={newNote.content}
                  onChange={(e) =>
                    setNewNote({ ...newNote, content: e.target.value })
                  }
                  placeholder="Write your note here..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white font-mono text-sm"
                  rows={10}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNew(false);
                  setEditingNote(null);
                  setNewNote({ title: '', content: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingNote ? handleUpdateNote : handleCreateNote}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{editingNote ? 'Update' : 'Create'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {viewingNote.title}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date(viewingNote.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => {
                  setViewingNote(null);
                  setViewContent('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 whitespace-pre-wrap font-mono text-sm text-gray-900 dark:text-white break-words">
              {viewContent}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
