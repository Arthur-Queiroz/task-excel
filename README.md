# Task Excel - Sistema de Processamento de Tarefas

Sistema refatorado para processar planilhas Excel de tarefas, validar dados e enviar para API externa.

## 🎯 Como Funciona

O sistema foi simplificado para funcionar da mesma forma que o script `excel-to-json`:

1. **Processamento**: Lê o Excel e gera `tasks.json` (tarefas válidas) e `errors.json` (erros de validação)
2. **Validação**: Verifica se os pesos das etapas somam 100% por tarefa/pavimento
3. **Envio para API**: Permite enviar apenas as tarefas válidas para a API externa

## 📁 Estrutura

```
task-excel/
├── task-excel-processor/     # Backend (NestJS)
│   └── src/upload/
│       ├── task.processor.ts           # Lógica de processamento (excel-to-json)
│       └── tasks-upload.controller.ts  # Endpoints da API
└── task-excel-frontend/       # Frontend (React + Vite)
    └── src/
        ├── App.tsx            # Interface principal
        └── App.css            # Estilos
```

## 🚀 Como Usar

### 1. Iniciar o Backend

```bash
cd task-excel-processor
npm install
npm run start:dev
```

O backend estará disponível em `http://localhost:3000`

### 2. Iniciar o Frontend

```bash
cd task-excel-frontend/task-excel-frontend
npm install
npm run dev
```

O frontend estará disponível em `http://localhost:5173`

### 3. Processar Planilha

1. Acesse `http://localhost:5173`
2. Selecione uma planilha Excel (.xlsx ou .xls)
3. O sistema processará automaticamente e mostrará:
   - ✅ Tarefas válidas (com pesos somando 100%)
   - ❌ Erros de validação (tarefas com pesos incorretos)

### 4. Enviar para API Externa (Opcional)

1. Configure a API externa:
   - URL Base: `https://v2-kwwmyyzjzq-uc.a.run.app`
   - Endpoint: `/tasks/create-many`
   - Token JWT: (fornecido)

2. Clique em "🚀 Enviar para API Externa"
3. Visualize o resultado do envio

## 🔌 Endpoints da API

### POST `/tasks-upload/process`
Processa o arquivo Excel e retorna tasks válidas e errors.

**Request:**
```
Content-Type: multipart/form-data
file: <arquivo.xlsx>
```

**Response:**
```json
{
  "success": true,
  "message": "Arquivo processado com sucesso",
  "tasks": [...],
  "errors": {
    "timestamp": "2025-10-21T...",
    "totalErrors": 2,
    "errors": [...]
  },
  "summary": {
    "totalRows": 50,
    "validTasks": 10,
    "invalidTasks": 2
  }
}
```

### POST `/tasks-upload/send-to-api`
Envia tasks para a API externa.

**Request:**
```json
{
  "baseUrl": "https://v2-kwwmyyzjzq-uc.a.run.app",
  "endpoint": "/tasks/create-many",
  "token": "eyJhbGc...",
  "tasks": [...]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tarefas enviadas com sucesso",
  "apiResponse": {...}
}
```

## 📋 Formato da Planilha

A planilha deve conter as seguintes colunas:

- `tarefa` - Nome da tarefa
- `pavimento` - Número do pavimento
- `etapa` - Nome da etapa
- `peso` - Peso da etapa (deve somar 100% por tarefa/pavimento)
- `Torre ` - Torre (ID será mapeado automaticamente)
- `Setor / ambiente` - Setor/ambiente
- `mes_planejado` - Data planejada

## ✅ Validações

### Validação de Pesos
- Agrupa etapas por `tarefa` + `pavimento`
- Verifica se a soma dos pesos = 100%
- Apenas tarefas com pesos corretos são incluídas no `tasks.json`
- Tarefas com erros vão para o `errors.json`

### Exemplo de Erro
```json
{
  "taskName": "Instalação Elétrica",
  "floorNumber": 1,
  "totalWeight": 95.5,
  "expectedWeight": 100,
  "difference": -4.5,
  "message": "A soma dos pesos da tarefa \"Instalação Elétrica\" no pavimento 1 é 95.50%, deveria ser 100%"
}
```

## 🔧 Configuração

### Token da API Externa
O token já está pré-configurado no frontend:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODk0OTg4ZjA0ZDNiNWFiZjVlZDhlYjUiLCJlbWFpbCI6InRpQGVuZ2VuaGFyaWFsZW1lLmNvbS5iciIsImFjY2Vzc1R5cGUiOiJhZG1pbiIsImlhdCI6MTc2MTA1NDU4MSwiZXhwIjoxNzYxMDU4MTgxfQ.tpkelE6cLeoUObcX-yHEbFnUNi7vCp4hgsyJC0ulMxE
```

## 🎨 Interface

- **Upload**: Arraste e solte ou clique para selecionar arquivo
- **Processamento**: Automático após seleção do arquivo
- **Visualização**: 
  - Resumo (total de linhas, tarefas válidas/inválidas)
  - Lista de tarefas válidas com detalhes
  - Lista de erros de validação
- **Envio**: Botão para enviar tarefas válidas para API externa

## 📝 Mudanças em Relação à Versão Anterior

1. ✅ Removidas validações complexas do frontend e backend
2. ✅ Implementada mesma lógica do `excel-to-json.ts`
3. ✅ Separação clara entre processamento e envio para API
4. ✅ Interface simplificada e intuitiva
5. ✅ Exibição clara de tarefas válidas e erros

## 🐛 Troubleshooting

**Erro: "Planilha está vazia"**
- Verifique se a primeira aba contém dados

**Erro: "A soma dos pesos não é 100%"**
- Verifique se todas as etapas da tarefa/pavimento somam exatamente 100%
- Considere arredondamentos (o sistema aceita até 2 casas decimais)

**Erro ao enviar para API**
- Verifique se o token está correto
- Verifique se a URL e endpoint estão corretos
- Verifique a conexão com a internet

