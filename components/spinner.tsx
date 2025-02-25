// Spinner component
function Spinner() {
  return (
    <div className="spinner">
      <div className="spinner1"></div>
      <style jsx>{`
       .spinner {
         background-image: linear-gradient(#58E877 35%, #1eff4b);
         width: 28px; /* Adjusted width */
         height: 28px; /* Adjusted height */
         animation: spinning82341 1.7s linear infinite;
         border-radius: 50%; /* Use percentage for consistent roundness */
         filter: blur(1px);
         box-shadow: 0px -2px 8px 0px #58E877, 0px 2px 8px 0px #1eff4b; /* Adjusted shadow */
       }

       .spinner1 {
         background-color: rgb(36, 36, 36);
         width: 28px; /* Adjusted width */
         height: 28px; /* Adjusted height */
         border-radius: 50%; /* Use percentage for consistent roundness */
         filter: blur(3px); /* Adjusted blur */
       }

       @keyframes spinning82341 {
         to {
           transform: rotate(360deg);
         }
       }
     `}</style>
    </div>
  )
}

export default Spinner

