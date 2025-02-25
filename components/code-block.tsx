import React from "react"
import Prism from "prismjs"
import "prismjs/components/prism-jsx"
import "prismjs/themes/prism-tomorrow.css"

interface CodeBlockProps {
  code: string
  language: string
  isJsx?: boolean
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, isJsx }) => {
  React.useEffect(() => {
    Prism.highlightAll()
  }, [])

  const languageClass = isJsx ? "language-jsx" : `language-${language}`

  return (
    <pre>
      <code className={languageClass}>{code}</code>
    </pre>
  )
}

