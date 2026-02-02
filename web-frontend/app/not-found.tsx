'use client'

import { Box, Heading, Text, Button, useColorModeValue } from '@chakra-ui/react'
import Link from 'next/link'

export default function NotFound() {
  const bg = useColorModeValue('gray.50', 'gray.900')
  const textColor = useColorModeValue('gray.800', 'white')
  const subtextColor = useColorModeValue('gray.600', 'gray.400')

  return (
    <Box 
      minH="100vh" 
      display="flex" 
      alignItems="center" 
      justifyContent="center" 
      bg={bg}
    >
      <Box textAlign="center">
        <Heading 
          as="h1" 
          size="4xl" 
          color={textColor}
          mb={4}
        >
          404
        </Heading>
        <Text 
          fontSize="xl" 
          color={subtextColor}
          mb={8}
        >
          Page non trouvée
        </Text>
        <Button 
          as={Link} 
          href="/dashboard"
          colorScheme="blue"
          size="lg"
        >
          Retour au tableau de bord
        </Button>
      </Box>
    </Box>
  )
}