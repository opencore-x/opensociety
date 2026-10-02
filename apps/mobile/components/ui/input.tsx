import * as React from 'react'
import { TextInput } from 'react-native'

import { cn } from '../../lib/utils'

function Input({ className, ...props }: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor="#64736B"
      selectionColor="#234F40"
      className={cn(
        'min-h-13 w-full rounded-md border border-input bg-card px-4 py-3 text-base text-foreground focus:border-primary',
        props.editable === false && 'opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
