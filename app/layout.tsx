// Server-side imports
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ClientLayout } from "@/components/client-layout"
import { Toaster } from "@/components/ui/sonner"
import { AuthProvider } from "@/hooks/useAuth"
import { AttributeCleaner } from "@/components/attribute-cleaner"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"] })

// Metadata (server-side)
export const metadata: Metadata = {
  title: "SiaFlow",
  description: "Plataforma de automação de atendimento",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <Script id="prevent-cz-attribute" strategy="beforeInteractive">
          {`
            (function() {
              // Sobrescrever o método setAttribute para bloquear o atributo cz-shortcut-listen
              const originalSetAttribute = Element.prototype.setAttribute;
              Element.prototype.setAttribute = function(name, value) {
                if (name === 'cz-shortcut-listen') {
                  // Simplesmente não fazer nada quando tentar definir este atributo
                  return;
                }
                // Caso contrário, chamar o método original
                return originalSetAttribute.call(this, name, value);
              };
              
              // Sobrescrever também o método Element.attributes para não expor o atributo cz-shortcut-listen
              if (Object.getOwnPropertyDescriptor(Element.prototype, 'attributes')) {
                const originalAttributes = Object.getOwnPropertyDescriptor(Element.prototype, 'attributes');
                if (originalAttributes && originalAttributes.get) {
                  Object.defineProperty(Element.prototype, 'attributes', {
                    get: function() {
                      const attrs = originalAttributes.get.call(this);
                      if (attrs) {
                        // Criar um proxy ao redor do objeto NamedNodeMap para filtrar atributos indesejados
                        return new Proxy(attrs, {
                          get: function(target, prop) {
                            if (typeof prop === 'string' && prop === 'getNamedItem') {
                              return function(name) {
                                if (name === 'cz-shortcut-listen') {
                                  return null;
                                }
                                return target.getNamedItem(name);
                              };
                            }
                            return target[prop];
                          }
                        });
                      }
                      return attrs;
                    }
                  });
                }
              }
              
              // Função para remover o atributo se já existir
              function removeAttribute() {
                if (document.body && document.body.hasAttribute('cz-shortcut-listen')) {
                  document.body.removeAttribute('cz-shortcut-listen');
                }
                
                // Também remover de qualquer outro elemento
                const elements = document.querySelectorAll('[cz-shortcut-listen]');
                for (let i = 0; i < elements.length; i++) {
                  elements[i].removeAttribute('cz-shortcut-listen');
                }
              }
              
              // Tentar remover imediatamente
              removeAttribute();
              
              // Tentar novamente quando o DOM estiver pronto
              document.addEventListener('DOMContentLoaded', removeAttribute);
              
              // E também quando a janela carregar completamente
              window.addEventListener('load', removeAttribute);
              
              // Tentar periodicamente por um curto período
              var attempts = 0;
              var interval = setInterval(function() {
                removeAttribute();
                attempts++;
                if (attempts >= 20) {
                  clearInterval(interval);
                }
              }, 250);
            })();
          `}
        </Script>
      </head>
      <body className={`${inter.className} bg-[#0A0A0B] m-0 p-0 min-h-screen`}>
        <AuthProvider>
          <AttributeCleaner />
          <ClientLayout>{children}</ClientLayout>
          <Toaster 
            position="top-center" 
            closeButton
            richColors
            toastOptions={{
              className: "!bg-[#1E1E1E] !text-white !border !border-[#272727]",
              style: {
                marginTop: "20px"
              }
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
