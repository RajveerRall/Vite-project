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
          container: 'bg-red-50 border-2 border-red-400 shadow-lg',
          text: 'text-red-900',
          icon: 'text-red-600',
          close: 'text-red-400 hover:text-red-600'
        };
      case 'success':
        return {
          container: 'bg-green-50 border-2 border-green-400 shadow-lg',
          text: 'text-green-900',
          icon: 'text-green-600',
          close: 'text-green-400 hover:text-green-600'
        };
      case 'info':
      default:
        return {
          container: 'bg-amber-50 border-2 border-amber-400 shadow-lg',
          text: 'text-amber-900',
          icon: 'text-amber-600',
          close: 'text-amber-500 hover:text-amber-700'
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
      className={`max-w-sm w-full rounded-lg ${styles.container} p-4 transform transition-all duration-300 ease-in-out backdrop-blur-sm`}
      style={{
        animation: 'slideInRight 0.3s ease-out',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium leading-relaxed ${styles.text}`}>{toast.message}</p>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={() => onRemove(toast.id)}
            className={`inline-flex ${styles.close} focus:outline-none transition ease-in-out duration-150 rounded p-1 hover:bg-opacity-10 hover:bg-current`}
            aria-label="Close notification"
          >
            <span className="sr-only">Close</span>
            <X className="h-4 w-4" />
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
    <div className="fixed top-36 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
};
