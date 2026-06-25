// components/SchemaMarkup.tsx — Componente reutilizável para injetar JSON-LD schemas

interface SchemaMarkupProps {
  schemas: Array<Record<string, unknown>>;
}

/**
 * Renderiza um ou múltiplos schemas JSON-LD em <script type="application/ld+json">
 * Uso: <SchemaMarkup schemas={[organization, breadcrumb, ...]} />
 */
export default function SchemaMarkup({ schemas }: SchemaMarkupProps) {
  return (
    <>
      {schemas.map((schema, idx) => (
        <script
          key={idx}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
