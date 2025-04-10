import { Attachment, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@/types/chat"
import { supabase } from "@/lib/supabase-client"
import { analyzeImage, analyzeDocument, analyzeDocumentByUrl } from "@/lib/groq"

export class FileValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "FileValidationError"
  }
}

function getMimeType(file: File): string {
  // Map file extensions to MIME types
  const extensionToMime: { [key: string]: string } = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain'
  }

  // Get file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  
  // Return mapped MIME type or original type if not found
  return extensionToMime[extension] || file.type
}

export async function validateFile(file: File): Promise<void> {
  const mimeType = getMimeType(file)
  
  // Log detalhado para debug
  console.log('Validando arquivo:', {
    name: file.name,
    size: file.size,
    mimeType,
    allowedTypes: ALLOWED_FILE_TYPES
  })

  // Validação mais estrita do tipo MIME
  if (!mimeType || !ALLOWED_FILE_TYPES.includes(mimeType)) {
    console.error('Tipo MIME inválido:', {
      detectedType: mimeType,
      allowedTypes: ALLOWED_FILE_TYPES
    })
    throw new FileValidationError(
      `Tipo de arquivo não suportado: ${mimeType || 'desconhecido'}. ` +
      `Tipos permitidos: ${ALLOWED_FILE_TYPES.join(', ')}`
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new FileValidationError(
      `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(2)}MB). ` +
      `Tamanho máximo: ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(2)}MB`
    )
  }
}

async function convertToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64String = reader.result as string
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = base64String.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export async function uploadFile(file: File): Promise<string> {
  try {
    await validateFile(file)

    const timestamp = new Date().getTime()
    const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
    const filePath = `uploads/${fileName}`
    const mimeType = getMimeType(file)

    console.log('Iniciando upload com URL assinada:', {
      fileName,
      filePath,
      mimeType,
      size: file.size
    })

    // Primeiro, obter uma URL assinada para upload
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('chat-attachments')
      .createSignedUploadUrl(filePath)

    if (signedUrlError || !signedUrlData) {
      console.error('Erro ao obter URL assinada:', signedUrlError)
      throw new Error(`Erro ao obter URL assinada: ${signedUrlError?.message}`)
    }

    // Criar um FormData com o arquivo
    const formData = new FormData()
    formData.append('file', file)

    // Fazer o upload usando fetch diretamente para a URL assinada
    const uploadResponse = await fetch(signedUrlData.signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': mimeType,
        'x-amz-acl': 'public-read'
      }
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('Erro na resposta do upload:', {
        status: uploadResponse.status,
        statusText: uploadResponse.statusText,
        error: errorText
      })
      throw new Error(`Erro no upload: ${uploadResponse.statusText}`)
    }

    // Obter a URL pública do arquivo
    const { data: { publicUrl } } = supabase.storage
      .from('chat-attachments')
      .getPublicUrl(filePath)

    console.log('Upload concluído com sucesso:', {
      filePath,
      publicUrl,
      mimeType
    })

    return publicUrl
  } catch (error) {
    console.error('Erro completo do upload:', error)
    throw error
  }
}

export async function createAttachment(
  messageId: string,
  file: File,
  fileUrl: string,
  extractedText?: string
): Promise<Attachment> {
  // Log detalhado para depuração
  console.log('Criando registro de anexo:', {
    messageId,
    fileName: file.name,
    fileType: file.type, 
    fileSize: file.size,
    hasExtractedText: !!extractedText,
    extractedTextLength: extractedText?.length || 0
  });

  const { data, error } = await supabase
    .from('attachments')
    .insert([{
      message_id: messageId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      file_url: fileUrl,
      content: extractedText || null, // Usar o campo 'content' para o texto extraído
      extracted_text: extractedText, // Manter esse campo para compatibilidade
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single()

  if (error) {
    console.error('Erro detalhado ao criar anexo:', error);
    throw new Error("Erro ao criar registro do anexo")
  }

  // Verificar se o anexo foi criado corretamente
  console.log('Anexo criado com sucesso:', data);
  return data
}

async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsText(file)
  })
}

async function getImageMetadata(file: File): Promise<{ width?: number; height?: number; type: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({
        width: img.width,
        height: img.height,
        type: file.type
      })
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// Função auxiliar para obter o conteúdo de um arquivo como base64
async function getFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64String = reader.result as string
      // Remove the data URL prefix (e.g., "data:application/pdf;base64,")
      const base64 = base64String.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Função para detectar melhor o tipo de arquivo
function detectFileType(file: File): "text" | "image" | "document" | "other" {
  const mimeType = getMimeType(file).toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase() || ''
  
  if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) {
    return "image"
  }
  
  if (mimeType === 'text/plain' || extension === 'txt') {
    return "text"
  }
  
  if (
    mimeType.includes('pdf') || 
    mimeType.includes('doc') || 
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('sheet') ||
    ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)
  ) {
    return "document"
  }
  
  return "other"
}

export async function processFile(file: File): Promise<{ url: string; text: string; fileType: string; content?: string }> {
  await validateFile(file)
  
  let extractedText = ""
  let fileUrl = ""
  const fileType = detectFileType(file)
  
  try {
    // Upload the file first
    fileUrl = await uploadFile(file)

    // Extract basic metadata for all files
    const metadata = {
      name: file.name,
      type: getMimeType(file),
      size: file.size,
      lastModified: new Date(file.lastModified).toISOString()
    }

    console.log(`Iniciando processamento de arquivo (${fileType}):`, {
      fileName: file.name,
      fileType: file.type,
      detectedType: fileType,
      fileUrl
    })

    // Processamento específico por tipo de arquivo
    switch (fileType) {
      case "image":
        try {
          // Para imagens, usar o Groq para análise detalhada
          extractedText = await analyzeImage(fileUrl)
          console.log('Análise de imagem concluída:', {
            fileName: file.name,
            extractedTextLength: extractedText.length
          })
        } catch (imageError) {
          console.error('Erro ao analisar imagem:', imageError)
          extractedText = `Não foi possível analisar a imagem: ${file.name}. Erro: ${imageError instanceof Error ? imageError.message : 'Erro desconhecido'}`
        }
        break
        
      case "text":
        try {
          // Para arquivos de texto, ler o conteúdo diretamente
          console.log('Lendo arquivo de texto:', file.name)
          extractedText = await readTextFile(file)
          
          // Se o texto for muito grande, analisá-lo com Groq
          if (extractedText.length > 5000) {
            console.log('Texto grande, enviando para análise com Groq:', {
              fileName: file.name,
              textLength: extractedText.length
            })
            
            extractedText = await analyzeDocument(extractedText.substring(0, 50000))
          }
          
          console.log('Processamento de texto concluído:', {
            fileName: file.name,
            extractedTextLength: extractedText.length
          })
        } catch (textError) {
          console.error('Erro ao processar arquivo de texto:', textError)
          extractedText = `Não foi possível processar o arquivo de texto: ${file.name}. Erro: ${textError instanceof Error ? textError.message : 'Erro desconhecido'}`
        }
        break
        
      case "document":
        try {
          // Para documentos como PDF, DOC, etc.
          console.log('Processando documento:', file.name)
          
          // Enviar a URL para a API do Groq analisar
          const documentPrompt = `Analise detalhadamente o conteúdo do documento: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB). Extraia as informações principais, identifique tópicos e forneça um resumo completo do conteúdo.`
          
          extractedText = await analyzeDocumentByUrl(fileUrl, documentPrompt)
          
          console.log('Análise de documento concluída:', {
            fileName: file.name,
            extractedTextLength: extractedText.length
          })
        } catch (docError) {
          console.error('Erro ao processar documento:', docError)
          extractedText = `Não foi possível processar o documento: ${file.name}. Erro: ${docError instanceof Error ? docError.message : 'Erro desconhecido'}`
        }
        break
        
      default:
        // Para outros tipos de arquivo
        extractedText = `Arquivo: ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB)\n\n` + 
                        JSON.stringify(metadata, null, 2)
    }

    // Garantir que temos algum texto para retornar
    if (!extractedText || extractedText.trim() === '') {
      extractedText = `[Arquivo enviado: ${file.name} (${(file.size / 1024).toFixed(2)} KB)]`
    }

    console.log('Processamento de arquivo concluído:', {
      fileUrl,
      fileType,
      extractedTextLength: extractedText.length
    })
  } catch (error) {
    console.error("Erro ao processar arquivo:", error)
    throw new Error(`Erro ao processar arquivo ${file.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }

  // Retornar também o campo content para ser usado na tabela attachments
  return {
    url: fileUrl,
    text: extractedText,
    content: extractedText, // Para uso no campo content da tabela attachments
    fileType
  }
}

export async function processFiles(files: File[]): Promise<Array<{ url: string; text: string; fileType: string }>> {
  console.log('Iniciando processamento de arquivos:', files.map(f => f.name))
  const results = []
  for (const file of files) {
    const result = await processFile(file)
    results.push(result)
  }
  console.log('Processamento de arquivos concluído')
  return results
} 