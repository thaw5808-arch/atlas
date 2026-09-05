/**
 * Development seed.
 *
 * The institutions below are INVENTED. Countries, cities and general cost
 * ranges are plausible, but nothing here is sourced — every record is marked
 * NEEDS_REVIEW and attributed to the sample data source so the reliability
 * surfaces in the app tell the truth. Replace with sourced records before any
 * real use.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function reset() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.verificationRecord.deleteMany(),
    prisma.correctionRequest.deleteMany(),
    prisma.universityRepresentative.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.applicationTask.deleteMany(),
    prisma.application.deleteMany(),
    prisma.savedUniversity.deleteMany(),
    prisma.collection.deleteMany(),
    prisma.scenarioCost.deleteMany(),
    prisma.scenario.deleteMany(),
    prisma.decisionScore.deleteMany(),
    prisma.decisionPreference.deleteMany(),
    prisma.languageQualification.deleteMany(),
    prisma.studentProfile.deleteMany(),
    prisma.session.deleteMany(),
    prisma.scholarshipRequirement.deleteMany(),
    prisma.scholarship.deleteMany(),
    prisma.livingCostRecord.deleteMany(),
    prisma.tuitionRecord.deleteMany(),
    prisma.languageRequirement.deleteMany(),
    prisma.admissionRequirement.deleteMany(),
    prisma.program.deleteMany(),
    prisma.university.deleteMany(),
    prisma.city.deleteMany(),
    prisma.country.deleteMany(),
    prisma.major.deleteMany(),
    prisma.field.deleteMany(),
    prisma.exchangeRate.deleteMany(),
    prisma.dataSource.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

const RATES: [string, number][] = [
  ["EUR", 0.92],
  ["GBP", 0.78],
  ["JPY", 150],
  ["THB", 35],
  ["KRW", 1350],
  ["AUD", 1.5],
  ["CAD", 1.36],
  ["SGD", 1.34],
];

async function main() {
  await reset();

  const source = await prisma.dataSource.create({
    data: {
      label: "ATLAS sample dataset",
      publisher: "ATLAS development seed",
      note: "Illustrative figures for development. Not collected from any institution.",
    },
  });

  await prisma.exchangeRate.createMany({
    data: RATES.map(([quoteCurrency, rate]) => ({
      baseCurrency: "USD",
      quoteCurrency,
      rate,
      source: "seed",
    })),
  });

  // ── reference data ────────────────────────────────────────────────
  const countries = await Promise.all(
    (
      [
        {
          code: "JP",
          name: "Japan",
          region: "East Asia",
          currency: "JPY",
          languages: ["Japanese", "English"],
          visaOverview: "Student visa granted on a Certificate of Eligibility applied for by the university.",
          workRuleSummary: "Permission to engage in activity outside status allows up to 28 hours a week in term.",
          workHoursPerWeek: 28,
          typicalStudentWage: 1150,
          workWeeksPerYear: 40,
          academicCalendar: "Main intake in April, a growing number of English programs start in September.",
          housingNotes: "University dormitories are common in the first year; key money is usual in private rentals.",
          insuranceNotes: "National Health Insurance enrolment is compulsory for stays over three months.",
          transportNotes: "Commuter passes are heavily discounted for registered students.",
          typicalTuitionMin: 3500,
          typicalTuitionMax: 12000,
          typicalLivingMin: 7000,
          typicalLivingMax: 13000,
          latitude: 36.2,
          longitude: 138.25,
        },
        {
          code: "TH",
          name: "Thailand",
          region: "Southeast Asia",
          currency: "THB",
          languages: ["Thai", "English"],
          visaOverview: "Non-Immigrant ED visa, extended in-country each term through the university.",
          workRuleSummary: "Paid work is tightly restricted and needs a separate work permit.",
          workHoursPerWeek: 0,
          typicalStudentWage: 0,
          workWeeksPerYear: 0,
          academicCalendar: "Two semesters, August and January, with a short summer term.",
          housingNotes: "Private condominium rentals near campus are the norm.",
          insuranceNotes: "Private student health insurance is usually required at enrolment.",
          transportNotes: "Rail passes in Bangkok; scooters and songthaews elsewhere.",
          typicalTuitionMin: 2000,
          typicalTuitionMax: 9000,
          typicalLivingMin: 4000,
          typicalLivingMax: 8000,
          latitude: 15.87,
          longitude: 100.99,
        },
        {
          code: "DE",
          name: "Germany",
          region: "Western Europe",
          currency: "EUR",
          languages: ["German", "English"],
          visaOverview: "National visa for study, with a blocked account showing living funds for the first year.",
          workRuleSummary: "Non-EU students may work 140 full or 280 half days a year.",
          workHoursPerWeek: 20,
          typicalStudentWage: 13,
          workWeeksPerYear: 30,
          academicCalendar: "Winter semester from October, summer semester from April.",
          housingNotes: "Studierendenwerk halls are cheap but heavily oversubscribed; shared flats are common.",
          insuranceNotes: "Statutory student health insurance is required to enrol.",
          transportNotes: "The semester ticket covers regional transport in most states.",
          typicalTuitionMin: 0,
          typicalTuitionMax: 6000,
          typicalLivingMin: 10000,
          typicalLivingMax: 14000,
          latitude: 51.16,
          longitude: 10.45,
        },
        {
          code: "KR",
          name: "South Korea",
          region: "East Asia",
          currency: "KRW",
          languages: ["Korean", "English"],
          visaOverview: "D-2 student visa issued on a certificate of admission.",
          workRuleSummary: "Part-time work permitted after one semester, subject to a language-level condition.",
          workHoursPerWeek: 20,
          typicalStudentWage: 9800,
          workWeeksPerYear: 34,
          academicCalendar: "Spring semester in March, autumn semester in September.",
          housingNotes: "On-campus dormitories are widely available and inexpensive.",
          insuranceNotes: "National Health Insurance enrolment is mandatory for international students.",
          transportNotes: "Subway and bus networks with transfer discounts.",
          typicalTuitionMin: 3500,
          typicalTuitionMax: 11000,
          typicalLivingMin: 6000,
          typicalLivingMax: 11000,
          latitude: 36.5,
          longitude: 127.85,
        },
        {
          code: "NL",
          name: "Netherlands",
          region: "Western Europe",
          currency: "EUR",
          languages: ["Dutch", "English"],
          visaOverview: "Residence permit applied for by the university as a recognised sponsor.",
          workRuleSummary: "Non-EU students may work 16 hours a week in term with an employer-held permit.",
          workHoursPerWeek: 16,
          typicalStudentWage: 14,
          workWeeksPerYear: 32,
          academicCalendar: "One intake in September, some programs also start in February.",
          housingNotes: "Housing shortages are severe in the large student cities — apply early.",
          insuranceNotes: "Dutch basic health insurance is required once you take paid work.",
          transportNotes: "Cycling is the default; regional rail is fast but not discounted for internationals.",
          typicalTuitionMin: 8000,
          typicalTuitionMax: 18000,
          typicalLivingMin: 11000,
          typicalLivingMax: 15000,
          latitude: 52.13,
          longitude: 5.29,
        },
        {
          code: "CA",
          name: "Canada",
          region: "North America",
          currency: "CAD",
          languages: ["English", "French"],
          visaOverview: "Study permit, with proof of funds alongside the letter of acceptance.",
          workRuleSummary: "Up to 24 hours a week off campus during term for eligible study-permit holders.",
          workHoursPerWeek: 24,
          typicalStudentWage: 17,
          workWeeksPerYear: 34,
          academicCalendar: "Fall intake in September, winter intake in January.",
          housingNotes: "Residence in first year is common; off-campus rents vary sharply by city.",
          insuranceNotes: "Provincial or university health plans depending on the province.",
          transportNotes: "Universal transit passes are bundled into fees at many universities.",
          typicalTuitionMin: 12000,
          typicalTuitionMax: 30000,
          typicalLivingMin: 11000,
          typicalLivingMax: 17000,
          latitude: 56.13,
          longitude: -106.35,
        },
      ] satisfies Prisma.CountryUncheckedCreateInput[]
    ).map((data) =>
      prisma.country.create({ data: { ...data, dataSourceId: source.id, verification: "NEEDS_REVIEW" } }),
    ),
  );

  const cityData: [string, string, "MAJOR_METRO" | "MID_SIZED_CITY" | "UNIVERSITY_TOWN", number, number][] = [
    ["Kyoto", "JP", "MID_SIZED_CITY", 35.01, 135.77],
    ["Fukuoka", "JP", "MID_SIZED_CITY", 33.59, 130.4],
    ["Bangkok", "TH", "MAJOR_METRO", 13.76, 100.5],
    ["Chiang Mai", "TH", "MID_SIZED_CITY", 18.79, 98.99],
    ["Leipzig", "DE", "MID_SIZED_CITY", 51.34, 12.37],
    ["Aachen", "DE", "UNIVERSITY_TOWN", 50.78, 6.08],
    ["Daejeon", "KR", "MID_SIZED_CITY", 36.35, 127.38],
    ["Groningen", "NL", "UNIVERSITY_TOWN", 53.22, 6.57],
    ["Halifax", "CA", "MID_SIZED_CITY", 44.65, -63.58],
  ];

  const cities = await Promise.all(
    cityData.map(([name, countryCode, environment, latitude, longitude]) =>
      prisma.city.create({ data: { name, countryCode, environment, latitude, longitude } }),
    ),
  );
  const cityBy = (name: string) => cities.find((city) => city.name === name)!;

  const fieldData: [string, string[]][] = [
    ["Computing", ["Computer Science", "Data Science", "Cybersecurity"]],
    ["Engineering", ["Mechanical Engineering", "Electrical Engineering"]],
    ["Business", ["Business Administration", "International Business"]],
    ["Design", ["Interaction Design"]],
    ["Health", ["Public Health"]],
  ];

  const majors: { id: string; name: string }[] = [];
  for (const [fieldName, majorNames] of fieldData) {
    const field = await prisma.field.create({ data: { name: fieldName } });
    for (const name of majorNames) {
      majors.push(await prisma.major.create({ data: { name, fieldId: field.id } }));
    }
  }
  const majorBy = (name: string) => majors.find((major) => major.name === name)!;

  // ── universities ──────────────────────────────────────────────────
  type UniversitySeed = {
    slug: string;
    name: string;
    localName?: string;
    type: "PUBLIC" | "PRIVATE" | "PRIVATE_NONPROFIT";
    city: string;
    countryCode: string;
    overview: string;
    ranking?: number;
    students: number;
    partTime: boolean;
    housing: boolean;
    tuition: { currency: string; perYear: number; admission: number; other: number };
    living: { currency: string; onCampus: number; shared: number; private: number; food: number; transport: number; insurance: number; personal: number; books: number; visa: number };
    programs: { name: string; major: string; level: "BACHELOR" | "MASTER"; years: number; language: string; gpa: number | null; language_req: { test: string; score?: number; band?: string; waivable?: boolean }[] }[];
  };

  const universitySeeds: UniversitySeed[] = [
    {
      slug: "kamogawa-institute-of-technology",
      name: "Kamogawa Institute of Technology",
      localName: "鴨川工科大学",
      type: "PRIVATE_NONPROFIT",
      city: "Kyoto",
      countryCode: "JP",
      overview:
        "A mid-sized technical institute in eastern Kyoto with English-taught engineering and computing tracks, built around a compulsory industry placement in the third year.",
      ranking: 420,
      students: 9800,
      partTime: true,
      housing: true,
      tuition: { currency: "JPY", perYear: 985000, admission: 250000, other: 90000 },
      living: { currency: "JPY", onCampus: 42000, shared: 58000, private: 78000, food: 38000, transport: 7000, insurance: 3000, personal: 22000, books: 45000, visa: 12000 },
      programs: [
        {
          name: "BSc Computer Science",
          major: "Computer Science",
          level: "BACHELOR",
          years: 4,
          language: "English",
          gpa: 3.0,
          language_req: [{ test: "IELTS", score: 6 }, { test: "JLPT", band: "N4", waivable: true }],
        },
        {
          name: "MEng Mechanical Engineering",
          major: "Mechanical Engineering",
          level: "MASTER",
          years: 2,
          language: "English",
          gpa: 3.2,
          language_req: [{ test: "IELTS", score: 6.5 }],
        },
      ],
    },
    {
      slug: "hakata-bay-university",
      name: "Hakata Bay University",
      type: "PUBLIC",
      city: "Fukuoka",
      countryCode: "JP",
      overview:
        "A public university on the Fukuoka waterfront with a large international intake and one of the cheaper fee schedules for non-residents in the region.",
      ranking: 610,
      students: 14200,
      partTime: true,
      housing: true,
      tuition: { currency: "JPY", perYear: 535800, admission: 282000, other: 40000 },
      living: { currency: "JPY", onCampus: 30000, shared: 46000, private: 62000, food: 34000, transport: 6000, insurance: 3000, personal: 20000, books: 38000, visa: 12000 },
      programs: [
        {
          name: "BSc Data Science",
          major: "Data Science",
          level: "BACHELOR",
          years: 4,
          language: "English",
          gpa: 2.8,
          language_req: [{ test: "TOEFL_IBT", score: 79 }],
        },
        {
          name: "BA International Business",
          major: "International Business",
          level: "BACHELOR",
          years: 4,
          language: "Japanese",
          gpa: 2.6,
          language_req: [{ test: "JLPT", band: "N2" }],
        },
      ],
    },
    {
      slug: "chao-phraya-international-university",
      name: "Chao Phraya International University",
      type: "PRIVATE",
      city: "Bangkok",
      countryCode: "TH",
      overview:
        "An English-medium private university in central Bangkok focused on business, computing and design, with rolling admissions and a large regional student body.",
      students: 7600,
      partTime: false,
      housing: false,
      tuition: { currency: "THB", perYear: 198000, admission: 25000, other: 12000 },
      living: { currency: "THB", onCampus: 7000, shared: 9500, private: 15000, food: 9000, transport: 2200, insurance: 900, personal: 5000, books: 8000, visa: 6000 },
      programs: [
        {
          name: "BSc Computer Science",
          major: "Computer Science",
          level: "BACHELOR",
          years: 4,
          language: "English",
          gpa: 2.5,
          language_req: [{ test: "IELTS", score: 5.5, waivable: true }, { test: "DUOLINGO", score: 100, waivable: true }],
        },
        {
          name: "BBA Business Administration",
          major: "Business Administration",
          level: "BACHELOR",
          years: 4,
          language: "English",
          gpa: 2.3,
          language_req: [{ test: "IELTS", score: 5.5, waivable: true }],
        },
      ],
    },
    {
      slug: "lanna-technical-university",
      name: "Lanna Technical University",
      type: "PUBLIC",
      city: "Chiang Mai",
      countryCode: "TH",
      overview:
        "A public technical university in Chiang Mai with low fees, a bilingual curriculum and strong links to the northern manufacturing corridor.",
      students: 11500,
      partTime: false,
      housing: true,
      tuition: { currency: "THB", perYear: 96000, admission: 8000, other: 6000 },
      living: { currency: "THB", onCampus: 4000, shared: 6500, private: 11000, food: 7000, transport: 1500, insurance: 800, personal: 4000, books: 6000, visa: 6000 },
      programs: [
        {
          name: "BEng Electrical Engineering",
          major: "Electrical Engineering",
          level: "BACHELOR",
          years: 4,
          language: "English",
          gpa: 2.5,
          language_req: [{ test: "IELTS", score: 5.5, waivable: true }],
        },
      ],
    },
    {
      slug: "leipzig-university-of-applied-sciences",
      name: "Leipzig School of Applied Sciences",
      type: "PUBLIC",
      city: "Leipzig",
      countryCode: "DE",
      overview:
        "A public applied-sciences institution charging no tuition beyond the semester contribution, with English master's programs in computing and design.",
      ranking: 540,
      students: 8300,
      partTime: true,
      housing: true,
      tuition: { currency: "EUR", perYear: 0, admission: 0, other: 620 },
      living: { currency: "EUR", onCampus: 310, shared: 420, private: 640, food: 250, transport: 0, insurance: 125, personal: 180, books: 300, visa: 110 },
      programs: [
        {
          name: "MSc Interaction Design",
          major: "Interaction Design",
          level: "MASTER",
          years: 2,
          language: "English",
          gpa: 3.0,
          language_req: [{ test: "IELTS", score: 6.5 }],
        },
        {
          name: "MSc Cybersecurity",
          major: "Cybersecurity",
          level: "MASTER",
          years: 2,
          language: "English",
          gpa: 3.2,
          language_req: [{ test: "IELTS", score: 6.5 }, { test: "TOEFL_IBT", score: 90, waivable: true }],
        },
      ],
    },
    {
      slug: "aachen-institute-of-engineering",
      name: "Aachen Institute of Engineering",
      type: "PUBLIC",
      city: "Aachen",
      countryCode: "DE",
      overview:
        "An engineering-only institution in a small university town on the Belgian border, where roughly a third of students come from outside Germany.",
      ranking: 300,
      students: 12900,
      partTime: true,
      housing: true,
      tuition: { currency: "EUR", perYear: 0, admission: 0, other: 580 },
      living: { currency: "EUR", onCampus: 290, shared: 380, private: 560, food: 240, transport: 0, insurance: 125, personal: 170, books: 280, visa: 110 },
      programs: [
        {
          name: "MSc Mechanical Engineering",
          major: "Mechanical Engineering",
          level: "MASTER",
          years: 2,
          language: "English",
          gpa: 3.3,
          language_req: [{ test: "IELTS", score: 6.5 }],
        },
      ],
    },
    {
      slug: "daejeon-science-university",
      name: "Daejeon Science University",
      type: "PRIVATE_NONPROFIT",
      city: "Daejeon",
      countryCode: "KR",
      overview:
        "A research-focused private university in Korea's science corridor, with scholarship-heavy admissions for international undergraduates in STEM.",
      ranking: 380,
      students: 10400,
      partTime: true,
      housing: true,
      tuition: { currency: "KRW", perYear: 7400000, admission: 950000, other: 320000 },
      living: { currency: "KRW", onCampus: 320000, shared: 480000, private: 700000, food: 400000, transport: 65000, insurance: 55000, personal: 250000, books: 400000, visa: 130000 },
      programs: [
        {
          name: "BSc Computer Science",
          major: "Computer Science",
          level: "BACHELOR",
          years: 4,
          language: "English",
          gpa: 3.0,
          language_req: [{ test: "IELTS", score: 6 }, { test: "TOPIK", band: "3", waivable: true }],
        },
        {
          name: "MSc Data Science",
          major: "Data Science",
          level: "MASTER",
          years: 2,
          language: "English",
          gpa: 3.3,
          language_req: [{ test: "IELTS", score: 6.5 }],
        },
      ],
    },
    {
      slug: "groningen-college-of-technology",
      name: "Groningen College of Technology",
      type: "PUBLIC",
      city: "Groningen",
      countryCode: "NL",
      overview:
        "A compact technical college in the north of the Netherlands, entirely English-taught at master's level, with project-based teaching and industry supervisors.",
      ranking: 260,
      students: 6900,
      partTime: true,
      housing: false,
      tuition: { currency: "EUR", perYear: 14500, admission: 0, other: 400 },
      living: { currency: "EUR", onCampus: 0, shared: 520, private: 780, food: 260, transport: 45, insurance: 130, personal: 200, books: 350, visa: 210 },
      programs: [
        {
          name: "MSc Computer Science",
          major: "Computer Science",
          level: "MASTER",
          years: 2,
          language: "English",
          gpa: 3.2,
          language_req: [{ test: "IELTS", score: 6.5 }],
        },
        {
          name: "MSc Public Health",
          major: "Public Health",
          level: "MASTER",
          years: 1,
          language: "English",
          gpa: 3.0,
          language_req: [{ test: "IELTS", score: 6.5 }],
        },
      ],
    },
    {
      slug: "atlantic-coast-university",
      name: "Atlantic Coast University",
      type: "PUBLIC",
      city: "Halifax",
      countryCode: "CA",
      overview:
        "A mid-sized coastal university in Nova Scotia with co-op placements built into most undergraduate degrees and guaranteed first-year residence.",
      ranking: 480,
      students: 15800,
      partTime: true,
      housing: true,
      tuition: { currency: "CAD", perYear: 21400, admission: 250, other: 1100 },
      living: { currency: "CAD", onCampus: 950, shared: 780, private: 1350, food: 480, transport: 85, insurance: 90, personal: 300, books: 1200, visa: 235 },
      programs: [
        {
          name: "BSc Computer Science",
          major: "Computer Science",
          level: "BACHELOR",
          years: 4,
          language: "English",
          gpa: 3.0,
          language_req: [{ test: "IELTS", score: 6.5 }, { test: "DUOLINGO", score: 115, waivable: true }],
        },
        {
          name: "BBA Business Administration",
          major: "Business Administration",
          level: "BACHELOR",
          years: 4,
          language: "English",
          gpa: 2.8,
          language_req: [{ test: "IELTS", score: 6.5 }],
        },
      ],
    },
  ];

  const created: { id: string; slug: string; name: string; countryCode: string; programIds: string[] }[] = [];

  for (const seed of universitySeeds) {
    const university = await prisma.university.create({
      data: {
        slug: seed.slug,
        name: seed.name,
        localName: seed.localName,
        type: seed.type,
        countryCode: seed.countryCode,
        cityId: cityBy(seed.city).id,
        overview: seed.overview,
        globalRanking: seed.ranking,
        studentCount: seed.students,
        internationalShare: 0.18,
        housingAvailable: seed.housing,
        housingNotes: seed.housing ? "Rooms in university halls are allocated by application before the intake." : null,
        internationalSupport: "International office runs orientation, visa guidance and a buddy scheme.",
        partTimeFriendly: seed.partTime,
        websiteUrl: `https://example.edu/${seed.slug}`,
        internationalOfficeEmail: `international@${seed.slug.split("-")[0]}.example.edu`,
        latitude: cityBy(seed.city).latitude,
        longitude: cityBy(seed.city).longitude,
      },
    });

    const programIds: string[] = [];
    for (const program of seed.programs) {
      const record = await prisma.program.create({
        data: {
          universityId: university.id,
          majorId: majorBy(program.major).id,
          name: program.name,
          degreeLevel: program.level,
          durationYears: program.years,
          languageOfInstruction: program.language,
          intakes: seed.countryCode === "JP" ? ["SPRING", "AUTUMN"] : ["AUTUMN"],
          applicationOpens: new Date("2026-10-01"),
          applicationCloses: new Date("2027-01-31"),
          admissionRequirement: {
            create: {
              minGpa: program.gpa,
              gpaScale: 4,
              minEducationLevel: program.level === "MASTER" ? "BACHELOR" : "HIGH_SCHOOL",
              requiredDocuments: ["Passport", "Transcript", "Statement of purpose", "Proof of funds"],
              interviewRequired: program.level === "MASTER",
              dataSourceId: source.id,
              verification: "NEEDS_REVIEW",
            },
          },
          languageRequirements: {
            create: program.language_req.map((requirement) => ({
              test: requirement.test as never,
              minScore: requirement.score ?? null,
              minBand: requirement.band ?? null,
              waivable: requirement.waivable ?? false,
              dataSourceId: source.id,
              verification: "NEEDS_REVIEW",
            })),
          },
        },
      });
      programIds.push(record.id);
    }

    await prisma.tuitionRecord.create({
      data: {
        universityId: university.id,
        academicYear: "2026/27",
        currency: seed.tuition.currency,
        tuitionPerYear: seed.tuition.perYear,
        admissionFee: seed.tuition.admission,
        otherAcademicFees: seed.tuition.other,
        dataSourceId: source.id,
        verification: "NEEDS_REVIEW",
      },
    });

    const housingTypes = [
      ["ON_CAMPUS", seed.living.onCampus],
      ["SHARED_OFF_CAMPUS", seed.living.shared],
      ["PRIVATE_OFF_CAMPUS", seed.living.private],
    ] as const;

    for (const [housingType, housingPerMonth] of housingTypes) {
      if (housingPerMonth === 0) continue;
      await prisma.livingCostRecord.create({
        data: {
          universityId: university.id,
          housingType,
          currency: seed.living.currency,
          housingPerMonth,
          foodPerMonth: seed.living.food,
          transportPerMonth: seed.living.transport,
          insurancePerMonth: seed.living.insurance,
          personalPerMonth: seed.living.personal,
          booksPerYear: seed.living.books,
          visaFeesPerYear: seed.living.visa,
          dataSourceId: source.id,
          verification: "NEEDS_REVIEW",
        },
      });
    }

    created.push({
      id: university.id,
      slug: seed.slug,
      name: seed.name,
      countryCode: seed.countryCode,
      programIds,
    });
  }

  // ── scholarships ──────────────────────────────────────────────────
  const universityBy = (slug: string) => created.find((entry) => entry.slug === slug)!;

  type ScholarshipRequirementSeed = {
    kind: "MIN_GPA" | "LANGUAGE_SCORE" | "NATIONALITY" | "FINANCIAL_NEED" | "DEGREE_LEVEL" | "MAJOR";
    description: string;
    numericValue?: number;
    textValue?: string;
    listValue?: string[];
  };

  const scholarshipSeeds: {
    slug: string;
    name: string;
    provider: "UNIVERSITY" | "GOVERNMENT" | "PRIVATE" | "EXTERNAL";
    universitySlug: string;
    currency: string;
    tuitionPercent: number;
    stipend: number;
    summary: string;
    requirements: ScholarshipRequirementSeed[];
  }[] = [
    {
      slug: "kamogawa-international-merit",
      name: "Kamogawa International Merit Award",
      provider: "UNIVERSITY" as const,
      universitySlug: "kamogawa-institute-of-technology",
      currency: "JPY",
      tuitionPercent: 50,
      stipend: 0,
      summary: "Halves tuition for international entrants with strong prior results. Renewable on a B average.",
      requirements: [
        { kind: "MIN_GPA" as const, description: "GPA of 3.4 or above", numericValue: 3.4 },
        { kind: "LANGUAGE_SCORE" as const, description: "IELTS 6.5 or equivalent", numericValue: 6.5, textValue: "IELTS" },
      ],
    },
    {
      slug: "hakata-regional-exchange",
      name: "Hakata Regional Exchange Grant",
      provider: "GOVERNMENT" as const,
      universitySlug: "hakata-bay-university",
      currency: "JPY",
      tuitionPercent: 100,
      stipend: 720000,
      summary: "Full tuition plus a monthly living stipend for students from partner countries in Southeast and East Asia.",
      requirements: [
        { kind: "MIN_GPA" as const, description: "GPA of 3.2 or above", numericValue: 3.2 },
        { kind: "NATIONALITY" as const, description: "Nationals of partner countries", listValue: ["TH", "VN", "ID", "PH", "MM"] },
        { kind: "FINANCIAL_NEED" as const, description: "Household funding under USD 12,000 a year", numericValue: 12000 },
      ],
    },
    {
      slug: "chao-phraya-early-offer",
      name: "Chao Phraya Early Offer Discount",
      provider: "UNIVERSITY" as const,
      universitySlug: "chao-phraya-international-university",
      currency: "THB",
      tuitionPercent: 25,
      stipend: 0,
      summary: "A quarter off tuition for applications submitted before the first deadline of the cycle.",
      requirements: [{ kind: "MIN_GPA" as const, description: "GPA of 2.8 or above", numericValue: 2.8 }],
    },
    {
      slug: "lanna-asean-access",
      name: "Lanna ASEAN Access Bursary",
      provider: "UNIVERSITY" as const,
      universitySlug: "lanna-technical-university",
      currency: "THB",
      tuitionPercent: 40,
      stipend: 24000,
      summary: "Fee reduction and a small allowance for students from ASEAN member states studying engineering.",
      requirements: [
        { kind: "NATIONALITY" as const, description: "ASEAN nationals", listValue: ["TH", "MM", "LA", "KH", "VN", "MY", "ID", "PH", "SG", "BN"] },
        { kind: "MIN_GPA" as const, description: "GPA of 2.6 or above", numericValue: 2.6 },
      ],
    },
    {
      slug: "saxony-graduate-support",
      name: "Saxony Graduate Support Grant",
      provider: "GOVERNMENT" as const,
      universitySlug: "leipzig-university-of-applied-sciences",
      currency: "EUR",
      tuitionPercent: 0,
      stipend: 8400,
      summary: "A living-cost grant for master's students in the state of Saxony, paid monthly across the study period.",
      requirements: [
        { kind: "DEGREE_LEVEL" as const, description: "Master's applicants only", listValue: ["MASTER"] },
        { kind: "MIN_GPA" as const, description: "GPA of 3.3 or above", numericValue: 3.3 },
      ],
    },
    {
      slug: "daejeon-stem-scholarship",
      name: "Daejeon STEM Scholarship",
      provider: "UNIVERSITY" as const,
      universitySlug: "daejeon-science-university",
      currency: "KRW",
      tuitionPercent: 70,
      stipend: 3000000,
      summary: "Covers most of tuition plus a dormitory allowance for international students in science and engineering.",
      requirements: [
        { kind: "MIN_GPA" as const, description: "GPA of 3.0 or above", numericValue: 3.0 },
        { kind: "LANGUAGE_SCORE" as const, description: "IELTS 6.0 or equivalent", numericValue: 6, textValue: "IELTS" },
      ],
    },
    {
      slug: "atlantic-coast-entrance-award",
      name: "Atlantic Coast Entrance Award",
      provider: "UNIVERSITY" as const,
      universitySlug: "atlantic-coast-university",
      currency: "CAD",
      tuitionPercent: 20,
      stipend: 0,
      summary: "Automatic tuition reduction for entering international undergraduates above the academic threshold.",
      requirements: [{ kind: "MIN_GPA" as const, description: "GPA of 3.5 or above", numericValue: 3.5 }],
    },
    {
      slug: "groningen-north-fund",
      name: "Groningen North Fund",
      provider: "PRIVATE" as const,
      universitySlug: "groningen-college-of-technology",
      currency: "EUR",
      tuitionPercent: 60,
      stipend: 0,
      summary: "Partial fee waiver funded by regional employers, with a commitment to a placement in the north of the country.",
      requirements: [
        { kind: "MIN_GPA" as const, description: "GPA of 3.4 or above", numericValue: 3.4 },
        { kind: "DEGREE_LEVEL" as const, description: "Master's applicants only", listValue: ["MASTER"] },
      ],
    },
  ];

  for (const seed of scholarshipSeeds) {
    const university = universityBy(seed.universitySlug);
    await prisma.scholarship.create({
      data: {
        slug: seed.slug,
        name: seed.name,
        provider: seed.provider,
        universityId: university.id,
        countryCode: university.countryCode,
        summary: seed.summary,
        currency: seed.currency,
        tuitionPercent: seed.tuitionPercent,
        livingStipendPerYear: seed.stipend,
        housingCovered: seed.stipend > 0,
        deadline: new Date("2027-02-28"),
        renewable: true,
        dataSourceId: source.id,
        verification: "NEEDS_REVIEW",
        degreeLevels: ["BACHELOR", "MASTER"],
        requirements: {
          create: seed.requirements.map((requirement) => ({
            kind: requirement.kind,
            description: requirement.description,
            numericValue: requirement.numericValue ?? null,
            textValue: requirement.textValue ?? null,
            listValue: requirement.listValue ?? [],
            mandatory: true,
          })),
        },
      },
    });
  }

  // ── demo accounts ─────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("password123", 12);
  const collections = [
    { name: "Dream", color: "brass" },
    { name: "Target", color: "viridian" },
    { name: "Safe", color: "slate" },
    { name: "Affordable", color: "viridian" },
    { name: "Scholarship target", color: "brass" },
    { name: "Research later", color: "slate" },
  ];

  const student = await prisma.user.create({
    data: {
      email: "demo@atlas.study",
      name: "Nadia Rahman",
      passwordHash,
      preferredCurrency: "USD",
      collections: { create: collections.map((collection) => ({ ...collection, system: true })) },
      decisionPreference: { create: {} },
      studentProfile: {
        create: {
          currentCountryCode: "TH",
          nationalityCode: "TH",
          currentEducationLevel: "HIGH_SCHOOL",
          currentInstitution: "Bangkok Christian College",
          desiredDegree: "BACHELOR",
          desiredMajorId: majorBy("Computer Science").id,
          preferredCountries: ["JP", "KR", "DE"],
          preferredIntake: "AUTUMN",
          preferredEnvironment: "MID_SIZED_CITY",
          gpa: 3.45,
          gpaScale: 4,
          budgetCurrency: "USD",
          annualFamilyBudget: 9000,
          availableSavings: 12000,
          expectedSupport: 1500,
          maxTuitionPerYear: 8000,
          maxLivingCostPerYear: 9000,
          scholarshipRequired: false,
          willingToWorkPartTime: true,
          careerGoal: "Backend software engineering, ideally at a games or robotics company in Japan",
          completedOnboarding: true,
          onboardingStep: 6,
          languageQualifications: {
            create: [
              { test: "IELTS", score: 6.5 },
              { test: "JLPT", band: "N4" },
            ],
          },
        },
      },
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@atlas.study",
      name: "Priya Menon",
      passwordHash,
      role: "ADMIN",
      studentProfile: { create: { completedOnboarding: true } },
    },
  });

  const repUser = await prisma.user.create({
    data: {
      email: "rep@atlas.study",
      name: "Kenji Watanabe",
      passwordHash,
      role: "REPRESENTATIVE",
      studentProfile: { create: { completedOnboarding: true } },
      representative: {
        create: {
          universityId: universityBy("kamogawa-institute-of-technology").id,
          jobTitle: "International admissions officer",
          workEmail: "k.watanabe@kamogawa.example.edu",
          status: "VERIFIED",
          reviewedAt: new Date(),
        },
      },
    },
  });

  await prisma.university.update({
    where: { id: universityBy("kamogawa-institute-of-technology").id },
    data: { claimed: true },
  });

  // A pending claim so the admin queue has something real in it.
  const pendingRepUser = await prisma.user.create({
    data: {
      email: "claims@atlas.study",
      name: "Sofia Bakker",
      passwordHash,
      studentProfile: { create: {} },
      representative: {
        create: {
          universityId: universityBy("groningen-college-of-technology").id,
          jobTitle: "Recruitment lead",
          workEmail: "s.bakker@groningen.example.edu",
        },
      },
    },
  });

  const kamogawa = universityBy("kamogawa-institute-of-technology");
  const daejeon = universityBy("daejeon-science-university");
  const lanna = universityBy("lanna-technical-university");

  const studentCollections = await prisma.collection.findMany({ where: { userId: student.id } });
  const collectionBy = (name: string) => studentCollections.find((entry) => entry.name === name)!;

  await prisma.savedUniversity.createMany({
    data: [
      { userId: student.id, universityId: kamogawa.id, collectionId: collectionBy("Target").id },
      { userId: student.id, universityId: daejeon.id, collectionId: collectionBy("Dream").id },
      { userId: student.id, universityId: lanna.id, collectionId: collectionBy("Safe").id },
    ],
  });

  const applicationTasks = [
    { kind: "PASSPORT" as const, title: "Valid passport", completed: true },
    { kind: "TRANSCRIPT" as const, title: "Academic transcript", completed: true },
    { kind: "RECOMMENDATION_LETTER" as const, title: "Recommendation letters", completed: false },
    { kind: "STATEMENT_OF_PURPOSE" as const, title: "Statement of purpose", completed: false },
    { kind: "LANGUAGE_CERTIFICATE" as const, title: "Language certificate", completed: true },
    { kind: "FINANCIAL_DOCUMENTS" as const, title: "Proof of funds", completed: false },
    { kind: "APPLICATION_FEE" as const, title: "Application fee paid", completed: false },
    { kind: "VISA_DOCUMENTS" as const, title: "Visa documents", completed: false },
  ];

  await prisma.application.create({
    data: {
      userId: student.id,
      universityId: kamogawa.id,
      programId: kamogawa.programIds[0],
      stage: "PREPARING",
      deadline: new Date("2027-01-31"),
      tasks: {
        create: applicationTasks.map((task, index) => ({
          ...task,
          position: index,
          dueDate: index < 4 ? new Date("2026-12-15") : null,
        })),
      },
    },
  });

  await prisma.application.create({
    data: {
      userId: student.id,
      universityId: daejeon.id,
      programId: daejeon.programIds[0],
      stage: "RESEARCHING",
      deadline: new Date("2027-02-15"),
      tasks: { create: applicationTasks.map((task, index) => ({ ...task, completed: false, position: index })) },
    },
  });

  await prisma.correctionRequest.create({
    data: {
      universityId: universityBy("atlantic-coast-university").id,
      reportedById: student.id,
      entityType: "TuitionRecord",
      entityId: (await prisma.tuitionRecord.findFirstOrThrow({
        where: { universityId: universityBy("atlantic-coast-university").id },
      })).id,
      field: "tuitionPerYear",
      claimedValue: "22600",
      message: "The fee schedule published for the 2026/27 intake lists a higher international rate than the figure here.",
      evidenceUrl: "https://example.edu/atlantic-coast-university/fees",
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: student.id,
        kind: "APPLICATION_DEADLINE",
        title: "Kamogawa closes in 8 weeks",
        body: "Recommendation letters and proof of funds are still outstanding.",
        href: "/planner",
      },
      {
        userId: student.id,
        kind: "NEW_SCHOLARSHIP_MATCH",
        title: "You now qualify for the Daejeon STEM Scholarship",
        body: "Your IELTS result meets the language criterion for this award.",
        href: "/scholarships",
      },
      {
        userId: admin.id,
        kind: "VERIFICATION",
        title: "A university claim is waiting",
        body: `${pendingRepUser.name} claimed Groningen College of Technology.`,
        href: "/admin/representatives",
      },
    ],
  });

  console.log(
    `Seeded ${created.length} universities, ${scholarshipSeeds.length} scholarships and 4 accounts.\n` +
      `Student demo@atlas.study · admin admin@atlas.study · representative ${repUser.email} — password123`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
