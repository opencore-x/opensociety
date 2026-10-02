import * as React from 'react'
import { Pressable } from 'react-native'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'
import { TextClassContext } from './text'

const buttonVariants = cva(
  'flex flex-row items-center justify-center gap-2 rounded-md active:opacity-75',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        destructive: 'bg-destructive',
        outline: 'border border-input bg-background',
        secondary: 'bg-secondary',
        ghost: '',
        link: '',
      },
      size: {
        default: 'min-h-[48px] px-5 py-3',
        sm: 'min-h-[44px] rounded-md px-4 py-2.5',
        lg: 'min-h-[56px] rounded-lg px-6 py-4',
        icon: 'h-[48px] w-[48px]',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

const buttonTextVariants = cva('shrink text-center text-sm font-semibold', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      destructive: 'text-white',
      outline: 'text-foreground',
      secondary: 'text-secondary-foreground',
      ghost: 'text-foreground',
      link: 'text-primary underline',
    },
  },
  defaultVariants: { variant: 'default' },
})

type ButtonProps = React.ComponentProps<typeof Pressable> & VariantProps<typeof buttonVariants>

function Button({ className, variant, size, disabled, accessibilityState, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant })}>
      <Pressable
        role="button"
        disabled={disabled}
        accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
        className={cn(buttonVariants({ variant, size }), disabled && 'opacity-50', className)}
        {...props}
      />
    </TextClassContext.Provider>
  )
}

export { Button, buttonTextVariants, buttonVariants }
export type { ButtonProps }
