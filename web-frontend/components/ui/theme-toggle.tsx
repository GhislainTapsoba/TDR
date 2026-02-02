'use client'

import { IconButton } from '@chakra-ui/react'

export function ThemeToggle() {
  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark')
  }

  return (
    <IconButton
      aria-label="Toggle theme"
      onClick={toggleTheme}
      variant="ghost"
      size="md"
    >
      🌙
    </IconButton>
  )
}