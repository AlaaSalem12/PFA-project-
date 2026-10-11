import { Role } from "@prisma/client";

/** Example questions shown on an empty chat (French first, like the UI). */
export const suggestionsByRole: Record<Role, string[]> = {
  ADMIN: [
    "Quelles machines sont en panne ?",
    "Résume l'état du parc machines.",
    "Quelles maintenances sont en retard ?",
    "Quels ordres de travail critiques sont encore ouverts ?",
    "Combien de comptes utilisateurs sont verrouillés ou désactivés ?",
  ],
  HR_MANAGER: [
    "Combien d'employés y a-t-il par département ?",
    "Qui est en congé en ce moment ?",
    "Liste les employés de l'atelier Soudure.",
    "Comment ajouter un nouvel employé ?",
  ],
  PRODUCTION_MANAGER: [
    "Quelles machines sont en panne ?",
    "Quels ordres de travail sont en cours ?",
    "Quels plans de maintenance arrivent à échéance cette semaine ?",
    "Montre l'historique des statuts de PRESS-001.",
  ],
  MAINTENANCE_TECH: [
    "Quels sont mes ordres de travail ouverts ?",
    "Quelles maintenances sont en retard ?",
    "Donne-moi les détails de la machine FURN-001.",
    "Comment clôturer un ordre de travail ?",
  ],
  EMPLOYEE: [
    "Quels sont mes ordres de travail ?",
    "Quelles machines sont en panne ?",
    "Comment changer mon mot de passe ?",
    "À quoi sert la page Machines ?",
  ],
};
