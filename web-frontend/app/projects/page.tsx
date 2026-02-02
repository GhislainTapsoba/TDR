"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { api, projectsApi } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { hasPermission } from "@/lib/permissions"
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
  Menu,
  InputGroup,
  Flex,
  Progress,
  Wrap,
  WrapItem
} from '@chakra-ui/react'
import { FiPlus, FiSearch, FiCalendar, FiUsers, FiBarChart, FiAlertTriangle, FiMoreVertical, FiEdit, FiTrash2 } from 'react-icons/fi'
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal"
import ProjectEditModal from "@/components/ProjectEditModal"

interface Project {
  id: string
  title: string
  description: string
  start_date: string
  end_date: string
  status: "planifie" | "en_cours" | "en_pause" | "termine" | "annule"
  manager_id: string
  manager: {
    id: string
    name: string
    email: string
  } | null
  stats?: {
    total_tasks: number
    completed_tasks: number
    progress_percentage: number
    is_overdue: boolean
  }
}

const statusLabels = {
  planifie: "Planifié",
  en_cours: "En cours",
  en_pause: "En pause",
  termine: "Terminé",
  annule: "Annulé",
}

const statusColors = {
  planifie: "gray",
  en_cours: "orange",
  en_pause: "yellow",
  termine: "green",
  annule: "red",
}

export default function ProjectsPage() {
  const { data: session } = useSession()
  const { user: authUser } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await projectsApi.getAll()
      setProjects((response.data || []) as any as Project[])
    } catch (error) {
      console.error("Erreur projets:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateProjectStatus = async (projectId: string, newStatus: Project["status"]) => {
    try {
      await projectsApi.update(projectId, { status: newStatus })
      fetchProjects()
    } catch (error) {
      console.error("Erreur mise à jour:", error)
    }
  }

  const handleDeleteProject = async () => {
    if (projectToDelete) {
      try {
        await projectsApi.delete(projectToDelete.id)
        fetchProjects()
        setShowDeleteModal(false)
        setProjectToDelete(null)
      } catch (error) {
        console.error("Erreur suppression:", error)
      }
    }
  }

  const handleEditProject = async () => {
    setShowEditModal(false)
    setProjectToEdit(null)
    fetchProjects()
  }

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || project.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <MainLayout>
        <Center h="50vh">
          <Spinner size="xl" color="blue.500" />
        </Center>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <VStack spacing={6} align="stretch">
        <Flex justify="space-between" align="center">
          <Box>
            <Heading size="xl" color="white">Projets</Heading>
            <Text color="gray.400">Gérez vos projets</Text>
          </Box>
          {hasPermission(authUser?.permissions || [], 'projects.create') && (
            <Button as={Link} href="/projects/new" colorScheme="blue" leftIcon={<FiPlus />}>
              Nouveau projet
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            w="200px"
            bg="gray.700"
            borderColor="gray.600"
            color="white"
          >
            <option value="all">Tous les statuts</option>
            <option value="planifie">Planifié</option>
            <option value="en_cours">En cours</option>
            <option value="en_pause">En pause</option>
            <option value="termine">Terminé</option>
            <option value="annule">Annulé</option>
          </Select>
        </Flex>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {filteredProjects.map((project) => (
            <Card key={project.id} bg="gray.800" borderColor="gray.700" _hover={{ borderColor: 'blue.400' }}>
              <CardBody>
                <VStack align="stretch" spacing={4}>
                  <Flex justify="space-between" align="start">
                    <VStack align="start" spacing={2} flex={1}>
                      <Heading size="sm" color="white">{project.title}</Heading>
                      <Text color="gray.300" fontSize="sm" noOfLines={2}>{project.description}</Text>
                    </VStack>
                    
                    <HStack>
                      {project.stats?.is_overdue && (
                        <Icon as={FiAlertTriangle} color="red.400" />
                      )}
                      <Menu>
                        <MenuButton as={Button} size="sm" variant="ghost">
                          <Icon as={FiMoreVertical} />
                        </MenuButton>
                        <MenuList bg="gray.700" borderColor="gray.600">
                          {hasPermission(authUser?.permissions || [], 'projects.update') && (
                            <MenuItem
                              onClick={() => {
                                setProjectToEdit(project)
                                setShowEditModal(true)
                              }}
                              icon={<FiEdit />}
                            >
                              Modifier
                            </MenuItem>
                          )}
                          {hasPermission(authUser?.permissions || [], 'projects.delete') && (
                            <MenuItem
                              onClick={() => {
                                setProjectToDelete(project)
                                setShowDeleteModal(true)
                              }}
                              icon={<FiTrash2 />}
                              color="red.400"
                            >
                              Supprimer
                            </MenuItem>
                          )}
                        </MenuList>
                      </Menu>
                    </HStack>
                  </Flex>

                  <Wrap spacing={1}>
                    {Object.entries(statusLabels).map(([statusKey, label]) => (
                      <WrapItem key={statusKey}>
                        <Button
                          size="xs"
                          variant={project.status === statusKey ? "solid" : "outline"}
                          colorScheme={statusColors[statusKey as keyof typeof statusColors]}
                          onClick={() => updateProjectStatus(project.id, statusKey as Project["status"])}
                          isDisabled={!hasPermission(authUser?.permissions || [], 'projects.update')}
                        >
                          {label}
                        </Button>
                      </WrapItem>
                    ))}
                  </Wrap>

                  <VStack align="stretch" spacing={2}>
                    <HStack spacing={2}>
                      <Icon as={FiCalendar} color="gray.400" boxSize={4} />
                      <Text fontSize="sm" color="gray.400">
                        {format(new Date(project.start_date), "dd MMM", { locale: fr })} -{" "}
                        {format(new Date(project.end_date), "dd MMM yyyy", { locale: fr })}
                      </Text>
                    </HStack>

                    <HStack spacing={2}>
                      <Icon as={FiUsers} color="gray.400" boxSize={4} />
                      <Text fontSize="sm" color="gray.400">
                        {project.manager?.name || "Non assigné"}
                      </Text>
                    </HStack>

                    {project.stats && (
                      <Box>
                        <Flex justify="space-between" mb={2}>
                          <Text fontSize="sm" color="gray.400">Progression</Text>
                          <Text fontSize="sm" color="white" fontWeight="bold">
                            {project.stats.progress_percentage}%
                          </Text>
                        </Flex>
                        <Progress
                          value={project.stats.progress_percentage}
                          colorScheme="blue"
                          size="sm"
                          borderRadius="md"
                        />
                        <Text fontSize="xs" color="gray.500" mt={1}>
                          {project.stats.completed_tasks}/{project.stats.total_tasks} tâches
                        </Text>
                      </Box>
                    )}
                  </VStack>

                  <Button
                    as={Link}
                    href={`/projects/${project.id}`}
                    variant="outline"
                    size="sm"
                    colorScheme="blue"
                  >
                    Voir détails
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>

        {filteredProjects.length === 0 && (
          <Center py={12}>
            <VStack>
              <Icon as={FiBarChart3} boxSize={12} color="gray.500" />
              <Heading size="md" color="white">Aucun projet</Heading>
              <Text color="gray.400" textAlign="center">
                {searchTerm || statusFilter !== "all"
                  ? "Aucun projet ne correspond à vos critères."
                  : "Commencez par créer votre premier projet."}
              </Text>
              {hasPermission(authUser?.permissions || [], 'projects.create') && !searchTerm && statusFilter === "all" && (
                <Button as={Link} href="/projects/new" colorScheme="blue" leftIcon={<FiPlus />}>
                  Créer un projet
                </Button>
              )}
            </VStack>
          </Center>
        )}
      </VStack>

      {projectToDelete && (
        <DeleteConfirmationModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteProject}
          itemName={projectToDelete.title}
          itemType="projet"
        />
      )}

      {projectToEdit && (
        <ProjectEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          project={projectToEdit}
          onProjectUpdated={handleEditProject}
        />
      )}
    </MainLayout>
  )
}

