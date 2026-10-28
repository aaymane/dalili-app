import { useMutation } from '@tanstack/react-query';

import { sendReport, type ReportReason, type ReportTarget } from './api';

export function useSendReport() {
  return useMutation({
    mutationFn: ({ target, reason, comment }: { target: ReportTarget; reason: ReportReason; comment: string }) => sendReport(target, reason, comment),
  });
}
