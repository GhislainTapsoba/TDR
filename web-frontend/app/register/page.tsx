"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Box,
  Button,
  Input,
  FormControl,
  FormLabel,
  VStack,
  Text,
  Image,
  Alert,
  AlertIcon,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  Card,
  CardBody,
  Heading,
  Link as ChakraLink,
  Spinner
} from '@chakra-ui/react'
import { ViewIcon, ViewOffIcon, EmailIcon, LockIcon } from '@chakra-ui/icons'
import { AtSignIcon } from '@chakra-ui/icons'
import axios from 'axios'
import Link from "next/link"

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.")
      return
    }

    setLoading(true)

    try {
      const response = await axios.post('/api/auth/register', {
        name,
        email,
        password,
      });

      if (response.status === 201) {
        setSuccess("Inscription réussie ! Redirection...")
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response) {
        setError(err.response.data.error || "Erreur lors de l'inscription.");
      } else {
        setError("Une erreur inattendue s'est produite.");
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" p={4}>
      <Card maxW="md" w="full" bg="gray.800" borderColor="gray.700">
        <CardBody p={8}>
          <VStack spacing={6}>
            <Box>
              <Image src="/logo.png" alt="Team Project" boxSize="60px" mx="auto" mb={4} />
              <Heading size="lg" textAlign="center" color="white">Créer un compte</Heading>
              <Text textAlign="center" color="gray.400" mt={2}>Rejoignez la plateforme</Text>
            </Box>

            <Box as="form" onSubmit={handleSubmit} w="full">
              <VStack spacing={4}>
                {error && (
                  <Alert status="error" borderRadius="md">
                    <AlertIcon />
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert status="success" borderRadius="md">
                    <AlertIcon />
                    {success}
                  </Alert>
                )}

                <FormControl isRequired>
                  <FormLabel color="gray.300">Nom complet</FormLabel>
                  <InputGroup>
                    <InputLeftElement>
                      <AtSignIcon color="gray.400" />
                    </InputLeftElement>
                    <Input
                      placeholder="Votre nom"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      bg="gray.700"
                      borderColor="gray.600"
                      color="white"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{ borderColor: 'blue.400' }}
                    />
                  </InputGroup>
                </FormControl>

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
                      borderColor="gray.600"
                      color="white"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{ borderColor: 'blue.400' }}
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
                      borderColor="gray.600"
                      color="white"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{ borderColor: 'blue.400' }}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label="Toggle password"
                        icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                        onClick={() => setShowPassword(!showPassword)}
                        variant="ghost"
                        size="sm"
                        color="gray.400"
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel color="gray.300">Confirmer le mot de passe</FormLabel>
                  <InputGroup>
                    <InputLeftElement>
                      <LockIcon color="gray.400" />
                    </InputLeftElement>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      bg="gray.700"
                      borderColor="gray.600"
                      color="white"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{ borderColor: 'blue.400' }}
                    />
                  </InputGroup>
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="blue"
                  size="lg"
                  w="full"
                  isLoading={loading}
                  loadingText="Création..."
                >
                  S'inscrire
                </Button>
              </VStack>
            </Box>

            <Text fontSize="sm" color="gray.400">
              Déjà un compte?{" "}
              <ChakraLink as={Link} href="/login" color="blue.400" _hover={{ color: 'blue.300' }}>
                Se connecter
              </ChakraLink>
            </Text>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  )
}