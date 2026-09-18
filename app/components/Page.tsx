/** 화면 공통 바깥 틀 — 제목과 본문 폭만 맞춘다. */
export function Page({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-gray-600 dark:text-gray-400">{description}</p>
        )}
      </header>
      {children}
    </main>
  );
}
