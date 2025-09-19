import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
      <div className="flex items-center space-x-3">
        <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
        <div>
          <h3 className="text-lg font-medium text-red-800">Hata Oluştu</h3>
          <p className="text-red-700 mt-1">{message}</p>
          {onRetry && (
            <button 
              onClick={onRetry}
              className="mt-3 text-sm text-red-600 hover:text-red-800 underline"
            >
              Tekrar dene
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorMessage;