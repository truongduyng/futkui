import Toast from 'react-native-toast-message';

export interface ToastOptions {
  type?: 'success' | 'error' | 'info';
  title: string;
  message?: string;
  duration?: number;
  position?: 'top' | 'bottom';
}

export const useToast = () => {
  const showToast = ({ 
    type = 'info', 
    title, 
    message, 
    duration = 3000,
    position = 'top'
  }: ToastOptions) => {
    Toast.show({
      type,
      text1: title,
      text2: message,
      visibilityTime: duration,
      position,
    });
  };

  const showSuccess = (title: string, message?: string) => {
    showToast({ type: 'success', title, message });
  };

  const showError = (title: string, message?: string) => {
    showToast({ type: 'error', title, message });
  };

  const showInfo = (title: string, message?: string) => {
    showToast({ type: 'info', title, message });
  };

  return {
    showToast,
    showSuccess,
    showError,
    showInfo,
  };
};