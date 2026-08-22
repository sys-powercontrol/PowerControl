import React from "react";
import { Navigate } from "react-router-dom";

export default function Invite() {
  return <Navigate to="/Configuracoes?tab=invites" replace />;
}
