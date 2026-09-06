import Link from "next/link";
import type { ReactNode } from "react";
import { Award, GraduationCap, Globe2, Search as SearchIcon } from "lucide-react";
import { prisma } from "@/lib/db";
import { titleCase } from "@/lib/format";
import { EmptyState } from "@/components/ui";

const RESULT_LIMIT = 8;

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [universities, countries, scholarships] = query
    ? await Promise.all([
        prisma.university.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { city: { name: { contains: query, mode: "insensitive" } } },
              { country: { name: { contains: query, mode: "insensitive" } } },
            ],
          },
          include: { city: true, country: true },
          orderBy: { name: "asc" },
          take: RESULT_LIMIT,
        }),
        prisma.country.findMany({
          where: { name: { contains: query, mode: "insensitive" } },
          orderBy: { name: "asc" },
          take: RESULT_LIMIT,
        }),
        prisma.scholarship.findMany({
          where: { name: { contains: query, mode: "insensitive" } },
          include: { university: true, country: true },
          orderBy: { name: "asc" },
          take: RESULT_LIMIT,
        }),
      ])
    : [[], [], []];

  const total = universities.length + countries.length + scholarships.length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl">Search</h1>
        <p className="mt-2 max-w-prose text-sm text-slate">
          Find a university by name, city or country, a country profile, or a scholarship.
        </p>
      </header>

      <form action="/search" method="GET" className="glass flex items-center gap-2 rounded-[22px] p-3 sm:p-4">
        <SearchIcon size={17} className="ml-1 shrink-0 text-mist" />
        <input
          name="q"
          className="input h-10 flex-1 border-none bg-transparent shadow-none focus:outline-none"
          placeholder="Search universities, cities, countries, scholarships…"
          defaultValue={query}
          autoFocus
        />
        <button type="submit" className="btn btn-primary h-10">
          Search
        </button>
      </form>

      {!query ? (
        <EmptyState title="Start typing to search" body="Results from universities, countries and scholarships will show up here." />
      ) : total === 0 ? (
        <EmptyState
          title={`Nothing matches "${query}"`}
          body="Try a different spelling, or search a city or country name instead."
        />
      ) : (
        <div className="space-y-8">
          {universities.length > 0 && (
            <ResultSection title="Universities" icon={GraduationCap} count={universities.length}>
              {universities.map((university) => (
                <Link
                  key={university.id}
                  href={`/universities/${university.slug}`}
                  className="panel flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-parchment"
                >
                  <div>
                    <p className="text-sm">{university.name}</p>
                    <p className="mt-0.5 text-xs text-slate">
                      {university.city.name}, {university.country.name} · {titleCase(university.type)}
                    </p>
                  </div>
                </Link>
              ))}
            </ResultSection>
          )}

          {countries.length > 0 && (
            <ResultSection title="Countries" icon={Globe2} count={countries.length}>
              {countries.map((country) => (
                <Link
                  key={country.code}
                  href={`/countries?code=${country.code}`}
                  className="panel flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-parchment"
                >
                  <div>
                    <p className="text-sm">{country.name}</p>
                    <p className="mt-0.5 text-xs text-slate">{country.region}</p>
                  </div>
                </Link>
              ))}
            </ResultSection>
          )}

          {scholarships.length > 0 && (
            <ResultSection title="Scholarships" icon={Award} count={scholarships.length}>
              {scholarships.map((scholarship) => (
                <Link
                  key={scholarship.id}
                  href={`/scholarships#${scholarship.id}`}
                  className="panel flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-parchment"
                >
                  <div>
                    <p className="text-sm">{scholarship.name}</p>
                    <p className="mt-0.5 text-xs text-slate">
                      {titleCase(scholarship.provider)}
                      {scholarship.university ? ` · ${scholarship.university.name}` : ""}
                      {scholarship.country ? ` · ${scholarship.country.name}` : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </ResultSection>
          )}
        </div>
      )}
    </div>
  );
}

function ResultSection({
  title,
  icon: Icon,
  count,
  children,
}: {
  title: string;
  icon: typeof GraduationCap;
  count: number;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <Icon size={16} className="text-viridian" />
        <h2 className="text-base">{title}</h2>
        <span className="chip">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
