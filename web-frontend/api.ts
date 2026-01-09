// api.ts
import { api } from "./lib/api";

export const fetchProject = async (id: number) => {
  try {
    const response = await api.get(`/projects/${id}`) as { data: any };
    console.log("API /projects/:id response:", response.data);
    return response.data?.data; // 🔥 corrige ici
  } catch (error) {
    console.error("Erreur lors du chargement du projet:", error);
    throw error;
  }
};

export const fetchStages = async (projectId: number) => {
  try {
    const response = await api.get(`/projects/${projectId}/stages`) as { data: any };
    console.log("API /projects/:id/stages response:", response.data);
    return response.data?.data; // 🔥 corrige ici
  } catch (error) {
    console.error("Erreur lors du chargement des étapes:", error);
    throw error;
  }
};
