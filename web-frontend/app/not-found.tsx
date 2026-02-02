'use client'

import { Box, Heading, Text, Button } from '@chakra-ui/react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <Box textAlign="center" py={10} px={6}>
      <Heading as="h2" size="2xl" mb={2}>
        404
      </Heading>
      <Text fontSize="18px" mt={3} mb={2}>
        Page Non Trouvée
      </Text>
      <Text color="gray.500" mb={6}>
        La page que vous recherchez n'existe pas
      </Text>
      <Button as={Link} href="/dashboard" colorPalette="blue">
        Retour au tableau de bord
      </Button>
    </Box>
  )
}