import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import {
  ApiConfig,
  CreateManyProjectsRequest,
  CreateManyProjectsResponse
} from '../interfaces/api-config.interface';
import { Task } from '../task.processor';

interface CreateManyTasksRequest {
  tasks: Task[];
}

interface CreateManyTasksResponse {
  success: boolean;
  created: number;
  failed: number;
  errors?: any[];
}

@Injectable()
export class ApiService {
  private readonly logger = new Logger(ApiService.name);

  async createManyProjects(
    projects: any[],
    config: ApiConfig
  ): Promise<CreateManyProjectsResponse> {
    try {
      const requestData: CreateManyProjectsRequest = { projects };

      this.logger.log(`Enviando ${projects.length} projetos para a API`);

      const response: AxiosResponse<CreateManyProjectsResponse> = await axios.post(
        `${config.baseUrl}${config.endpoint}`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.token}`
          },
          timeout: 30000 // 30 segundos de timeout
        }
      );

      this.logger.log(`Resposta da API: ${response.data.created} criados, ${response.data.failed} falharam`);

      return response.data;
    } catch (error) {
      this.logger.error('Erro ao enviar projetos para a API:', error.message);

      if (error.response) {
        // Erro da API
        this.logger.error(`Status: ${error.response.status}, Data:`, error.response.data);
        throw new Error(`Erro da API: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        // Erro de rede
        this.logger.error('Erro de rede:', error.message);
        throw new Error(`Erro de rede: ${error.message}`);
      } else {
        // Outros erros
        this.logger.error('Erro desconhecido:', error.message);
        throw new Error(`Erro desconhecido: ${error.message}`);
      }
    }
  }

  async createManyTasks(
    tasks: Task[],
    config: ApiConfig
  ): Promise<CreateManyTasksResponse> {
    try {
      // Transformar tasks para o formato esperado pela API
      const tasksPayload = tasks.map(task => ({
        towerId: task.towerId,
        sector: task.sector,
        title: task.title,
        scheduleDate: task.scheduleDate,
        statusDate: task.statusDate,
        weightOnProject: task.taskWeightInProject,
        completionPercentage: task.completionPercentage,
        observation: task.observation || '',
        done: task.done,
        floorNumber: task.floorNumber,
        stages: task.stages.map(stage => ({
          sortIndex: stage.sortIndex,
          name: stage.name,
          weight: stage.weightInTask * 100, // Converter de decimal para percentual
          weightOnProject: stage.weightInProject,
          completionPercentage: stage.completionPercentage,
          scheduleDate: stage.scheduleDate,
          environment: stage.environment,
          measurementDates: stage.measurementDates || []
        }))
      }));

      const requestData: CreateManyTasksRequest = { tasks: tasksPayload };

      this.logger.log(`Enviando ${tasks.length} tarefas para a API`);

      const response: AxiosResponse<CreateManyTasksResponse> = await axios.post(
        `${config.baseUrl}${config.endpoint}`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.token}`
          },
          timeout: 60000 // 60 segundos de timeout (tasks podem ter muitos stages)
        }
      );

      this.logger.log(`Resposta da API: ${response.data.created} criados, ${response.data.failed} falharam`);

      return response.data;
    } catch (error) {
      this.logger.error('Erro ao enviar tarefas para a API:', error.message);

      if (error.response) {
        // Erro da API
        this.logger.error(`Status: ${error.response.status}, Data:`, error.response.data);
        throw new Error(`Erro da API: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        // Erro de rede
        this.logger.error('Erro de rede:', error.message);
        throw new Error(`Erro de rede: ${error.message}`);
      } else {
        // Outros erros
        this.logger.error('Erro desconhecido:', error.message);
        throw new Error(`Erro desconhecido: ${error.message}`);
      }
    }
  }

  async validateApiConnection(config: ApiConfig): Promise<boolean> {
    try {
      // Teste simples de conectividade
      const response = await axios.get(config.baseUrl, {
        headers: {
          'Authorization': `Bearer ${config.token}`
        },
        timeout: 5000
      });
      
      return response.status < 400;
    } catch (error) {
      this.logger.warn('Não foi possível validar a conexão com a API:', error.message);
      return false;
    }
  }
}