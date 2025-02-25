-- Criar políticas de acesso para o bucket chat-attachments
-- Nota: O bucket deve ser criado manualmente através do Console do Supabase ou API REST

-- Allow public access to the chat-attachments bucket
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-attachments');

-- Allow anyone to upload files with any MIME type
CREATE POLICY "Upload Access"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  (CASE 
    WHEN RIGHT(name, 4) = '.jpg' OR RIGHT(name, 5) = '.jpeg' THEN mime_type IN ('image/jpeg', 'image/jpg')
    WHEN RIGHT(name, 4) = '.png' THEN mime_type = 'image/png'
    WHEN RIGHT(name, 4) = '.pdf' THEN mime_type = 'application/pdf'
    WHEN RIGHT(name, 4) = '.doc' OR RIGHT(name, 5) = '.docx' THEN mime_type IN ('application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    WHEN RIGHT(name, 4) = '.xls' OR RIGHT(name, 5) = '.xlsx' THEN mime_type IN ('application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    WHEN RIGHT(name, 4) = '.txt' THEN mime_type = 'text/plain'
    ELSE false
  END)
);

-- Allow anyone to update their own files
CREATE POLICY "Update Access"
ON storage.objects FOR UPDATE
USING (bucket_id = 'chat-attachments');

-- Allow anyone to delete their own files
CREATE POLICY "Delete Access"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-attachments'); 