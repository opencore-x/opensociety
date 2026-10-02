import * as React from 'react'
import { Text as RNText, useWindowDimensions } from 'react-native'

import { cn } from '../../lib/utils'

/** Lets a parent (e.g. Button, Card) push text classes down to nested <Text>. */
const TextClassContext = React.createContext<string | undefined>(undefined)

function Text({ className, ...props }: React.ComponentProps<typeof RNText>) {
  const contextClass = React.useContext(TextClassContext)
  // Remeasure native text after a Dynamic Type change, including its line breaks.
  const { fontScale } = useWindowDimensions()
  return (
    <RNText
      key={fontScale}
      className={cn('text-foreground text-base', contextClass, className)}
      {...props}
    />
  )
}

export { Text, TextClassContext }
