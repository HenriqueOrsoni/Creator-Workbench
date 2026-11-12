import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4 px-4 text-center font-sans">
      <h1 className="text-3xl font-bold font-heading">Página não encontrada</h1>
      <p className="text-sm text-muted-foreground max-w-md">
        O endereço que você tentou abrir não existe ou foi movido.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-lg bg-primary px-4 h-9 text-xs font-semibold text-primary-foreground hover:bg-primary-hover transition-colors"
      >
        Voltar ao painel
      </Link>
    </main>
  );
}
