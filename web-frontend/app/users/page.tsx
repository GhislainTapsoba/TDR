"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import { usersApi } from "@/lib/api"
import { MainLayout } from "@/components/layout/main-layout"
import {
  Box,
  Button,
  Card,
  CardBody,
  Badge,
  Input,
  Select,
  VStack,
  HStack,
  Text,
  Heading,
  Spinner,
  Center,
  SimpleGrid,
  Icon,
  Avatar,
  InputGroup,
  Flex,
  Wrap,
  WrapItem
} from '@chakra-ui/react'
import { FiPlus, FiSearch, FiMail, FiShield, FiUser, FiBriefcase, FiUser as FiUserAlt } from 'react-icons/fi'
import { useAuth } from "@/contexts/auth-context"
import { hasPermission } from "@/lib/permissions"
import UserEditModal from "@/components/UserEditModal"
import UserDeleteModal from "@/components/UserDeleteModal"

const roleLabels = {
  admin: "Administrateur",
  manager: "Manager",
  employe: "Employé",
}

const roleColors = {
  admin: "red",
  manager: "blue",
  employe: "green",
}

const roleIcons = {
  admin: FiCrown,
  manager: FiBriefcase,
  employe: FiUser,
}

export default function UsersPage() {
  const { data: session, status } = useSession()
  const { user: authUser } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)

  const canReadUsers = hasPermission(authUser?.permissions || [], 'users.read')
  const canCreateUsers = hasPermission(authUser?.permissions || [], 'users.create')
  const canUpdateUsers = hasPermission(authUser?.permissions || [], 'users.update')
  const canDeleteUsers = hasPermission(authUser?.permissions || [], 'users.delete')

  useEffect(() => {
    if (canReadUsers) {
      fetchUsers()
    } else {
      setLoading(false)
    }
  }, [canReadUsers])

  const fetchUsers = async () => {
    try {
      const response = await usersApi.getAll()
      setUsers(response.data as any || [])
    } catch (error) {
      console.error("Erreur utilisateurs:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = (users || []).filter((user) => {
    const matchesSearch =
        (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesSearch && matchesRole
  })

  const getInitials = (name: string) => {
    if (!name) return ''
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (status === 'loading' || loading) {
    return (
      <MainLayout>
        <Center h="50vh">
          <Spinner size="xl" color="blue.500" />
        </Center>
      </MainLayout>
    )
  }
  
  if (!canReadUsers) {
    return (
      <MainLayout>
        <Center py={12}>
          <VStack>
            <Icon as={FiShield} boxSize={12} color="gray.500" />
            <Heading size="md" color="white">Accès refusé</Heading>
            <Text color="gray.400">Vous n'avez pas les permissions nécessaires.</Text>
          </VStack>
        </Center>
      </MainLayout>
    )
  }
  
  return (
    <MainLayout>
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Box>
            <Heading size="xl" color="white">Utilisateurs</Heading>
            <Text color="gray.400">Gérez les utilisateurs</Text>
          </Box>
          {canCreateUsers && (
            <Button as={Link} href="/users/create" colorScheme="blue" leftIcon={<FiPlus />}>
              Nouvel utilisateur
            </Button>
          )}
        </Flex>

        <Flex gap={4}>
          <InputGroup maxW="sm">
            <InputLeftElement>
              <Icon as={FiSearch} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              bg="gray.700"
              borderColor="gray.600"
              color="white"
              _placeholder={{ color: 'gray.400' }}
            />
          </InputGroup>
          
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            w="200px"
            bg="gray.700"
            borderColor="gray.600"
            color="white"
          >
            <option value="all">Tous les rôles</option>
            <option value="admin">Administrateur</option>
            <option value="manager">Manager</option>
            <option value="employe">Employé</option>
          </Select>
        </Flex>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {filteredUsers.map((user) => {
            const RoleIcon = roleIcons[user.role as keyof typeof roleIcons] || FiUser
            return (
              <Card key={user.id} bg="gray.800" borderColor="gray.700" _hover={{ borderColor: 'blue.400' }}>
                <CardBody>
                  <VStack spacing={4}>
                    <HStack w="full" justify="space-between">
                      <HStack>
                        <Avatar size="md" name={user.name} bg="blue.500">
                          <AvatarBadge boxSize="1em" bg={user.is_active ? "green.500" : "gray.500"} />
                        </Avatar>
                        <VStack align="start" spacing={0}>
                          <Heading size="sm" color="white">{user.name}</Heading>
                          <HStack spacing={1}>
                            <Icon as={FiMail} boxSize={3} color="gray.400" />
                            <Text fontSize="sm" color="gray.400">{user.email}</Text>
                          </HStack>
                        </VStack>
                      </HStack>
                    </HStack>

                    <Wrap spacing={2} w="full" justify="center">
                      <WrapItem>
                        <Badge colorScheme={roleColors[user.role as keyof typeof roleColors]} variant="subtle">
                          <Icon as={RoleIcon} mr={1} />
                          {roleLabels[user.role as keyof typeof roleLabels]}
                        </Badge>
                      </WrapItem>
                      <WrapItem>
                        <Badge colorScheme={user.is_active ? "green" : "gray"} variant="outline">
                          {user.is_active ? "Actif" : "Inactif"}
                        </Badge>
                      </WrapItem>
                    </Wrap>

                    <Text fontSize="xs" color="gray.500">
                      Créé le {new Date(user.created_at).toLocaleDateString("fr-FR")}
                    </Text>

                    <HStack w="full" spacing={2}>
                      <Button
                        as={Link}
                        href={`/users/${user.id}/view`}
                        size="sm"
                        variant="outline"
                        flex={1}
                      >
                        Voir
                      </Button>
                      {canUpdateUsers && (
                        <Button
                          size="sm"
                          colorScheme="blue"
                          flex={1}
                          onClick={() => {
                            setSelectedUser(user)
                            setIsEditModalOpen(true)
                          }}
                        >
                          Modifier
                        </Button>
                      )}
                      {canDeleteUsers && (
                        <Button
                          size="sm"
                          colorScheme="red"
                          flex={1}
                          onClick={() => {
                            setSelectedUser(user)
                            setIsDeleteModalOpen(true)
                          }}
                        >
                          Supprimer
                        </Button>
                      )}
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            )
          })}
        </SimpleGrid>

        {filteredUsers.length === 0 && (
          <Center py={12}>
            <VStack>
              <Icon as={FiUser} boxSize={12} color="gray.500" />
              <Heading size="md" color="white">Aucun utilisateur</Heading>
              <Text color="gray.400" textAlign="center">
                {searchTerm || roleFilter !== "all"
                  ? "Aucun utilisateur ne correspond à vos critères."
                  : "Aucun utilisateur créé."}
              </Text>
            </VStack>
          </Center>
        )}

        {selectedUser && (
          <>
            <UserEditModal
              user={selectedUser}
              isOpen={isEditModalOpen}
              onClose={() => {
                setIsEditModalOpen(false)
                setSelectedUser(null)
              }}
              onSuccess={() => {
                setIsEditModalOpen(false)
                setSelectedUser(null)
                fetchUsers()
              }}
            />
            <UserDeleteModal
              user={selectedUser}
              isOpen={isDeleteModalOpen}
              onClose={() => {
                setIsDeleteModalOpen(false)
                setSelectedUser(null)
              }}
              onSuccess={() => {
                setIsDeleteModalOpen(false)
                setSelectedUser(null)
                fetchUsers()
              }}
            />
          </>
        )}
      </VStack>
    </MainLayout>
  )
}
