export type Urgency = 'Low' | 'Medium' | 'High';
export type NeedStatus = 'Pending' | 'In Progress' | 'Completed';
export type UserRole = 'NGO' | 'Volunteer';

export interface Need {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  peopleAffected: number;
  urgency: Urgency;
  createdAt: number;
  deadline?: number; // Optional deadline
  priorityScore: number;
  aiSummary: string;
  status: NeedStatus;
  ngoId: string;
  ngoEmail: string;
  volunteerId?: string; // If assigned to single
  assignedVolunteers?: string[]; 
  deleted?: boolean;
}

export interface VolunteerProfile {
  uid: string;
  name: string;
  email: string;
  skills: string[];
  location: string;
  availability: boolean;
  experienceLevel: 'Beginner' | 'Intermediate' | 'Expert';
  trustScore: number; // 0-100 scale
  completedTasks: number;
  impactScore: number;
  deleted?: boolean;
}

export interface Assignment {
  id: string;
  needId: string;
  ngoId: string;
  volunteerId: string;
  volunteerName: string;
  status: 'Assigned' | 'Accepted' | 'Rejected';
  timestamp: number;
  rating?: number; // 1-5 stars assigned by NGO
  feedback?: string;
}

export interface ActivityLog {
  id: string;
  type: 'Task_Created' | 'Assignment_Initialized' | 'Task_Accepted' | 'Task_Rejected' | 'Mission_Withdrawn' | 'Task_Completed' | 'Feedback_Given';
  targetId: string; // needId or volunteerId
  actorId: string;
  message: string;
  timestamp: number;
}

export interface Notification {
  id: string;
  recipientId: string;
  message: string;
  type: string;
  timestamp: number;
  read: boolean;
}
