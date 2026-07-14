import * as React from 'react'
import { TextInput } from 'react-native'

import { cn } from '../../lib/utils'

function Input({
  className,
  ...props
}: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor="rgb(113,113,122)"
      className={cn(
        'h-10 w-full rounded-md border border-input bg-background px-3 text-base text-foreground',
        props.editable === false && 'opacity-50',
        className
      )}
      {...props}
    />
  )
}

export { Input }
