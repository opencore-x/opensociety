import * as React from 'react'
import { ScrollView, View } from 'react-native'

import { Button } from '../components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'

export default function UiDemo() {
  const [flat, setFlat] = React.useState('')

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-6 p-6">
      <View className="gap-1">
        <Text className="text-3xl font-bold">Design system</Text>
        <Text className="text-muted-foreground">
          react-native-reusables · NativeWind v5 · Expo SDK 57
        </Text>
      </View>

      <Card>
        <CardHeader>
          <CardTitle>Flat 4B-207</CardTitle>
          <CardDescription>Pre-approve a visitor for the gate</CardDescription>
        </CardHeader>
        <CardContent className="gap-3">
          <Text className="text-sm font-medium">Flat number</Text>
          <Input value={flat} onChangeText={setFlat} placeholder="e.g. 4B-207" />
        </CardContent>
        <CardFooter className="gap-3">
          <Button className="flex-1">
            <Text>Approve</Text>
          </Button>
          <Button variant="outline" className="flex-1">
            <Text>Cancel</Text>
          </Button>
        </CardFooter>
      </Card>

      <View className="gap-3">
        <Text className="text-lg font-semibold">Button variants</Text>
        <View className="flex-row flex-wrap gap-3">
          <Button>
            <Text>Default</Text>
          </Button>
          <Button variant="secondary">
            <Text>Secondary</Text>
          </Button>
          <Button variant="destructive">
            <Text>Destructive</Text>
          </Button>
          <Button variant="outline">
            <Text>Outline</Text>
          </Button>
          <Button variant="ghost">
            <Text>Ghost</Text>
          </Button>
        </View>
      </View>
    </ScrollView>
  )
}
