import { toast } from '@/hooks/useToast';

export const showSuccessToast = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: 'success',
  });
};

export const showErrorToast = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: 'destructive',
  });
};

export const showInfoToast = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: 'info',
  });
};

export const showWarningToast = (title: string, description?: string) => {
  toast({
    title,
    description,
    variant: 'destructive',
  });
};

export const getErrorMessage = (error: any): string => {
  if (typeof error?.message === 'string') {
    return error.message;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  return 'Coś poszło nie tak';
};
