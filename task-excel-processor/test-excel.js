const XLSX = require('xlsx');
const workbook = XLSX.readFile('/home/arthurdequeiroz2005/prog/task-excel/tarefas para teste com ordem.xlsx');
const sheetName = workbook.SheetNames[0];
const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { raw: true });

// Agrupar por tarefa + torre + pavimento
const groups = {};
data.forEach(row => {
  const taskName = row.tarefa || '';
  const towerId = row.torre || '';
  const floorNumber = parseInt(row.pavimento || 0);
  const key = `${taskName.trim().toLowerCase()}_tower_${towerId.trim()}_floor_${floorNumber}`;

  if (!groups[key]) {
    groups[key] = { taskName, towerId, floorNumber, stages: [], totalWeight: 0 };
  }

  groups[key].stages.push({
    etapa: row.etapa,
    peso: row.peso
  });
  groups[key].totalWeight += row.peso || 0;
});

console.log('Primeiros 3 grupos:');
Object.entries(groups).slice(0, 3).forEach(([key, group]) => {
  console.log(`\nGrupo: ${key}`);
  console.log(`  Tarefa: ${group.taskName}`);
  console.log(`  Torre: ${group.towerId}`);
  console.log(`  Pavimento: ${group.floorNumber}`);
  console.log(`  Total Weight: ${group.totalWeight}`);
  console.log(`  Num Stages: ${group.stages.length}`);

  // Simular cálculo do weight para primeira etapa
  const stageWeight = group.stages[0].peso;
  const taskWeight = group.totalWeight;
  const calculatedWeight = taskWeight > 0 ? (stageWeight / taskWeight) * 100 : 0;
  console.log(`  Primeira etapa:`, group.stages[0]);
  console.log(`  Calculated weight: ${calculatedWeight}% (${stageWeight} / ${taskWeight} * 100)`);
});
