import { useState, useCallback } from 'react';
import { ToastMessage, ToastType } from '../components/Toast';

let toastId = 0;

const generateId = () => {
  toastId += 1;
  return `toast-${toastId}`;
};

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((
    type: ToastType,
    title: string,
    message?: string,
    options?: {
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    }
  ) => {
    const id = generateId();
    const toast: ToastMessage = {
      id,
      type,
      title,
      message,
      duration: options?.duration ?? (type === 'error' ? 0 : 5000), // Error toasts don't auto-dismiss
      action: options?.action
    };

    setToasts(prev => [...prev, toast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((title: string, message?: string, options?: { duration?: number }) => {
    return addToast('success', title, message, options);
  }, [addToast]);

  const error = useCallback((title: string, message?: string, options?: { 
    duration?: number;
    action?: { label: string; onClick: () => void };
  }) => {
    return addToast('error', title, message, options);
  }, [addToast]);

  const warning = useCallback((title: string, message?: string, options?: { duration?: number }) => {
    return addToast('warning', title, message, options);
  }, [addToast]);

  const info = useCallback((title: string, message?: string, options?: { duration?: number }) => {
    return addToast('info', title, message, options);
  }, [addToast]);

  // API error handler
  const handleApiError = useCallback((error: any, context?: string) => {
    let title = 'API Hatası';
    let message = 'Bilinmeyen bir hata oluştu';

    if (context) {
      title = `${context} Hatası`;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        message = 'İstek zaman aşımına uğradı';
      } else if (error.message.includes('Failed to fetch')) {
        message = 'Ağ bağlantısı hatası. İnternet bağlantınızı kontrol edin.';
      } else if (error.message.includes('429')) {
        message = 'Çok fazla istek gönderildi. Lütfen bekleyin.';
      } else if (error.message.includes('500')) {
        message = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
      } else {
        message = error.message;
      }
    } else if (typeof error === 'string') {
      message = error;
    }

    return addToast('error', title, message, {
      action: {
        label: 'Tekrar Dene',
        onClick: () => window.location.reload()
      }
    });
  }, [addToast]);

  // Network status handler
  const handleNetworkStatus = useCallback((isOnline: boolean) => {
    if (isOnline) {
      success('Bağlantı Restored', 'İnternet bağlantınız yeniden kuruldu.');
    } else {
      error('Bağlantı Kesildi', 'İnternet bağlantınız kesildi. Lütfen bağlantınızı kontrol edin.', {
        duration: 0 // Don't auto-dismiss
      });
    }
  }, [success, error]);

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
    handleApiError,
    handleNetworkStatus
  };
};

export default useToast;