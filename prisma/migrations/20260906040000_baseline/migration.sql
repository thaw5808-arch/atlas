-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'REPRESENTATIVE', 'ADMIN');

-- CreateEnum
CREATE TYPE "EducationLevel" AS ENUM ('HIGH_SCHOOL', 'FOUNDATION', 'DIPLOMA', 'BACHELOR', 'MASTER', 'DOCTORATE');

-- CreateEnum
CREATE TYPE "DegreeLevel" AS ENUM ('FOUNDATION', 'DIPLOMA', 'BACHELOR', 'MASTER', 'DOCTORATE');

-- CreateEnum
CREATE TYPE "CityEnvironment" AS ENUM ('MAJOR_METRO', 'MID_SIZED_CITY', 'UNIVERSITY_TOWN', 'NO_PREFERENCE');

-- CreateEnum
CREATE TYPE "Intake" AS ENUM ('SPRING', 'SUMMER', 'AUTUMN', 'WINTER', 'ROLLING');

-- CreateEnum
CREATE TYPE "LanguageTest" AS ENUM ('IELTS', 'TOEFL_IBT', 'DUOLINGO', 'JLPT', 'TOPIK', 'DELF', 'TESTDAF', 'OTHER');

-- CreateEnum
CREATE TYPE "UniversityType" AS ENUM ('PUBLIC', 'PRIVATE', 'PRIVATE_NONPROFIT');

-- CreateEnum
CREATE TYPE "HousingType" AS ENUM ('ON_CAMPUS', 'SHARED_OFF_CAMPUS', 'PRIVATE_OFF_CAMPUS');

-- CreateEnum
CREATE TYPE "ScholarshipProvider" AS ENUM ('UNIVERSITY', 'GOVERNMENT', 'PRIVATE', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "RequirementKind" AS ENUM ('MIN_GPA', 'LANGUAGE_SCORE', 'NATIONALITY', 'FINANCIAL_NEED', 'DEGREE_LEVEL', 'MAJOR', 'ENROLMENT', 'OTHER');

-- CreateEnum
CREATE TYPE "Importance" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "WorkAssumption" AS ENUM ('NONE', 'CONSERVATIVE', 'PERMITTED_MAX');

-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('RESEARCHING', 'CONSIDERING', 'PREPARING', 'READY_TO_APPLY', 'APPLIED', 'INTERVIEW', 'OFFER', 'REJECTED', 'ACCEPTED');

-- CreateEnum
CREATE TYPE "TaskKind" AS ENUM ('PASSPORT', 'TRANSCRIPT', 'RECOMMENDATION_LETTER', 'STATEMENT_OF_PURPOSE', 'LANGUAGE_CERTIFICATE', 'FINANCIAL_DOCUMENTS', 'PORTFOLIO', 'APPLICATION_FEE', 'INTERVIEW', 'VISA_DOCUMENTS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('APPLICATION_DEADLINE', 'SCHOLARSHIP_DEADLINE', 'DATA_CHANGED', 'CHECKLIST_DUE', 'NEW_SCHOLARSHIP_MATCH', 'APPLICATION_STATUS', 'VERIFICATION');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIED', 'NEEDS_REVIEW', 'RECENTLY_UPDATED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "RepresentativeStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STUDENT',
    "preferredCurrency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentCountryCode" TEXT,
    "nationalityCode" TEXT,
    "currentEducationLevel" "EducationLevel",
    "currentInstitution" TEXT,
    "desiredDegree" "DegreeLevel",
    "desiredMajorId" TEXT,
    "preferredCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredUniversityIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredIntake" "Intake",
    "preferredEnvironment" "CityEnvironment" NOT NULL DEFAULT 'NO_PREFERENCE',
    "gpa" DOUBLE PRECISION,
    "gpaScale" DOUBLE PRECISION DEFAULT 4,
    "academicNotes" TEXT,
    "budgetCurrency" TEXT NOT NULL DEFAULT 'USD',
    "annualFamilyBudget" DOUBLE PRECISION,
    "availableSavings" DOUBLE PRECISION,
    "expectedSupport" DOUBLE PRECISION,
    "maxTuitionPerYear" DOUBLE PRECISION,
    "maxLivingCostPerYear" DOUBLE PRECISION,
    "scholarshipRequired" BOOLEAN NOT NULL DEFAULT false,
    "minScholarshipPercent" DOUBLE PRECISION,
    "willingToWorkPartTime" BOOLEAN NOT NULL DEFAULT false,
    "careerGoal" TEXT,
    "onboardingStep" INTEGER NOT NULL DEFAULT 0,
    "completedOnboarding" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageQualification" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "test" "LanguageTest" NOT NULL,
    "score" DOUBLE PRECISION,
    "band" TEXT,
    "takenOn" TIMESTAMP(3),
    "expiresOn" TIMESTAMP(3),

    CONSTRAINT "LanguageQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visaOverview" TEXT,
    "workRuleSummary" TEXT,
    "workHoursPerWeek" INTEGER,
    "typicalStudentWage" DOUBLE PRECISION,
    "workWeeksPerYear" INTEGER DEFAULT 40,
    "academicCalendar" TEXT,
    "housingNotes" TEXT,
    "insuranceNotes" TEXT,
    "transportNotes" TEXT,
    "typicalTuitionMin" DOUBLE PRECISION,
    "typicalTuitionMax" DOUBLE PRECISION,
    "typicalLivingMin" DOUBLE PRECISION,
    "typicalLivingMax" DOUBLE PRECISION,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "dataSourceId" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "verification" "VerificationStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',

    CONSTRAINT "Country_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "environment" "CityEnvironment" NOT NULL DEFAULT 'MID_SIZED_CITY',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "costIndex" DOUBLE PRECISION,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Field" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Major" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,

    CONSTRAINT "Major_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "University" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "localName" TEXT,
    "type" "UniversityType" NOT NULL,
    "countryCode" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "foundedYear" INTEGER,
    "overview" TEXT NOT NULL,
    "campusImageUrl" TEXT,
    "websiteUrl" TEXT,
    "internationalOfficeEmail" TEXT,
    "internationalOfficePhone" TEXT,
    "globalRanking" INTEGER,
    "studentCount" INTEGER,
    "internationalShare" DOUBLE PRECISION,
    "housingAvailable" BOOLEAN NOT NULL DEFAULT false,
    "housingNotes" TEXT,
    "internationalSupport" TEXT,
    "partTimeFriendly" BOOLEAN NOT NULL DEFAULT false,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "University_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "majorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "degreeLevel" "DegreeLevel" NOT NULL,
    "durationYears" DOUBLE PRECISION NOT NULL,
    "languageOfInstruction" TEXT NOT NULL,
    "intakes" "Intake"[] DEFAULT ARRAY[]::"Intake"[],
    "applicationOpens" TIMESTAMP(3),
    "applicationCloses" TIMESTAMP(3),
    "description" TEXT,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdmissionRequirement" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "minGpa" DOUBLE PRECISION,
    "gpaScale" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "minEducationLevel" "EducationLevel" NOT NULL DEFAULT 'HIGH_SCHOOL',
    "requiredDocuments" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "entranceExam" TEXT,
    "interviewRequired" BOOLEAN NOT NULL DEFAULT false,
    "portfolioRequired" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "dataSourceId" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "verification" "VerificationStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',

    CONSTRAINT "AdmissionRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageRequirement" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "test" "LanguageTest" NOT NULL,
    "minScore" DOUBLE PRECISION,
    "minBand" TEXT,
    "waivable" BOOLEAN NOT NULL DEFAULT false,
    "waiverNotes" TEXT,
    "dataSourceId" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "verification" "VerificationStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',

    CONSTRAINT "LanguageRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TuitionRecord" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "programId" TEXT,
    "academicYear" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "tuitionPerYear" DOUBLE PRECISION NOT NULL,
    "admissionFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherAcademicFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isInternationalRate" BOOLEAN NOT NULL DEFAULT true,
    "dataSourceId" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3),
    "verification" "VerificationStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',

    CONSTRAINT "TuitionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LivingCostRecord" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "housingType" "HousingType" NOT NULL,
    "currency" TEXT NOT NULL,
    "housingPerMonth" DOUBLE PRECISION NOT NULL,
    "foodPerMonth" DOUBLE PRECISION NOT NULL,
    "transportPerMonth" DOUBLE PRECISION NOT NULL,
    "insurancePerMonth" DOUBLE PRECISION NOT NULL,
    "booksPerYear" DOUBLE PRECISION NOT NULL,
    "personalPerMonth" DOUBLE PRECISION NOT NULL,
    "visaFeesPerYear" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataSourceId" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastVerifiedAt" TIMESTAMP(3),
    "verification" "VerificationStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',

    CONSTRAINT "LivingCostRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "quoteCurrency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'seed',

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scholarship" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "ScholarshipProvider" NOT NULL,
    "universityId" TEXT,
    "countryCode" TEXT,
    "majorId" TEXT,
    "degreeLevels" "DegreeLevel"[] DEFAULT ARRAY[]::"DegreeLevel"[],
    "summary" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "tuitionPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "livingStipendPerYear" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "housingCovered" BOOLEAN NOT NULL DEFAULT false,
    "travelCovered" BOOLEAN NOT NULL DEFAULT false,
    "insuranceCovered" BOOLEAN NOT NULL DEFAULT false,
    "applicationUrl" TEXT,
    "deadline" TIMESTAMP(3),
    "renewable" BOOLEAN NOT NULL DEFAULT false,
    "slots" INTEGER,
    "dataSourceId" TEXT,
    "lastVerifiedAt" TIMESTAMP(3),
    "verification" "VerificationStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',

    CONSTRAINT "Scholarship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScholarshipRequirement" (
    "id" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "kind" "RequirementKind" NOT NULL,
    "description" TEXT NOT NULL,
    "numericValue" DOUBLE PRECISION,
    "textValue" TEXT,
    "listValue" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mandatory" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ScholarshipRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "costImportance" "Importance" NOT NULL DEFAULT 'VERY_HIGH',
    "academicImportance" "Importance" NOT NULL DEFAULT 'HIGH',
    "languageImportance" "Importance" NOT NULL DEFAULT 'HIGH',
    "locationImportance" "Importance" NOT NULL DEFAULT 'MEDIUM',
    "scholarshipImportance" "Importance" NOT NULL DEFAULT 'HIGH',
    "careerImportance" "Importance" NOT NULL DEFAULT 'MEDIUM',
    "rankingImportance" "Importance" NOT NULL DEFAULT 'LOW',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DecisionPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DecisionScore" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "programId" TEXT,
    "overall" DOUBLE PRECISION NOT NULL,
    "academic" DOUBLE PRECISION NOT NULL,
    "financial" DOUBLE PRECISION NOT NULL,
    "language" DOUBLE PRECISION NOT NULL,
    "location" DOUBLE PRECISION NOT NULL,
    "scholarship" DOUBLE PRECISION NOT NULL,
    "career" DOUBLE PRECISION NOT NULL,
    "explanation" JSONB NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DecisionScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "universityId" TEXT,
    "programId" TEXT,
    "housingType" "HousingType" NOT NULL DEFAULT 'SHARED_OFF_CAMPUS',
    "workAssumption" "WorkAssumption" NOT NULL DEFAULT 'NONE',
    "scholarshipIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "rentMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "tuitionMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "fxMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "scholarshipPercentOverride" DOUBLE PRECISION,
    "roommateCount" INTEGER NOT NULL DEFAULT 0,
    "flightsPerYear" INTEGER NOT NULL DEFAULT 1,
    "flightCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emergencyBufferMonths" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScenarioCost" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amountPerYear" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScenarioCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "programId" TEXT,
    "stage" "ApplicationStage" NOT NULL DEFAULT 'RESEARCHING',
    "intake" "Intake",
    "deadline" TIMESTAMP(3),
    "notes" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationTask" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "kind" "TaskKind" NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "dueDate" TIMESTAMP(3),
    "notes" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ApplicationTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'viridian',
    "system" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedUniversity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "collectionId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedUniversity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT,
    "publisher" TEXT,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationRecord" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" "VerificationStatus" NOT NULL,
    "verifiedById" TEXT,
    "dataSourceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "previousValue" TEXT,
    "newValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UniversityRepresentative" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "jobTitle" TEXT,
    "workEmail" TEXT NOT NULL,
    "status" "RepresentativeStatus" NOT NULL DEFAULT 'PENDING',
    "evidenceUrl" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UniversityRepresentative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorrectionRequest" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "reportedById" TEXT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "field" TEXT,
    "claimedValue" TEXT,
    "evidenceUrl" TEXT,
    "message" TEXT NOT NULL,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "CorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE INDEX "LanguageQualification_profileId_idx" ON "LanguageQualification"("profileId");

-- CreateIndex
CREATE UNIQUE INDEX "City_name_countryCode_key" ON "City"("name", "countryCode");

-- CreateIndex
CREATE UNIQUE INDEX "Field_name_key" ON "Field"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Major_name_key" ON "Major"("name");

-- CreateIndex
CREATE UNIQUE INDEX "University_slug_key" ON "University"("slug");

-- CreateIndex
CREATE INDEX "University_countryCode_idx" ON "University"("countryCode");

-- CreateIndex
CREATE INDEX "University_cityId_idx" ON "University"("cityId");

-- CreateIndex
CREATE INDEX "Program_universityId_idx" ON "Program"("universityId");

-- CreateIndex
CREATE INDEX "Program_majorId_idx" ON "Program"("majorId");

-- CreateIndex
CREATE UNIQUE INDEX "AdmissionRequirement_programId_key" ON "AdmissionRequirement"("programId");

-- CreateIndex
CREATE INDEX "LanguageRequirement_programId_idx" ON "LanguageRequirement"("programId");

-- CreateIndex
CREATE INDEX "TuitionRecord_universityId_idx" ON "TuitionRecord"("universityId");

-- CreateIndex
CREATE UNIQUE INDEX "LivingCostRecord_universityId_housingType_key" ON "LivingCostRecord"("universityId", "housingType");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_baseCurrency_quoteCurrency_key" ON "ExchangeRate"("baseCurrency", "quoteCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "Scholarship_slug_key" ON "Scholarship"("slug");

-- CreateIndex
CREATE INDEX "ScholarshipRequirement_scholarshipId_idx" ON "ScholarshipRequirement"("scholarshipId");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionPreference_userId_key" ON "DecisionPreference"("userId");

-- CreateIndex
CREATE INDEX "DecisionScore_userId_idx" ON "DecisionScore"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DecisionScore_userId_universityId_programId_key" ON "DecisionScore"("userId", "universityId", "programId");

-- CreateIndex
CREATE INDEX "Scenario_userId_idx" ON "Scenario"("userId");

-- CreateIndex
CREATE INDEX "ScenarioCost_scenarioId_idx" ON "ScenarioCost"("scenarioId");

-- CreateIndex
CREATE INDEX "Application_userId_idx" ON "Application"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Application_userId_universityId_programId_key" ON "Application"("userId", "universityId", "programId");

-- CreateIndex
CREATE INDEX "ApplicationTask_applicationId_idx" ON "ApplicationTask"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_userId_name_key" ON "Collection"("userId", "name");

-- CreateIndex
CREATE INDEX "SavedUniversity_collectionId_idx" ON "SavedUniversity"("collectionId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedUniversity_userId_universityId_key" ON "SavedUniversity"("userId", "universityId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "VerificationRecord_entityType_entityId_idx" ON "VerificationRecord"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "UniversityRepresentative_userId_key" ON "UniversityRepresentative"("userId");

-- CreateIndex
CREATE INDEX "UniversityRepresentative_universityId_idx" ON "UniversityRepresentative"("universityId");

-- CreateIndex
CREATE INDEX "CorrectionRequest_universityId_status_idx" ON "CorrectionRequest"("universityId", "status");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_desiredMajorId_fkey" FOREIGN KEY ("desiredMajorId") REFERENCES "Major"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageQualification" ADD CONSTRAINT "LanguageQualification_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Country" ADD CONSTRAINT "Country_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Major" ADD CONSTRAINT "Major_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "University" ADD CONSTRAINT "University_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "University" ADD CONSTRAINT "University_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionRequirement" ADD CONSTRAINT "AdmissionRequirement_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdmissionRequirement" ADD CONSTRAINT "AdmissionRequirement_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageRequirement" ADD CONSTRAINT "LanguageRequirement_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageRequirement" ADD CONSTRAINT "LanguageRequirement_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TuitionRecord" ADD CONSTRAINT "TuitionRecord_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TuitionRecord" ADD CONSTRAINT "TuitionRecord_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TuitionRecord" ADD CONSTRAINT "TuitionRecord_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivingCostRecord" ADD CONSTRAINT "LivingCostRecord_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivingCostRecord" ADD CONSTRAINT "LivingCostRecord_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_countryCode_fkey" FOREIGN KEY ("countryCode") REFERENCES "Country"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipRequirement" ADD CONSTRAINT "ScholarshipRequirement_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionPreference" ADD CONSTRAINT "DecisionPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DecisionScore" ADD CONSTRAINT "DecisionScore_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scenario" ADD CONSTRAINT "Scenario_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScenarioCost" ADD CONSTRAINT "ScenarioCost_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationTask" ADD CONSTRAINT "ApplicationTask_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedUniversity" ADD CONSTRAINT "SavedUniversity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedUniversity" ADD CONSTRAINT "SavedUniversity_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedUniversity" ADD CONSTRAINT "SavedUniversity_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRecord" ADD CONSTRAINT "VerificationRecord_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationRecord" ADD CONSTRAINT "VerificationRecord_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniversityRepresentative" ADD CONSTRAINT "UniversityRepresentative_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniversityRepresentative" ADD CONSTRAINT "UniversityRepresentative_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CorrectionRequest" ADD CONSTRAINT "CorrectionRequest_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

