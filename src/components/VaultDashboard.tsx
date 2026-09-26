'use client';

import { useState, useEffect, useMemo } from 'react';
import { Check, FolderInput, Plus, Link2, Folder, ExternalLink, Image as ImageIcon, Search, Trash2, Play, Globe, Bookmark, Camera, FolderPlus, Pencil, ListVideo, Lock, Upload, X, Settings, Maximize, FileUp, FolderUp, FileText, Code, Archive, File, Download, Key, User, Eye, EyeOff, Phone, MapPin, Mail, Hash, ChevronRight, Copy } from 'lucide-react';

type Item = {
  id: string;
  url: string;
  title: string;
  thumbnailUrl: string | null;
  platform: string;
  categoryId: string;
  isLocal: boolean;
  fileSize: number | null;
  fileType: string | null;
};

type SecretMedia = {
  id: string;
  type: string;
  fileUrl: string;
  caption: string;
  createdAt: string | Date;
};

type Category = {
  id: string;
  name: string;
  isSecret?: boolean;
  items: Item[];
};

type VaultConfig = {
  secretFolderCode: string;
  secretNotepadCode: string;
};

type SecretNote = {
  id: string;
  title: string;
  content: string;
  updatedAt: string | Date;
};

type Credential = {
  id: string;
  website: string;
  username: string;
  password: string;
};

type Contact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  location: string | null;
};

export default function VaultDashboard({ 
  initialCategories, 
  initialConfig,
  initialSecretNotes = [],
  initialSecretMedia = [],
  initialCredentials = [],
  initialContacts = []
}: { 
  initialCategories: Category[], 
  initialConfig: VaultConfig,
  initialSecretNotes?: SecretNote[],
  initialSecretMedia?: SecretMedia[],
  initialCredentials?: Credential[],
  initialContacts?: Contact[]
}) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [config, setConfig] = useState<VaultConfig>(initialConfig);
  const [url, setUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Playlist Viewer State
  const [activePlaylist, setActivePlaylist] = useState<{ name: string, items: Item[] } | null>(null);
  const [currentPlayIndex, setCurrentPlayIndex] = useState(0);

  // New Folder State
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const [pickerModal, setPickerModal] = useState<{isOpen: boolean, targetCategoryId: string | null}>({isOpen: false, targetCategoryId: null});
  const [pickerSelectedIds, setPickerSelectedIds] = useState<Set<string>>(new Set());
  const [isMovingItems, setIsMovingItems] = useState(false);

  const [isSavingFolder, setIsSavingFolder] = useState(false);

  // Edit Folder State
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // Secret Mode State
  const [secretMode, setSecretMode] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Secret Notepad State
  const [notepadActive, setNotepadActive] = useState(false);
  const [secretNotes, setSecretNotes] = useState<SecretNote[]>(initialSecretNotes);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(initialSecretNotes.length > 0 ? initialSecretNotes[0].id : null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [universalDragOver, setUniversalDragOver] = useState(false);

  // Credentials & Contacts State
  const [credentials, setCredentials] = useState<Credential[]>(initialCredentials);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [showCredForm, setShowCredForm] = useState(false);
  const [credForm, setCredForm] = useState({ website: '', username: '', password: '' });
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', phone: '', email: '', location: '' });
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [searchVault, setSearchVault] = useState('');

  // Secret Media State
  const [secretMedia, setSecretMedia] = useState<SecretMedia[]>(initialSecretMedia);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [uploadQueueStatus, setUploadQueueStatus] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<SecretMedia | null>(null);

  const [isUploadingPublic, setIsUploadingPublic] = useState(false);

  // Secure Media Panel Expansion State
  const [isSecureMediaExpanded, setIsSecureMediaExpanded] = useState(false);

  // Folder Expansion State
  const [expandedFolderModal, setExpandedFolderModal] = useState<Category | null>(null);

  // Secure Viewing Privacy State
  const [isMediaBlurred, setIsMediaBlurred] = useState(true);

  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState<{ id: string, categoryId: string } | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, itemId: string, categoryId: string) => {
    e.stopPropagation();
    setDraggedItem({ id: itemId, categoryId });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCategoryDragStart = (e: React.DragEvent, categoryId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('categoryId', categoryId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, categoryId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCategory !== categoryId && draggedItem?.categoryId !== categoryId) {
      setDragOverCategory(categoryId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, categoryId: string) => {
    if (dragOverCategory === categoryId) {
      setDragOverCategory(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetCategoryId: string) => {
    e.preventDefault();
    setDragOverCategory(null);

    const sourceCategoryId = e.dataTransfer.getData('categoryId');
    if (sourceCategoryId && sourceCategoryId !== targetCategoryId && !draggedItem) {
      // Reorder Categories
      const next = [...categories];
      const sourceIndex = next.findIndex(c => c.id === sourceCategoryId);
      const targetIndex = next.findIndex(c => c.id === targetCategoryId);
      
      if (sourceIndex >= 0 && targetIndex >= 0) {
        const [removed] = next.splice(sourceIndex, 1);
        next.splice(targetIndex, 0, removed);
        
        // Optimistic update
        setCategories(next);
        
        try {
          await fetch('/api/categories/reorder', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categoryIds: next.map(c => c.id) })
          });
        } catch (error) {
          console.error('Failed to save reorder', error);
        }
      }
      return;
    }

    if (draggedItem && draggedItem.categoryId !== targetCategoryId) {
      await handleCategoryChange(draggedItem.id, targetCategoryId);
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Handle native file drops to upload directly to this category
      setIsUploadingPublic(true);
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('categoryId', targetCategoryId);
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });
          if (res.ok) {
            const item = await res.json();
            setCategories(prev => {
              const next = [...prev];
              const catIndex = next.findIndex(c => c.id === targetCategoryId);
              if (catIndex >= 0) {
                next[catIndex] = { ...next[catIndex], items: [item, ...next[catIndex].items] };
              }
              return next;
            });
          }
        } catch (error) {
          console.error(error);
        }
      }
      setIsUploadingPublic(false);
    }
    setDraggedItem(null);
  };
  
  const handleCategoryUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetCategoryId: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploadingPublic(true);
    const files = Array.from(e.target.files);
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('categoryId', targetCategoryId);
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const item = await res.json();
          setCategories(prev => {
            const next = [...prev];
            const catIndex = next.findIndex(c => c.id === targetCategoryId);
            if (catIndex >= 0) {
              next[catIndex] = { ...next[catIndex], items: [item, ...next[catIndex].items] };
            }
            return next;
          });
        }
      } catch (error) {
        console.error(error);
      }
    }
    setIsUploadingPublic(false);
    e.target.value = '';
  };

  const toggleExpand = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  useEffect(() => {
    setOrigin(window.location.origin);
    const handleClickOutside = () => setOpenDropdownId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchQuery === config.secretNotepadCode) {
      setSearchQuery('');
      setNotepadActive(true);
    }
  }, [searchQuery, config.secretNotepadCode]);

  useEffect(() => {
    if (!notepadActive || !activeNoteId) return;
    const activeNote = secretNotes.find(n => n.id === activeNoteId);
    if (!activeNote) return;

    const timer = setTimeout(() => {
      setIsSavingNote(true);
      fetch('/api/secret-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(activeNote)
      }).finally(() => {
        setIsSavingNote(false);
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [secretNotes, notepadActive, activeNoteId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewMedia) {
          setPreviewMedia(null);
        } else if (activePlaylist) {
          setActivePlaylist(null);
        } else if (expandedFolderModal) {
          setExpandedFolderModal(null);
        } else if (isSecureMediaExpanded) {
          setIsSecureMediaExpanded(false);
        } else if (notepadActive) {
          setNotepadActive(false);
        } else if (secretMode) {
          setSecretMode(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewMedia, activePlaylist, expandedFolderModal, isSecureMediaExpanded, notepadActive]);

  const processFiles = async (files: File[], targetCategoryId?: string) => {
    if (files.length === 0) return;
    setIsUploadingPublic(true);
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      if (targetCategoryId) formData.append('categoryId', targetCategoryId);
      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const item = await res.json();
          setCategories(prev => {
            const next = [...prev];
            const catIndex = next.findIndex(c => c.id === item.categoryId);
            if (catIndex >= 0) {
              next[catIndex] = { ...next[catIndex], items: [item, ...next[catIndex].items] };
            } else {
              next.push({ id: item.categoryId, name: 'Local Files', items: [item] });
            }
            return next;
          });
        }
      } catch (error) {
        console.error(error);
      }
    }
    setIsUploadingPublic(false);
  };

  const processUrl = async (targetUrl: string) => {
    if (!targetUrl) return;
    
    let finalUrl = targetUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: finalUrl })
      });
      if (res.ok) {
        const item = await res.json();
        setCategories(prev => {
          const next = [...prev];
          const catIndex = next.findIndex(c => c.id === item.categoryId);
          if (catIndex >= 0) {
            next[catIndex] = { ...next[catIndex], items: [item, ...next[catIndex].items] };
          } else {
            // New category created by backend, requires a reload to fetch its name cleanly 
            // (or we can just reload for simplicity since it's rare)
            window.location.reload();
          }
          return next;
        });
        setUrl('');
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Ignore paste if focused in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const pastedText = e.clipboardData?.getData('text');
      if (pastedText && (pastedText.startsWith('http://') || pastedText.startsWith('https://'))) {
        e.preventDefault();
        processUrl(pastedText);
      } else if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        e.preventDefault();
        processFiles(Array.from(e.clipboardData.files));
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleSecretUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const filesToUpload = files.slice(0, 5);
    if (files.length > 5) {
      alert('You can only upload up to 5 files at a time. The first 5 files will be uploaded.');
    }

    setIsUploadingMedia(true);
    
    for (let i = 0; i < filesToUpload.length; i++) {
      setUploadQueueStatus(`Uploading ${i + 1} of ${filesToUpload.length}`);
      const file = filesToUpload[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/secret-media', {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          const newItem = await res.json();
          setSecretMedia(prev => [newItem, ...prev]);
        }
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }

    setIsUploadingMedia(false);
    setUploadQueueStatus(null);
    e.target.value = '';
  };

  const handleDeleteSecretMedia = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Permanently delete this secret file?')) return;
    
    setSecretMedia(prev => prev.filter(m => m.id !== id));
    try {
      await fetch(`/api/secret-media/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (searchQuery === config.secretFolderCode) {
      setSearchQuery('');
      setSecretMode(true);
    }
  }, [searchQuery, config.secretFolderCode]);

  const handleUpdateCode = async (type: 'folder' | 'notepad') => {
    const newCode = prompt(`Enter new trigger code for ${type === 'folder' ? 'Secret Vault Folder' : 'Secret Notepad'}:`);
    if (!newCode || newCode.trim() === '') return;
    
    const payload = type === 'folder' ? { secretFolderCode: newCode } : { secretNotepadCode: newCode };
    
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updatedConfig = await res.json();
        setConfig(updatedConfig);
        alert('Access code updated successfully!');
        if (type === 'folder') setSecretMode(false);
        if (type === 'notepad') setNotepadActive(false);
        setSearchQuery('');
      }
    } catch (error) {
      console.error(error);
      alert('Failed to update code.');
    }
  };

  const togglePassword = (id: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveCredential = async () => {
    if (!credForm.website || !credForm.username || !credForm.password) return;
    const res = await fetch('/api/credentials', { method: 'POST', body: JSON.stringify(credForm) });
    if (res.ok) {
      const newCred = await res.json();
      setCredentials([newCred, ...credentials]);
      setCredForm({ website: '', username: '', password: '' });
      
    }
  };

  const handleSaveContact = async () => {
    if (!contactForm.name) return;
    const res = await fetch('/api/contacts', { method: 'POST', body: JSON.stringify(contactForm) });
    if (res.ok) {
      const newContact = await res.json();
      setContacts([newContact, ...contacts]);
      setContactForm({ name: '', phone: '', email: '', location: '' });
      setShowContactForm(false);
    }
  };

  const handleCreateNote = async () => {
    const res = await fetch('/api/secret-notes', { method: 'POST', body: JSON.stringify({ title: 'New Note', content: '' }) });
    if (res.ok) {
      const newNote = await res.json();
      setSecretNotes([newNote, ...secretNotes]);
      setActiveNoteId(newNote.id);
    }
  };
  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this secure note?')) return;
    setSecretNotes(prev => prev.filter(n => n.id !== id));
    if (activeNoteId === id) setActiveNoteId(null);
    try {
      await fetch(`/api/secret-notes/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCredential = async (id: string) => {
    if (!confirm('Are you sure you want to delete this login?')) return;
    setCredentials(prev => prev.filter(c => c.id !== id));
    try {
      await fetch(`/api/credentials/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    setContacts(prev => prev.filter(c => c.id !== id));
    try {
      await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error(err);
    }
  };


  const handleAddFolder = async (e: React.FormEvent) => {
    if (!newFolderName.trim()) return;
    setIsSavingFolder(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName })
      });
      if (res.ok) {
        const newCategory = await res.json();
        setCategories(prev => {
          if (prev.some(c => c.id === newCategory.id)) return prev;
          return [...prev, { ...newCategory, items: [] }];
        });
        setNewFolderName('');
        setIsAddingFolder(false);
      }
    } catch (error) {
      console.error(error);
    }
    setIsSavingFolder(false);
  };

  const handleDownload = async (e: React.MouseEvent, url: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = title || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed, opening in new tab', err);
      window.open(url, '_blank');
    }
  };
  const handleEditFolder = async (e: React.FormEvent, categoryId: string) => {
    e.preventDefault();
    if (!editingCategoryName.trim()) {
      setEditingCategoryId(null);
      return;
    }
    
    setCategories(prev => prev.map(c => 
      c.id === categoryId ? { ...c, name: editingCategoryName.trim() } : c
    ));
    setEditingCategoryId(null);

    try {
      await fetch(`/api/categories/${categoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingCategoryName })
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  
  const togglePickerSelection = (id: string) => {
     setPickerSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
     });
  };

  const handleConfirmMove = async () => {
     if (!pickerModal.targetCategoryId || pickerSelectedIds.size === 0) return;
     setIsMovingItems(true);
     try {
        const promises = Array.from(pickerSelectedIds).map(itemId => 
           fetch(`/api/items/${itemId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ categoryId: pickerModal.targetCategoryId })
           })
        );
        await Promise.all(promises);
        
        setCategories(prev => {
           const next = JSON.parse(JSON.stringify(prev));
           const targetCat = next.find((c: any) => c.id === pickerModal.targetCategoryId);
           if (!targetCat) return prev;
           
           const movedItems: any[] = [];
           next.forEach((c: any) => {
              if (c.id !== pickerModal.targetCategoryId) {
                 const itemsToMove = c.items.filter((i: any) => pickerSelectedIds.has(i.id));
                 movedItems.push(...itemsToMove);
                 c.items = c.items.filter((i: any) => !pickerSelectedIds.has(i.id));
              }
           });
           
           movedItems.forEach(i => {
              i.categoryId = pickerModal.targetCategoryId;
              targetCat.items.unshift(i);
           });
           
           return next;
        });
        
        setPickerModal({isOpen: false, targetCategoryId: null});
        setPickerSelectedIds(new Set());
     } catch (err) {
        console.error(err);
     }
     setIsMovingItems(false);
  };

  const handleCategoryChange = async (itemId: string, newCategoryId: string) => {
    setCategories((prev) => {
      let targetItem: Item | null = null;
      const withoutItem = prev.map(c => {
        const item = c.items.find(i => i.id === itemId);
        if (item) {
          targetItem = { ...item, categoryId: newCategoryId };
          return { ...c, items: c.items.filter(i => i.id !== itemId) };
        }
        return c;
      });

      if (!targetItem) return prev;

      return withoutItem.map(c => {
        if (c.id === newCategoryId) {
          return { ...c, items: [targetItem!, ...c.items] };
        }
        return c;
      });
    });

    try {
      await fetch(`/api/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: newCategoryId })
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteFolder = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this ENTIRE folder and all its contents?')) return;
    
    setCategories(prev => prev.filter(c => c.id !== categoryId));

    try {
      await fetch(`/api/categories/${categoryId}`, { method: 'DELETE' });
    } catch (error) {
      console.error(error);
    }
  };

  const handleDelete = async (itemId: string, categoryId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    setCategories((prev) => 
      prev.map(c => 
        c.id === categoryId 
          ? { ...c, items: c.items.filter(i => i.id !== itemId) }
          : c
      )
    );

    try {
      await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
    } catch (error) {
      console.error(error);
    }
  };

  const publicCategories = categories.filter(c => !c.isSecret);
  const secretCategories = categories.filter(c => c.isSecret);

  const categoriesToRender = useMemo(() => {
    const targetCategories = secretMode ? secretCategories : publicCategories;
    if (!searchQuery) return targetCategories;
    const query = searchQuery.toLowerCase();
    return targetCategories.map(category => ({
      ...category,
      items: category.items.filter(item => item.title.toLowerCase().includes(query))
    })).filter(category => category.items.length > 0);
  }, [categories, secretMode, searchQuery, publicCategories, secretCategories]);

  return (
    <div className="min-h-screen bg-[#f9f9fb] text-zinc-800 font-sans flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-stone-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">Super Vault</h1>
        <div className="flex items-center space-x-2 text-zinc-400">
          <Lock size={14} className="opacity-70" />
          <span className="text-[10px] sm:text-xs font-semibold tracking-wider uppercase">Private Digital Sanctuary</span>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-1 w-full p-6 md:p-12">
        <div className="max-w-7xl mx-auto space-y-12">
        {/* Header & Ingestion/Search Bars */}
        <div className="w-full max-w-4xl mx-auto flex flex-col space-y-6">
          
          {/* Universal Drop & Upload Bar */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setUniversalDragOver(true); }}
            onDragLeave={() => setUniversalDragOver(false)}
            onDrop={(e) => {
               e.preventDefault();
               setUniversalDragOver(false);
               const urlText = e.dataTransfer.getData('URL') || e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text');
               if (urlText && (urlText.startsWith('http') || urlText.startsWith('https'))) {
                 processUrl(urlText);
               } else if (e.dataTransfer.files?.length > 0) {
                 processFiles(Array.from(e.dataTransfer.files));
               }
            }}
            className={`w-full max-w-4xl mx-auto border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center space-y-4 transition-all duration-300 relative overflow-hidden bg-white shadow-sm
              ${universalDragOver ? 'border-zinc-800 bg-zinc-50 scale-[1.02]' : 'border-stone-200 hover:border-zinc-300 hover:bg-zinc-50/50'}`}
          >
             {/* Hidden file input triggered by a click anywhere on the bar */}
             <label className="absolute inset-0 w-full h-full cursor-pointer z-10">
               <input type="file" multiple className="hidden" onChange={(e) => {
                 if (e.target.files?.length) processFiles(Array.from(e.target.files));
                 e.target.value = '';
               }} />
             </label>
             
             <div className="flex items-center justify-center space-x-6 text-zinc-400 pointer-events-none">
               <ImageIcon size={28} />
               <FileText size={28} />
               <Play size={28} />
               <Link2 size={28} />
               <Folder size={28} />
             </div>
             
             <div className="text-center pointer-events-none">
               <p className="text-sm font-medium text-zinc-600 mb-1">
                 Drag & drop links, photos, videos, files, folders, docs, or PDFs here
               </p>
               <p className="text-xs text-zinc-400">
                 or <span className="text-zinc-800 font-semibold underline decoration-stone-300 underline-offset-4">click to browse</span> from your computer
               </p>
             </div>
             
             {/* Uploading Overlay */}
             {(isUploadingPublic || loading) && (
               <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-800 mb-3"></div>
                 <span className="text-sm font-medium text-zinc-600">{loading ? 'Processing Link...' : 'Uploading Files...'}</span>
               </div>
             )}
          </div>
          
          {/* Action Bar: Search & Quick Utilities */}
          <div className="w-full max-w-4xl flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Real-time Search */}
            <div className="flex-1 w-full flex items-center bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-zinc-200 focus-within:border-zinc-300 transition-all h-12 max-w-xs">
              <div className="pl-4 text-zinc-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your vault..."
                className="w-full outline-none py-3 px-3 text-zinc-700 bg-transparent placeholder-zinc-400 text-sm"
              />
            </div>

            {/* Link Paste Bar & New Folder */}
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 flex-1 justify-end">
              
              {/* URL Input Form */}
              <form onSubmit={(e) => { e.preventDefault(); processUrl(url); }} className="w-full max-w-sm relative flex">
                <div className="w-full flex items-center bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-zinc-200 focus-within:border-zinc-300 transition-all h-12">
                  <div className="pl-4 text-zinc-400">
                    <Link2 size={16} />
                  </div>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste URL (YouTube, Drive, Site)..."
                    className="flex-1 outline-none py-3 px-3 text-zinc-700 bg-transparent placeholder-zinc-400 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={loading || !url}
                    className="mr-1.5 bg-zinc-800 hover:bg-zinc-700 text-white h-9 px-4 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center shrink-0 whitespace-nowrap"
                  >
                    <span>{loading ? 'Saving...' : 'Save Link'}</span>
                  </button>
                </div>
              </form>

            {/* Lock Vault Toggle */}
            {secretMode && (
              <button 
                onClick={() => setSecretMode(false)}
                className="flex items-center space-x-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 transition-colors py-2 px-4 rounded-lg shadow-sm h-[38px] shrink-0 whitespace-nowrap"
              >
                <Lock size={14} />
                <span>Lock Vault</span>
              </button>
            )}

            {/* New Folder Toggle */}
            {isAddingFolder ? (
              <form onSubmit={handleAddFolder} className="flex items-center space-x-2 bg-white border border-stone-200 rounded-lg shadow-sm p-1 pl-4 h-[38px]">
                <FolderPlus size={14} className="text-zinc-400" />
                <input
                  type="text"
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder name..."
                  className="outline-none px-1 text-sm text-zinc-700 bg-transparent w-28"
                  required
                />
                <button type="submit" disabled={isSavingFolder} className="p-1.5 bg-zinc-800 text-white rounded-md hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                  <Plus size={14} />
                </button>
                <button type="button" onClick={() => { setIsAddingFolder(false); setNewFolderName(''); }} className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-md transition-colors">
                  <Trash2 size={14} />
                </button>
              </form>
            ) : (
              <button 
                onClick={() => setIsAddingFolder(true)}
                className="flex items-center space-x-2 whitespace-nowrap shrink-0 text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors bg-white border border-stone-100 py-2 px-4 rounded-lg shadow-sm h-[38px]"
              >
                <FolderPlus size={14} className="text-zinc-400" />
                <span>New Folder</span>
              </button>
            )}
          </div>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] animate-pulse mb-8">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-stone-100">
              <div className="h-8 w-8 bg-zinc-200 rounded-lg"></div>
              <div className="h-5 w-32 bg-zinc-200 rounded-md"></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl overflow-hidden border border-stone-100 bg-zinc-50/50">
                <div className="aspect-video w-full bg-zinc-200"></div>
                <div className="p-3 space-y-3">
                  <div className="h-4 bg-zinc-200 rounded-md w-3/4"></div>
                  <div className="h-4 bg-zinc-200 rounded-md w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Sections (Masonry Layout) */}
        <div className={`gap-6 ${categoriesToRender.length === 1 ? 'max-w-4xl mx-auto flex flex-col' : 'columns-1 lg:columns-2'}`}>
          {categoriesToRender.map((category) => (
            <div 
              key={category.id} 
              draggable={true}
              onDragStart={(e) => handleCategoryDragStart(e, category.id)}
              onDragOver={(e) => handleDragOver(e, category.id)}
              onDragLeave={(e) => handleDragLeave(e, category.id)}
              onDrop={(e) => handleDrop(e, category.id)}
              className={`bg-white rounded-3xl p-6 border transition-all duration-200 flex flex-col break-inside-avoid mb-6 ${dragOverCategory === category.id ? 'border-zinc-800 ring-4 ring-zinc-800/10 shadow-lg scale-[1.01]' : 'border-stone-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]'}`}
            >
              <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-stone-100 group/folder">
                <div className="p-2 bg-zinc-50 rounded-lg text-zinc-500">
                  {category.isSecret ? <Lock size={18} className="text-zinc-800" /> : <Folder size={18} />}
                </div>
                {editingCategoryId === category.id ? (
                  <form onSubmit={(e) => handleEditFolder(e, category.id)} className="flex items-center space-x-2">
                    <input
                      type="text"
                      autoFocus
                      value={editingCategoryName}
                      onChange={(e) => setEditingCategoryName(e.target.value)}
                      onBlur={() => setEditingCategoryId(null)}
                      className="text-xl font-medium text-zinc-800 bg-zinc-50 outline-none px-2 py-1 rounded w-64"
                    />
                    <button type="submit" className="hidden">Save</button>
                  </form>
                ) : (
                  <>
                    <h2 className="text-xl font-medium text-zinc-800">{category.name}</h2>
                    <button 
                      onClick={() => {
                        setEditingCategoryId(category.id);
                        setEditingCategoryName(category.name);
                      }}
                      className="opacity-0 group-hover/folder:opacity-100 text-zinc-300 hover:text-zinc-500 transition-all ml-2 p-1"
                      title="Rename Folder"
                    >
                      <Pencil size={14} />
                    </button>
                    {category.isSecret && (
                      <button onClick={() => handleUpdateCode('folder')} className="ml-3 text-xs flex items-center space-x-1 px-2 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-md transition-colors" title="Change Access Code">
                        <Settings size={12} /> <span>Code</span>
                      </button>
                    )}
                  </>
                )}

                
                <div className="ml-auto flex items-center space-x-3">
                  {/* Picker Items */}
                  {category.isSecret && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPickerModal({isOpen: true, targetCategoryId: category.id});
                        setPickerSelectedIds(new Set());
                      }}
                      className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center space-x-1.5 shadow-sm shrink-0 z-10 relative"
                    >
                      <FolderInput size={14} />
                      <span>Add Items</span>
                    </button>
                  )}
                  
                  {/* Playlist button for ALL folders with >= 2 items */}
                  {category.items.length >= 2 && (
                    <button 
                      onClick={() => {
                        setActivePlaylist({ name: category.name, items: [...category.items].reverse() });
                        setCurrentPlayIndex(0);
                      }}
                      className="flex items-center space-x-1.5 text-xs font-medium text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                    >
                      <ListVideo size={14} className="text-white" />
                      <span>Create Playlist</span>
                    </button>
                  )}

                  <span className="text-xs font-medium text-zinc-400 bg-zinc-50 px-3 py-1 rounded-full flex items-center">
                    {category.items.length} {category.items.length === 1 ? 'item' : 'items'}
                  </span>

                  {/* Delete Folder */}
                  {!category.isSecret && (
                    <button 
                      onClick={() => handleDeleteFolder(category.id)}
                      className="opacity-0 group-hover/folder:opacity-100 text-zinc-300 hover:text-red-500 transition-all p-1"
                      title="Delete Folder"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {category.items.slice(0, 6).map((item) => (
                  <div 
                    key={item.id} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id, category.id)}
                    onDragEnd={() => { setDraggedItem(null); setDragOverCategory(null); }}
                    className={`group relative flex flex-col rounded-2xl overflow-hidden border bg-zinc-50/50 hover:bg-zinc-50 transition-all duration-200 h-full cursor-grab active:cursor-grabbing ${draggedItem?.id === item.id ? 'opacity-50 scale-95 border-zinc-300' : 'border-stone-100'}`}
                  >
                    {/* Platform Badge */}
                    <div className="absolute top-2 left-2 z-10 p-1.5 bg-white/90 backdrop-blur border border-stone-200 rounded-lg shadow-sm pointer-events-none">
                      {item.platform === 'youtube' ? <Play size={14} className="text-red-500" /> : 
                       item.platform === 'instagram' ? <Camera size={14} className="text-pink-500" /> : 
                       item.platform === 'image' ? <ImageIcon size={14} className="text-zinc-500" /> : 
                       item.platform === 'pdf' ? <FileText size={14} className="text-red-400" /> : 
                       item.platform === 'code' ? <Code size={14} className="text-blue-500" /> : 
                       item.platform === 'archive' ? <Archive size={14} className="text-orange-400" /> : 
                       item.platform === 'file' ? <File size={14} className="text-zinc-500" /> : 
                       <Globe size={14} className="text-zinc-500" />}
                    </div>

                    {/* Delete Icon on Hover */}
                    <button 
                      onClick={() => handleDelete(item.id, category.id)}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur border border-stone-200 rounded-lg text-zinc-400 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all z-10"
                      title="Delete Item"
                    >
                      <Trash2 size={14} />
                    </button>

                    {/* Clickable Image */}
                    <a href={item.url} onClick={item.isLocal && item.platform !== 'image' && item.platform !== 'pdf' ? (e) => handleDownload(e, item.url, item.title) : undefined} target={item.isLocal && item.platform !== 'image' && item.platform !== 'pdf' ? undefined : "_blank"} rel="noopener noreferrer" className="block relative w-full shrink-0 overflow-hidden bg-zinc-200 group/img aspect-video" download={item.isLocal ? item.title : undefined}>
                      {item.thumbnailUrl ? (
                        <img 
                          src={item.thumbnailUrl} 
                          alt={item.title} 
                          className={`w-full h-full group-hover/img:scale-105 transition-transform duration-500 ${item.thumbnailUrl.includes('s2/favicons') ? 'object-contain p-4 bg-zinc-50' : 'object-cover'}`} 
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 text-zinc-300">
                           {item.platform === 'pdf' ? <FileText size={32} /> : 
                            item.platform === 'code' ? <Code size={32} /> : 
                            item.platform === 'archive' ? <Archive size={32} /> : 
                            item.isLocal ? <File size={32} /> : 
                            <ImageIcon size={32} />}
                           {item.isLocal && <span className="mt-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">{item.fileType || 'FILE'}</span>}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/5 transition-colors"></div>
                    </a>

                    <div className="p-3 flex flex-col flex-1">
                      {/* Clickable Title */}
                      <button 
                        onClick={(e) => toggleExpand(e, item.id)}
                        className={`text-sm font-medium text-zinc-700 hover:text-black mb-2 text-left flex-1 ${expandedItems.has(item.id) ? '' : 'line-clamp-2 min-h-[40px]'}`}
                        title={expandedItems.has(item.id) ? "Click to collapse" : "Click to expand full title"}
                      >
                        {item.title}
                      </button>
                      
                      {/* Move Item Menu */}
                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-stone-100/50 relative group/dropdown">
                        <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center space-x-1 truncate max-w-[50%]">
                          {item.isLocal ? (
                            <>
                              <span>{item.platform}</span>
                              {item.fileSize && <span> • {(item.fileSize / 1024 / 1024).toFixed(1)} MB</span>}
                            </>
                          ) : (
                            item.platform === 'youtube' ? 'Video' : item.platform === 'instagram' ? 'Post' : item.platform === 'image' ? 'Image' : 'Website'
                          )}
                        </span>
                        
                        <div className="relative flex items-center justify-end gap-1.5 shrink-0 ml-1">
                          {item.isLocal && (
                            <a href={item.url} onClick={(e) => handleDownload(e, item.url, item.title)} download={item.title} className="text-xs font-medium bg-zinc-800 text-white hover:bg-zinc-700 py-1 px-2.5 rounded-md shadow-sm transition-all inline-flex items-center shrink-0">
                              <Download size={12} />
                            </a>
                          )}
                          <button 
                            onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === item.id ? null : item.id); }}
                            className="text-xs font-medium bg-white border border-stone-200 text-zinc-600 hover:text-zinc-900 hover:border-stone-300 py-1 px-2.5 rounded-md shadow-sm transition-all inline-flex items-center space-x-1 shrink-0"
                          >
                            <span>Move to</span>
                          </button>
                          
                          {/* Dropdown Menu */}
                          <div className={`absolute right-0 bottom-full mb-1 w-40 bg-white border border-stone-200 rounded-xl shadow-lg transition-all z-50 overflow-hidden flex flex-col py-1 ${openDropdownId === item.id ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
                            <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold px-3 py-1.5 border-b border-stone-50 mb-1">
                              Select Folder
                            </span>
                            {(() => {
                              const available = categories.filter(c => c.id !== category.id);
                              if (available.length === 0) {
                                return <span className="text-xs text-zinc-400 px-3 py-2 italic">No other folders</span>;
                              }
                              return available.map(c => (
                                <button 
                                  key={c.id} 
                                  onClick={() => { setOpenDropdownId(null); handleCategoryChange(item.id, c.id); }}
                                  className="text-xs text-left px-3 py-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors truncate flex justify-between items-center"
                                >
                                  <span>{c.name}</span>
                                  {c.isSecret && <Lock size={10} className="text-zinc-400" />}
                                </button>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {category.items.length > 6 && (
                <div className="mt-4 flex justify-center border-t border-stone-100 pt-4">
                  <button 
                    onClick={() => setExpandedFolderModal(category)}
                    className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-full text-sm font-medium transition-colors shadow-sm flex items-center space-x-2"
                  >
                    <span>Expand Full Folder View</span>
                  </button>
                </div>
              )}
              {/* Empty State Placeholder */}
              {category.items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-zinc-400 border-2 border-dashed border-stone-100 rounded-2xl bg-zinc-50/30 w-full">
                  <Folder size={24} className="mb-2 text-zinc-300" />
                  <span className="text-sm font-medium text-zinc-500">No items saved here yet</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      </main>

      {/* Internal Playlist Viewer Modal */}
      {activePlaylist && (
        <div className="fixed inset-0 z-50 bg-[#f9f9fb] flex flex-col animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex justify-between items-center p-4 bg-white border-b border-stone-200 shadow-sm shrink-0">
            <div className="flex items-center space-x-4 text-zinc-800">
              <span className="font-medium flex items-center space-x-2">
                <ListVideo size={18} className="text-zinc-500" />
                <span className="tracking-tight">{activePlaylist.name} Playlist</span>
              </span>
              <span className="text-zinc-400 text-sm font-medium bg-zinc-50 px-2.5 py-0.5 rounded-full border border-stone-100">{currentPlayIndex + 1} / {activePlaylist.items.length}</span>
            </div>
            <button 
              onClick={() => setActivePlaylist(null)} 
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <X size={16} /> <span>Close (Esc)</span>
            </button>
          </div>
          
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Main Player Area */}
            <div className="flex-1 bg-zinc-50/50 flex items-center justify-center p-4 md:p-8">
               {(() => {
                 const item = activePlaylist.items[currentPlayIndex];
                 
                 // YouTube embed
                 if (item.platform === 'youtube') {
                   const match = item.url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                   const id = match ? match[1] : null;
                   return id ? (
                     <iframe src={`https://www.youtube.com/embed/${id}?autoplay=1`} className="w-full h-full max-w-5xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-stone-200 bg-white" allowFullScreen allow="autoplay; fullscreen" />
                   ) : <div className="text-zinc-500">Invalid YouTube Link</div>;
                 }
                 
                 // General Iframe for Websites & Instagram
                 const isIg = item.platform === 'instagram';
                 return (
                   <div className={`w-full h-full ${isIg ? 'max-w-md mx-auto' : 'max-w-5xl'} rounded-2xl overflow-hidden bg-white relative shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-stone-200`}>
                     <iframe src={isIg ? `${item.url.split('?')[0]}embed` : item.url} className="w-full h-full" sandbox="allow-same-origin allow-scripts allow-popups allow-forms" />
                     {!isIg && (
                       <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)] rounded-2xl" />
                     )}
                   </div>
                 );
               })()}
            </div>

            {/* Playlist Sidebar */}
            <div className="w-full md:w-80 lg:w-96 bg-white border-t md:border-t-0 md:border-l border-stone-200 overflow-y-auto p-4 space-y-2 shrink-0 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
               <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-4 px-2">Up Next</h3>
               {activePlaylist.items.map((item, i) => (
                 <div 
                   key={item.id} 
                   onClick={() => setCurrentPlayIndex(i)} 
                   className={`cursor-pointer flex items-start space-x-3 p-2.5 rounded-xl transition-all ${i === currentPlayIndex ? 'bg-zinc-50 border border-stone-200 shadow-sm' : 'hover:bg-zinc-50/80 border border-transparent'}`}
                 >
                    <div className="w-24 h-16 bg-zinc-100 rounded-lg flex-shrink-0 overflow-hidden relative border border-stone-100/50">
                       {item.thumbnailUrl ? (
                         <img 
                           src={item.thumbnailUrl} 
                           className={`w-full h-full ${item.thumbnailUrl.includes('s2/favicons') ? 'object-contain p-2 bg-zinc-50' : 'object-cover'}`} 
                           alt="" 
                         />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center bg-zinc-50 text-zinc-400"><Globe size={16} /></div>
                       )}
                       {i === currentPlayIndex && (
                         <div className="absolute inset-0 bg-white/60 flex items-center justify-center backdrop-blur-[1px]">
                           <Play size={16} className="text-zinc-900 fill-zinc-900 drop-shadow-sm" />
                         </div>
                       )}
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 py-0.5">
                      <p className={`text-sm line-clamp-2 ${i === currentPlayIndex ? 'text-zinc-900 font-semibold' : 'text-zinc-600 font-medium group-hover:text-zinc-800'}`}>
                        {item.title}
                      </p>
                      <span className="text-[10px] text-zinc-400 mt-1.5 uppercase font-bold tracking-wider">{item.platform}</span>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}
      {/* Secret Notepad Modal */}
      {notepadActive && (
        <div className="fixed inset-0 z-50 bg-[#f9f9fb] flex flex-col animate-in fade-in duration-200 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-5 sm:px-8 py-4 gap-3 sm:gap-0 bg-white border-b border-stone-200 shadow-sm shrink-0 w-full overflow-hidden">
            <div className="flex items-center space-x-2 sm:space-x-3 text-zinc-800 w-full sm:w-auto">
              <Lock size={20} className="text-zinc-600 shrink-0" />
              <h2 className="text-lg md:text-xl font-medium tracking-tight truncate flex-1 sm:flex-none">Secure Vault Notepad</h2>
              {isSavingNote ? (
                <span className="shrink-0 px-2.5 py-1 bg-stone-800 text-stone-100 rounded-md text-[10px] md:text-xs font-medium animate-pulse shadow-sm">Saving...</span>
              ) : (
                <span className="shrink-0 px-2.5 py-1 bg-stone-800 text-stone-100 rounded-md text-[10px] md:text-xs font-medium shadow-sm whitespace-nowrap">Saved securely</span>
              )}
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto">
              <button onClick={() => handleUpdateCode('notepad')} className="flex-1 sm:flex-none text-xs sm:text-sm flex items-center justify-center space-x-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg transition-colors shrink-0" title="Change Access Code">
                <Settings size={14} /> <span>Change Code</span>
              </button>
              <button 
                onClick={() => setNotepadActive(false)}
                className="flex-1 sm:flex-none text-xs sm:text-sm flex items-center justify-center font-medium text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors shrink-0"
              >
                Lock <span className="hidden md:inline ml-1">(Esc)</span>
              </button>
            </div>
          </div>
          
          <div className="flex-1 max-w-[96rem] w-full mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-6 overflow-y-auto lg:overflow-hidden transition-all duration-300">
            {/* Notes Sidebar */}
            <div className={`order-2 lg:order-1 w-full lg:w-64 bg-white rounded-3xl p-4 border border-stone-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] h-64 lg:h-full flex flex-col shrink-0 ${isSecureMediaExpanded ? 'hidden' : 'flex'}`}>
              <div className="flex items-center justify-between mb-4 px-2">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Notes</h3>
                <button onClick={handleCreateNote} className="text-xs bg-zinc-800 text-white p-1.5 rounded-lg hover:bg-zinc-700 transition-colors">
                  <Plus size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                {secretNotes.map(n => (
                  <div key={n.id} className="flex flex-col gap-1">
                    <div 
                      onClick={() => setActiveNoteId(activeNoteId === n.id ? null : n.id)}
                      role="button"
                      tabIndex={0}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all flex items-center justify-between group cursor-pointer ${activeNoteId === n.id ? 'bg-zinc-100 font-medium text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50'}`}
                    >
                      <span className="truncate flex-1">{n.title || 'Untitled Note'}</span>
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteNote(n.id, e); }}
                          className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 p-1 text-zinc-400 hover:text-red-500 rounded transition-opacity"
                          title="Delete Note"
                        >
                          <Trash2 size={14} />
                        </button>
                        <ChevronRight size={14} className={`transition-transform duration-200 ${activeNoteId === n.id ? 'rotate-90 text-zinc-400' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100 text-zinc-300'}`} />
                      </div>
                    </div>
                    {/* Mobile Accordion Editor */}
                    {activeNoteId === n.id && (
                      <div className="lg:hidden flex flex-col gap-3 p-4 bg-zinc-50 rounded-xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
                        <input 
                          type="text" 
                          value={n.title || ''} 
                          onChange={(e) => {
                            const v = e.target.value;
                            setSecretNotes(notes => notes.map(note => note.id === n.id ? { ...note, title: v } : note));
                          }}
                          placeholder="Note Title..."
                          className="text-lg font-semibold bg-transparent outline-none text-zinc-900 placeholder-zinc-400"
                        />
                        <textarea
                          value={n.content || ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setSecretNotes(notes => notes.map(note => note.id === n.id ? { ...note, content: v } : note));
                          }}
                          placeholder="Write your note..."
                          className="w-full bg-transparent outline-none resize-none text-zinc-700 text-sm leading-relaxed placeholder-zinc-400 min-h-[150px] custom-scrollbar"
                        />
                        <button onClick={(e) => { e.stopPropagation(); setActiveNoteId(null); }} className="mt-2 w-full text-center bg-zinc-200 hover:bg-zinc-300 text-zinc-700 py-2 rounded-lg text-xs font-medium transition-colors">
                          Close Note
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Main Center Area */}
            <div className={`order-1 lg:order-2 flex-none lg:flex-1 flex flex-col gap-6 h-auto lg:h-full overflow-visible lg:overflow-hidden ${isSecureMediaExpanded ? 'hidden' : 'flex'}`}>
              
              {/* Credentials & Contacts Section */}
              <div className="bg-white rounded-3xl p-6 border border-stone-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] shrink-0 flex flex-col max-h-[400px] lg:max-h-[50%]">
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Credentials & Contacts</h3>
                   <div className="flex items-center space-x-2">
                     <button onClick={() => { setShowCredForm(!showCredForm); setShowContactForm(false); }} className="text-xs flex items-center space-x-1 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-colors"><Key size={12}/><span>Add Logins</span></button>
                     <button onClick={() => { setShowContactForm(!showContactForm); setShowCredForm(false); }} className="text-xs flex items-center space-x-1 px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg transition-colors"><User size={12}/><span>Add Contact</span></button>
                   </div>
                 </div>

                 {showCredForm && (
                   <div className="bg-zinc-50 p-4 rounded-xl border border-stone-200 mb-4 flex flex-col md:flex-row gap-3 items-center">
                     <input type="text" placeholder="Website" className="flex-1 w-full bg-white border border-stone-200 px-3 py-2 rounded-lg text-sm outline-none" value={credForm.website} onChange={e => setCredForm({...credForm, website: e.target.value})} />
                     <input type="text" placeholder="Username/Email" className="flex-1 w-full bg-white border border-stone-200 px-3 py-2 rounded-lg text-sm outline-none" value={credForm.username} onChange={e => setCredForm({...credForm, username: e.target.value})} />
                     <input type="password" placeholder="Password" className="flex-1 w-full bg-white border border-stone-200 px-3 py-2 rounded-lg text-sm outline-none" value={credForm.password} onChange={e => setCredForm({...credForm, password: e.target.value})} />
                     <button onClick={handleSaveCredential} className="w-full md:w-auto bg-zinc-800 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 shrink-0">Save Login</button>
                   </div>
                 )}

                 {showContactForm && (
                   <div className="bg-zinc-50 p-4 rounded-xl border border-stone-200 mb-4 flex flex-col md:flex-row gap-3 items-center">
                     <input type="text" placeholder="Name" className="flex-1 w-full bg-white border border-stone-200 px-3 py-2 rounded-lg text-sm outline-none" value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} />
                     <input type="text" placeholder="Phone" className="flex-1 w-full bg-white border border-stone-200 px-3 py-2 rounded-lg text-sm outline-none" value={contactForm.phone} onChange={e => setContactForm({...contactForm, phone: e.target.value})} />
                     <input type="email" placeholder="Email" className="flex-1 w-full bg-white border border-stone-200 px-3 py-2 rounded-lg text-sm outline-none" value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} />
                     <button onClick={handleSaveContact} className="w-full md:w-auto bg-zinc-800 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-zinc-700 shrink-0">Save Contact</button>
                   </div>
                 )}

                                   <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-5 pr-2">
                    {credentials.map(c => (
                      <div key={c.id} className="flex flex-col xl:flex-row xl:items-center justify-between p-5 bg-zinc-50 border border-stone-100 rounded-xl hover:bg-zinc-100 transition-colors group gap-4">
                        <div className="flex items-center space-x-4 min-w-0 xl:w-1/3 shrink-0">
                          <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center shrink-0 shadow-sm"><Key size={16} className="text-zinc-500" /></div>
                          <div className="text-[15px] font-semibold text-zinc-900 truncate">{c.website}</div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 min-w-0">
                          {/* Username Box */}
                          <div className="flex items-center justify-between bg-white px-4 py-2 rounded-lg border border-stone-200 shadow-sm w-full sm:w-1/2">
                            <span className="text-xs text-zinc-600 truncate font-medium mr-2">{c.username}</span>
                            <button onClick={() => navigator.clipboard.writeText(c.username)} className="text-zinc-400 hover:text-zinc-700 transition-colors shrink-0" title="Copy Username">
                              <Copy size={14} />
                            </button>
                          </div>
                          
                          {/* Password Box */}
                          <div className="flex items-center justify-between bg-white px-4 py-2 rounded-lg border border-stone-200 shadow-sm w-full sm:w-1/2">
                            <span className="text-xs font-mono text-zinc-600 truncate tracking-wider mr-2">
                              {visiblePasswords.has(c.id) ? c.password : '••••••••'}
                            </span>
                            <div className="flex items-center space-x-2 shrink-0">
                              <button onClick={() => togglePassword(c.id)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                                {visiblePasswords.has(c.id) ? <EyeOff size={14}/> : <Eye size={14}/>}
                              </button>
                              <button onClick={() => navigator.clipboard.writeText(c.password)} className="text-zinc-400 hover:text-zinc-700 transition-colors" title="Copy Password">
                                <Copy size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="shrink-0 flex justify-end xl:block hidden">
                          <button onClick={() => handleDeleteCredential(c.id)} className="p-2 text-zinc-400 hover:text-red-500 bg-white border border-stone-200 rounded-lg shadow-sm transition-colors opacity-0 group-hover:opacity-100" title="Delete Login">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {/* Mobile Delete Button */}
                        <div className="shrink-0 flex justify-end xl:hidden">
                          <button onClick={() => handleDeleteCredential(c.id)} className="p-2 text-zinc-400 hover:text-red-500 bg-white border border-stone-200 rounded-lg shadow-sm transition-colors" title="Delete Login">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {contacts.map(c => (
                      <div key={c.id} className="flex flex-col xl:flex-row xl:items-center justify-between p-5 bg-zinc-50 border border-stone-100 rounded-xl hover:bg-zinc-100 transition-colors group gap-4">
                        <div className="flex items-center space-x-4 min-w-0 xl:w-1/3 shrink-0">
                          <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 flex items-center justify-center shrink-0 shadow-sm"><User size={16} className="text-zinc-500" /></div>
                          <div className="text-[15px] font-semibold text-zinc-900 truncate">{c.name}</div>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 min-w-0">
                          {c.phone ? (
                            <div className="flex items-center justify-between bg-white px-4 py-2 rounded-lg border border-stone-200 shadow-sm w-full sm:w-1/2">
                              <div className="flex items-center min-w-0">
                                <Phone size={12} className="text-zinc-400 mr-2 shrink-0"/>
                                <span className="text-xs text-zinc-600 truncate font-medium">{c.phone}</span>
                              </div>
                              <button onClick={() => navigator.clipboard.writeText(c.phone!)} className="text-zinc-400 hover:text-zinc-700 transition-colors shrink-0 ml-2" title="Copy Phone">
                                <Copy size={14} />
                              </button>
                            </div>
                          ) : <div className="hidden sm:block sm:w-1/2" />}
                          
                          {c.email ? (
                            <div className="flex items-center justify-between bg-white px-4 py-2 rounded-lg border border-stone-200 shadow-sm w-full sm:w-1/2">
                              <div className="flex items-center min-w-0">
                                <Mail size={12} className="text-zinc-400 mr-2 shrink-0"/>
                                <span className="text-xs text-zinc-600 truncate font-medium">{c.email}</span>
                              </div>
                              <button onClick={() => navigator.clipboard.writeText(c.email!)} className="text-zinc-400 hover:text-zinc-700 transition-colors shrink-0 ml-2" title="Copy Email">
                                <Copy size={14} />
                              </button>
                            </div>
                          ) : <div className="hidden sm:block sm:w-1/2" />}
                        </div>
                        
                        <div className="shrink-0 flex justify-end xl:block hidden">
                          <button onClick={() => handleDeleteContact(c.id)} className="p-2 text-zinc-400 hover:text-red-500 bg-white border border-stone-200 rounded-lg shadow-sm transition-colors opacity-0 group-hover:opacity-100" title="Delete Contact">
                            <Trash2 size={14} />
                          </button>
                        </div>
                        {/* Mobile Delete Button */}
                        <div className="shrink-0 flex justify-end xl:hidden">
                          <button onClick={() => handleDeleteContact(c.id)} className="p-2 text-zinc-400 hover:text-red-500 bg-white border border-stone-200 rounded-lg shadow-sm transition-colors" title="Delete Contact">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {credentials.length === 0 && contacts.length === 0 && (
                     <div className="text-sm text-zinc-400 text-center py-6 italic">No credentials or contacts saved yet.</div>
                   )}
                 </div>
              </div>

              {/* Active Notepad Area */}
              <div className={`flex-1 flex-col bg-white rounded-3xl p-6 border border-stone-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] overflow-hidden hidden lg:flex`}>
                {activeNoteId ? (
                  <>
                    <input 
                      type="text" 
                      value={secretNotes.find(n => n.id === activeNoteId)?.title || ''} 
                      onChange={(e) => {
                        const v = e.target.value;
                        setSecretNotes(notes => notes.map(n => n.id === activeNoteId ? { ...n, title: v } : n));
                      }}
                      placeholder="Note Title..."
                      className="text-2xl font-medium tracking-tight bg-transparent outline-none text-zinc-900 mb-4 placeholder-zinc-300"
                    />
                    <textarea
                      autoFocus
                      value={secretNotes.find(n => n.id === activeNoteId)?.content || ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSecretNotes(notes => notes.map(n => n.id === activeNoteId ? { ...n, content: v } : n));
                      }}
                      placeholder="Write your secure notes, thoughts, or sensitive information here..."
                      className="flex-1 w-full bg-transparent outline-none resize-none text-zinc-800 text-base leading-relaxed placeholder-zinc-300 custom-scrollbar"
                    />
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 space-y-4">
                    <FileText size={48} className="text-zinc-200" />
                    <p>Select or create a new secure note.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Media Area */}
            <div className={`${isSecureMediaExpanded ? 'flex-1' : 'w-full lg:w-96'} order-3 flex flex-col bg-white rounded-3xl p-6 border border-stone-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] min-h-[600px] lg:min-h-0 lg:h-full overflow-hidden transition-all duration-300 gap-6`}>
              
              {/* Top Half: Upload Dropzone */}
              <div className="flex-none bg-zinc-50 border-2 border-dashed border-stone-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-colors hover:bg-zinc-100 relative group">
                <div className="text-zinc-400 mb-2 pointer-events-none group-hover:scale-110 transition-transform">
                  <Upload size={24} />
                </div>
                <h3 className="text-sm font-semibold text-zinc-700 pointer-events-none">Secure Media Upload</h3>
                <p className="text-xs text-zinc-500 mt-1 pointer-events-none">Drag & drop or click to browse</p>
                
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  accept="image/*,video/*" 
                  multiple 
                  onChange={handleSecretUpload} 
                  disabled={isUploadingMedia} 
                />

                {isUploadingMedia && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-2xl">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zinc-800 mb-2"></div>
                    <span className="text-xs font-medium text-zinc-600">{uploadQueueStatus || 'Uploading...'}</span>
                  </div>
                )}
              </div>

              {/* Bottom Half: Privacy Zone Grid */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Vault Gallery</h3>
                    <button 
                      onClick={() => setIsSecureMediaExpanded(!isSecureMediaExpanded)} 
                      className="p-1 hover:bg-zinc-100 rounded text-zinc-400 hover:text-zinc-800 transition-colors"
                      title={isSecureMediaExpanded ? "Collapse panel" : "Expand to full screen"}
                    >
                      <Maximize size={14} className={isSecureMediaExpanded ? "rotate-180 transition-transform" : "transition-transform"} />
                    </button>
                  </div>
                  
                  {/* Eye Privacy Toggle */}
                  <button 
                    onClick={() => setIsMediaBlurred(!isMediaBlurred)}
                    className="flex items-center space-x-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  >
                    {isMediaBlurred ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{isMediaBlurred ? 'Hidden' : 'Visible'}</span>
                  </button>
                </div>

                <div className={`flex-1 overflow-y-auto grid ${isSecureMediaExpanded ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5' : 'grid-cols-2'} gap-4 pr-2 custom-scrollbar content-start transition-all duration-300 ${isMediaBlurred ? 'blur-md hover:blur-sm select-none' : ''}`}>
                  {(isSecureMediaExpanded ? secretMedia : secretMedia.slice(0, 12)).map(media => (
                    <div key={media.id} className="relative group/media rounded-xl overflow-hidden bg-zinc-100 border border-stone-100 aspect-video flex items-center justify-center cursor-pointer shadow-sm hover:shadow-md transition-all" onClick={() => !isMediaBlurred && setPreviewMedia(media)}>
                      {media.type === 'video' ? (
                        <video src={`/api/secret-media/${media.id}`} className="w-full h-full object-cover pointer-events-none" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/secret-media/${media.id}`} alt="Secret Media" className="w-full h-full object-cover pointer-events-none" />
                      )}
                      
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/media:opacity-100 transition-opacity flex flex-col items-center justify-center">
                        <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full text-white mt-4">
                          <Maximize size={20} />
                        </div>
                        <span className="text-white text-xs mt-2 font-medium tracking-wide">EXPAND</span>
                      </div>

                      {media.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover/media:opacity-0 transition-opacity">
                          <div className="bg-black/50 p-2 rounded-full"><Play size={20} className="text-white fill-white" /></div>
                        </div>
                      )}
                      
                      <button 
                        onClick={(e) => handleDeleteSecretMedia(media.id, e)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500/90 text-white rounded-lg opacity-0 group-hover/media:opacity-100 transition-opacity hover:bg-red-600 shadow-sm z-10"
                        title="Delete Secure Media"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  
                  {!isSecureMediaExpanded && secretMedia.length > 12 && (
                    <div className="col-span-2 flex justify-center py-4 border-t border-stone-100/50 mt-2">
                      <button 
                        onClick={() => setIsSecureMediaExpanded(true)}
                        className="text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-600 px-4 py-2 rounded-full transition-colors shadow-sm flex items-center space-x-2"
                      >
                        <span>View All {secretMedia.length} Files</span>
                      </button>
                    </div>
                  )}

                  {secretMedia.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-sm italic col-span-full py-8">
                      No secure media uploaded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          
    


          {/* Media Preview Modal */}
          {previewMedia && (
            <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-200">
              <button onClick={() => setPreviewMedia(null)} className="absolute top-6 right-6 text-zinc-400 hover:text-white p-2">
                <X size={24} />
              </button>
              <div className="max-w-5xl max-h-full w-full h-full flex items-center justify-center">
                {previewMedia.type === 'video' ? (
                  <video src={`/api/secret-media/${previewMedia.id}`} controls autoPlay className="max-w-full max-h-full rounded-lg" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/secret-media/${previewMedia.id}`} alt="Secret Preview" className="max-w-full max-h-full object-contain rounded-lg" />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Expanded Folder Modal */}
      {/* Item Picker Modal */}
    {pickerModal.isOpen && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
         <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-zinc-50/50">
               <div>
                 <h2 className="text-xl font-semibold text-zinc-900">Select Items to Secure</h2>
                 <p className="text-sm text-zinc-500 mt-1">Move items from your dashboard directly into the secret vault.</p>
               </div>
               <button onClick={() => setPickerModal({isOpen: false, targetCategoryId: null})} className="p-2 text-zinc-400 hover:bg-zinc-200 rounded-full transition-colors">
                  <X size={20} />
               </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-[#f9f9fb] custom-scrollbar">
               {publicCategories.every(c => c.items.length === 0) ? (
                 <div className="flex flex-col items-center justify-center h-full text-zinc-400 py-12">
                    <Folder size={48} className="mb-4 opacity-20" />
                    <p>No dashboard items found.</p>
                 </div>
               ) : (
                 <div className="space-y-8">
                    {publicCategories.filter(c => c.items.length > 0).map(cat => (
                      <div key={cat.id}>
                         <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4 flex items-center"><Folder size={14} className="mr-2"/>{cat.name}</h3>
                         <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {cat.items.map(item => {
                               const isSelected = pickerSelectedIds.has(item.id);
                               return (
                                 <div 
                                   key={item.id} 
                                   onClick={() => togglePickerSelection(item.id)}
                                   className={`relative group rounded-xl overflow-hidden aspect-square border-2 cursor-pointer transition-all ${isSelected ? 'border-zinc-800 shadow-md scale-[0.98]' : 'border-transparent hover:border-zinc-300'}`}
                                 >
                                    <div className="absolute inset-0 bg-zinc-100 flex items-center justify-center">
                                       {item.platform === 'video' ? (
                                         <video src={item.url} className="w-full h-full object-cover pointer-events-none" />
                                       ) : item.platform === 'image' || item.thumbnailUrl ? (
                                         <img src={item.thumbnailUrl || item.url} alt="" className="w-full h-full object-cover pointer-events-none" />
                                       ) : item.platform === 'link' ? (
                                         <Globe size={32} className="text-zinc-300 mb-2"/>
                                       ) : (
                                         <FileText size={32} className="text-zinc-300 mb-2"/>
                                       )}
                                    </div>
                                    
                                    {/* Checkbox Overlay */}
                                    <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-zinc-800 border-zinc-800' : 'bg-white/80 border-zinc-300 group-hover:border-zinc-400'}`}>
                                       {isSelected && <Check size={14} className="text-white" />}
                                    </div>
                                    
                                    {/* Title Overlay */}
                                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-8">
                                       <div className="text-xs font-medium text-white truncate drop-shadow-md">{item.title}</div>
                                    </div>
                                 </div>
                               )
                            })}
                         </div>
                      </div>
                    ))}
                 </div>
               )}
            </div>
            
            <div className="p-4 border-t border-stone-100 flex justify-between items-center bg-white shrink-0">
               <div className="text-sm font-medium text-zinc-600">
                 <span className="text-zinc-900 font-bold">{pickerSelectedIds.size}</span> item{pickerSelectedIds.size !== 1 ? 's' : ''} selected
               </div>
               <div className="flex space-x-3">
                 <button onClick={() => setPickerModal({isOpen: false, targetCategoryId: null})} className="px-5 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">
                    Cancel
                 </button>
                 <button 
                   onClick={handleConfirmMove} 
                   disabled={pickerSelectedIds.size === 0 || isMovingItems}
                   className="px-5 py-2 text-sm font-medium text-white bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center space-x-2"
                 >
                   {isMovingItems && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                   <span>Move to Vault</span>
                 </button>
               </div>
            </div>
         </div>
      </div>
    )}
      {expandedFolderModal && (
        <div className="fixed inset-0 z-[60] bg-zinc-50 flex flex-col animate-in fade-in duration-200">
          <div className="flex justify-between items-center px-8 py-4 bg-white border-b border-stone-200 shadow-sm shrink-0">
            <div className="flex items-center space-x-3 text-zinc-800">
              <Folder size={20} className="text-zinc-500" />
              <h2 className="text-xl font-medium tracking-tight">{expandedFolderModal.name}</h2>
              <span className="text-xs font-medium text-zinc-400 bg-zinc-50 px-3 py-1 rounded-full border border-stone-100">
                {expandedFolderModal.items.length} items
              </span>
            </div>
            <button 
              onClick={() => setExpandedFolderModal(null)}
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
            >
              <X size={16} /> <span>Close (Esc)</span>
            </button>
          </div>
          
          <div className="flex-1 w-full mx-auto p-8 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {expandedFolderModal.items.map((item) => (
                <div key={item.id} className="group relative flex flex-col rounded-2xl overflow-hidden border border-stone-100 bg-white hover:shadow-md transition-all h-full">
                  {/* Platform Badge */}
                  <div className="absolute top-2 left-2 z-10 p-1.5 bg-white/90 backdrop-blur border border-stone-200 rounded-lg shadow-sm pointer-events-none">
                    {item.platform === 'youtube' ? <Play size={14} className="text-red-500" /> : 
                     item.platform === 'instagram' ? <Camera size={14} className="text-pink-500" /> : 
                     item.platform === 'image' ? <ImageIcon size={14} className="text-zinc-500" /> : 
                     item.platform === 'pdf' ? <FileText size={14} className="text-red-400" /> : 
                     item.platform === 'code' ? <Code size={14} className="text-blue-500" /> : 
                     item.platform === 'archive' ? <Archive size={14} className="text-orange-400" /> : 
                     item.platform === 'file' ? <File size={14} className="text-zinc-500" /> : 
                     <Globe size={14} className="text-zinc-500" />}
                  </div>

                  {/* Delete Icon on Hover */}
                  <button 
                    onClick={() => handleDelete(item.id, expandedFolderModal.id)}
                    className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur border border-stone-200 rounded-lg text-zinc-400 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all z-10"
                    title="Delete Item"
                  >
                    <Trash2 size={14} />
                  </button>

                  {/* Clickable Image */}
                  <a href={item.url} onClick={item.isLocal && item.platform !== 'image' && item.platform !== 'pdf' ? (e) => handleDownload(e, item.url, item.title) : undefined} target={item.isLocal && item.platform !== 'image' && item.platform !== 'pdf' ? undefined : "_blank"} rel="noopener noreferrer" className="block relative w-full shrink-0 overflow-hidden bg-zinc-200 group/img aspect-video" download={item.isLocal ? item.title : undefined}>
                    {item.thumbnailUrl ? (
                      <img 
                        src={item.thumbnailUrl} 
                        alt={item.title} 
                        className={`w-full h-full group-hover/img:scale-105 transition-transform duration-500 ${item.thumbnailUrl.includes('s2/favicons') ? 'object-contain p-4 bg-zinc-50' : 'object-cover'}`} 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-100 text-zinc-300">
                         {item.platform === 'pdf' ? <FileText size={32} /> : 
                          item.platform === 'code' ? <Code size={32} /> : 
                          item.platform === 'archive' ? <Archive size={32} /> : 
                          item.isLocal ? <File size={32} /> : 
                          <ImageIcon size={32} />}
                         {item.isLocal && <span className="mt-2 text-xs font-medium text-zinc-400 uppercase tracking-wider">{item.fileType || 'FILE'}</span>}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/5 transition-colors"></div>
                  </a>

                  <div className="p-3 flex flex-col flex-1">
                    {/* Clickable Title */}
                    <button 
                      onClick={(e) => toggleExpand(e, item.id)}
                      className={`text-sm font-medium text-zinc-700 hover:text-black mb-2 text-left flex-1 ${expandedItems.has(item.id) ? '' : 'line-clamp-2 min-h-[40px]'}`}
                      title={expandedItems.has(item.id) ? "Click to collapse" : "Click to expand full title"}
                    >
                      {item.title}
                    </button>
                    
                    {/* Move Item Menu */}
                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-stone-100/50 relative group/dropdown">
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold flex items-center space-x-1 truncate max-w-[50%]">
                        {item.isLocal ? (
                          <>
                            <span>{item.platform}</span>
                            {item.fileSize && <span> • {(item.fileSize / 1024 / 1024).toFixed(1)} MB</span>}
                          </>
                        ) : (
                          item.platform === 'youtube' ? 'Video' : item.platform === 'instagram' ? 'Post' : item.platform === 'image' ? 'Image' : 'Website'
                        )}
                      </span>
                      
                      <div className="relative flex items-center justify-end gap-1.5 shrink-0 ml-1">
                        {item.isLocal && (
                          <a href={item.url} onClick={(e) => handleDownload(e, item.url, item.title)} download={item.title} className="text-xs font-medium bg-zinc-800 text-white hover:bg-zinc-700 py-1 px-2.5 rounded-md shadow-sm transition-all inline-flex items-center shrink-0">
                            <Download size={12} />
                          </a>
                        )}
                        <button 
                          onClick={(e) => { e.stopPropagation(); setOpenDropdownId(openDropdownId === item.id ? null : item.id); }}
                          className="text-xs font-medium bg-white border border-stone-200 text-zinc-600 hover:text-zinc-900 hover:border-stone-300 py-1 px-2.5 rounded-md shadow-sm transition-all inline-flex items-center space-x-1 shrink-0"
                        >
                          <span>Move to</span>
                        </button>
                        
                        {/* Dropdown Menu */}
                        <div className={`absolute right-0 bottom-full mb-1 w-40 bg-white border border-stone-200 rounded-xl shadow-lg transition-all z-50 overflow-hidden flex flex-col py-1 ${openDropdownId === item.id ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
                          <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold px-3 py-1.5 border-b border-stone-50 mb-1">
                            Select Folder
                          </span>
                          {(() => {
                            const available = categories.filter(c => c.id !== expandedFolderModal.id);
                            if (available.length === 0) {
                              return <span className="text-xs text-zinc-400 px-3 py-2 italic">No other folders</span>;
                            }
                            return available.map(c => (
                              <button 
                                key={c.id} 
                                onClick={() => {
                                  setOpenDropdownId(null);
                                  handleCategoryChange(item.id, c.id);
                                  // Update modal state so it disappears from the grid immediately
                                  setExpandedFolderModal(prev => prev ? { ...prev, items: prev.items.filter(i => i.id !== item.id) } : null);
                                }}
                                className="text-xs text-left px-3 py-2 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors truncate flex justify-between items-center"
                              >
                                <span>{c.name}</span>
                                {c.isSecret && <Lock size={10} className="text-zinc-400" />}
                              </button>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
