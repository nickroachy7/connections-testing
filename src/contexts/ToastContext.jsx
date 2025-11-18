import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const success = useCallback((message, duration) => addToast(message, 'success', duration), [addToast]);
  const error = useCallback((message, duration) => addToast(message, 'error', duration), [addToast]);
  const info = useCallback((message, duration) => addToast(message, 'info', duration), [addToast]);
  const warning = useCallback((message, duration) => addToast(message, 'warning', duration), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function Toast({ toast, onClose }) {
  const typeStyles = {
    success: 'bg-gradient-to-r from-primary-green-500/90 to-primary-green-600/90 shadow-glow-green',
    error: 'bg-gradient-to-r from-red-500/90 to-red-600/90 shadow-glow-red',
    warning: 'bg-gradient-to-r from-accent-orange-500/90 to-accent-orange-600/90 shadow-glow-orange',
    info: 'bg-gradient-to-r from-blue-500/90 to-blue-600/90'
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div className={`${typeStyles[toast.type]} backdrop-blur-sm rounded-xl p-4 shadow-xl animate-slide-up flex items-start gap-3`}>
      <span className="text-2xl flex-shrink-0">{icons[toast.type]}</span>
      <p className="text-white font-dk text-sm flex-1">{toast.message}</p>
      <button
        onClick={onClose}
        className="text-white/80 hover:text-white transition-colors flex-shrink-0 text-xl leading-none"
      >
        ×
      </button>
    </div>
  );
}
