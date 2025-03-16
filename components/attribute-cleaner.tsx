'use client'

import { useEffect } from 'react'

/**
 * Componente que remove atributos indesejados do DOM
 * 
 * Especificamente, remove o atributo cz-shortcut-listen que está causando os avisos
 * no console. Este atributo é adicionado por alguma biblioteca de terceiros.
 */
export function AttributeCleaner() {
  useEffect(() => {
    // Função para limpar o atributo
    const cleanupAttribute = () => {
      console.log('AttributeCleaner: Iniciando limpeza de atributos')
      
      // Remover do body
      const body = document.body
      if (body && body.hasAttribute('cz-shortcut-listen')) {
        console.log('AttributeCleaner: Removendo atributo cz-shortcut-listen')
        body.removeAttribute('cz-shortcut-listen')
      }
      
      // Remover de qualquer outro elemento
      document.querySelectorAll('[cz-shortcut-listen]').forEach(el => {
        console.log('AttributeCleaner: Removendo atributo cz-shortcut-listen de elemento')
        el.removeAttribute('cz-shortcut-listen')
      })
    }
    
    // Executar limpeza inicial
    cleanupAttribute()
    
    // Configurar um MutationObserver para monitorar mudanças de atributos
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && 
            mutation.attributeName === 'cz-shortcut-listen') {
          console.log('AttributeCleaner: Atributo detectado por MutationObserver')
          // Remover o atributo de forma assíncrona
          setTimeout(cleanupAttribute, 0)
        }
      })
    })
    
    // Iniciar a observação do body
    observer.observe(document.body, { 
      attributes: true,
      attributeFilter: ['cz-shortcut-listen']
    })
    
    // Configurar um temporizador para verificar periodicamente
    const intervalId = setInterval(cleanupAttribute, 2000)
    
    // Sobrescrever elementos nativos para interceptar tentativas de adição do atributo
    const originalSetAttribute = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value) {
      if (name === 'cz-shortcut-listen') {
        // Não fazer nada, apenas bloquear a adição
        return;
      }
      originalSetAttribute.call(this, name, value);
    };

    // Limpeza quando o componente for desmontado
    return () => {
      observer.disconnect()
      clearInterval(intervalId)
      // Restaurar método original
      Element.prototype.setAttribute = originalSetAttribute;
    }
  }, [])
  
  // Componente não renderiza nada visível
  return null
}

export default AttributeCleaner 