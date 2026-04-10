export interface ParticleQueryResponse {
  id: string;
  patient_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  networks?: {
    name: string;
    status: string;
  }[];
}
