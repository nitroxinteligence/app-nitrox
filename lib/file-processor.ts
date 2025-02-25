import { Attachment, ALLOWED_FILE_TYPES, MAX_FILE_SIZE } from "@/types/chat"
import { supabase } from "@/lib/supabase-client"
import { analyzeImage, analyzeDocument } from "@/lib/groq"

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
  const { data, error } = await supabase
    .from('attachments')
    .insert([{
      message_id: messageId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      file_url: fileUrl,
      extracted_text: extractedText,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single()

  if (error) {
    throw new Error("Erro ao criar registro do anexo")
  }

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

export async function processFile(file: File): Promise<{ url: string; text: string }> {
  await validateFile(file)
  
  let extractedText = ""
  let fileUrl = ""
  
  try {
    // Upload the file first
    fileUrl = await uploadFile(file)

    // Extract basic metadata for all files
    const metadata = {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: new Date(file.lastModified).toISOString()
    }

    console.log('Iniciando processamento de arquivo:', {
      fileName: file.name,
      fileType: file.type,
      fileUrl
    })

    // Handle different file types
    if (file.type.startsWith('image/')) {
      // Para imagens, usar o Groq para análise detalhada
      extractedText = await analyzeImage(fileUrl)
      console.log('Análise de imagem concluída:', {
        fileName: file.name,
        extractedText: extractedText.substring(0, 100) + '...'
      })
    } else if (file.type === "text/plain") {
      extractedText = await readTextFile(file)
    } else if (file.type.includes('pdf') || file.type.includes('doc') || file.type.includes('sheet')) {
      // Para documentos, usar o Groq para análise
      const documentContent = await readTextFile(file)
      extractedText = await analyzeDocument(documentContent)
    } else {
      // For other file types, just store basic metadata
      extractedText = JSON.stringify(metadata, null, 2)
    }

    console.log('Processamento de arquivo concluído:', {
      fileUrl,
      extractedText: extractedText.substring(0, 100) + '...'
    })
  } catch (error) {
    console.error("Erro ao processar arquivo:", error)
    throw new Error(`Erro ao processar arquivo ${file.name}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }

  return {
    url: fileUrl,
    text: extractedText
  }
}

export async function processFiles(files: File[]): Promise<Array<{ url: string; text: string }>> {
  console.log('Iniciando processamento de arquivos:', files.map(f => f.name))
  const results = []
  for (const file of files) {
    const result = await processFile(file)
    results.push(result)
  }
  console.log('Processamento de arquivos concluído')
  return results
} 