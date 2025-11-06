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
  weight: number
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
  stages: Stage[]
}

interface ValidationError {
  taskName: string
  floorNumber: number
  totalWeight: number
  expectedWeight: number
  difference: number
  message: string
}

interface ProcessResult {
  success: boolean
  message: string
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

  // Configuração fixa da API externa
  const apiConfig: ApiConfig = {
    baseUrl: 'https://v2-kwwmyyzjzq-uc.a.run.app',
    endpoint: '/tasks/create-many',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2ODk0OTg4ZjA0ZDNiNWFiZjVlZDhlYjUiLCJlbWFpbCI6InRpQGVuZ2VuaGFyaWFsZW1lLmNvbS5iciIsImFjY2Vzc1R5cGUiOiJhZG1pbiIsImlhdCI6MTc2MjE3NjA3NiwiZXhwIjoxNzYyMTc5Njc2fQ.cS7BJ2UYYlp00kvr5pbqHumq4Y_wIQ8IHMp4mFDlhMM'
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

  const sendToApi = async () => {
    if (!processResult || !processResult.tasks || processResult.tasks.length === 0) {
      setError('❌ Nenhuma tarefa válida para enviar')
      return
    }

    setIsSendingToApi(true)
    setError(null)
    setApiSendResult(null)

    try {
      const response = await axios.post<ApiSendResult>(
        'http://localhost:3000/tasks-upload/send-to-api',
        {
          baseUrl: apiConfig.baseUrl,
          endpoint: apiConfig.endpoint,
          token: apiConfig.token,
          tasks: processResult.tasks
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      setApiSendResult(response.data)
      setIsSendingToApi(false)
    } catch (err) {
      setIsSendingToApi(false)
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

  const resetUpload = () => {
    setError(null)
    setProcessResult(null)
    setApiSendResult(null)
    setIsProcessing(false)
    setIsSendingToApi(false)
    // Limpar o input file
    const fileInput = document.getElementById('file-input') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  return (
    <div className="app">
      <div className="container">
        <h1>Processador de Tarefas Excel</h1>

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
                <div className="summary-item">
                  <span className="label">Tarefas inválidas:</span>
                  <span className="value invalid">{processResult.summary.invalidTasks}</span>
                </div>
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
                          <span className="task-floor">Pavimento {task.floorNumber}</span>
                        </div>
                        <div className="task-details">
                          <p><strong>Setor:</strong> {task.sector}</p>
                          <p><strong>Etapas:</strong> {task.stages.length}</p>
                          <div className="stages-summary">
                            {task.stages.map((stage, idx) => (
                              <span key={idx} className="stage-badge">
                                {stage.name} ({stage.weight}%)
                              </span>
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
                    As seguintes tarefas não foram incluídas porque a soma dos pesos não é 100%:
                  </p>
                  <div className="errors-list">
                    {processResult.errors.errors.map((error, index) => (
                      <div key={index} className="error-item">
                        <div className="error-header">
                          <strong className="error-task-name">{error.taskName}</strong>
                          <span className="error-floor">Pavimento {error.floorNumber}</span>
                        </div>
                        <p className="error-message">{error.message}</p>
                        <div className="error-detail">
                          <span>Peso total: <strong>{error.totalWeight.toFixed(2)}%</strong></span>
                          <span className={error.difference > 0 ? 'diff-positive' : 'diff-negative'}>
                            Diferença: {error.difference > 0 ? '+' : ''}{error.difference.toFixed(2)}%
                          </span>
                        </div>
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
                    <pre>{JSON.stringify(apiSendResult.apiResponse, null, 2)}</pre>
                  )}
                  {apiSendResult.error && (
                    <pre>{JSON.stringify(apiSendResult.error, null, 2)}</pre>
                  )}
                </div>
              )}

              <div className="result-actions">
                {processResult.tasks.length > 0 && !apiSendResult && (
                  <button
                    className="btn btn-primary"
                    onClick={sendToApi}
                    disabled={isSendingToApi}
                  >
                    {isSendingToApi ? ' Enviando...' : ' Enviar para API Externa'}
                  </button>
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
                  <p>Processando arquivo...</p>
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
