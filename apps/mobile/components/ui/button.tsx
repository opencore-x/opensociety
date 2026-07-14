import * as React from 'react'
import { Pressable } from 'react-native'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '../../lib/utils'
import { TextClassContext } from './text'

const buttonVariants = cva(
  'flex flex-row items-center justify-center gap-2 rounded-md active:opacity-90',
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
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

const buttonTextVariants = cva('text-sm font-medium', {
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

function Button({ className, variant, size, disabled, ...props }: ButtonProps) {
  return (
    <TextClassContext.Provider value={buttonTextVariants({ variant })}>
      <Pressable
        role="button"
        disabled={disabled}
        className={cn(buttonVariants({ variant, size }), disabled && 'opacity-50', className)}
        {...props}
      />
    </TextClassContext.Provider>
  )
}

export { Button, buttonTextVariants, buttonVariants }
export type { ButtonProps }
