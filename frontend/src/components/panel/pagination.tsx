'use client';

interface PaginationProps {
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, total, limit, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (totalPages <= 1) return null;

  const pages = buildPageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-between pt-1">
      <p className="text-xs text-gray-400">
        {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
      </p>
      <div className="flex items-center gap-1">
        <NavButton
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          label="Anterior"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </NavButton>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-1 text-xs text-gray-400">...</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`min-w-[28px] rounded-md px-1.5 py-1 text-xs font-medium transition cursor-pointer ${
                p === page
                  ? 'bg-[#0f1f3d] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ),
        )}

        <NavButton
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          label="Siguiente"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </NavButton>
      </div>
    </div>
  );
}

function NavButton({
  disabled,
  onClick,
  label,
  children,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {children}
      </svg>
    </button>
  );
}

function buildPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | '...')[] = [1];

  if (current > 3) pages.push('...');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push('...');

  pages.push(total);
  return pages;
}
