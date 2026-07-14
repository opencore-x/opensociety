import * as React from 'react'
import { View } from 'react-native'

import { cn } from '../../lib/utils'
import { Text, TextClassContext } from './text'

function Card({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('rounded-xl border border-border bg-card', className)} {...props} />
}

function CardHeader({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<typeof Text>) {
  return (
    <Text
      role="heading"
      className={cn('text-card-foreground text-2xl font-semibold', className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<typeof Text>) {
  return <Text className={cn('text-muted-foreground text-sm', className)} {...props} />
}

function CardContent({ className, ...props }: React.ComponentProps<typeof View>) {
  return (
    <TextClassContext.Provider value="text-card-foreground">
      <View className={cn('p-6 pt-0', className)} {...props} />
    </TextClassContext.Provider>
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<typeof View>) {
  return <View className={cn('flex flex-row items-center p-6 pt-0', className)} {...props} />
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
