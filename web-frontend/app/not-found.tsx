'use client'

import { Box, Heading, Text, Button } from '@chakra-ui/react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <Box 
      minH="100vh" 
      display="flex" 
      alignItems="center" 
      justifyContent="center"
      textAlign="center"
      p={6}
    >
      <Box>
        <Heading size="4xl" mb={4}>
          404
        </Heading>
        <Text fontSize="xl" mb={6}>
          Page non trouvée
        </Text>
        <Button as={Link} href="/dashboard" colorScheme="blue">
          Retour au tableau de bord
        </Button>
      </Box>
    </Box>
  )
}