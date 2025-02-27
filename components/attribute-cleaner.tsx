'use client'

import { useEffect } from 'react'

/**
 * Componente que limpa atributos extras do DOM que causam warnings no React
 * Especificamente, remove o atributo cz-shortcut-listen que está causando os avisos
 */
export function AttributeCleaner() {
  useEffect(() => {
    // Função para remover atributos indesejados
    const cleanAttributes = () => {
      console.log('AttributeCleaner: Iniciando limpeza de atributos')
      
      // Remover atributos do body
      const body = document.querySelector('body')
      if (body && body.hasAttribute('cz-shortcut-listen')) {
        console.log('AttributeCleaner: Removendo atributo cz-shortcut-listen')
        body.removeAttribute('cz-shortcut-listen')
      }
      
      // Remover de outros elementos, se necessário
      document.querySelectorAll('[cz-shortcut-listen]').forEach(el => {
        console.log('AttributeCleaner: Removendo atributo de elemento adicional')
        el.removeAttribute('cz-shortcut-listen')
      })
    }
    
    // Limpar imediatamente na montagem
    cleanAttributes()
    
    // Configurar um MutationObserver para monitorar mudanças no DOM
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'cz-shortcut-listen') {
          console.log('AttributeCleaner: Atributo detectado por MutationObserver')
          cleanAttributes()
        }
      }
    })
    
    // Iniciar a observação
    observer.observe(document.body, { 
      attributes: true,
      subtree: true,
      attributeFilter: ['cz-shortcut-listen']
    })
    
    // Limpar ao desmontar
    return () => {
      observer.disconnect()
    }
  }, [])
  
  // Componente não renderiza nada visível
  return null
}

export default AttributeCleaner 