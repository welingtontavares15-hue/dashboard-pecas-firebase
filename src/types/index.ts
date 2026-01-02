/**
 * Firebase Configuration Types
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

/**
 * User Roles
 */
export type UserRole = 'administrador' | 'gestor' | 'tecnico';

/**
 * User Interface
 */
export interface User {
  id: string;
  username: string;
  name: string;
  email?: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Authentication Context
 */
export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

/**
 * Part (Peça) Interface
 */
export interface Part {
  id: string;
  codigo: string;
  descricao: string;
  categoria: string;
  valor: number;
  unidade: string;
  active: boolean;
}

/**
 * Technician (Técnico) Interface
 */
export interface Technician {
  id: string;
  name: string;
  username: string;
  email?: string;
  endereco?: string;
  bairro?: string;
  cep?: string;
  municipio?: string;
  uf?: string;
  active: boolean;
}

/**
 * Supplier (Fornecedor) Interface
 */
export interface Supplier {
  id: string;
  nome: string;
  cnpj?: string;
  contato?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  active: boolean;
}

/**
 * Solicitation Status
 */
export type SolicitationStatus = 'pendente' | 'aprovada' | 'rejeitada' | 'cancelada';

/**
 * Solicitation (Solicitação) Interface
 */
export interface Solicitation {
  id: string;
  numero: string;
  tecnicoId: string;
  tecnicoName: string;
  pecaId: string;
  pecaDescricao: string;
  pecaValor: number;
  quantidade: number;
  valorTotal: number;
  fornecedorId?: string;
  fornecedorNome?: string;
  justificativa: string;
  status: SolicitationStatus;
  dataUltimaStatus: Date;
  createdAt: Date;
  updatedAt?: Date;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}

/**
 * App Settings
 */
export interface AppSettings {
  slaHours: number;
  maxSolicitationValue: number;
  requireFornecedor: boolean;
}

/**
 * Statistics
 */
export interface Statistics {
  pending: number;
  approved: number;
  rejected: number;
  totalValue: number;
  totalPendingValue: number;
  avgApprovalTimeHours: number;
  rangeLabel: string;
  topTechniciansByValue: Array<{
    name: string;
    total: number;
  }>;
}
