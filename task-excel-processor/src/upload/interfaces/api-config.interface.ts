export interface ApiConfig {
  baseUrl: string;
  endpoint: string;
  token: string;
}

export interface CreateManyProjectsRequest {
  projects: ProjectData[];
}

export interface ProjectData {
  name: string;
  location: string;
  startDate: string;
  forecastCompletionDate: string;
  constructionCompanyId: string;
  photoUrl?: string;
}

export interface CreateManyProjectsResponse {
  created: number;
  failed: number;
  projects: ProjectResponse[];
  errors: ProjectError[];
}

export interface ProjectResponse {
  _id: string;
  name: string;
  location: string;
  startDate: string;
  forecastCompletionDate: string;
  constructionCompanyId: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectError {
  index: number;
  error: string;
  data: ProjectData;
}