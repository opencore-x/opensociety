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
        accessibilityState={{ selected: !!selected, ...props.accessibilityState }}
        className={cn(
          'min-h-11 items-center justify-center rounded-full border px-4 py-2.5 active:opacity-75',
          selected ? 'border-primary bg-primary' : 'border-input bg-background',
          className,
        )}
        {...props}
      >
        <Text>{label}</Text>
      </Pressable>
    </TextClassContext.Provider>
  )
}

export { Chip }
