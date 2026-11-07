export interface ExtractedSkills {
  skills: string[];
  primaryMatches: string[];
  additionalMatches: string[];
}

export const PRIMARY_SKILLS = [
  "JavaScript",
  "TypeScript",
  "Node.js",
  "NestJS",
  "PostgreSQL",
  "Redis",
  "Python",
  "Docker",
];

export const ADDITIONAL_SKILLS = [
  "React",
  "SQL",
  "REST APIs",
  "Git",
  "Linux",
  "Microservices",
  "MongoDB",
  "AWS",
  "System Design",
  "Next.js",
  "Express",
  "GraphQL",
  "Tailwind CSS",
  "Kubernetes",
  "Kafka",
  "CI/CD",
  "Prisma",
  "WebSockets",
  "GCP",
  "Go",
  "Java",
];

interface SkillPattern {
  name: string;
  pattern: RegExp;
  category: "primary" | "additional";
}

const SKILL_PATTERNS: SkillPattern[] = [
  // Primary
  { name: "JavaScript", pattern: /\b(javascript|js|es6|es20\d\d)\b/i, category: "primary" },
  { name: "TypeScript", pattern: /\b(typescript|ts)\b/i, category: "primary" },
  { name: "Node.js", pattern: /\b(node(?:\.js)?|nodejs)\b/i, category: "primary" },
  { name: "NestJS", pattern: /\b(nest(?:\.js)?|nestjs)\b/i, category: "primary" },
  { name: "PostgreSQL", pattern: /\b(postgres(?:ql)?|psql)\b/i, category: "primary" },
  { name: "Redis", pattern: /\b(redis)\b/i, category: "primary" },
  { name: "Python", pattern: /\b(python|python3|py)\b/i, category: "primary" },
  { name: "Docker", pattern: /\b(docker|containerization|containers)\b/i, category: "primary" },

  // Additional
  { name: "React", pattern: /\b(react(?:\.js)?|reactjs)\b/i, category: "additional" },
  { name: "SQL", pattern: /\b(sql|relational databases?|rdbms)\b/i, category: "additional" },
  { name: "REST APIs", pattern: /\b(rest(?:ful)?(?:\s+api[s]?)?|restapis?)\b/i, category: "additional" },
  { name: "Git", pattern: /\b(git|github|gitlab)\b/i, category: "additional" },
  { name: "Linux", pattern: /\b(linux|unix|bash|shell scripting)\b/i, category: "additional" },
  { name: "Microservices", pattern: /\b(microservices?|distributed systems?)\b/i, category: "additional" },
  { name: "MongoDB", pattern: /\b(mongodb|mongo|nosql)\b/i, category: "additional" },
  { name: "AWS", pattern: /\b(aws|amazon web services|ec2|s3|lambda)\b/i, category: "additional" },
  { name: "System Design", pattern: /\b(system design|high availability|scalability|architecting)\b/i, category: "additional" },
  { name: "Next.js", pattern: /\b(next(?:\.js)?|nextjs)\b/i, category: "additional" },
  { name: "Express", pattern: /\b(express(?:\.js)?|expressjs)\b/i, category: "additional" },
  { name: "GraphQL", pattern: /\b(graphql|gql)\b/i, category: "additional" },
  { name: "Tailwind CSS", pattern: /\b(tailwind(?:css)?)\b/i, category: "additional" },
  { name: "Kubernetes", pattern: /\b(kubernetes|k8s)\b/i, category: "additional" },
  { name: "Kafka", pattern: /\b(kafka|message queues?|rabbitmq|event-driven)\b/i, category: "additional" },
  { name: "CI/CD", pattern: /\b(ci\/cd|continuous integration|github actions)\b/i, category: "additional" },
  { name: "Prisma", pattern: /\b(prisma|typeorm|orm)\b/i, category: "additional" },
  { name: "WebSockets", pattern: /\b(websockets?|socket\.io)\b/i, category: "additional" },
  { name: "GCP", pattern: /\b(gcp|google cloud)\b/i, category: "additional" },
  { name: "Go", pattern: /\b(golang|go language)\b/i, category: "additional" },
  { name: "Java", pattern: /\b(java\b(?!\s*script)|spring boot)\b/i, category: "additional" },
];

export function extractSkills(text: string): ExtractedSkills {
  if (!text) {
    return { skills: [], primaryMatches: [], additionalMatches: [] };
  }

  const foundSkills = new Set<string>();
  const primaryMatches = new Set<string>();
  const additionalMatches = new Set<string>();

  for (const { name, pattern, category } of SKILL_PATTERNS) {
    if (pattern.test(text)) {
      foundSkills.add(name);
      if (category === "primary") {
        primaryMatches.add(name);
      } else {
        additionalMatches.add(name);
      }
    }
  }

  return {
    skills: Array.from(foundSkills),
    primaryMatches: Array.from(primaryMatches),
    additionalMatches: Array.from(additionalMatches),
  };
}

