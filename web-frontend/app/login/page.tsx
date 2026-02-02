"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import {
  Box,
  Button,
  Input,
  VStack,
  HStack,
  Text,
  Image,
  Alert,
  InputGroup,
  IconButton,
  Card,
  CardBody,
  Heading,
  Link as ChakraLink,
  Spinner
} from '@chakra-ui/react'
import { ViewIcon, ViewOffIcon, EmailIcon, LockIcon } from '@chakra-ui/icons'
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion")
      setLoading(false);
    }
  }

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={4}>
      <Card maxW="md" w="full" bg="gray.800" borderColor="gray.700">
        <CardBody p={8}>
          <VStack spacing={6}>
            <Box>
              <Image src="/logo.png" alt="Team Project" boxSize="60px" mx="auto" mb={4} />
              <Heading size="lg" textAlign="center" color="white">Connexion</Heading>
              <Text textAlign="center" color="gray.400" mt={2}>Accédez à votre espace</Text>
            </Box>

            <Box as="form" onSubmit={handleSubmit} w="full">
              <VStack spacing={4}>
                {error && (
                  <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    {error}
                  </Alert>
                )}

                <FormControl isRequired>
                  <FormLabel color="gray.300">Email</FormLabel>
                  <InputGroup>
                    <InputLeftElement>
                      <EmailIcon color="gray.400" />
                    </InputLeftElement>
                    <Input
                      type="email"
                      placeholder="votre@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      bg="gray.700"
                      border="1px solid"
                      borderColor="gray.600"
                      color="white"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px #3182ce' }}
                    />
                  </InputGroup>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel color="gray.300">Mot de passe</FormLabel>
                  <InputGroup>
                    <InputLeftElement>
                      <LockIcon color="gray.400" />
                    </InputLeftElement>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      bg="gray.700"
                      border="1px solid"
                      borderColor="gray.600"
                      color="white"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{ borderColor: 'blue.400', boxShadow: '0 0 0 1px #3182ce' }}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={showPassword ? "Masquer" : "Afficher"}
                        icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                        onClick={() => setShowPassword(!showPassword)}
                        variant="ghost"
                        size="sm"
                        color="gray.400"
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="blue"
                  size="lg"
                  w="full"
                  isLoading={loading}
                  loadingText="Connexion..."
                  spinner={<Spinner size="sm" />}
                >
                  Se connecter
                </Button>
              </VStack>
            </Box>

            <Text fontSize="sm" color="gray.400">
              Pas encore de compte?{" "}
              <ChakraLink as={Link} href="/register" color="blue.400" _hover={{ color: 'blue.300' }}>
                S'inscrire
              </ChakraLink>
            </Text>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  )
}
