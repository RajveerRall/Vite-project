import React from 'react';
import { Toast } from '../../context/ToastContext';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

export const ToastComponent: React.FC<ToastProps> = ({ toast, onRemove }) => {
  
  const getToastStyles = () => {
    switch (toast.type) {
      case 'error':
        return {
          container: 'bg-red-50 border-2 border-red-200',
          text: 'text-red-900',
          icon: 'text-red-600',
          close: 'text-red-400 hover:text-red-600'
        };
      case 'success':
        return {
          container: 'bg-green-50 border-2 border-green-200',
          text: 'text-green-900',
          icon: 'text-green-600',
          close: 'text-green-400 hover:text-green-600'
        };
      case 'info':
      default:
        return {
          container: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200',
          text: 'text-gray-900',
          icon: 'text-blue-600',
          close: 'text-gray-400 hover:text-gray-600'
        };
    }
  };

  const getIcon = () => {
    const styles = getToastStyles();
    switch (toast.type) {
      case 'error':
        return <XCircle className={`w-5 h-5 ${styles.icon}`} />;
      case 'success':
        return <CheckCircle2 className={`w-5 h-5 ${styles.icon}`} />;
      case 'info':
      default:
        return <Info className={`w-5 h-5 ${styles.icon}`} />;
    }
  };

  const styles = getToastStyles();

  return (
    <div
      className={`max-w-sm w-full rounded-lg shadow-xl ${styles.container} p-4 transform transition-all duration-300 ease-in-out`}
      style={{
        animation: 'slideInRight 0.3s ease-out',
      }}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${styles.text}`}>{toast.message}</p>
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={() => onRemove(toast.id)}
            className={`inline-flex ${styles.close} focus:outline-none transition ease-in-out duration-150`}
          >
            <span className="sr-only">Close</span>
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};
