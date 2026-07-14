import * as React from 'react'
import { Text as RNText } from 'react-native'

import { cn } from '../../lib/utils'

/** Lets a parent (e.g. Button, Card) push text classes down to nested <Text>. */
const TextClassContext = React.createContext<string | undefined>(undefined)

function Text({ className, ...props }: React.ComponentProps<typeof RNText>) {
  const contextClass = React.useContext(TextClassContext)
  return <RNText className={cn('text-foreground text-base', contextClass, className)} {...props} />
}

export { Text, TextClassContext }
