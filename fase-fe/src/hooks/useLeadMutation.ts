import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '../components/common/Toaster'
import { errorMessage } from '../services/api/errorMessage'
import { leadKeys } from '../services/api/leadApi'
import { notificationKeys } from '../services/api/notificationApi'

/** Mutation trên LEAD: lỗi hiện toast, xong thì làm mới mọi danh sách LEAD. */
export function useLeadMutation<TInput, TResult>(
  mutationFn: (input: TInput) => Promise<TResult>,
  onSuccess?: (result: TResult) => void,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: leadKeys.all })
      void queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      onSuccess?.(result)
    },
    onError: (error) => toast(errorMessage(error), 'error'),
  })
}
