export interface RawCompensation {
  min?: number;
  max?: number;
  currency?: string;
  interval?: string;
  summary?: string;
}

export interface RawAtsJob {
  atsProvider: "ashby" | "greenhouse" | "lever" | "huntyourtribe" | "freehire" | string;
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
  structuredMinExperience?: number | null;
  structuredMaxExperience?: number | null;
  metadata?: Record<string, unknown>;
}

export interface AtsFetchResult {
  companyId: string;
  companyName: string;
  atsProvider: "ashby" | "greenhouse" | "lever" | "huntyourtribe" | "freehire" | string;
  success: boolean;
  jobs: RawAtsJob[];
  error?: string;
  httpStatus?: number;
}

