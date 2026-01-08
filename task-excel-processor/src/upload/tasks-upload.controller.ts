import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TaskProcessor } from './task.processor';
import { Task } from './task.processor';
import { FileValidationPipe } from './pipes/file-validation.pipe';
import * as XLSX from 'xlsx';
import axios from 'axios';

export class SendToApiDto {
  baseUrl: string;
  endpoint: string;
  token: string;
  tasks: Task[];
}

@Controller('tasks-upload')
export class TasksUploadController {
  private readonly logger = new Logger(TasksUploadController.name);

  constructor(private readonly taskProcessor: TaskProcessor) {}

  @Get('health')
  async healthCheck() {
    return {
      status: 'ok',
      message: 'Tasks Upload Controller is running',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Endpoint para processar o arquivo Excel
   * Retorna tasks válidas e errors (como excel-to-json)
   */
  @Post('process')
  @UseInterceptors(FileInterceptor('file'))
  async processExcel(@UploadedFile(new FileValidationPipe()) file: any) {
    try {
      this.logger.log(`Processando arquivo: ${file.originalname}`);

      // Ler arquivo Excel
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      
      // Usar primeira aba
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { 
        raw: true,
        defval: ''
      });

      if (data.length === 0) {
        throw new BadRequestException(`Planilha "${sheetName}" está vazia`);
      }

      this.logger.log(`Lidas ${data.length} linhas da aba "${sheetName}"`);

      // Processar dados (mesma lógica do excel-to-json)
      const result = await this.taskProcessor.handle(data);

      this.logger.log(
        `Processamento concluído: ${result.summary.validTasks} tarefas válidas, ${result.summary.invalidTasks} inválidas`,
      );

      return {
        success: true,
        message: 'Arquivo processado com sucesso',
        tasks: result.tasks,
        errors: result.errors,
        summary: result.summary
      };
    } catch (error) {
      this.logger.error('Erro ao processar arquivo:', error.message);
      throw new BadRequestException({
        success: false,
        message: `Erro ao processar arquivo: ${error.message}`,
      });
    }
  }

  /**
   * Endpoint para enviar tasks para a API externa
   */
  @Post('send-to-api')
  async sendToApi(@Body() body: SendToApiDto) {
    try {
      if (!body.baseUrl || !body.endpoint || !body.token) {
        throw new BadRequestException({
          success: false,
          message: 'baseUrl, endpoint e token são obrigatórios',
        });
      }

      if (!body.tasks || body.tasks.length === 0) {
        throw new BadRequestException({
          success: false,
          message: 'Nenhuma tarefa fornecida para envio',
        });
      }

      this.logger.log(
        `Enviando ${body.tasks.length} tarefas para ${body.baseUrl}${body.endpoint}`,
      );

      const response = await axios.post(
        `${body.baseUrl}${body.endpoint}`,
        { tasks: body.tasks },
        {
          headers: {
            Authorization: `Bearer ${body.token}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      this.logger.log(`API respondeu com sucesso: ${response.status}`);

      return {
        success: true,
        message: 'Tarefas enviadas com sucesso',
        apiResponse: response.data,
      };
    } catch (error) {
      this.logger.error('Erro ao enviar para API:', error.message);
      
      if (axios.isAxiosError(error)) {
        const status = error.response?.status || 500;
        const errorData = error.response?.data || error.message;
        
        throw new BadRequestException({
          success: false,
          message: `Erro da API externa (${status})`,
          error: errorData,
        });
      }

      throw new BadRequestException({
        success: false,
        message: `Erro ao enviar tarefas: ${error.message}`,
      });
    }
  }
}

