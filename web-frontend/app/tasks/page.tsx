"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useSession } from "next-auth/react"
import { tasksApi } from "@/lib/api"
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
  Wrap,
  WrapItem
} from '@chakra-ui/react'
import { FiPlus, FiSearch, FiCalendar, FiUser, FiAlertTriangle, FiCheckCircle, FiClock, FiMoreVertical, FiEdit, FiTrash2 } from 'react-icons/fi'
import Link from "next/link"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { useAuth } from "@/contexts/auth-context"
import { hasPermission } from "@/lib/permissions"
import TaskEditModal from "@/components/TaskEditModal"
import DeleteConfirmationModal from "@/components/DeleteConfirmationModal"

interface Task {
  id: string
  title: string
  description: string
  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "COMPLETED" | "CANCELLED"
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT"
  due_date: string | null
  assigned_to: string | null
  assignees: {
    id: string
    name: string
    email: string
  }[]
  project: {
    id: string
    title: string
  }
  stage: {
    id: string
    name: string
  } | null
}

const statusLabels = {
  TODO: "À faire",
  IN_PROGRESS: "En cours",
  IN_REVIEW: "En revue",
  COMPLETED: "Terminé",
  CANCELLED: "Annulé",
}

const statusColors = {
  TODO: "gray",
  IN_PROGRESS: "orange",
  IN_REVIEW: "blue",
  COMPLETED: "green",
  CANCELLED: "red",
}

const priorityLabels = {
  LOW: "Faible",
  MEDIUM: "Moyenne",
  HIGH: "Élevée",
  URGENT: "Urgente",
}

const isOverdue = (task: Task) => {
  return task.due_date && new Date(task.due_date) < new Date() && task.status !== "COMPLETED"
}

export default function TasksPage() {
  const { data: session, status: sessionStatus } = useSession()
  const { user: authUser } = useAuth()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")

  const [showEditTaskModal, setShowEditTaskModal] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null)
  const [showDeleteTaskModal, setShowDeleteTaskModal] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)

  const permissions = useMemo(() => {
    return {
      canReadTasks: hasPermission(authUser?.permissions || [], 'tasks.read'),
      canCreateTasks: hasPermission(authUser?.permissions || [], 'tasks.create'),
      canUpdateTasks: hasPermission(authUser?.permissions || [], 'tasks.update'),
      canDeleteTasks: hasPermission(authUser?.permissions || [], 'tasks.delete'),
    }
  }, [authUser?.permissions])

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await tasksApi.getAll()
      setTasks(response.data || [])
      setError(null)
    } catch (error) {
      console.error("Erreur tâches:", error)
      setError("Erreur lors du chargement")
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = useCallback(async (taskId: string, newStatus: Task["status"]) => {
    try {
      await tasksApi.update(taskId, { status: newStatus })
      fetchTasks()
    } catch (error) {
      console.error("Erreur mise à jour:", error)
    }
  }, [])

  const handleEditTask = (task: Task) => {
    setTaskToEdit(task)
    setShowEditTaskModal(true)
  }

  const onTaskSave = () => {
    setShowEditTaskModal(false)
    setTaskToEdit(null)
    fetchTasks()
  }

  const handleDeleteTaskConfirm = (task: Task) => {
    setTaskToDelete(task)
    setShowDeleteTaskModal(true)
  }

  const onTaskDeleteConfirm = async () => {
    if (taskToDelete) {
      try {
        await tasksApi.delete(taskToDelete.id)
        fetchTasks()
        setShowDeleteTaskModal(false)
        setTaskToDelete(null)
      } catch (error) {
        console.error("Erreur suppression:", error)
      }
    }
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        (task.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.project.title?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === "all" || task.status === statusFilter
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [tasks, searchTerm, statusFilter, priorityFilter])

  if (sessionStatus === 'authenticated' && !permissions.canReadTasks) {
    return (
      <MainLayout>
        <Center py={12}>
          <VStack>
            <Heading size="md" color="white">Accès refusé</Heading>
            <Text color="gray.400">Vous n'avez pas la permission de voir cette page.</Text>
            <Button as={Link} href="/dashboard" colorScheme="blue">Retour au tableau de bord</Button>
          </VStack>
        </Center>
      </MainLayout>
    )
  }

  if (loading || sessionStatus === 'loading') {
    return (
      <MainLayout>
        <Center h="50vh">
          <Spinner size="xl" color="blue.500" />
        </Center>
      </MainLayout>
    )
  }

  if (error) {
    return (
      <MainLayout>
        <Center py={12}>
          <VStack>
            <Icon as={FiAlertTriangle} boxSize={12} color="red.400" />
            <Heading size="md" color="white">Erreur</Heading>
            <Text color="gray.400">{error}</Text>
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
            <Heading size="xl" color="white">Tâches</Heading>
            <Text color="gray.400">Gérez vos tâches</Text>
          </Box>
          {permissions.canCreateTasks && (
            <Button as={Link} href="/tasks/new" colorScheme="blue" leftIcon={<FiPlus />}>
              Nouvelle tâche
            </Button>
          )}
        </Flex>

        <Flex gap={4} wrap="wrap">
          <InputGroup maxW="sm">
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
            <option value="TODO">À faire</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="IN_REVIEW">En revue</option>
            <option value="COMPLETED">Terminé</option>
            <option value="CANCELLED">Annulé</option>
          </Select>
          
          <Select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            w="200px"
            bg="gray.700"
            borderColor="gray.600"
            color="white"
          >
            <option value="all">Toutes priorités</option>
            <option value="URGENT">Urgente</option>
            <option value="HIGH">Élevée</option>
            <option value="MEDIUM">Moyenne</option>
            <option value="LOW">Faible</option>
          </Select>
        </Flex>

        <VStack spacing={4} align="stretch">
          {filteredTasks.map((task) => (
            <Card key={task.id} bg="gray.800" borderColor="gray.700" _hover={{ borderColor: 'blue.400' }}>
              <CardBody>
                <Flex justify="space-between" align="start">
                  <VStack align="start" spacing={3} flex={1}>
                    <HStack>
                      <Heading size="sm" color="white">{task.title}</Heading>
                      {isOverdue(task) && <Icon as={FiAlertTriangle} color="red.400" />}
                    </HStack>
                    
                    {task.description && (
                      <Text color="gray.300" fontSize="sm">{task.description}</Text>
                    )}
                    
                    <Wrap spacing={2}>
                      <WrapItem>
                        <Badge colorScheme={statusColors[task.status]}>
                          {statusLabels[task.status]}
                        </Badge>
                      </WrapItem>
                      <WrapItem>
                        <Badge variant="outline">{priorityLabels[task.priority]}</Badge>
                      </WrapItem>
                      {task.project && (
                        <WrapItem>
                          <Badge colorScheme="blue" variant="subtle">
                            {task.project.title}
                          </Badge>
                        </WrapItem>
                      )}
                      {task.assignees && task.assignees.length > 0 && (
                        <WrapItem>
                          <HStack spacing={1}>
                            <Icon as={FiUser} boxSize={3} color="gray.400" />
                            <Text fontSize="xs" color="gray.400">
                              {task.assignees.map(a => a.name).join(', ')}
                            </Text>
                          </HStack>
                        </WrapItem>
                      )}
                      {task.due_date && (
                        <WrapItem>
                          <HStack spacing={1}>
                            <Icon as={FiCalendar} boxSize={3} color="gray.400" />
                            <Text fontSize="xs" color={isOverdue(task) ? "red.400" : "gray.400"}>
                              {format(new Date(task.due_date), "dd MMM yyyy", { locale: fr })}
                            </Text>
                          </HStack>
                        </WrapItem>
                      )}
                    </Wrap>
                  </VStack>

                  <HStack>
                    <Wrap spacing={1}>
                      {Object.entries(statusLabels).map(([statusKey, label]) => (
                        <WrapItem key={statusKey}>
                          <Button
                            size="xs"
                            variant={task.status === statusKey ? "solid" : "outline"}
                            colorScheme={statusColors[statusKey as keyof typeof statusColors]}
                            onClick={() => updateTaskStatus(task.id, statusKey as Task["status"])}
                            isDisabled={!permissions.canUpdateTasks}
                          >
                            {label}
                          </Button>
                        </WrapItem>
                      ))}
                    </Wrap>

                    <HStack spacing={1}>
                      {(permissions.canUpdateTasks || (authUser?.role === 'employe' && task.assignees?.some(a => a.id === authUser.id))) && (
                        <Button size="sm" variant="ghost" onClick={() => handleEditTask(task)}>
                          <Icon as={FiEdit} />
                        </Button>
                      )}
                      {permissions.canDeleteTasks && (
                        <Button size="sm" variant="ghost" colorScheme="red" onClick={() => handleDeleteTaskConfirm(task)}>
                          <Icon as={FiTrash2} />
                        </Button>
                      )}
                    </HStack>
                  </HStack>
                </Flex>
              </CardBody>
            </Card>
          ))}
        </VStack>

        {filteredTasks.length === 0 && (
          <Center py={12}>
            <VStack>
              <Icon as={FiCheckCircle} boxSize={12} color="gray.500" />
              <Heading size="md" color="white">Aucune tâche</Heading>
              <Text color="gray.400" textAlign="center">
                {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                  ? "Aucune tâche ne correspond à vos critères."
                  : "Aucune tâche créée."}
              </Text>
              {permissions.canCreateTasks && !searchTerm && statusFilter === "all" && priorityFilter === "all" && (
                <Button as={Link} href="/tasks/new" colorScheme="blue" leftIcon={<FiPlus />}>
                  Créer une tâche
                </Button>
              )}
            </VStack>
          </Center>
        )}
      </VStack>

      {taskToEdit && (
        <TaskEditModal
          isOpen={showEditTaskModal}
          onClose={() => setShowEditTaskModal(false)}
          task={taskToEdit}
          onSave={onTaskSave}
        />
      )}

      {taskToDelete && (
        <DeleteConfirmationModal
          isOpen={showDeleteTaskModal}
          onClose={() => setShowDeleteTaskModal(false)}
          onConfirm={onTaskDeleteConfirm}
          itemName={taskToDelete.title}
          itemType="tâche"
        />
      )}
    </MainLayout>
  )
}
