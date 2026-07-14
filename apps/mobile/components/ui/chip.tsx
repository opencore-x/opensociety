import * as React from 'react'
import { Pressable } from 'react-native'

import { cn } from '../../lib/utils'
import { Text, TextClassContext } from './text'

/** Selectable pill used by filter/type selectors across screens. */
function Chip({
  label,
  selected,
  className,
  ...props
}: React.ComponentProps<typeof Pressable> & { label: string; selected?: boolean }) {
  return (
    <TextClassContext.Provider
      value={cn('text-sm font-medium', selected ? 'text-primary-foreground' : 'text-foreground')}
    >
      <Pressable
        role="button"
        className={cn(
          'rounded-full border px-3 py-2 active:opacity-90',
          selected ? 'border-primary bg-primary' : 'border-input bg-background',
          className
        )}
        {...props}
      >
        <Text>{label}</Text>
      </Pressable>
    </TextClassContext.Provider>
  )
}

export { Chip }
