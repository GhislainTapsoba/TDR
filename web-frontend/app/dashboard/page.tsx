"use client"

import { useEffect, useState } from "react"
import {
  Box,
  SimpleGrid,
  Heading,
  Text,
  VStack,
  HStack,
  Progress,
  Badge,
  Spinner,
  Center,
  Icon,
  Flex
} from '@chakra-ui/react'
import { FiFolder, FiCheckSquare, FiClock, FiAlertTriangle, FiUsers, FiTrendingUp, FiActivity } from 'react-icons/fi'
import { MainLayout } from "@/components/layout/main-layout"
import { dashboardApi, activityLogsApi, ActivityLog, Project, Task } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

export const dynamic = 'force-dynamic'

interface DashboardStats {
  totalProjects?: number
  activeProjects?: number
  completedProjects?: number
  overdueTasks?: number
  totalTasks?: number
  completedTasks?: number
  pendingTasks?: number
  myProjects?: number
  myTasks?: number
  pending_my_tasks?: number
  in_progress_my_tasks?: number
  totalUsers?: number
  projectsByStatus?: Record<string, number>
  tasksByStatus?: Record<string, number>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({})
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsResponse = await dashboardApi.getStats()
        setStats(statsResponse.data as DashboardStats)

        if (user?.role === 'admin' || user?.role === 'manager') {
          const activitiesResponse = await dashboardApi.getRecentActivity(8)
          setActivities(activitiesResponse.data || [])
        }
      } catch (error) {
        console.error("Erreur dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user?.role])

  const getStatsCards = () => {
    if (user?.role === "admin") {
      return [
        { title: "Projets", value: stats.totalProjects || 0, desc: `${stats.activeProjects || 0} actifs`, icon: FiFolder, color: "blue" },
        { title: "Tâches", value: stats.totalTasks || 0, desc: `${stats.completedTasks || 0} terminées`, icon: FiCheckSquare, color: "green" },
        { title: "En retard", value: stats.overdueTasks || 0, desc: "Tâches urgentes", icon: FiAlertTriangle, color: "red" },
        { title: "Utilisateurs", value: stats.totalUsers || 0, desc: "Membres actifs", icon: FiUsers, color: "purple" },
      ]
    } else if (user?.role === "manager") {
      return [
        { title: "Mes projets", value: stats.myProjects || 0, desc: "Gérés", icon: FiFolder, color: "blue" },
        { title: "Tâches projet", value: stats.totalTasks || 0, desc: "Total", icon: FiCheckSquare, color: "green" },
        { title: "Mes tâches", value: stats.myTasks || 0, desc: "Assignées", icon: FiClock, color: "orange" },
        { title: "En retard", value: stats.overdueTasks || 0, desc: "Urgentes", icon: FiAlertTriangle, color: "red" },
      ]
    } else {
      return [
        { title: "Mes tâches", value: stats.myTasks || 0, desc: "Total", icon: FiCheckSquare, color: "blue" },
        { title: "En attente", value: stats.pending_my_tasks || 0, desc: "À faire", icon: FiClock, color: "orange" },
        { title: "En cours", value: stats.in_progress_my_tasks || 0, desc: "Actives", icon: FiTrendingUp, color: "green" },
        { title: "Terminées", value: stats.completedTasks || 0, desc: "Accomplies", icon: FiCheckSquare, color: "purple" },
      ]
    }
  }

  const getProgressPercentage = () => {
    const total = stats.totalTasks || stats.myTasks || 0
    const completed = stats.completedTasks || 0
    return total > 0 ? Math.round((completed / total) * 100) : 0
  }

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
      <VStack gap={8} alignItems="stretch">
        {/* Header */}
        <Box bg="gray.800" p={8} borderRadius="xl" border="1px" borderColor="gray.700">
          <Heading size="xl" color="white" mb={2}>Tableau de bord</Heading>
          <Text color="gray.400" fontSize="lg">Bienvenue, {user?.name}</Text>
        </Box>

        {/* Stats Cards */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={6}>
          {getStatsCards().map((card, index) => (
            <Box 
              key={index} 
              bg="gray.800" 
              borderColor="gray.700" 
              border="1px" 
              borderRadius="lg" 
              p={6}
              _hover={{ borderColor: 'blue.400', transform: 'translateY(-2px)' }} 
              transition="all 0.2s"
            >
              <Flex justifyContent="space-between" alignItems="center">
                <Box>
                  <Text color="gray.400" fontSize="sm">{card.title}</Text>
                  <Text color="white" fontSize="2xl" fontWeight="bold">{card.value}</Text>
                  <Text color="gray.500" fontSize="xs">{card.desc}</Text>
                </Box>
                <Icon as={card.icon} boxSize={8} color={`${card.color}.400`} />
              </Flex>
            </Box>
          ))}
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 3 }} gap={8}>
          {/* Progress */}
          <Box 
            bg="gray.800" 
            borderColor="gray.700" 
            border="1px" 
            borderRadius="lg" 
            p={6}
            gridColumn={{ lg: "span 2" }}
          >
            <VStack alignItems="stretch" gap={6}>
              <HStack>
                <Icon as={FiTrendingUp} color="blue.400" />
                <Heading size="md" color="white">Progression</Heading>
              </HStack>
              
              <Box>
                <Flex justifyContent="space-between" mb={2}>
                  <Text color="gray.300" fontSize="sm">Tâches terminées</Text>
                  <Text color="blue.400" fontWeight="bold">{getProgressPercentage()}%</Text>
                </Flex>
                <Progress value={getProgressPercentage()} colorScheme="blue" size="lg" borderRadius="md" />
              </Box>

              {stats.tasksByStatus && (
                <Box>
                  <Text color="gray.300" fontSize="sm" mb={3}>Statut des tâches</Text>
                  <Flex wrap="wrap" gap={2}>
                    {Object.entries(stats.tasksByStatus).map(([status, count]) => (
                      <Badge key={status} colorScheme="blue" variant="subtle">
                        {status}: {count}
                      </Badge>
                    ))}
                  </Flex>
                </Box>
              )}
            </VStack>
          </Box>

          {/* Activities */}
          <Box 
            bg="gray.800" 
            borderColor="gray.700" 
            border="1px" 
            borderRadius="lg" 
            p={6}
          >
            <VStack alignItems="stretch" gap={4}>
              <HStack>
                <Icon as={FiActivity} color="blue.400" />
                <Heading size="md" color="white">Activités</Heading>
              </HStack>
              
              <VStack alignItems="stretch" gap={3}>
                {activities.slice(0, 6).map((activity) => (
                  <Box key={activity.id} p={3} bg="gray.700" borderRadius="md">
                    <Text color="white" fontSize="sm" mb={1}>
                      {activity.details || activity.action}
                    </Text>
                    <HStack gap={3}>
                      <Badge size="sm" colorScheme="gray">{activity.user?.name || "—"}</Badge>
                      <Text color="gray.400" fontSize="xs">
                        {new Date(activity.created_at).toLocaleDateString('fr-FR')}
                      </Text>
                    </HStack>
                  </Box>
                ))}
                {activities.length === 0 && (
                  <Center py={8}>
                    <VStack>
                      <Icon as={FiActivity} boxSize={8} color="gray.500" />
                      <Text color="gray.500" fontSize="sm">Aucune activité</Text>
                    </VStack>
                  </Center>
                )}
              </VStack>
            </VStack>
          </Box>
        </SimpleGrid>
      </VStack>
    </MainLayout>
  )
}