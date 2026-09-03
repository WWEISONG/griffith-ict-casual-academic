// ---------------------------------------------------------------------------
// Griffith University — School of ICT course catalogue.
//
// Source: Griffith's official course reading-list directory for the School of
// Information and Communication Technology (griffith.rl.talis.com/schools/ict).
// Retrieved September 2026. Campus/teaching-period variants (_M2, _P1, ...)
// were collapsed to their base course code.
//
// Regenerate or amend via the Admin > Courses screen, or by editing this file
// and re-running `npm run gen:courses` to refresh supabase/seed/courses.sql.
// ---------------------------------------------------------------------------
import type { Course } from '@/types'

interface RawCourse { code: string; title: string }

const RAW: RawCourse[] = [
  { code: '1001ICT', title: 'Introduction to Programming' },
  { code: '1004ICT', title: 'Professional Practice in Information Technology' },
  { code: '1005ICT', title: 'Object Oriented Programming' },
  { code: '1007ICT', title: 'Computer Systems and Cyber Security' },
  { code: '1008ICT', title: 'Business Informatics' },
  { code: '1011ICT', title: 'Applied Computing' },
  { code: '1013ICT', title: 'Mathematics for Computer Science' },
  { code: '1116ICT', title: 'Introduction to AI and Data Analytics' },
  { code: '1117ICT', title: 'Big Data Analytics and Social Media' },
  { code: '1118ICT', title: 'Fundamentals of Cyber Security' },
  { code: '1611ICT', title: 'Emerging Technologies' },
  { code: '1621ICT', title: 'Web Technologies' },
  { code: '1701ICT', title: 'Creative Coding' },
  { code: '1711ICT', title: 'Introduction to Robotics' },
  { code: '1801ICT', title: 'Object-Oriented Programming' },
  { code: '1802ICT', title: 'Foundations of Systems Development' },
  { code: '1803ICT', title: 'Information Systems Foundations' },
  { code: '1804ICT', title: 'Data Management' },
  { code: '1805ICT', title: 'Human Computer Interaction' },
  { code: '1806ICT', title: 'Programming Fundamentals' },
  { code: '1807ICT', title: 'Computer and Network Architecture' },
  { code: '1808ICT', title: 'Discrete Structures' },
  { code: '1810ICT', title: 'Software Development Processes' },
  { code: '1811ICT', title: 'Programming Principles' },
  { code: '1812ICT', title: 'Data Management' },
  { code: '1814ICT', title: 'Data Management' },
  { code: '2006ICT', title: 'Object Oriented Software Development' },
  { code: '2007ICT', title: 'Cyber Security Standards and Operations' },
  { code: '2008ICT', title: 'Design Thinking in IT' },
  { code: '2016ICT', title: 'Cloud Architecture and Administration' },
  { code: '2030ICT', title: 'Introduction to Big Data Analytics' },
  { code: '2031ICT', title: 'Data Analytics Methods' },
  { code: '2105ICT', title: 'Advanced Research Project in Information Technology A' },
  { code: '2420ICT', title: 'Systems Programming' },
  { code: '2511ICT', title: 'Business Analysis' },
  { code: '2701ICT', title: 'Interactive App Development' },
  { code: '2702ICT', title: 'Intelligent Media Systems' },
  { code: '2703ICT', title: 'Web Application Development' },
  { code: '2800ICT', title: 'Object Oriented Programming' },
  { code: '2801ICT', title: 'Computing Algorithms' },
  { code: '2802ICT', title: 'Intelligent Systems' },
  { code: '2803ICT', title: 'Systems and Distributed Computing' },
  { code: '2805ICT', title: 'System and Software Design' },
  { code: '2806ICT', title: 'IT Services Management' },
  { code: '2807ICT', title: 'Programming Principles' },
  { code: '2808ICT', title: 'Secure Development Operations' },
  { code: '2809ICT', title: 'Computer Networking Essentials' },
  { code: '2810ICT', title: 'Software Technologies' },
  { code: '2811ICT', title: 'Web Programming' },
  { code: '2812ICT', title: 'Perceptual Computing' },
  { code: '2813ICT', title: 'Software Engineering Fundamentals' },
  { code: '2814ICT', title: 'Data Management' },
  { code: '2815ICT', title: 'Theory of Computing' },
  { code: '2905ICT', title: 'Fundamentals of Cyber Security' },
  { code: '3001ICT', title: 'Enterprise Routing and Network Architectures' },
  { code: '3002ICT', title: 'Industry Project' },
  { code: '3003ICT', title: 'Programming for Robotics' },
  { code: '3004ICT', title: 'Web Application Development' },
  { code: '3005ICT', title: 'Distributed Programming' },
  { code: '3006ICT', title: 'Robotics and Computer Vision' },
  { code: '3008ICT', title: 'Deep Learning' },
  { code: '3009ICT', title: 'Data Processing and Visualisation' },
  { code: '3010ICT', title: 'Cyber Security of Cyber Physical Systems' },
  { code: '3012ICT', title: 'Cryptography' },
  { code: '3014ICT', title: 'Cyber Security Defence and Incident Response' },
  { code: '3015ICT', title: 'Trustworthy AI' },
  { code: '3016ICT', title: 'Secure Development Operations' },
  { code: '3020ICT', title: 'Industry Affiliates Program' },
  { code: '3030ICT', title: 'Data Analytics' },
  { code: '3031ICT', title: 'Applied Data Mining' },
  { code: '3032ICT', title: 'Big Data Analytics and Social Media' },
  { code: '3105ICT', title: 'Advanced Research Project in Information Technology B' },
  { code: '3301ICT', title: 'Enterprise Architecture Concepts' },
  { code: '3407ICT', title: 'Graphics Programming' },
  { code: '3410ICT', title: 'The Ethical Technologist' },
  { code: '3412ICT', title: 'Software Architecture' },
  { code: '3413ICT', title: 'Network Security' },
  { code: '3418ICT', title: 'Strategic IS Management' },
  { code: '3420ICT', title: 'Systems Programming' },
  { code: '3421ICT', title: 'Multiagent Systems' },
  { code: '3530ICT', title: 'Scientific and Parallel Computing' },
  { code: '3601ICT', title: 'Professional Practice Portfolio' },
  { code: '3612ICT', title: 'Database Systems and Administration' },
  { code: '3623ICT', title: 'Information and Content Management' },
  { code: '3624ICT', title: '3D Game Development' },
  { code: '3701ICT', title: 'Mobile Application Development' },
  { code: '3702ICT', title: 'Games Development' },
  { code: '3705ICT', title: 'Virtual and Augmented Reality' },
  { code: '3706ICT', title: 'Sensor Networks' },
  { code: '3707ICT', title: 'Automation and IoT' },
  { code: '3723ICT', title: 'Interaction Design' },
  { code: '3801ICT', title: 'Numerical Algorithms' },
  { code: '3802ICT', title: 'Programming Languages' },
  { code: '3803ICT', title: 'Big Data Analysis' },
  { code: '3804ICT', title: 'Data Mining' },
  { code: '3805ICT', title: 'Advanced Algorithms' },
  { code: '3806ICT', title: 'Logic and Automated Reasoning' },
  { code: '3807ICT', title: 'IT/Business Alignment' },
  { code: '3808ICT', title: 'Routing and Internetworking' },
  { code: '3809ICT', title: 'Ethical Hacking' },
  { code: '3810ICT', title: 'Enterprise Architecture Application' },
  { code: '3811ICT', title: 'Advanced Network Architectures' },
  { code: '3812ICT', title: 'Agile Methodologies' },
  { code: '3813ICT', title: 'Full Stack Development' },
  { code: '3815ICT', title: 'Software Engineering' },
  { code: '3821ICT', title: 'Work Integrated Learning - Single Project' },
  { code: '3822ICT', title: 'Work Integrated Learning - Placement' },
  { code: '3825ICT', title: 'Theory of Computation' },
  { code: '3906ICT', title: 'Digital Forensics' },
  { code: '4030ICT', title: 'Big Data Analytics and Social Media' },
  { code: '6001ICT', title: 'Advanced Topics in Computer Science A' },
  { code: '6002ICT', title: 'Advanced Topics in Computer Science B' },
  { code: '6003ICT', title: 'Advanced Topics in Computer Science C' },
  { code: '6004ICT', title: 'Advanced Topics in Computer Science D' },
  { code: '6005ICT', title: 'Research Practice in ICT 1' },
  { code: '6006ICT', title: 'Research Practice in ICT 2' },
  { code: '6105ICT', title: 'Advanced Topics in Information Technology C' },
  { code: '6106ICT', title: 'Advanced Topics in Information Technology D' },
  { code: '6112ICT', title: 'Research Methods in IT' },
  { code: '6190ICT', title: 'Honours Thesis' },
  { code: '6205ICT', title: 'Advanced Topics in Information Technology A' },
  { code: '6206ICT', title: 'Advanced Topics in Information Technology B' },
  { code: '7001ICT', title: 'Programming Principles' },
  { code: '7002ICT', title: 'Systems Development' },
  { code: '7003ICT', title: 'Database Design' },
  { code: '7004ICT', title: 'Data Communication' },
  { code: '7005ICT', title: 'Web Programming' },
  { code: '7006ICT', title: 'Introduction to Artificial Intelligence' },
  { code: '7008ICT', title: 'Data Processing and Visualisation' },
  { code: '7009ICT', title: 'Advances in XR Development' },
  { code: '7010ICT', title: 'Object Oriented Software Development' },
  { code: '7011ICT', title: 'Data Structures and Algorithms' },
  { code: '7013ICT', title: 'Advanced Topics in IT' },
  { code: '7015ICT', title: 'Cyber Security Operations Centres' },
  { code: '7016ICT', title: 'Cyber Security of Critical Infrastructure' },
  { code: '7017ICT', title: 'Responsible and Secure Artificial Intelligence' },
  { code: '7018ICT', title: 'Cloud Architecture and Administration' },
  { code: '7019ICT', title: 'Cyber Security Risk Management' },
  { code: '7022ICT', title: 'Computational Intelligence' },
  { code: '7030ICT', title: 'Introduction to Big Data Analytics' },
  { code: '7031ICT', title: 'Applied Data Mining' },
  { code: '7101ICT', title: 'The Ethical Technologist' },
  { code: '7103ICT', title: 'Business Analysis' },
  { code: '7113ICT', title: 'Research for IT Professionals' },
  { code: '7130ICT', title: 'Data Analytics' },
  { code: '7204ICT', title: 'Database Technology' },
  { code: '7230ICT', title: 'Big Data Analytics and Social Media' },
  { code: '7301ICT', title: 'Enterprise Architecture Concepts' },
  { code: '7302ICT', title: 'Enterprise Architecture Applications' },
  { code: '7401ICT', title: 'eService Technology' },
  { code: '7412ICT', title: 'Software Architecture' },
  { code: '7418ICT', title: 'Strategic Information Systems Management' },
  { code: '7420ICT', title: 'Advanced Software Development' },
  { code: '7421ICT', title: 'Mobile Device Software Development' },
  { code: '7502ICT', title: 'Advanced Networking' },
  { code: '7504ICT', title: 'Network and Information Security' },
  { code: '7506ICT', title: 'Industrial Applications of Blockchain' },
  { code: '7590ICT', title: 'Dissertation' },
  { code: '7610ICT', title: 'Application Systems' },
  { code: '7611ICT', title: 'Computer Systems and Cyber Security' },
  { code: '7623ICT', title: 'Secure Development Operations' },
  { code: '7701ICT', title: 'IT Project' },
  { code: '7720ICT', title: 'Industry Affiliates Program' },
  { code: '7740ICT', title: 'Industry Affiliates Program' },
  { code: '7805ICT', title: 'System and Software Design' },
  { code: '7806ICT', title: 'IT Services Management' },
  { code: '7807ICT', title: 'IT/Business Alignment' },
  { code: '7808ICT', title: 'Project and Cyber Security Management' },
  { code: '7809ICT', title: 'Offensive Cyber Security' },
  { code: '7810ICT', title: 'Software Technologies' },
  { code: '7812ICT', title: 'Agile Business Analysis' },
  { code: '7821ICT', title: 'Work Integrated Learning - Single Project' },
  { code: '7822ICT', title: 'Work Integrated Learning - Placement' },
  { code: '7905ICT', title: 'Fundamentals of Cyber Security' },
  { code: '7906ICT', title: 'Digital Investigations' },
  { code: '7907ICT', title: 'IT and Cyber Security Governance, Policy, Ethics and Law' },
  { code: '7980ICT', title: 'Cyber Security Capstone Project' },
  { code: '7990ICT', title: 'Designing Application Systems and Databases' },
  { code: '7991ICT', title: 'Computer Systems and Programming' },
  { code: '7992ICT', title: 'Artificial Intelligence and IT Governance' },
  { code: '7993ICT', title: 'Network Infrastructure and Cloud Systems' },
  { code: '7994ICT', title: 'Security Essentials and Adversarial Techniques' },
  { code: '7995ICT', title: 'Data Wrangling and Social Analytics' },
  { code: '7996ICT', title: 'Intelligent Systems and Data Analysis' },
  { code: '7997ICT', title: 'Capstone Project' },
  { code: '7998ICT', title: 'Security Operations Centre and AI' },
  { code: '7999ICT', title: 'Critical Infrastructure and Distributed Technologies' },
]

/** First digit of a Griffith course code encodes its level. */
export function courseLevel(code: string): number {
  return Number(code[0]) || 0
}

export function levelLabel(level: number): string {
  if (level >= 1 && level <= 3) return `Undergraduate — Year ${level}`
  if (level === 4 || level === 6) return 'Honours / Research'
  if (level >= 7) return 'Postgraduate'
  return 'Other'
}

/** Short label for compact UI, e.g. tables and chips. */
export function levelShortLabel(level: number): string {
  if (level >= 1 && level <= 3) return `UG Y${level}`
  if (level === 4 || level === 6) return 'Hons'
  if (level >= 7) return 'PG'
  return '—'
}

export const ICT_COURSES: Course[] = RAW.map((c) => ({
  code: c.code,
  title: c.title,
  level: courseLevel(c.code),
  school: 'ICT' as const,
  isActive: true,
}))

export const COURSE_BY_CODE: Record<string, Course> = Object.fromEntries(
  ICT_COURSES.map((c) => [c.code, c]),
)

export function courseLabel(code: string): string {
  const c = COURSE_BY_CODE[code]
  return c ? `${c.code} — ${c.title}` : code
}
