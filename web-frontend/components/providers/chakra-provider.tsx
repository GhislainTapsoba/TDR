'use client'

import { ChakraProvider, extendTheme, ColorModeScript } from '@chakra-ui/react'
import { ColorModeProvider } from '@chakra-ui/color-mode'

const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
})

export function ChakraUIProvider({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider theme={theme} resetCSS={false}>
      {children}
    </ChakraProvider>
  )
}