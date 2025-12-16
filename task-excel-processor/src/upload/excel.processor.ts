import { Injectable, Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { ProjectDTO } from './dto/project.dto';
import { ApiService } from './services/api.service';
import { ApiConfig, ProjectData } from './interfaces/api-config.interface';

@Injectable()
export class ExcelProcessor {
  private readonly logger = new Logger(ExcelProcessor.name);

  constructor(private readonly apiService: ApiService) {}

  async handle(data: any[], apiConfig?: ApiConfig) {
    const resultado = [];
    const validProjects: ProjectData[] = [];
    const errors = [];

    this.logger.log(`Processando ${data.length} linhas do Excel`);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      this.logger.debug(`Processando linha ${i + 1}:`, row);

      try {
        // Mapear os dados do Excel para o formato esperado
        const projectData = this.mapExcelRowToProject(row);
        // Validar os dados
        const instance = plainToInstance(ProjectDTO, projectData);
        const validationErrors = validateSync(instance);

        if (validationErrors.length > 0) {
          const errorDetails = validationErrors.map((e) => ({
            campo: e.property,
            msg: e.constraints,
          }));

          resultado.push({
            linha: i + 1,
            ...row,
            status: 'INVALIDO',
            erros: errorDetails,
          });

          errors.push({
            linha: i + 1,
            erro: 'Dados inválidos',
            detalhes: errorDetails,
            dados: projectData,
          });
        } else {
          // Validar regras de negócio adicionais
          const businessValidation = this.validateBusinessRules(projectData);
          if (businessValidation.isValid) {
            validProjects.push(projectData);
            resultado.push({
              linha: i + 1,
              ...row,
              status: 'VALIDO',
              dadosMapeados: projectData,
            });
          } else {
            resultado.push({
              linha: i + 1,
              ...row,
              status: 'INVALIDO',
              erros: businessValidation.errors,
            });

            errors.push({
              linha: i + 1,
              erro: 'Regra de negócio violada',
              detalhes: businessValidation.errors,
              dados: projectData,
            });
          }
        }
      } catch (error) {
        this.logger.error(`Erro ao processar linha ${i + 1}:`, error.message);
        resultado.push({
          linha: i + 1,
          ...row,
          status: 'ERRO',
          erro: error.message,
        });

        errors.push({
          linha: i + 1,
          erro: 'Erro de processamento',
          detalhes: error.message,
          dados: row,
        });
      }
    }

    // Se há configuração da API e projetos válidos, enviar para a API
    let apiResponse = null;
    if (apiConfig && validProjects.length > 0) {
      try {
        this.logger.log(
          `Enviando ${validProjects.length} projetos válidos para a API`,
        );
        apiResponse = await this.apiService.createManyProjects(
          validProjects,
          apiConfig,
        );
      } catch (error) {
        this.logger.error('Erro ao enviar projetos para a API:', error.message);
        apiResponse = { error: error.message };
      }
    }

    return {
      processamento: {
        totalLinhas: data.length,
        validos: validProjects.length,
        invalidos: errors.length,
        resultado,
        erros: errors,
      },
      api: apiResponse,
    };
  }

  private mapExcelRowToProject(row: any): ProjectData {
    // Mapear colunas do Excel para campos do projeto
    // Assumindo que o Excel tem colunas com nomes específicos
    return {
      name: row.nome || row.name || row['Nome do Projeto'],
      location: row.localizacao || row.location || row['Localização'],
      startDate: this.formatDate(
        row.dataInicio || row.startDate || row['Data de Início'],
      ),
      forecastCompletionDate: this.formatDate(
        row.dataConclusao ||
          row.forecastCompletionDate ||
          row['Data de Conclusão Prevista'],
      ),
      constructionCompanyId:
        row.construtoraId ||
        row.constructionCompanyId ||
        row['ID da Construtora'],
      photoUrl: row.fotoUrl || row.photoUrl || row['URL da Foto'],
    };
  }

  private formatDate(dateValue: any): string {
    if (!dateValue) return '';

    // Se já é uma string no formato correto
    if (
      typeof dateValue === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
    ) {
      return dateValue;
    }

    // Se é um número (Excel serial date)
    if (typeof dateValue === 'number') {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }

    // Se é um objeto Date
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split('T')[0];
    }

    // Tentar converter string para data
    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {}

    return String(dateValue);
  }

  private validateBusinessRules(projectData: ProjectData): {
    isValid: boolean;
    errors: any[];
  } {
    const errors = [];

    // Validar se a data de início é anterior à data de conclusão
    if (projectData.startDate && projectData.forecastCompletionDate) {
      const startDate = new Date(projectData.startDate);
      const endDate = new Date(projectData.forecastCompletionDate);

      if (startDate >= endDate) {
        errors.push({
          campo: 'forecastCompletionDate',
          msg: 'Data de conclusão deve ser posterior à data de início',
        });
      }
    }
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
