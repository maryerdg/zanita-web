export interface Profile {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  role: 'customer' | 'cetys' | 'admin';
}

export interface CetysAccessRequest {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  profiles?: {
    full_name: string;
    phone: string;
    email: string;
  };
}
