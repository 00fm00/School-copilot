import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { loginUser, logoutUser, getMe } from '../auth';
import { queryKeys } from '../keys';
import { authStore } from '../../lib/auth-store';
import { LoginInput } from '@school-copilot/shared';

export function useMe() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: getMe,
    enabled: authStore.isAuthenticated(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (credentials: LoginInput) => loginUser(credentials),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth.me, data.user);
      navigate({ to: '/chat' });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      queryClient.clear();
      navigate({ to: '/login' });
    },
  });
}
