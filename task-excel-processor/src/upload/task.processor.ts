import { Injectable, Logger } from '@nestjs/common';

// Interfaces para tipagem
export interface MeasurementDate {
  date: string;
  measuredPercentage: number;
  measuredBy: string;
}

export interface Stage {
  sortIndex: number;  // Índice de ordenação da etapa
  name: string;
  weightInTask: number;  // Peso da etapa na tarefa (não soma 100%)
  weightInProject: number;  // Peso da etapa no projeto
  completionPercentage: number;
  scheduleDate: string;
  environment: string;
  measurementDates?: MeasurementDate[];
}

export interface Task {
  towerId: string;
  sector: string;
  title: string;
  scheduleDate: string;
  statusDate: string;
  floorNumber: number;
  observation?: string;
  done: boolean;
  completionPercentage: number;
  taskWeightInProject: number;  // Peso da tarefa no projeto (soma dos pesos das etapas no projeto)
  stages: Stage[];
}

export interface ExcelRow {
  [key: string]: any;
}

export interface ValidationError {
  taskName: string;
  floorNumber: number;
  towerId: string;
  totalWeight: number;
  message: string;
}

@Injectable()
export class TaskProcessor {
  private readonly logger = new Logger(TaskProcessor.name);

  /**
   * Processa dados do Excel com nova lógica:
   * 1. Valida que a soma de TODOS os pesos no projeto = 100%
   * 2. Calcula peso da etapa com base no peso da tarefa
   * 3. Mantém validação de que etapas de uma tarefa somam corretamente
   * 4. Opcionalmente salva resultado em arquivo JSON
   */
  async handle(data: ExcelRow[], options?: { saveToFile?: boolean; outputPath?: string }) {
    this.logger.log(`Processando ${data.length} linhas do Excel`);

    // 1. Validar se a soma total no projeto é 100%
    const projectValidation = this.validateProjectWeight(data);
    
    if (!projectValidation.isValid) {
      const errorResult = {
        tasks: [],
        errors: {
          timestamp: new Date().toISOString(),
          totalErrors: 1,
          errors: [{
            type: 'PROJECT_WEIGHT_ERROR',
            message: projectValidation.error,
            totalWeight: projectValidation.totalWeight,
            expectedWeight: 100,
            difference: parseFloat((projectValidation.totalWeight - 100).toFixed(2))
          }]
        },
        summary: {
          totalRows: data.length,
          validTasks: 0,
          invalidTasks: 0
        }
      };

      // Salvar em arquivo se solicitado
      if (options?.saveToFile) {
        await this.saveToJsonFile(errorResult, options.outputPath);
      }

      return errorResult;
    }

    // 2. Calcular pesos das tarefas e validar estrutura
    const { errors: taskErrors, validTasks } = this.calculateAndValidateTaskWeights(data);

    this.logger.log(`Tarefas válidas: ${validTasks.size}`);
    this.logger.log(`Tarefas com erros: ${taskErrors.length}`);

    // 3. Transformar dados em tasks
    const tasks = this.transformToTasks(data, validTasks);

    this.logger.log(`${tasks.length} tarefas processadas com sucesso`);

    // 4. Formatar erros
    const formattedErrors = taskErrors.length > 0 ? {
      timestamp: new Date().toISOString(),
      totalErrors: taskErrors.length,
      errors: taskErrors.map(error => ({
        taskName: error.taskName,
        floorNumber: error.floorNumber,
        towerId: error.towerId,
        totalWeight: error.totalWeight * 100, // Converter para percentual para exibição
        expectedWeight: 100,
        difference: parseFloat(((error.totalWeight * 100) - 100).toFixed(2)),
        message: error.message
      }))
    } : null;

    const result = {
      tasks,
      errors: formattedErrors,
      summary: {
        totalRows: data.length,
        validTasks: tasks.length,
        invalidTasks: taskErrors.length,
        projectWeightTotal: projectValidation.totalWeight,
        processedAt: new Date().toISOString()
      }
    };

    // 5. Salvar em arquivo se solicitado
    if (options?.saveToFile) {
      await this.saveToJsonFile(result, options.outputPath);
    }

    return result;
  }

  /**
   * Salva o resultado do processamento em um arquivo JSON
   */
  private async saveToJsonFile(result: any, outputPath?: string): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');

    // Define caminho padrão se não fornecido
    const filePath = outputPath || path.join(process.cwd(), 'tasks-output.json');

    try {
      // Cria o diretório se não existir
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      // Salva o arquivo
      await fs.writeFile(filePath, JSON.stringify(result, null, 2), 'utf-8');
      
      this.logger.log(`✓ Arquivo JSON salvo em: ${filePath}`);
    } catch (error) {
      this.logger.error(`Erro ao salvar arquivo JSON: ${error.message}`);
      throw error;
    }
  }

  /**
   * Valida se a soma de TODOS os pesos no projeto é 100%
   * IMPORTANTE: Os pesos internos são em decimal (0-1), então validamos se soma = 1.0
   */
  private validateProjectWeight(data: ExcelRow[]): { isValid: boolean; totalWeight: number; error?: string } {
    let totalWeight = 0;

    data.forEach(row => {
      const weight = this.parseWeight(row['peso'] || row['weight'] || 0);
      totalWeight += weight;
    });

    // Arredonda para evitar erros de ponto flutuante
    const totalWeightRounded = Math.round(totalWeight * 1000000) / 1000000;
    
    // Valida se é 1.0 (100% em decimal)
    if (Math.abs(totalWeightRounded - 1.0) > 0.0001) {
      return {
        isValid: false,
        totalWeight: totalWeightRounded,
        error: `A soma de todos os pesos no projeto é ${(totalWeightRounded * 100).toFixed(2)}%, deveria ser 100%`
      };
    }

    return {
      isValid: true,
      totalWeight: totalWeightRounded
    };
  }

  /**
   * Remove símbolo de porcentagem e converte para número
   * IMPORTANTE: Retorna valor em formato DECIMAL (0.0 a 1.0)
   * Exemplo: 5% ou 0.05 → retorna 0.05
   */
  private parseWeight(weightStr: string | number): number {
    if (!weightStr && weightStr !== 0) return 0;
    
    // Se já é número
    if (typeof weightStr === 'number') {
      // Se for <= 1, já está em formato decimal
      if (weightStr >= 0 && weightStr <= 1) {
        return weightStr;
      }
      // Se for > 1, está em formato percentual, converter para decimal
      if (weightStr > 1 && weightStr <= 100) {
        return weightStr / 100;
      }
      return weightStr;
    }
    
    // Se for string, remove %, espaços e converte
    const cleanWeight = String(weightStr).replace(/%/g, '').replace(/,/g, '.').trim();
    const num = parseFloat(cleanWeight) || 0;
    
    // Se for <= 1, já está em decimal
    if (num >= 0 && num <= 1) {
      return num;
    }
    
    // Se for > 1, está em percentual, converter para decimal
    if (num > 1 && num <= 100) {
      return num / 100;
    }
    
    return num;
  }

  /**
   * Calcula o peso de cada tarefa no projeto e valida a estrutura
   * 
   * Lógica:
   * 1. Agrupa etapas por tarefa+torre+pavimento+setor (hierarquia de diferenciação)
   * 2. Para cada grupo, calcula:
   *    - taskWeightInProject = soma dos pesos das etapas no projeto
   *    - weightInTask = peso da etapa (valor original da planilha)
   * 3. Valida que cada tarefa tem estrutura consistente
   * 
   * Hierarquia de diferenciação:
   * - Torre: separa tarefas em torres diferentes
   * - Pavimento: separa tarefas no mesmo torre mas pavimentos diferentes
   * - Setor: separa tarefas no mesmo torre e pavimento mas setores diferentes
   */
  private calculateAndValidateTaskWeights(data: ExcelRow[]): { 
    errors: ValidationError[], 
    validTasks: Set<string> 
  } {
    const errors: ValidationError[] = [];
    const validTasks = new Set<string>();

    // Agrupa por tarefa + torre + pavimento + setor
    const groupedTasks = new Map<string, {
      taskName: string;
      floorNumber: number;
      towerId: string;
      sector: string;
      stages: { weight: number }[];
    }>();

    data.forEach(row => {
      const taskName = row['tarefa'] || row['nome_tarefa'] || row['nomeTarefa'] || row['task_name'] || '';
      const floorValue = row['pavimento'] || row['floor'] || row['andar'] || 0;
      const floorNumber = parseInt(String(floorValue)) || 0;
      const towerId = row['torre'] || row['Torre '] || row['torre_id'] || row['tower_id'] || '';
      const sectorRaw = row['ambiente'] || row['Setor / ambiente'] || row['setor'] || row['sector'] || '';
      // Garantir que sector nunca seja vazio
      const sector = sectorRaw && sectorRaw.trim() !== '' && String(sectorRaw).toLowerCase() !== 'nan'
        ? sectorRaw
        : 'Não especificado';
      const weight = this.parseWeight(row['peso'] || row['weight'] || 0);

      if (!taskName) return;

      // Cria chave única: tarefa + torre + pavimento + setor
      // Esta hierarquia garante que tarefas com mesmo nome sejam diferenciadas por:
      // 1. Torre diferente
      // 2. Se mesma torre, pavimento diferente
      // 3. Se mesmo torre e pavimento, setor diferente
      const key = `${taskName.trim().toLowerCase()}_tower_${towerId.trim()}_floor_${floorNumber}_sector_${sector.trim().toLowerCase()}`;

      if (!groupedTasks.has(key)) {
        groupedTasks.set(key, {
          taskName,
          floorNumber,
          towerId,
          sector,
          stages: []
        });
      }

      const taskGroup = groupedTasks.get(key)!;
      taskGroup.stages.push({ weight });
    });

    // Para cada grupo de tarefa, calcular peso no projeto
    groupedTasks.forEach((taskGroup, taskKey) => {
      const taskWeightInProject = taskGroup.stages.reduce((sum, stage) => sum + stage.weight, 0);
      
      // Arredonda para evitar erros de ponto flutuante
      const taskWeightRounded = Math.round(taskWeightInProject * 100) / 100;
      
      // Todas as tarefas são válidas (não há mais validação de 100% por tarefa)
      // A única validação é que o projeto soma 100%, que já foi feita
      validTasks.add(taskKey);
      
      // Opcional: log para debug
      this.logger.debug(
        `Tarefa: ${taskGroup.taskName} | ` +
        `Torre: ${taskGroup.towerId} | ` +
        `Pav: ${taskGroup.floorNumber} | ` +
        `Setor: ${taskGroup.sector} | ` +
        `Peso no projeto: ${taskWeightRounded.toFixed(4)}%`
      );
    });

    return { errors, validTasks };
  }

  /**
   * Converte uma linha do Excel para o formato de Stage
   * weightInTask = percentual que a etapa representa DENTRO da tarefa (soma = 1.0 ou 100%)
   * weightInProject = peso absoluto da etapa no projeto total
   * sortIndex = índice de ordenação da etapa (gerado automaticamente)
   */
  private rowToStage(row: ExcelRow, taskWeightInProject: number, stageWeightInProject: number, sortIndex: number): Stage {
    // Calcular weightInTask como percentual relativo dentro da tarefa
    // Se taskWeightInProject = 0.015 e stageWeightInProject = 0.007
    // então weightInTask = 0.007 / 0.015 = 0.467 (46.7% da tarefa)
    const weightInTask = taskWeightInProject > 0
      ? stageWeightInProject / taskWeightInProject
      : 0;

    // Garantir que environment nunca seja vazio
    const envValue = row['ambiente'] || row['Setor / ambiente'] || row['setor'] || row['environment'] || '';
    const environment = envValue && envValue.trim() !== '' && String(envValue).toLowerCase() !== 'nan'
      ? envValue
      : 'Não especificado';

    const stage: Stage = {
      sortIndex: sortIndex,  // Índice de ordenação
      name: row['etapa'] || row['nome_etapa'] || row['stage_name'] || '',
      weightInTask: weightInTask,  // Peso relativo dentro da tarefa (0-1)
      weightInProject: stageWeightInProject,  // Peso absoluto no projeto (0-1)
      completionPercentage: parseFloat(row['percentual_conclusao'] || row['completion'] || '0'),
      scheduleDate: this.parseISODate(row['mes_planejado'] || row['data_prevista'] || row['schedule_date'] || ''),
      environment: environment,
    };

    // Adiciona measurementDates se existir
    if (row['data_medicao']) {
      stage.measurementDates = [{
        date: this.parseISODate(row['data_medicao']),
        measuredPercentage: parseFloat(row['percentual_medido'] || '0'),
        measuredBy: row['medido_por'] || row['measured_by'] || ''
      }];
    }

    return stage;
  }

  /**
   * Converte data para formato ISO
   */
  private parseISODate(dateString: string | number): string {
    if (!dateString && dateString !== 0) {
      return new Date().toISOString();
    }

    try {
      // Se for número, trata como data do Excel
      if (typeof dateString === 'number') {
        const date = new Date((dateString - 25569) * 86400 * 1000);
        if (!isNaN(date.getTime())) {
          return date.toISOString();
        }
      }
      
      // Tenta converter diferentes formatos de data
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (error) {
      this.logger.warn(`Data inválida: ${dateString}`);
    }

    return new Date().toISOString();
  }

  /**
   * Agrupa as linhas por tarefa + torre + pavimento + setor, criando o JSON final
   * Agora com cálculo correto dos pesos e diferenciação completa por setor
   * 
   * Hierarquia de diferenciação:
   * 1. Torre: tarefas em torres diferentes são sempre separadas
   * 2. Pavimento: tarefas no mesmo torre mas pavimentos diferentes são separadas
   * 3. Setor: tarefas no mesmo torre e pavimento mas setores diferentes são separadas
   */
  private transformToTasks(data: ExcelRow[], validTasks: Set<string>): Task[] {
    const taskMap = new Map<string, Task>();

    // Primeiro, calcular os pesos das tarefas
    const taskWeights = new Map<string, number>();
    
    data.forEach(row => {
      const taskName = row['tarefa'] || row['nome_tarefa'] || row['task_name'] || '';
      const floorValue = row['pavimento'] || row['floor'] || row['andar'] || 0;
      const floorNumber = parseInt(String(floorValue)) || 0;
      const towerId = row['torre'] || row['Torre '] || row['tower_id'] || row['torre_id'] || '';
      const sectorRaw = row['ambiente'] || row['Setor / ambiente'] || row['setor'] || row['sector'] || '';
      // Garantir que sector nunca seja vazio
      const sector = sectorRaw && sectorRaw.trim() !== '' && String(sectorRaw).toLowerCase() !== 'nan'
        ? sectorRaw
        : 'Não especificado';
      const weight = this.parseWeight(row['peso'] || row['weight'] || 0);
      
      if (!taskName) return;

      // Cria chave única incluindo setor
      const taskKey = `${taskName.trim().toLowerCase()}_tower_${towerId.trim()}_floor_${floorNumber}_sector_${sector.trim().toLowerCase()}`;
      
      if (!validTasks.has(taskKey)) return;

      if (!taskWeights.has(taskKey)) {
        taskWeights.set(taskKey, 0);
      }
      
      taskWeights.set(taskKey, taskWeights.get(taskKey)! + weight);
    });

    // Agora processar as linhas
    data.forEach(row => {
      const taskName = row['tarefa'] || row['nome_tarefa'] || row['task_name'] || '';
      const floorValue = row['pavimento'] || row['floor'] || row['andar'] || 0;
      const floorNumber = parseInt(String(floorValue)) || 0;
      const towerId = row['torre'] || row['Torre '] || row['tower_id'] || row['torre_id'] || '';
      const sectorRaw = row['ambiente'] || row['Setor / ambiente'] || row['setor'] || row['sector'] || '';
      // Garantir que sector nunca seja vazio
      const sector = sectorRaw && sectorRaw.trim() !== '' && String(sectorRaw).toLowerCase() !== 'nan'
        ? sectorRaw
        : 'Não especificado';
      const stageWeight = this.parseWeight(row['peso'] || row['weight'] || 0);
      
      if (!taskName) return;

      // Cria uma chave única para tarefa + torre + pavimento + setor
      const taskKey = `${taskName.trim().toLowerCase()}_tower_${towerId.trim()}_floor_${floorNumber}_sector_${sector.trim().toLowerCase()}`;

      // Ignora tarefas inválidas
      if (!validTasks.has(taskKey)) {
        return;
      }

      const taskWeightInProject = taskWeights.get(taskKey) || 0;

      if (!taskMap.has(taskKey)) {
        const task: Task = {
          towerId: towerId || '68f21c5c9490193684524b1b',
          sector: sector,  // Já validado acima
          title: taskName,
          scheduleDate: this.parseISODate(row['mes_planejado'] || row['data_prevista_tarefa'] || row['task_schedule_date'] || ''),
          statusDate: new Date().toISOString(),
          floorNumber: floorNumber,
          observation: row['observacao'] || row['observation'] || '',
          done: row['concluido'] === 'sim' || row['done'] === 'true' || row['concluido'] === true || false,
          completionPercentage: parseFloat(row['percentual_conclusao_tarefa'] || row['task_completion'] || '0'),
          taskWeightInProject: taskWeightInProject,
          stages: []
        };

        taskMap.set(taskKey, task);
      }

      const task = taskMap.get(taskKey)!;
      // sortIndex é baseado na ordem de inserção (começando do 0)
      const sortIndex = task.stages.length;
      const stage = this.rowToStage(row, taskWeightInProject, stageWeight, sortIndex);
      task.stages.push(stage);
    });

    return Array.from(taskMap.values());
  }
}