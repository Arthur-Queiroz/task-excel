import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Interfaces para tipagem
interface MeasurementDate {
  date: string;
  measuredPercentage: number;
  measuredBy: string;
}

interface Stage {
  name: string;
  weight: number;
  completionPercentage: number;
  scheduleDate: string;
  environment: string;
  measurementDates?: MeasurementDate[];
}

interface Task {
  towerId: string;
  sector: string;
  title: string;
  scheduleDate: string;
  statusDate: string;
  floorNumber: number;
  observation?: string;
  done: boolean;
  completionPercentage: number;
  stages: Stage[];
}

interface ExcelRow {
  [key: string]: any;
}

interface ValidationError {
  taskName: string;
  floorNumber: number;
  totalWeight: number;
  message: string;
}

/**
 * Lê a planilha Excel e retorna os dados como array de objetos
 */
function readExcelFile(filePath: string): ExcelRow[] {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const data: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, { 
      raw: true,  // Ler valores exatos sem formatação do Excel
      defval: ''
    });

    return data;
  } catch (error) {
    console.error('Erro ao ler arquivo Excel:', error);
    throw error;
  }
}

/**
 * Exibe as colunas da planilha para debug
 */
function debugColumns(data: ExcelRow[]): void {
  if (data.length === 0) {
    console.log('Nenhum dado encontrado na planilha');
    return;
  }

  console.log('\n=== COLUNAS ENCONTRADAS NA PLANILHA ===');
  const firstRow = data[0];
  const columns = Object.keys(firstRow);
  columns.forEach((col, index) => {
    const sampleValue = firstRow[col];
    console.log(`${index + 1}. "${col}" = "${sampleValue}"`);
  });
  console.log('=======================================\n');
}

/**
 * Remove símbolo de porcentagem e converte para número
 * Detecta se é formato decimal do Excel (0.188 = 18.8% ou 1 = 100%)
 */
function parseWeight(weightStr: string | number): number {
  if (!weightStr && weightStr !== 0) return 0;
  
  // Se já é número
  if (typeof weightStr === 'number') {
    // Se for <= 1, é formato decimal do Excel (0.188 = 18.8%, 1 = 100%)
    if (weightStr > 0 && weightStr <= 1) {
      return weightStr * 100;
    }
    return weightStr;
  }
  
  // Se for string, remove %, espaços e converte
  const cleanWeight = String(weightStr).replace(/%/g, '').replace(/,/g, '.').trim();
  const num = parseFloat(cleanWeight) || 0;
  
  // Se for <= 1, multiplica por 100
  if (num > 0 && num <= 1) {
    return num * 100;
  }
  
  return num;
}

/**
 * Valida se os pesos das etapas somam 100% por tarefa e pavimento
 * Retorna tanto os erros quanto as tarefas válidas
 */
function validateWeights(data: ExcelRow[]): { errors: ValidationError[], validTasks: Set<string> } {
  const errors: ValidationError[] = [];
  const validTasks = new Set<string>();

  // Agrupa por nome da tarefa e pavimento
  const groupedTasks = new Map<string, { floorNumber: number; weights: number[] }[]>();

  data.forEach(row => {
    const taskName = row['tarefa'] || row['nome_tarefa'] || row['nomeTarefa'] || row['task_name'] || '';
    const floorValue = row['pavimento'] || row['floor'] || row['andar'] || 0;
    const floorNumber = parseInt(String(floorValue)) || 0;
    const weight = parseWeight(row['peso'] || row['weight'] || 0);

    if (!taskName) return;

    const key = taskName.trim().toLowerCase();

    if (!groupedTasks.has(key)) {
      groupedTasks.set(key, []);
    }

    const taskFloors = groupedTasks.get(key)!;
    let floorGroup = taskFloors.find(f => f.floorNumber === floorNumber);

    if (!floorGroup) {
      floorGroup = { floorNumber, weights: [] };
      taskFloors.push(floorGroup);
    }

    floorGroup.weights.push(weight);
  });

  // Valida se a soma dos pesos é 100% para cada grupo
  groupedTasks.forEach((floors, taskName) => {
    floors.forEach(floorGroup => {
      const totalWeight = floorGroup.weights.reduce((sum, w) => sum + w, 0);
      const taskKey = `${taskName}_floor_${floorGroup.floorNumber}`;
      
      // Arredonda para 2 casas decimais para evitar erros de ponto flutuante
      const totalWeightRounded = Math.round(totalWeight * 100) / 100;
      
      if (totalWeightRounded !== 100) {
        errors.push({
          taskName,
          floorNumber: floorGroup.floorNumber,
          totalWeight: totalWeightRounded,
          message: `A soma dos pesos da tarefa "${taskName}" no pavimento ${floorGroup.floorNumber} é ${totalWeightRounded.toFixed(2)}%, deveria ser 100%`
        });
      } else {
        // Tarefa válida - adiciona ao conjunto
        validTasks.add(taskKey);
      }
    });
  });

  return { errors, validTasks };
}

/**
 * Converte uma linha do Excel para o formato de Stage
 */
function rowToStage(row: ExcelRow): Stage {
  const stage: Stage = {
    name: row['etapa'] || row['nome_etapa'] || row['stage_name'] || '',
    weight: parseWeight(row['peso'] || row['weight'] || '0'),
    completionPercentage: parseFloat(row['percentual_conclusao'] || row['completion'] || '0'),
    scheduleDate: parseISODate(row['mes_planejado'] || row['data_prevista'] || row['schedule_date'] || ''),
    environment: row['Setor / ambiente'] || row['ambiente'] || row['environment'] || '',
  };

  // Adiciona measurementDates se existir
  if (row['data_medicao']) {
    stage.measurementDates = [{
      date: parseISODate(row['data_medicao']),
      measuredPercentage: parseFloat(row['percentual_medido'] || '0'),
      measuredBy: row['medido_por'] || row['measured_by'] || ''
    }];
  }

  return stage;
}

/**
 * Converte data para formato ISO
 */
function parseISODate(dateString: string): string {
  if (!dateString) {
    return new Date().toISOString();
  }

  try {
    // Tenta converter diferentes formatos de data
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch (error) {
    console.warn(`Data inválida: ${dateString}`);
  }

  return new Date().toISOString();
}

/**
 * Agrupa as linhas por tarefa e pavimento, criando o JSON final
 * Filtra apenas as tarefas válidas (com pesos somando 100%)
 */
function transformToTasks(data: ExcelRow[], validTasks: Set<string>): Task[] {
  const taskMap = new Map<string, Task>();

  data.forEach(row => {
    const taskName = row['tarefa'] || row['nome_tarefa'] || row['task_name'] || '';
    const floorValue = row['pavimento'] || row['floor'] || row['andar'] || 0;
    const floorNumber = parseInt(String(floorValue)) || 0;
    
    if (!taskName) return;

    // Cria uma chave única para tarefa + pavimento
    const taskKey = `${taskName.trim().toLowerCase()}_floor_${floorNumber}`;

    // Ignora tarefas inválidas
    if (!validTasks.has(taskKey)) {
      return;
    }

    if (!taskMap.has(taskKey)) {
      const task: Task = {
        towerId: row['Torre '] || row['torre'] || row['tower_id'] || row['torre_id'] || '68f21c5c9490193684524b1b',
        sector: row['Setor / ambiente'] || row['setor'] || row['sector'] || '',
        title: taskName,
        scheduleDate: parseISODate(row['mes_planejado'] || row['data_prevista_tarefa'] || row['task_schedule_date'] || ''),
        statusDate: new Date().toISOString(),
        floorNumber: floorNumber,
        observation: row['observacao'] || row['observation'] || '',
        done: row['concluido'] === 'sim' || row['done'] === 'true' || row['concluido'] === true || false,
        completionPercentage: parseFloat(row['percentual_conclusao_tarefa'] || row['task_completion'] || '0'),
        stages: []
      };

      taskMap.set(taskKey, task);
    }

    const task = taskMap.get(taskKey)!;
    const stage = rowToStage(row);
    task.stages.push(stage);
  });

  return Array.from(taskMap.values());
}

/**
 * Função principal
 */
function main() {
  const excelFilePath = path.join(__dirname, '..', 'Modelo de tarefas.xlsx');
  const outputPath = path.join(__dirname, '..', 'tasks.json');
  const errorsPath = path.join(__dirname, '..', 'errors.json');

  console.log('Lendo planilha Excel...');
  const data = readExcelFile(excelFilePath);
  console.log(`${data.length} linhas lidas`);

  console.log('Validando pesos...');
  const { errors: validationErrors, validTasks } = validateWeights(data);

  console.log(`\nTarefas válidas: ${validTasks.size}`);
  console.log(`Tarefas com erros: ${validationErrors.length}`);

  console.log('\nTransformando dados (apenas tarefas válidas)...');
  const tasks = transformToTasks(data, validTasks);
  console.log(`${tasks.length} tarefas processadas com sucesso`);

  console.log('\nSalvando tasks.json...');
  fs.writeFileSync(outputPath, JSON.stringify(tasks, null, 2), 'utf-8');
  console.log(`Arquivo salvo em: ${outputPath}`);

  console.log('\nResumo das tarefas processadas:');
  tasks.forEach(task => {
    console.log(`  ✓ ${task.title} (Pavimento ${task.floorNumber}): ${task.stages.length} etapas`);
  });

  // Salva erros de validação em arquivo JSON (se houver)
  if (validationErrors.length > 0) {
    console.log('\nSalvando errors.json...');
    const errorsOutput = {
      timestamp: new Date().toISOString(),
      totalErrors: validationErrors.length,
      errors: validationErrors.map(error => ({
        taskName: error.taskName,
        floorNumber: error.floorNumber,
        totalWeight: error.totalWeight,
        expectedWeight: 100,
        difference: parseFloat((error.totalWeight - 100).toFixed(2)),
        message: error.message
      }))
    };
    fs.writeFileSync(errorsPath, JSON.stringify(errorsOutput, null, 2), 'utf-8');
    console.log(`Arquivo de erros salvo em: ${errorsPath}`);

    console.log('\n' + '='.repeat(70));
    console.log('  TAREFAS NÃO PROCESSADAS (Erros de Validação)');
    console.log('='.repeat(70));
    console.log('\nAs seguintes tarefas NÃO foram incluídas no JSON porque');
    console.log('a soma dos pesos não é 100%:\n');

    validationErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.message}`);
    });

    console.log('\n' + '='.repeat(70));
    console.log(`\n ATENÇÃO: ${validationErrors.length} tarefas não foram processadas devido a erros de peso.`);
    console.log(`✓  SUCESSO: ${tasks.length} tarefas foram processadas corretamente.\n`);
  } else {
    console.log('\n✓ Todas as tarefas foram processadas com sucesso!');
    // Remove errors.json se existir e não há erros
    if (fs.existsSync(errorsPath)) {
      fs.unlinkSync(errorsPath);
      console.log('Arquivo errors.json removido (nenhum erro encontrado)');
    }
  }

  console.log('Processo concluído!');
}

// Executa o script
if (require.main === module) {
  main();
}

export {
  readExcelFile,
  debugColumns,
  parseWeight,
  validateWeights,
  transformToTasks,
  ValidationError,
  Task,
  Stage
};

