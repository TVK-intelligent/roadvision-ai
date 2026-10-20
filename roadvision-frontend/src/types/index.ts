export type Role = 'ROLE_CITIZEN' | 'ROLE_ADMIN' | 'ROLE_STAFF';

export type IncidentStatus = 
  | 'SUBMITTED' 
  | 'AI_ANALYZED' 
  | 'VERIFIED'
  | 'INSPECTION_ASSIGNED'
  | 'INSPECTING'
  | 'INSPECTED'
  | 'ASSIGNED' 
  | 'IN_PROGRESS' 
  | 'PENDING_INSPECTION'
  | 'PENDING_ACCEPTANCE'
  | 'RESOLVED' 
  | 'REWORK_REQUIRED'
  | 'CLOSED' 
  | 'REJECTED';

export type EvidenceStage = 
  | 'INSPECTION' 
  | 'BEFORE_WORK' 
  | 'PROGRESS' 
  | 'AFTER_WORK' 
  | 'REWORK';

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
  reputationScore?: number;
  spamStrikes?: number;
  suspendedUntil?: string;
  suspendReason?: string;
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
  aiVerificationStatus?: 'AI_VERIFIED_CLEAN' | 'AI_WARNING_DEFECT_REMAINS';
  aiVerificationConfidence?: number;
  aiVerificationDetectionsJson?: string;
  aiVerificationNotes?: string;
  verificationBoxes?: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
    className: string;
  }>;
  resolvedAt: string;
}

export interface Feedback {
  rating: number;
  comments?: string;
  createdAt: string;
}

export interface InspectionResponse {
  id: number;
  incidentId: number;
  inspectorId?: number;
  inspectorName?: string;
  inspectionTeamId?: number;
  inspectionTeamName?: string;
  actualLatitude?: number;
  actualLongitude?: number;
  confirmedCategory?: Category;
  actualSeverity?: Severity;
  estimatedSize?: string;
  trafficImpact?: string;
  proposedSolution?: string;
  noDamageFound?: boolean;
  reasonNoDamage?: string;
  notes?: string;
  inspectionPhotos?: string[];
  inspectedAt?: string;
}

export interface EvidenceResponse {
  id: number;
  incidentId: number;
  stage: EvidenceStage;
  imageUrl: string;
  uploaderId?: number;
  uploaderName?: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
  reworkIteration?: number;
  aiVerificationStatus?: string;
  aiVerificationNotes?: string;
  createdAt: string;
}

export interface InspectionAssignRequest {
  teamId: number;
  inspectorId?: number;
  priority?: Priority;
  notes?: string;
}

export interface InspectionReportRequest {
  actualLatitude?: number;
  actualLongitude?: number;
  confirmedCategory?: Category;
  actualSeverity?: Severity;
  estimatedSize?: string;
  trafficImpact?: string;
  proposedSolution?: string;
  noDamageFound?: boolean;
  reasonNoDamage?: string;
  notes?: string;
}

export interface ConstructionAssignRequest {
  teamId: number;
  staffId?: number;
  workPlan?: string;
  priority?: Priority;
  plannedStartDate?: string;
  plannedDeadline?: string;
  safetyNotes?: string;
  instructions?: string;
}

export interface AcceptanceReviewRequest {
  approved: boolean;
  reworkReason?: string;
  notes?: string;
}

export interface Incident {
  id: number;
  ticketCode: string;
  title: string;
  description?: string;
  imageUrl: string;
  imageSha256?: string;
  latitude: number;
  longitude: number;
  originalLatitude?: number;
  originalLongitude?: number;
  gpsAccuracy?: number;
  address?: string;
  routeCorridor?: string;
  zoneName?: string;
  category: Category;
  status: IncidentStatus;
  severity: Severity;
  flag?: string;
  rejectionReason?: string;
  reworkReason?: string;
  reworkCount?: number;
  upvoteCount?: number;
  hasUpvoted?: boolean;
  citizenId: number;
  reporterName: string;
  reporterPhone?: string;
  reporterReputationScore?: number;
  aiDetection?: AiDetection;
  assignment?: Assignment;
  resolution?: Resolution;
  feedback?: Feedback;

  // Trường luồng 7 giai đoạn
  inspectionTeamId?: number;
  inspectionTeamName?: string;
  assignedTeamId?: number;
  assignedTeamName?: string;
  workPlan?: string;
  safetyNotes?: string;
  plannedStartDate?: string;
  plannedDeadline?: string;
  inspection?: InspectionResponse;
  evidences?: EvidenceResponse[];

  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
  closedAt?: string;
}

export interface NearbyIncidentCheckResponse {
  hasNearbyDuplicate: boolean;
  distanceMeters?: number;
  existingIncident?: Incident;
  message?: string;
}

export interface AuthResponse {
  token: string;
  type: string;
  userId: number;
  email: string;
  fullName: string;
  role: Role;
}

export interface StreamPoint {
  timeLabel: string;
  aiSensorCount: number;
  citizenReportCount: number;
}

export interface AdminAnalyticsResponse {
  totalIncidents: number;
  totalGrowthPercent: number;
  triagePendingCount: number;
  inProgressCount: number;
  activeCrewsCount: number;
  resolvedCount: number;
  clearanceRatePercent: number;
  aiAccuracyPercent: number;
  aiModelVersion: string;
  avgInferenceLatencyMs: number;
  meanResolutionHours: number;
  categoryCounts: Record<string, number>;
  categoryPercentages: Record<string, number>;
  statusCounts: Record<string, number>;
  telemetricStream: StreamPoint[];
  urgentIncidents: Incident[];
}

export type TeamType = 'INSPECTION' | 'CONSTRUCTION' | 'EMERGENCY';

export interface TeamMemberSummary {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  specialization?: string;
  isTeamLeader: boolean;
}

export interface Team {
  id: number;
  name: string;
  teamType: TeamType;
  corridor?: string;
  zoneName?: string;
  description?: string;
  leaderId?: number;
  leaderName?: string;
  leaderPhone?: string;
  memberCount: number;
  activeTaskCount: number;
  members: TeamMemberSummary[];
  isActive: boolean;
  createdAt?: string;
}

export interface TeamRequest {
  name: string;
  teamType: TeamType;
  corridor?: string;
  zoneName?: string;
  description?: string;
  leaderId?: number;
}

export interface Staff {
  id: number;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  specialization?: string;
  teamId?: number;
  teamName?: string;
  teamType?: TeamType;
  isTeamLeader: boolean;
  activeTasksCount: number;
  isActive: boolean;
  createdAt?: string;
}

export interface StaffCreateRequest {
  email: string;
  password?: string;
  fullName: string;
  phone?: string;
  specialization?: string;
  teamId?: number;
  isTeamLeader?: boolean;
}

export interface StaffUpdateRequest {
  fullName?: string;
  phone?: string;
  specialization?: string;
  teamId?: number;
  isTeamLeader?: boolean;
  password?: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'URGENT';
  incidentId?: number;
  ticketCode?: string;
  targetRole?: string;
  targetUserId?: number;
  read: boolean;
  createdAt: string;
}


