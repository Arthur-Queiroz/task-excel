const XLSX = require('xlsx');
const workbook = XLSX.readFile('/home/arthurdequeiroz2005/prog/task-excel/tarefas para teste com ordem.xlsx');
const sheetName = workbook.SheetNames[0];
const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: true });

console.log('Total de linhas:', data.length);
console.log('\n=== Primeira linha da planilha ===');
console.log(JSON.stringify(data[0], null, 2));

// Simular o processamento
const parseWeight = (weightStr) => {
  if (!weightStr && weightStr !== 0) return 0;

  if (typeof weightStr === 'number') {
    if (weightStr >= 0 && weightStr <= 1) {
      return weightStr;
    }
    if (weightStr > 1 && weightStr <= 100) {
      return weightStr / 100;
    }
    return weightStr;
  }

  const cleanWeight = String(weightStr).replace(/%/g, '').replace(/,/g, '.').trim();
  const num = parseFloat(cleanWeight) || 0;

  if (num >= 0 && num <= 1) {
    return num;
  }

  if (num > 1 && num <= 100) {
    return num / 100;
  }

  return num;
};

// Agrupar por tarefa + torre + pavimento
const taskWeights = {};
data.forEach(row => {
  const taskName = row['tarefa'] || '';
  const towerId = row['torre'] || '';
  const floorNumber = parseInt(row['pavimento'] || 0);
  const key = `${taskName.trim().toLowerCase()}_tower_${towerId.trim()}_floor_${floorNumber}`;

  if (!taskWeights[key]) {
    taskWeights[key] = 0;
  }

  taskWeights[key] += parseWeight(row['peso'] || 0);
});

// Processar primeira tarefa
const firstRow = data[0];
const taskName = firstRow['tarefa'] || '';
const towerId = firstRow['torre'] || '';
const floorNumber = parseInt(firstRow['pavimento'] || 0);
const taskKey = `${taskName.trim().toLowerCase()}_tower_${towerId.trim()}_floor_${floorNumber}`;

const taskWeightInProject = taskWeights[taskKey];
const stageWeightInProject = parseWeight(firstRow['peso'] || 0);

console.log('\n=== Cálculo do weight para primeira etapa ===');
console.log('taskWeightInProject:', taskWeightInProject);
console.log('stageWeightInProject:', stageWeightInProject);

let weight = taskWeightInProject > 0
  ? (stageWeightInProject / taskWeightInProject) * 100
  : 0;

if (!isFinite(weight) || isNaN(weight)) {
  weight = 0;
}

console.log('weight calculado:', weight);
console.log('weightOnProject:', stageWeightInProject);

// Simular criação do stage
const sortIndexValue = firstRow['sortIndex'] || firstRow['sort_index'] || firstRow['indice'] || firstRow['ordem'];
let sortIndex = typeof sortIndexValue === 'number' ? sortIndexValue : parseInt(String(sortIndexValue));

if (isNaN(sortIndex)) {
  sortIndex = 0;
}

const stage = {
  sortIndex: sortIndex,
  name: firstRow['etapa'] || '',
  weight: weight,
  weightOnProject: stageWeightInProject,
  completionPercentage: parseFloat(firstRow['percentual_conclusao'] || '0'),
  scheduleDate: new Date().toISOString(),
  environment: firstRow['ambiente'] || 'Não especificado',
};

console.log('\n=== Stage gerado ===');
console.log(JSON.stringify(stage, null, 2));
