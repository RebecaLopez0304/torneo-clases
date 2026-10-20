export function FirebaseMissing() {
  return (
    <div className="panel mx-auto max-w-xl p-6 text-left">
      <h2 className="panel-title text-xl">Falta conectar Firebase</h2>
      <p className="mt-2 text-ink-muted">
        Copia <code className="text-ink">.env.example</code> a <code className="text-ink">.env.local</code>, rellena
        los valores de tu app web de Firebase y reinicia el servidor.
      </p>
    </div>
  );
}
