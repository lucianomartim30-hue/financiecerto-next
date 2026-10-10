import MarcaAcessoInterno from '@/components/MarcaAcessoInterno';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <MarcaAcessoInterno />
      {children}
    </>
  );
}
