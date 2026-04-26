import React from "react";
import { useNavigate } from "react-router-dom";
import { Home, ArrowLeft, Search } from "lucide-react";
import { motion } from "motion/react";

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl p-10 flex flex-col items-center"
      >
        <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <Search className="text-red-500 w-12 h-12" />
        </div>
        
        <h1 className="text-6xl font-black text-gray-900 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Página Não Encontrada</h2>
        
        <p className="text-gray-500 mb-8 max-w-sm">
          Ops! Parece que o caminho que você está procurando não existe ou foi movido para outro lugar.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
          
          <button
            onClick={() => navigate("/dashboard")}
            className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
          >
            <Home size={20} />
            Dashboard
          </button>
        </div>
      </motion.div>
      
      <p className="mt-8 text-gray-400 text-sm font-medium">
        PowerControl ERP &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
};

export default NotFound; 
