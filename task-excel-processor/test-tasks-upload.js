const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testTasksUpload() {
  console.log('🧪 Teste de Upload de Tarefas\n');
  console.log('='.repeat(50));
  
  try {
    // Verificar se o servidor está rodando
    console.log('\n1. Verificando servidor...');
    try {
      const healthResponse = await axios.get('http://localhost:3000/tasks-upload/health');
      console.log('✅ Servidor está rodando');
      console.log('   Response:', healthResponse.data);
    } catch (error) {
      console.error('❌ Servidor não está rodando. Execute: npm run start:dev');
      return;
    }

    // Verificar se o arquivo existe
    const filePath = path.join(__dirname, 'docs', 'Modelo de tarefas.xlsx');
    if (!fs.existsSync(filePath)) {
      console.error('❌ Arquivo não encontrado:', filePath);
      return;
    }
    console.log('✅ Arquivo encontrado:', filePath);

    // Preparar FormData
    console.log('\n2. Preparando upload...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));

    // Teste 1: Apenas validação
    console.log('\n3. Testando validação apenas (sem envio para API)...');
    try {
      const validateResponse = await axios.post(
        'http://localhost:3000/tasks-upload/validate-only',
        formData,
        {
          headers: formData.getHeaders(),
        }
      );

      console.log('✅ Validação concluída com sucesso!');
      console.log('\n📊 Resultados da validação:');
      console.log('   Total de grupos:', validateResponse.data.processamento.totalGrupos);
      console.log('   Total de linhas:', validateResponse.data.processamento.totalLinhas);
      console.log('   Tarefas válidas:', validateResponse.data.processamento.validos);
      console.log('   Tarefas inválidas:', validateResponse.data.processamento.invalidos);

      if (validateResponse.data.processamento.erros.length > 0) {
        console.log('\n⚠️  Erros encontrados:');
        validateResponse.data.processamento.erros.slice(0, 5).forEach(erro => {
          console.log(`   - Grupo ${erro.grupo}:`, erro.erro);
          if (erro.detalhes && erro.detalhes.length > 0) {
            erro.detalhes.forEach(detalhe => {
              console.log(`     ${detalhe.campo}: ${detalhe.msg || JSON.stringify(detalhe)}`);
            });
          }
        });
        if (validateResponse.data.processamento.erros.length > 5) {
          console.log(`   ... e mais ${validateResponse.data.processamento.erros.length - 5} erros`);
        }
      }

      // Mostrar exemplos de tarefas válidas
      if (validateResponse.data.tasks && validateResponse.data.tasks.length > 0) {
        console.log('\n📝 Exemplo de tarefa transformada:');
        const exampleTask = validateResponse.data.tasks[0];
        console.log(JSON.stringify(exampleTask, null, 2));
      }

      // Salvar resultado completo em arquivo
      const outputPath = path.join(__dirname, 'test-tasks-result.json');
      fs.writeFileSync(outputPath, JSON.stringify(validateResponse.data, null, 2));
      console.log('\n💾 Resultado completo salvo em:', outputPath);

    } catch (error) {
      console.error('❌ Erro na validação:', error.response?.data || error.message);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Teste concluído!');

  } catch (error) {
    console.error('\n❌ Erro geral:', error.message);
  }
}

testTasksUpload();


