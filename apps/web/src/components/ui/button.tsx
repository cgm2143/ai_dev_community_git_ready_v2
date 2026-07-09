import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/**
 * 5단계 UI 디자인 원칙: Primary 버튼(보라 채움)은 화면당 1개만 - 핵심 액션("글쓰기" 등)에만 사용하고
 * 나머지는 outline/ghost를 쓴다. 이 원칙은 컴포넌트가 강제할 수 없으므로 사용하는 쪽에서 지켜야 한다.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent-primary-strong text-white hover:opacity-90',
        outline: 'border border-border-hairline bg-bg-surface text-text-primary hover:bg-bg-surface-muted',
        ghost: 'text-text-secondary hover:bg-bg-surface-muted hover:text-text-primary',
        danger: 'bg-accent-danger text-white hover:opacity-90',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-9 px-4',
        lg: 'h-11 px-6 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'outline',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
