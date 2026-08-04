import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function useGlobalKeyboardShortcuts() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const toggleModal = useCallback(() => setIsModalOpen(prev => !prev), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const keyLower = e.key.toLowerCase();

      const target = e.target as HTMLElement | null;
      const isTyping = target && (
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.isContentEditable
      );

      // Ctrl+P / Cmd+P -> Nova Venda / PDV
      if (isCtrlOrCmd && !e.shiftKey && keyLower === "p") {
        e.preventDefault();
        navigate("/Vender");
        toast.info("Atalho ativado: Redirecionado para PDV (Ctrl+P)");
        return;
      }

      // Ctrl+E / Cmd+E -> Estoque & Produtos
      if (isCtrlOrCmd && !e.shiftKey && keyLower === "e") {
        e.preventDefault();
        navigate("/Produtos");
        toast.info("Atalho ativado: Redirecionado para Produtos (Ctrl+E)");
        return;
      }

      // Ctrl+D / Cmd+D -> Dashboard
      if (isCtrlOrCmd && !e.shiftKey && keyLower === "d") {
        e.preventDefault();
        navigate("/");
        toast.info("Atalho ativado: Redirecionado para Dashboard (Ctrl+D)");
        return;
      }

      // Ctrl+Shift+C or Alt+C -> Clientes
      if ((isCtrlOrCmd && e.shiftKey && keyLower === "c") || (e.altKey && keyLower === "c")) {
        e.preventDefault();
        navigate("/Clientes");
        toast.info("Atalho ativado: Redirecionado para Clientes");
        return;
      }

      // Ctrl+Shift+F or Alt+F -> Financeiro / Contas a Pagar
      if ((isCtrlOrCmd && e.shiftKey && keyLower === "f") || (e.altKey && keyLower === "f")) {
        e.preventDefault();
        navigate("/ContasPagar");
        toast.info("Atalho ativado: Redirecionado para Financeiro");
        return;
      }

      // Ctrl+Shift+X or Alt+X -> Caixas
      if ((isCtrlOrCmd && e.shiftKey && keyLower === "x") || (e.altKey && keyLower === "x")) {
        e.preventDefault();
        navigate("/Caixas");
        toast.info("Atalho ativado: Redirecionado para Caixas");
        return;
      }

      // Ctrl+Shift+B or Alt+B -> Compras
      if ((isCtrlOrCmd && e.shiftKey && keyLower === "b") || (e.altKey && keyLower === "b")) {
        e.preventDefault();
        navigate("/Compras");
        toast.info("Atalho ativado: Redirecionado para Compras");
        return;
      }

      // Alt+H or Shift+? (when not typing in form field) -> Open Keyboard Shortcuts Guide
      if ((e.altKey && keyLower === "h") || (!isTyping && e.key === "?")) {
        e.preventDefault();
        toggleModal();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, toggleModal]);

  return {
    isModalOpen,
    openModal,
    closeModal,
    toggleModal
  };
}
