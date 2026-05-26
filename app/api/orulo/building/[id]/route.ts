import { NextRequest, NextResponse } from 'next/server';
import { getToken, invalidateToken, ORULO_BASE } from '@/lib/orulo-api';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = await getToken();

    const resp = await fetch(`${ORULO_BASE}/api/v2/buildings/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) throw new Error(`Orulo building error ${resp.status}`);

    const b = await resp.json();
    const address = (b.address as Record<string, string>) || {};

    // Extrair todas as fotos disponíveis
    const images: string[] = [];
    const img = (b.default_image as Record<string, string>) || {};
    const mainPhoto = img['840x560'] || img['520x280'] || img['200x140'];
    if (mainPhoto) images.push(mainPhoto);

    // Galeria adicional
    const gallery = (b.images as Record<string, string>[]) || [];
    for (const g of gallery) {
      const url = g['840x560'] || g['520x280'] || g['url'] || g['original'];
      if (url && !images.includes(url)) images.push(url);
    }

    const building = {
      id: String(b.id),
      name: (b.name as string) || 'Empreendimento',
      developer: (b.developer as Record<string, string>)?.name || (b.developer_name as string) || '',
      description: (b.description as string) || '',
      min_price: (b.min_price as number) ?? null,
      max_price: (b.max_price as number) ?? null,
      bedrooms_min: (b.min_bedrooms as number) ?? null,
      bedrooms_max: (b.max_bedrooms as number) ?? null,
      area_min: (b.min_area as number) ?? null,
      area_max: (b.max_area as number) ?? null,
      bathrooms_min: (b.min_bathrooms as number) ?? null,
      bathrooms_max: (b.max_bathrooms as number) ?? null,
      vagas_min: (b.min_parking_spots as number) ?? (b.min_garages as number) ?? null,
      vagas_max: (b.max_parking_spots as number) ?? (b.max_garages as number) ?? null,
      neighborhood: address.area || address.neighborhood || address.district || '',
      city: address.city || '',
      state: address.state || '',
      street: address.street || '',
      number: address.number || '',
      address_full: [address.street, address.number].filter(Boolean).join(', '),
      status: (b.status as string) || '',
      sharing_url: (b.sharing_url as string) || null,
      images,
      total_units: (b.total_units as number) ?? null,
      floors: (b.floors as number) ?? null,
      delivery_date: (b.delivery_date as string) || null,
    };

    return NextResponse.json({ building });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro';
    if (message.includes('401') || message.includes('403')) invalidateToken();
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
