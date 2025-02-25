import React from "react"
import { CodeBlock } from "./code-block" // Corrigido o import

const MyComponent = () => {
  const someCode = `
    const MyComponent = () => {
      return (
        <div>
          <h1>Hello, world!</h1>
        </div>
      );
    };
  `

  return (
    <div>
      <h1>My Component</h1>
      <CodeBlock code={someCode} language="javascript" isJsx={true} />
    </div>
  )
}

export default MyComponent

