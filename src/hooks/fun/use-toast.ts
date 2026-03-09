// Adapter: fun-proposals uses shadcn-style toast({ title, description, variant })
// but the app uses sonner. This bridges the two APIs.
import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function toast(opts: ToastOptions | string) {
  if (typeof opts === 'string') {
    sonnerToast(opts);
    return;
  }

  const message = opts.title || '';
  const desc = opts.description;

  if (opts.variant === 'destructive') {
    sonnerToast.error(message, { description: desc });
  } else {
    sonnerToast.success(message, { description: desc });
  }
}
