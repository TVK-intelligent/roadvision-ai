export type Role = 'ROLE_CITIZEN' | 'ROLE_ADMIN' | 'ROLE_STAFF';

export type IncidentStatus = 
  | 'SUBMITTED' 
  | 'AI_ANALYZED' 
  | 'ASSIGNED' 
  | 'IN_PROGRESS' 
  | 'RESOLVED' 
  | 'CLOSED' 
  | 'REJECTED';

export type Category = 
  | 'POTHOLE' 
  | 'ROAD_CRACK' 
  | 'ROAD_OBSTACLE' 
  | 'ROAD_FLOODING' 
  | 'COMPLEX_DAMAGE'
  | 'OTHER';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Priority = 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface User {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  role: Role;
  avatarUrl?: string;
}

export interface AiDetection {
  className: string;
  confidence: number;
  bboxX: number;
  bboxY: number;
  bboxWidth: number;
  bboxHeight: number;
  inferenceMs: number;
  activeThreshold?: number;
  flag?: string;
  count?: number;
  boxes?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    className: string;
  }>;
}

export interface Assignment {
  assignedByAdminName: string;
  assignedToStaffId: number;
  assignedToStaffName: string;
  verifiedCategory: string;
  priority: Priority;
  notes?: string;
  assignedAt: string;
}

export interface Resolution {
  staffName: string;
  proofImageUrl: string;
  notes?: string;
  resolvedAt: string;
}

export interface Feedback {
  rating: number;
  comments?: string;
  createdAt: string;
}

export interface Incident {
  id: number;
  ticketCode: string;
  title: string;
  description?: string;
  imageUrl: string;
  latitude: number;
  longitude: number;
  address?: string;
  category: Category;
  status: IncidentStatus;
  severity: Severity;
  flag?: string;
  rejectionReason?: string;
  citizenId: number;
  reporterName: string;
  reporterPhone?: string;
  aiDetection?: AiDetection;
  assignment?: Assignment;
  resolution?: Resolution;
  feedback?: Feedback;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
}

export interface AuthResponse {
  token: string;
  type: string;
  userId: number;
  email: string;
  fullName: string;
  role: Role;
}
