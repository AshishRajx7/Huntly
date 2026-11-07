export interface RawCompensation {
  min?: number;
  max?: number;
  currency?: string;
  interval?: string;
  summary?: string;
}

export interface RawAtsJob {
  atsProvider: "ashby" | "greenhouse" | "lever";
  atsJobId: string;
  companyId: string;
  companyName: string;
  companyWebsite?: string;
  companyLogo?: string;
  jobTitle: string;
  rawDescription: string;
  location?: string;
  isRemote?: boolean;
  department?: string;
  employmentType?: string;
  applicationUrl: string;
  originalPostingDate?: string;
  rawCompensation?: RawCompensation;
  metadata?: Record<string, unknown>;
}

export interface AtsFetchResult {
  companyId: string;
  companyName: string;
  atsProvider: "ashby" | "greenhouse" | "lever";
  success: boolean;
  jobs: RawAtsJob[];
  error?: string;
  httpStatus?: number;
}

