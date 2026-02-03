"use client"

import { useEffect, useState } from "react"
import {
  Box,
  SimpleGrid,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  Spinner,
  Center,
  Icon,
  Flex
} from '@chakra-ui/react'
import { Progress } from '@/components/ui/progress'
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
        <Box bg="card" p={8} borderRadius="xl" border="1px" borderColor="border" shadow="md">
          <Heading size="xl" color="card-foreground" mb={2}>Tableau de bord</Heading>
          <Text color="muted-foreground" fontSize="lg">Bienvenue, {user?.name}</Text>
        </Box>

        {/* Stats Cards */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={8}>
          {getStatsCards().map((card, index) => (
            <Box
              key={index}
              bg="card"
              borderColor="border"
              border="1px"
              borderRadius="xl"
              p={8}
              shadow="lg"
              minH="200px"
              _hover={{ borderColor: 'primary', transform: 'translateY(-4px)', shadow: 'xl' }}
              transition="all 0.3s"
            >
              <Flex justifyContent="space-between" alignItems="flex-start" h="full">
                <Box flex={1}>
                  <Text color="muted-foreground" fontSize="sm" mb={2}>{card.title}</Text>
                  <Text color="card-foreground" fontSize="3xl" fontWeight="bold" mb={2}>{card.value}</Text>
                  <Text color="muted-foreground" fontSize="sm">{card.desc}</Text>
                </Box>
                <Icon as={card.icon} boxSize={10} color={`${card.color}.500`} opacity={0.8} />
              </Flex>
            </Box>
          ))}
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, lg: 3 }} gap={8}>

          <Box
            bg="card"
            borderColor="border"
            border="1px"
            borderRadius="xl"
            p={8}
            shadow="lg"
            minH="300px"
            gridColumn={{ lg: "span 2" }}
          >
            <VStack alignItems="stretch" gap={8}>
              <HStack>
                <Icon as={FiTrendingUp} color="primary" boxSize={6} />
                <Heading size="lg" color="card-foreground">Progression</Heading>
              </HStack>

              <Box>
                <Flex justifyContent="space-between" mb={4}>
                  <Text color="muted-foreground" fontSize="md">Tâches terminées</Text>
                  <Text color="primary" fontWeight="bold" fontSize="lg">{getProgressPercentage()}%</Text>
                </Flex>
                <Progress value={getProgressPercentage()} className="h-6" />
              </Box>

              {stats.tasksByStatus && (
                <Box>
                  <Text color="muted-foreground" fontSize="md" mb={4}>Statut des tâches</Text>
                  <Flex wrap="wrap" gap={3}>
                    {Object.entries(stats.tasksByStatus).map(([status, count]) => (
                      <Badge key={status} colorScheme="primary" variant="secondary" fontSize="sm" px={3} py={1}>
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
            bg="card"
            borderColor="border"
            border="1px"
            borderRadius="xl"
            p={8}
            shadow="lg"
            minH="300px"
          >
            <VStack alignItems="stretch" gap={6}>
              <HStack>
                <Icon as={FiActivity} color="primary" />
                <Heading size="md" color="card-foreground">Activités</Heading>
              </HStack>

              <VStack alignItems="stretch" gap={4}>
                {activities.slice(0, 6).map((activity) => (
                  <Box key={activity.id} p={4} bg="muted/20" borderRadius="lg" border="1px" borderColor="border">
                    <Text color="card-foreground" fontSize="sm" mb={2}>
                      {activity.details || activity.action}
                    </Text>
                    <HStack gap={3}>
                      <Badge size="sm" colorScheme="secondary" variant="outline">{activity.user?.name || "—"}</Badge>
                      <Text color="muted-foreground" fontSize="xs">
                        {new Date(activity.created_at).toLocaleDateString('fr-FR')}
                      </Text>
                    </HStack>
                  </Box>
                ))}
                {activities.length === 0 && (
                  <Center py={12}>
                    <VStack>
                      <Icon as={FiActivity} boxSize={10} color="muted-foreground" />
                      <Text color="muted-foreground" fontSize="sm">Aucune activité</Text>
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