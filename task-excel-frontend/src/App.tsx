import { useState } from 'react'
import axios from 'axios'
import './App.css'

interface ApiConfig {
  baseUrl: string
  endpoint: string
  token: string
}

interface Stage {
  name: string
  weightInTask: number        // Peso da etapa na tarefa
  weightInProject: number     // Peso da etapa no projeto
  completionPercentage: number
  scheduleDate: string
  environment: string
  measurementDates?: any[]
}

interface Task {
  towerId: string
  sector: string
  title: string
  scheduleDate: string
  statusDate: string
  floorNumber: number
  observation?: string
  done: boolean
  completionPercentage: number
  taskWeightInProject: number  // Peso da tarefa no projeto (soma das etapas)
  stages: Stage[]
}

interface ValidationError {
  type?: string
  taskName?: string
  floorNumber?: number
  towerId?: string
  totalWeight: number
  expectedWeight?: number
  difference: number
  message: string
}

interface ProcessResult {
  success: boolean
  message?: string
  tasks: Task[]
  errors: {
    timestamp: string
    totalErrors: number
    errors: ValidationError[]
  } | null
  summary: {
    totalRows: number
    validTasks: number
    invalidTasks: number
    projectWeightTotal?: number
  }
}

interface ApiSendResult {
  success: boolean
  message: string
  apiResponse?: any
  error?: any
}

function App() {
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null)
  const [isSendingToApi, setIsSendingToApi] = useState(false)
  const [apiSendResult, setApiSendResult] = useState<ApiSendResult | null>(null)
  const [sendProgress, setSendProgress] = useState<string>('')

  // Configuração fixa da API externa
  const apiConfig: ApiConfig = {
    baseUrl: 'https://v2-kwwmyyzjzq-uc.a.run.app',
    endpoint: '/tasks/create-many',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODk0OTg4ZjA0ZDNiNWFiZjVlZDhlYjUiLCJlbWFpbCI6InRpQGVuZ2VuaGFyaWFsZW1lLmNvbS5iciIsImFjY2Vzc1R5cGUiOiJhZG1pbiIsImlhdCI6MTc2NTg4NDg4NSwiZXhwIjoxNzY1ODg4NDg1fQ.QDkfto-YsyzGM2jyxeks81_DNd2f36FbTFYT-Y7VIjw'
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError(null)
    setIsProcessing(true)
    setProcessResult(null)
    setApiSendResult(null)

    try {
      // Validar se é um arquivo Excel
      if (!file.name.match(/\.(xlsx|xls)$/)) {
        throw new Error('Por favor, selecione um arquivo Excel válido (.xlsx ou .xls)')
      }

      // Processar arquivo imediatamente
      await processFile(file)
    } catch (err: any) {
      setError(`❌ ${err.message || 'Erro ao processar arquivo'}`)
      console.error('Erro ao processar arquivo:', err)
      setIsProcessing(false)
    }
  }

  const processFile = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post<ProcessResult>(
        'http://localhost:3000/tasks-upload/process',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )

      setProcessResult(response.data)
      setIsProcessing(false)
    } catch (err) {
      setIsProcessing(false)
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || err.message
        setError(`❌ ${errorMessage}`)
      } else {
        setError('❌ Erro desconhecido ao processar arquivo')
      }
      console.error('Erro ao processar arquivo:', err)
    }
  }

  // ← ADICIONADO: Mapear nossa Task para o formato da API externa
  const mapTaskToApiFormat = (task: Task) => {
    // Garantir que sector nunca seja vazio
    const sector = task.sector && task.sector.trim() !== '' && task.sector !== 'NaN' 
      ? task.sector 
      : 'Não especificado';

    // Garantir que floorNumber seja >= 0
    const floorNumber = task.floorNumber >= 0 ? task.floorNumber : 0;

    return {
      towerId: task.towerId,
      sector: sector,
      title: task.title,
      scheduleDate: task.scheduleDate,
      completionDate: null,
      statusDate: task.statusDate,
      weightOnProject: task.taskWeightInProject,  // decimal (0-1)
      completionPercentage: task.completionPercentage,
      observation: task.observation || '',
      done: task.done,
      floorNumber: floorNumber,
      stages: task.stages.map(stage => {
        // Garantir que environment nunca seja vazio
        const environment = stage.environment && stage.environment.trim() !== '' && stage.environment !== 'NaN'
          ? stage.environment
          : 'Não especificado';

        return {
          name: stage.name,
          weight: stage.weightInTask * 100,  // Converter decimal para percentual (0-100)
          weightOnProject: stage.weightInProject,  // decimal (0-1)
          completionPercentage: stage.completionPercentage,
          scheduleDate: stage.scheduleDate,
          environment: environment,
          measurementDates: stage.measurementDates || []
        };
      })
    }
  }

  const sendToApi = async () => {
    if (!processResult || !processResult.tasks || processResult.tasks.length === 0) {
      setError('❌ Nenhuma tarefa válida para enviar')
      return
    }

    setIsSendingToApi(true)
    setError(null)
    setApiSendResult(null)
    setSendProgress('')

    try {
      const totalTasks = processResult.tasks.length
      const BATCH_SIZE = 50 // Enviar 50 tarefas por vez
      const totalBatches = Math.ceil(totalTasks / BATCH_SIZE)
      
      console.log(`📦 Enviando ${totalTasks} tarefas em ${totalBatches} lote(s) de ${BATCH_SIZE}`)

      let successCount = 0
      let errorCount = 0
      const errors: any[] = []
      const allResponses: any[] = []

      // Enviar em lotes
      for (let i = 0; i < totalBatches; i++) {
        const start = i * BATCH_SIZE
        const end = Math.min(start + BATCH_SIZE, totalTasks)
        const batch = processResult.tasks.slice(start, end)

        // Mapear tasks para o formato da API externa
        const mappedBatch = batch.map(mapTaskToApiFormat)

        setSendProgress(`Enviando lote ${i + 1}/${totalBatches}...`)
        console.log(`📤 Enviando lote ${i + 1}/${totalBatches} (${batch.length} tarefas)...`)

        try {
          const response = await axios.post(
            'https://v2-kwwmyyzjzq-uc.a.run.app/tasks/create-many',
            mappedBatch,  // Enviar array direto de tarefas
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiConfig.token}`
              },
            }
          )

          // Armazenar resposta
          allResponses.push({
            batchNumber: i + 1,
            tasksCount: batch.length,
            response: response.data
          })

          if (response.status === 200 || response.status === 201) {
            successCount += batch.length
            console.log(`✅ Lote ${i + 1} enviado com sucesso`)
          } else {
            errorCount += batch.length
            errors.push({
              batch: i + 1,
              error: `Status ${response.status}: ${response.statusText}`
            })
            console.error(`❌ Erro no lote ${i + 1}:`, response.statusText)
          }
        } catch (err) {
          errorCount += batch.length
          const errorMsg = axios.isAxiosError(err) 
            ? err.response?.data?.message || err.message 
            : 'Erro desconhecido'
          errors.push({
            batch: i + 1,
            error: errorMsg,
            details: axios.isAxiosError(err) ? err.response?.data : null
          })
          
          // Armazenar erro
          allResponses.push({
            batchNumber: i + 1,
            tasksCount: batch.length,
            error: errorMsg,
            details: axios.isAxiosError(err) ? err.response?.data : null
          })
          
          console.error(`❌ Erro ao enviar lote ${i + 1}:`, errorMsg)
        }

        // Pequeno delay entre lotes para não sobrecarregar a API
        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      setSendProgress('')

      // Salvar JSON de debug
      const debugData = {
        timestamp: new Date().toISOString(),
        totalTasks,
        totalBatches,
        successCount,
        errorCount,
        allResponses,
        errors: errors.length > 0 ? errors : null
      }
      console.log('📝 Respostas completas:', debugData)
      
      // Criar blob e baixar
      const blob = new Blob([JSON.stringify(debugData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `api-responses-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      console.log('✅ Arquivo de respostas salvo!')

      // Resultado final
      if (errorCount === 0) {
        setApiSendResult({
          success: true,
          message: `✅ Todas as ${totalTasks} tarefas foram enviadas com sucesso em ${totalBatches} lote(s)!`
        })
      } else if (successCount > 0) {
        setApiSendResult({
          success: false,
          message: `⚠️ Enviadas ${successCount} de ${totalTasks} tarefas. ${errorCount} falharam.`,
          error: errors
        })
      } else {
        setApiSendResult({
          success: false,
          message: `❌ Falha ao enviar todas as tarefas`,
          error: errors
        })
      }

      setIsSendingToApi(false)
    } catch (err) {
      setIsSendingToApi(false)
      setSendProgress('')
      if (axios.isAxiosError(err)) {
        const errorData = err.response?.data
        const errorMessage = errorData?.message || err.message
        setError(`❌ ${errorMessage}`)
        setApiSendResult({
          success: false,
          message: errorMessage,
          error: errorData?.error
        })
      } else {
        setError('❌ Erro desconhecido ao enviar para API')
      }
      console.error('Erro ao enviar para API:', err)
    }
  }

  // ← ADICIONADO: Função para baixar JSON das tarefas processadas
  const downloadProcessedJson = () => {
    if (!processResult) return
    
    const blob = new Blob([JSON.stringify(processResult, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tasks-processed-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    console.log('✅ Tarefas processadas salvas em JSON!')
  }

  const resetUpload = () => {
    setError(null)
    setProcessResult(null)
    setApiSendResult(null)
    setIsProcessing(false)
    setIsSendingToApi(false)
    setSendProgress('')
    // Limpar o input file
    const fileInput = document.getElementById('file-input') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  const formatWeight = (weight: number): string => {
    const percentage = weight * 100
    
    // Se for muito pequeno (< 0.01%), mostrar mais casas decimais
    if (percentage > 0 && percentage < 0.01) {
      return `${percentage.toFixed(4)}%`
    }
    
    // Se for 0, mostrar 0.00%
    if (percentage === 0) {
      return '0.00%'
    }
    
    // Caso normal, 2 casas decimais
    return `${percentage.toFixed(2)}%`
  }

  return (
    <div className="app">
      <div className="container">
        <h1>📊 Processador de Tarefas Excel</h1>
        <p className="subtitle">Sistema de validação e importação com diferenciação por Torre, Pavimento e Setor</p>

        {processResult ? (
          <div className="result-section">
            <div className="result-card">
              <h2>✅ Processamento Concluído</h2>

              <div className="result-summary">
                <div className="summary-item">
                  <span className="label">Total de linhas:</span>
                  <span className="value">{processResult.summary.totalRows}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Tarefas válidas:</span>
                  <span className="value valid">{processResult.summary.validTasks}</span>
                </div>
                {processResult.summary.invalidTasks > 0 && (
                  <div className="summary-item">
                    <span className="label">Tarefas inválidas:</span>
                    <span className="value invalid">{processResult.summary.invalidTasks}</span>
                  </div>
                )}
                {processResult.summary.projectWeightTotal !== undefined && (
                  <div className="summary-item highlight">
                    <span className="label">Peso total do projeto:</span>
                    <span className="value success">
                      {formatWeight(processResult.summary.projectWeightTotal)}
                    </span>
                  </div>
                )}
              </div>

              {/* Mensagem sobre validação */}
              <div className="validation-info">
                <h4>ℹ️ Nova Regra de Validação</h4>
                <p>
                  ✅ <strong>Validação no projeto:</strong> A soma de TODOS os pesos deve ser 100%
                  <br />
                  ✅ <strong>Tarefas individuais:</strong> NÃO precisam somar 100%
                  <br />
                  ✅ <strong>Diferenciação:</strong> Torre → Pavimento → Setor
                </p>
              </div>

              {/* Exibir tarefas válidas */}
              {processResult.tasks.length > 0 && (
                <div className="tasks-section">
                  <h3>✓ Tarefas Válidas ({processResult.tasks.length})</h3>
                  <div className="tasks-list">
                    {processResult.tasks.map((task, index) => (
                      <div key={index} className="task-item">
                        <div className="task-header">
                          <strong>{task.title}</strong>
                          <div className="task-badges">
                            <span className="task-tower">{task.towerId}</span>
                            <span className="task-floor">Pav {task.floorNumber}</span>
                            <span className="task-sector">{task.sector}</span>
                          </div>
                        </div>
                        <div className="task-details">
                          <div className="task-weight-info">
                            <span className="weight-label">Peso no projeto:</span>
                            <span className="weight-value">{formatWeight(task.taskWeightInProject)}</span>
                          </div>
                          <p><strong>Etapas:</strong> {task.stages.length}</p>
                          <div className="stages-summary">
                            {task.stages.map((stage, idx) => (
                              <div key={idx} className="stage-badge" title={stage.name}>
                                <span className="stage-name">{stage.name}</span>
                                <span className="stage-weight">
                                  {formatWeight(stage.weightInProject)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Exibir erros de validação */}
              {processResult.errors && processResult.errors.errors.length > 0 && (
                <div className="errors-section">
                  <h3>❌ Erros de Validação ({processResult.errors.totalErrors})</h3>
                  <p className="errors-description">
                    {processResult.errors.errors[0].type === 'PROJECT_WEIGHT_ERROR' 
                      ? 'Erro crítico: A soma total dos pesos no projeto não é 100%'
                      : 'As seguintes tarefas apresentaram problemas:'
                    }
                  </p>
                  <div className="errors-list">
                    {processResult.errors.errors.map((error, index) => (
                      <div key={index} className="error-item">
                        {error.type === 'PROJECT_WEIGHT_ERROR' ? (
                          <>
                            <div className="error-header">
                              <strong className="error-task-name">Validação do Projeto</strong>
                            </div>
                            <p className="error-message">{error.message}</p>
                            <div className="error-detail">
                              <span>Peso total: <strong>{error.totalWeight.toFixed(2)}%</strong></span>
                              <span className={error.difference > 0 ? 'diff-positive' : 'diff-negative'}>
                                Diferença: {error.difference > 0 ? '+' : ''}{error.difference.toFixed(2)}%
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="error-header">
                              <strong className="error-task-name">{error.taskName}</strong>
                              <div className="error-badges">
                                {error.towerId && <span className="error-tower">{error.towerId}</span>}
                                {error.floorNumber !== undefined && (
                                  <span className="error-floor">Pav {error.floorNumber}</span>
                                )}
                              </div>
                            </div>
                            <p className="error-message">{error.message}</p>
                            {error.totalWeight !== undefined && (
                              <div className="error-detail">
                                <span>Peso total: <strong>{error.totalWeight.toFixed(2)}%</strong></span>
                                <span className={error.difference > 0 ? 'diff-positive' : 'diff-negative'}>
                                  Diferença: {error.difference > 0 ? '+' : ''}{error.difference.toFixed(2)}%
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resultado do envio para API */}
              {apiSendResult && (
                <div className={`api-result ${apiSendResult.success ? 'success' : 'error'}`}>
                  <h3>{apiSendResult.success ? '✅ Sucesso!' : '❌ Erro'}</h3>
                  <p>{apiSendResult.message}</p>
                  {apiSendResult.apiResponse && (
                    <details className="api-details">
                      <summary>Ver resposta da API</summary>
                      <pre>{JSON.stringify(apiSendResult.apiResponse, null, 2)}</pre>
                    </details>
                  )}
                  {apiSendResult.error && (
                    <details className="api-details error">
                      <summary>Ver erro</summary>
                      <pre>{JSON.stringify(apiSendResult.error, null, 2)}</pre>
                    </details>
                  )}
                </div>
              )}

              <div className="result-actions">
                {processResult.tasks.length > 0 && !apiSendResult && (
                  <>
                    <button
                      className="btn btn-primary"
                      onClick={sendToApi}
                      disabled={isSendingToApi}
                    >
                      {isSendingToApi 
                        ? `⏳ ${sendProgress || 'Enviando...'}` 
                        : '🚀 Enviar para API Externa'}
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={downloadProcessedJson}
                      title="Baixar JSON das tarefas processadas para debug"
                    >
                      📥 Baixar JSON
                    </button>
                  </>
                )}
                <button className="btn btn-secondary" onClick={resetUpload}>
                  📁 Processar novo arquivo
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="upload-section">
            <div className="upload-area">
              <div className="upload-icon">📁</div>
              <h3>Selecione uma planilha Excel</h3>
              <p>O arquivo será processado automaticamente após a seleção</p>
              <div className="upload-requirements">
                <p><strong>Colunas necessárias:</strong></p>
                <ul>
                  <li>tarefa (nome da tarefa)</li>
                  <li>torre (ID da torre)</li>
                  <li>pavimento (número do pavimento)</li>
                  <li>Setor / ambiente (setor/ambiente)</li>
                  <li>peso (peso da etapa em decimal 0-1 ou percentual)</li>
                  <li>etapa (nome da etapa)</li>
                </ul>
              </div>
              <input
                id="file-input"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="file-input"
                disabled={isProcessing}
              />
              {isProcessing && (
                <div className="processing-indicator">
                  <div className="spinner"></div>
                  <p>⚙️ Processando arquivo...</p>
                </div>
              )}
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App