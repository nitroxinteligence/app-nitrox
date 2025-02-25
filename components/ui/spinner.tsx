import type React from "react"

const Spinner: React.FC = () => {
  return (
    <div className="flex justify-center items-center h-full">
      <div className="loader" />
      <style jsx>{`
        .loader {
          width: 50px;
          height: 50px;
          display: inline-block;
          border: 5px solid #10b981;
          border-radius: 50%;
          border-top-color: transparent;
          border-bottom-color: transparent;
          animation: rot5 1s infinite;
        }

        @keyframes rot5 {
          0% {
            transform: rotate(0);
          }

          50% {
            transform: rotate(180deg);
            border-top-color: #059669;
            border-bottom-color: #34d399;
            border-right-color: transparent;
            border-left-color: transparent;
          }

          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}

export default Spinner

