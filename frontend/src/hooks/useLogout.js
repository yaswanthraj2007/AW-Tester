import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../context/useAuth';
import useToast from '../context/useToast';

// Goes to the landing page first, so the route guard doesn't bounce us to /login
export default function useLogout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  return useCallback(async () => {
    navigate('/', { replace: true });
    await logout();
    toast.success('You have been logged out.');
  }, [logout, navigate, toast]);
}