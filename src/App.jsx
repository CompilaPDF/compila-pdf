import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Progress } from '@/components/ui/progress.jsx'
import { Alert, AlertDescription } from '@/components/ui/alert.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { Separator } from '@/components/ui/separator.jsx'
import { Upload, FileText, Download, CheckCircle, AlertCircle, BarChart3, Loader2 } from 'lucide-react'
import './App.css'

const API_BASE_URL = 'https://compila-pdf.onrender.com/api/barcode'

function App() {
  const [guias, setGuias] = useState([])
  const [comprovantes, setComprovantes] = useState([])
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const handleFileUpload = useCallback((files, type) => {
    const fileArray = Array.from(files).filter(file => file.type === 'application/pdf')
    
    if (type === 'guias') {
      setGuias(fileArray)
    } else {
      setComprovantes(fileArray)
    }
  }, [])

  const processFiles = async () => {
    if (guias.length === 0 || comprovantes.length === 0) {
      setError('Por favor, faça upload de pelo menos um arquivo de cada tipo.')
      return
    }

    setProcessing(true)
    setError(null)
    setResults(null)

    try {
      const formData = new FormData()
      
      // Adicionar arquivos de guias
      guias.forEach(file => {
        formData.append('guias', file)
      })
      
      // Adicionar arquivos de comprovantes
      comprovantes.forEach(file => {
        formData.append('comprovantes', file)
      })

      const response = await fetch(`${API_BASE_URL}/process`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao processar arquivos')
      }

      const data = await response.json()
      setResults(data.results)
      
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  const downloadResults = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/download/resultados.zip`)
      
      if (!response.ok) {
        throw new Error('Erro ao baixar arquivos')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = 'resultados_correspondencias.zip'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
    } catch (err) {
      setError('Erro ao baixar arquivos: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center justify-center gap-3">
            <BarChart3 className="h-10 w-10 text-blue-600" />
            Sistema de Correspondência de Códigos de Barras
          </h1>
          <p className="text-lg text-gray-600">
            Faça upload de guias e comprovantes para correspondência automática por código de barras
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Upload Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Guias Upload */}
          <Card className="border-2 border-dashed border-blue-300 hover:border-blue-400 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Guias (Nomes das Pessoas)
              </CardTitle>
              <CardDescription>
                Arquivos PDF nomeados com os nomes das pessoas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-4 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Clique para fazer upload</span> ou arraste e solte
                    </p>
                    <p className="text-xs text-gray-500">Apenas arquivos PDF</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf"
                    onChange={(e) => handleFileUpload(e.target.files, 'guias')}
                  />
                </label>
                {guias.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Arquivos selecionados:</p>
                    {guias.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="truncate">{file.name}</span>
                        <Badge variant="secondary">{(file.size / 1024).toFixed(1)} KB</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Comprovantes Upload */}
          <Card className="border-2 border-dashed border-green-300 hover:border-green-400 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Comprovantes (Numerados)
              </CardTitle>
              <CardDescription>
                Arquivos PDF numerados com códigos de barras
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-4 text-gray-500" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Clique para fazer upload</span> ou arraste e solte
                    </p>
                    <p className="text-xs text-gray-500">Apenas arquivos PDF</p>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    multiple
                    accept=".pdf"
                    onChange={(e) => handleFileUpload(e.target.files, 'comprovantes')}
                  />
                </label>
                {comprovantes.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Arquivos selecionados:</p>
                    {comprovantes.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <FileText className="h-4 w-4 text-green-600" />
                        <span className="truncate">{file.name}</span>
                        <Badge variant="secondary">{(file.size / 1024).toFixed(1)} KB</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Process Button */}
        <div className="text-center">
          <Button
            onClick={processFiles}
            disabled={processing || guias.length === 0 || comprovantes.length === 0}
            size="lg"
            className="px-8 py-3 text-lg"
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              'Processar Correspondências'
            )}
          </Button>
        </div>

        {/* Processing Indicator */}
        {processing && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processando arquivos...</span>
                  <span>Aguarde...</span>
                </div>
                <Progress value={undefined} className="w-full" />
                <p className="text-xs text-gray-500 text-center">
                  Extraindo códigos de barras e fazendo correspondências...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {results && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Resultados do Processamento
              </CardTitle>
              <CardDescription>
                {results.total_matches} correspondência(s) encontrada(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Download Button */}
              {results.total_matches > 0 && (
                <div className="text-center">
                  <Button
                    onClick={downloadResults}
                    size="lg"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Baixar Todos os Arquivos Compilados
                  </Button>
                </div>
              )}

              {/* Matches */}
              {results.matches.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-green-700">Correspondências Encontradas</h3>
                  {results.matches.map((match, index) => (
                    <Card key={index} className="border-green-200 bg-green-50">
                      <CardContent className="pt-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="font-medium">Guia: {match.guia}</p>
                              <p className="text-sm text-gray-600">Comprovante: {match.comprovante}</p>
                              <p className="text-sm text-gray-600">Arquivo gerado: {match.output}</p>
                            </div>
                            <Badge variant="default" className="bg-green-600">
                              Correspondência
                            </Badge>
                          </div>
                          <Separator />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <p className="font-medium text-gray-700">Código da Guia:</p>
                              <p className="font-mono bg-white p-2 rounded border break-all">
                                {match.guia_barcode}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700">Código do Comprovante:</p>
                              <p className="font-mono bg-white p-2 rounded border break-all">
                                {match.comprovante_barcode}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Unmatched Files */}
              {(results.unmatched_guias.length > 0 || results.unmatched_comprovantes.length > 0) && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-orange-700">Arquivos Sem Correspondência</h3>
                  
                  {results.unmatched_guias.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Guias sem correspondência:</strong> {results.unmatched_guias.join(', ')}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {results.unmatched_comprovantes.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Comprovantes sem correspondência:</strong> {results.unmatched_comprovantes.join(', ')}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-800">Como Usar</CardTitle>
          </CardHeader>
          <CardContent className="text-blue-700 space-y-2">
            <p>1. <strong>Faça upload das guias:</strong> Arquivos PDF nomeados com os nomes das pessoas</p>
            <p>2. <strong>Faça upload dos comprovantes:</strong> Arquivos PDF numerados contendo códigos de barras</p>
            <p>3. <strong>Clique em "Processar Correspondências":</strong> O sistema extrairá os códigos de barras e fará a correspondência</p>
            <p>4. <strong>Baixe os arquivos compilados:</strong> Cada correspondência gerará um PDF combinado com o nome da pessoa</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default App
