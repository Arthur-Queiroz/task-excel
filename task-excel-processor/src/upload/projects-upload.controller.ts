import {
  Controller,
  Get,
  Post,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
  Logger,
  HttpException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { ApiService } from './services/api.service';
import { FileValidationPipe } from './pipes/file-validation.pipe';

export class UploadProjectsDto {
  baseUrl?: string;
  endpoint?: string;
  token?: string;
}

@Controller('projects-upload')
export class ProjectsUploadController {
  private readonly logger = new Logger(ProjectsUploadController.name);

  constructor(
    private readonly uploadService: UploadService,
    private readonly apiService: ApiService,
  ) {}

  @Get('health')
  async healthCheck() {
    return {
      status: 'ok',
      message: 'Projects Upload Controller is running',
      timestamp: new Date().toISOString(),
    };
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadProjects(
    @UploadedFile(new FileValidationPipe()) file: any,
    @Body() body: UploadProjectsDto,
  ) {
    // Validar parâmetros da API se fornecidos
    if (body.baseUrl || body.endpoint || body.token) {
      if (!body.baseUrl) {
        throw new BadRequestException({
          success: false,
          error: 'BASE_URL_OBRIGATORIA',
          message: 'baseUrl é obrigatória quando endpoint ou token são fornecidos',
        });
      }
      if (!body.endpoint) {
        throw new BadRequestException({
          success: false,
          error: 'ENDPOINT_OBRIGATORIO',
          message: 'endpoint é obrigatório quando baseUrl ou token são fornecidos',
        });
      }
      if (!body.token) {
        throw new BadRequestException({
          success: false,
          error: 'TOKEN_OBRIGATORIO',
          message: 'token é obrigatório quando baseUrl ou endpoint são fornecidos',
        });
      }
    }

    try {
      this.logger.log(`Iniciando upload de projetos: ${file.originalname}`);
      
      // Validar conexão com a API antes de processar
      const isApiValid = await this.apiService.validateApiConnection({
        baseUrl: body.baseUrl,
        endpoint: body.endpoint,
        token: body.token,
      });

      if (!isApiValid) {
        this.logger.warn('Não foi possível validar a conexão com a API, mas continuando o processamento');
      }

      // Processar arquivo e enviar para API
      const result = await this.uploadService.processFileWithApi(
        file,
        body.baseUrl,
        body.endpoint,
        body.token,
      );

      this.logger.log(`Upload concluído: ${result.processamento.validos} projetos válidos, ${result.processamento.invalidos} inválidos`);

      return {
        success: true,
        message: 'Arquivo processado com sucesso',
        ...result,
      };
    } catch (error) {
      this.logger.error('Erro no upload de projetos:', error.message);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new BadRequestException({
        success: false,
        error: 'ERRO_PROCESSAMENTO',
        message: `Erro ao processar arquivo: ${error.message}`,
        details: error.stack,
      });
    }
  }

  @Post('validate-only')
  @UseInterceptors(FileInterceptor('file'))
  async validateOnly(@UploadedFile(new FileValidationPipe()) file: any) {

    try {
      this.logger.log(`Validando arquivo: ${file.originalname}`);
      
      // Processar apenas validação, sem enviar para API
      const result = await this.uploadService.processFile(file);

      this.logger.log(`Validação concluída: ${result.processamento.validos} projetos válidos, ${result.processamento.invalidos} inválidos`);

      return {
        success: true,
        message: 'Arquivo validado com sucesso',
        ...result,
      };
    } catch (error) {
      this.logger.error('Erro na validação do arquivo:', error.message);
      
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new BadRequestException({
        success: false,
        error: 'ERRO_VALIDACAO',
        message: `Erro ao validar arquivo: ${error.message}`,
        details: error.stack,
      });
    }
  }
}