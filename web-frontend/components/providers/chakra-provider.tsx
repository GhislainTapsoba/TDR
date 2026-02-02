'use client'

import { ChakraProvider } from '@chakra-ui/react'

export function ChakraUIProvider({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider resetCSS={false}>
      {children}
    </ChakraProvider>
  )
}