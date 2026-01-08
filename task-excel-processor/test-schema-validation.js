const XLSX = require('xlsx');

// Ler planilha
const workbook = XLSX.readFile('/home/arthurdequeiroz2005/prog/task-excel/tarefas para teste com ordem.xlsx');
const sheetName = workbook.SheetNames[0];
const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: true });

const parseWeight = (weightStr) => {
  if (!weightStr && weightStr !== 0) return 0;
  if (typeof weightStr === 'number') {
    if (weightStr >= 0 && weightStr <= 1) return weightStr;
    if (weightStr > 1 && weightStr <= 100) return weightStr / 100;
    return weightStr;
  }
  const cleanWeight = String(weightStr).replace(/%/g, '').replace(/,/g, '.').trim();
  const num = parseFloat(cleanWeight) || 0;
  if (num >= 0 && num <= 1) return num;
  if (num > 1 && num <= 100) return num / 100;
  return num;
};

const parseISODate = (dateString) => {
  if (!dateString && dateString !== 0) return new Date().toISOString();
  try {
    if (typeof dateString === 'number') {
      const date = new Date((dateString - 25569) * 86400 * 1000);
      if (!isNaN(date.getTime())) return date.toISOString();
    }
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) return date.toISOString();
  } catch (error) {}
  return new Date().toISOString();
};

// Agrupar e processar primeira tarefa
const taskWeights = {};
data.forEach(row => {
  const taskName = row['tarefa'] || '';
  const towerId = row['torre'] || '';
  const floorNumber = parseInt(row['pavimento'] || 0);
  const key = `${taskName.trim().toLowerCase()}_tower_${towerId.trim()}_floor_${floorNumber}`;
  if (!taskWeights[key]) taskWeights[key] = 0;
  taskWeights[key] += parseWeight(row['peso'] || 0);
});

// Encontrar primeira tarefa completa
const taskMap = {};
data.slice(0, 10).forEach(row => {
  const taskName = row['tarefa'] || '';
  const towerId = row['torre'] || '';
  const floorNumber = parseInt(row['pavimento'] || 0);
  const taskKey = `${taskName.trim().toLowerCase()}_tower_${towerId.trim()}_floor_${floorNumber}`;

  const taskWeightInProject = taskWeights[taskKey] || 0;
  const stageWeight = parseWeight(row['peso'] || 0);

  let weight = taskWeightInProject > 0 ? (stageWeight / taskWeightInProject) * 100 : 0;
  if (!isFinite(weight) || isNaN(weight)) weight = 0;

  const sectorRaw = row['ambiente'] || row['Setor / ambiente'] || row['setor'] || row['sector'] || '';
  const sector = sectorRaw && sectorRaw.trim() !== '' && String(sectorRaw).toLowerCase() !== 'nan'
    ? sectorRaw
    : 'Não especificado';

  const envValue = row['ambiente'] || row['Setor / ambiente'] || row['setor'] || row['environment'] || '';
  const environment = envValue && envValue.trim() !== '' && String(envValue).toLowerCase() !== 'nan'
    ? envValue
    : 'Não especificado';

  const sortIndexValue = row['sortIndex'] || row['sort_index'] || row['indice'] || row['ordem'];
  let sortIndex = typeof sortIndexValue === 'number' ? sortIndexValue : parseInt(String(sortIndexValue));
  if (isNaN(sortIndex)) sortIndex = 0;

  const stage = {
    sortIndex: sortIndex,
    name: row['etapa'] || '',
    weight: weight,
    weightOnProject: stageWeight,
    completionPercentage: parseFloat(row['percentual_conclusao'] || '0'),
    scheduleDate: parseISODate(row['mes_planejado'] || ''),
    environment: environment,
  };

  if (!taskMap[taskKey]) {
    taskMap[taskKey] = {
      towerId: towerId || '68f21c5c9490193684524b1b',
      sector: sector,
      title: taskName,
      scheduleDate: parseISODate(row['mes_planejado'] || ''),
      statusDate: new Date().toISOString(),
      floorNumber: floorNumber,
      observation: row['observacao'] || '',
      done: false,
      completionPercentage: parseFloat(row['percentual_conclusao_tarefa'] || '0'),
      weightOnProject: taskWeightInProject,
      stages: []
    };
  }

  taskMap[taskKey].stages.push(stage);
});

console.log('=== Primeira tarefa gerada ===');
const firstTask = Object.values(taskMap)[0];
console.log(JSON.stringify(firstTask, null, 2));

console.log('\n=== Validações ===');
console.log('towerId é ObjectId válido?', /^[0-9a-fA-F]{24}$/.test(firstTask.towerId));
console.log('sector tem conteúdo?', firstTask.sector && firstTask.sector.length > 0);
console.log('title tem conteúdo?', firstTask.title && firstTask.title.length > 0);
console.log('scheduleDate é válido?', firstTask.scheduleDate && firstTask.scheduleDate.length > 0);
console.log('statusDate é válido?', firstTask.statusDate && firstTask.statusDate.length > 0);
console.log('weightOnProject é número 0-1?', typeof firstTask.weightOnProject === 'number' && firstTask.weightOnProject >= 0 && firstTask.weightOnProject <= 1);
console.log('floorNumber é inteiro?', Number.isInteger(firstTask.floorNumber));
console.log('stages é array?', Array.isArray(firstTask.stages));

if (firstTask.stages.length > 0) {
  const firstStage = firstTask.stages[0];
  console.log('\n=== Primeira Stage ===');
  console.log('sortIndex é inteiro?', Number.isInteger(firstStage.sortIndex));
  console.log('name tem conteúdo?', firstStage.name && firstStage.name.length > 0);
  console.log('weight é número 0-100?', typeof firstStage.weight === 'number' && firstStage.weight >= 0 && firstStage.weight <= 100);
  console.log('weightOnProject é número 0-1?', typeof firstStage.weightOnProject === 'number' && firstStage.weightOnProject >= 0 && firstStage.weightOnProject <= 1);
  console.log('completionPercentage é número 0-100?', typeof firstStage.completionPercentage === 'number' && firstStage.completionPercentage >= 0 && firstStage.completionPercentage <= 100);
  console.log('scheduleDate é válido?', firstStage.scheduleDate && firstStage.scheduleDate.length > 0);
  console.log('environment tem conteúdo?', firstStage.environment && firstStage.environment.length > 0);
  console.log('\nValores:');
  console.log('  weight:', firstStage.weight);
  console.log('  weightOnProject:', firstStage.weightOnProject);
}
